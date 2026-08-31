// ============================================================
// SCRAPS — Game screen
//
// All game state lives in the gameReducer state machine
// (src/game/reducer.js). This component only:
//   • holds UI-local state (selections, animation flags, overlays)
//   • schedules animation timers that dispatch pure actions
//   • renders the table
// No setState call ever nests inside another updater, so
// React.StrictMode's development double-invocation is harmless.
// ============================================================

import { useReducer, useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  evaluateBestHand, getBestCardsForSignal, getActiveHandCards, compareHands,
  aiDecide, aiChooseSignal, isValidSignal, hasLegalTrade, tradeInValue,
  shouldCounterAce, chooseAceTargets,
} from "../game/engine.js";
import {
  gameReducer, createInitialState, buildRoundDeal, scoreScrapsOutcome,
  AI_TURN_PHASES, AI_SIGNAL_PHASES,
} from "../game/reducer.js";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { setAudioMuted, isAudioMuted,
  playSelect, playTransfer, playDraw, playAceStrike, playAceCounter,
  playInvalid, playHandWon, playHandLost, playRoundWon, playRoundLost,
  playFullScrap, playRevealBuild } from "../audio.js";
import { useCardMotion } from "../components/flight.jsx";
import { FannedHand, HorizontalScrapsZone, DiscardPile, DeckPile, HandUpgradeBadge, CARD_DIMS } from "../components/cards.jsx";
import { OpponentBar, PlayerBar, RoundProgressIndicator, NearWinBanner, GameLog, SignalLegalityStrip, GameAnnouncer } from "../components/hud.jsx";
import { BigBtn, TradeInBtn, AceTag, TOUCH_MIN, pressStyles } from "../components/buttons.jsx";
import { IconBolt, IconChevron } from "../components/icons.jsx";
import { TableSurface } from "../components/backdrop.jsx";
import { Walkthrough } from "./Walkthrough.jsx";
import { recordGame } from "../game/stats.js";
import { useViewport, layoutMode, MODE_MIN_W, SHORT_MAX_H, FitBox } from "../ui/viewport.jsx";
import {
  RoundInterstitial, RevealOverlay, FullScrapLightbox, WinScreen, LoseScreen,
  AceCounterModal, SkipTurnModal, QuitConfirmModal,
  OpponentAceReveal, AiCounterNotice, AceDrawnLightbox,
} from "../components/overlays.jsx";

// ─────────────────────────────────────────────────────────────
// Card sizes. A card is one size in a hand and a smaller one in a
// Scraps pile or on a pile marker; ghosts cross-fade between the
// two on the way.
//
// The set is chosen by how much room there is, which is NOT the
// same question as which arrangement to use: a landscape phone
// keeps the side-by-side arrangement (it is the height-thrifty
// one) but wants the small cards, because 390px of screen height
// is 390px however the bands are ordered.
//
// The opponent's hand gets its own entry because it is the one
// thing on the table that can afford to shrink furthest: it is
// face down, so it carries a count and nothing else, and the row
// it saves is a row the player's own hand gets to keep.
// ─────────────────────────────────────────────────────────────
const SIZES = {
  roomy:   { hand:'normal', oppHand:'normal', pile:'small' },
  compact: { hand:'small',  oppHand:'tiny',   pile:'tiny'  },
};

export function GameScreen({ difficulty, onExit }) {
  // ── Game state machine ─────────────────────────────────────
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const {
    deck, playerHand, aiHand, playerScraps, aiScraps, discard,
    playerScore, aiScore, roundWins, phase, roundNum,
    playerSignal, aiSignal, playerPlayed, aiPlayed, signalLocked,
    pendingTrade, scrapsOverflow, pendingAiAce, gameOver, log, currentTurn,
  } = state;

  // Timers read the freshest state through this ref, so a timeout
  // scheduled seconds ago never acts on a stale snapshot.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── UI-local state (selections, animations, overlays) ──────
  const [selected, setSelected]             = useState([]);
  const [scrapsDiscard, setScrapsDiscard]   = useState([]);
  const [aceMode, setAceMode]               = useState(null); // the Ace being spent, or null
  const [aceTargets, setAceTargets]         = useState([]);
  const [aiAceReveal, setAiAceReveal]       = useState(null); // { ace, targets } — step 2 of the opponent-Ace sequence
  const [aiCounterNotice, setAiCounterNotice] = useState(null); // { playerAce, aiAce } — AI countered the player's Ace
  // Which round's full narrator instruction has been shown, and on
  // which turn. Both, because the full text has to survive the WHOLE
  // of the turn that shows it — keyed on the round alone it retired
  // itself in the same tick it appeared, so the long form flashed and
  // collapsed before anyone could read it.
  const [fullHint, setFullHint] = useState({ round: 0, turn: -1 });
  const [showRules, setShowRules]           = useState(false);
  const [muted, setMuted]                   = useState(isAudioMuted);
  const [confirmQuit, setConfirmQuit]       = useState(false);
  // After the opponent counters and you are STILL holding an Ace, the
  // turn stays live but it is not a normal turn: the only way to carry
  // on is to spend another Ace. Trading is off the table until you
  // either attack again or end the turn.
  const [counterStand, setCounterStand]     = useState(false);
  const [revealData, setRevealData]         = useState(null);
  const [revealBuilding, setRevealBuilding] = useState(false);
  const [showFullScrap, setShowFullScrap]   = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [waveIds, setWaveIds]               = useState(new Set());
  // Cards that belong to a hand but have not been dealt out of the
  // deck yet. RoundInterstitial is a SCRIM, not a cover: it sits at
  // 0.6 alpha on the way in and spends its last 600ms fading to
  // fully transparent, while dealWave does not run until onDone()
  // at 2000ms. So the round's real hands sat face-up and readable
  // through the fade, then vanished and dealt themselves in again.
  // Hidden from the moment the round is built; the motion hook's
  // own hiddenIds takes over the instant the wave launches.
  const [pendingDealIds, setPendingDealIds] = useState(new Set());
  const [aiSignaledIds, setAiSignaledIds]   = useState(new Set());
  // Cards the opponent has just drawn. They are hidden while the
  // transferred cards fly, then fade up in place — see the AI trade
  // step for why they no longer fly in from the deck.
  const [aiFadeInIds, setAiFadeInIds]       = useState(new Set());
  const [scrapsShakeIds, setScrapsShakeIds] = useState(new Set());
  const [scrapsFadeIds, setScrapsFadeIds]   = useState(new Set());
  const [playerScoreFlash, setPlayerScoreFlash] = useState(false);
  const [aiScoreFlash, setAiScoreFlash]         = useState(false);
  const [tradeError, setTradeError]             = useState(null); // over-limit trade message
  const [showLogPanel, setShowLogPanel]         = useState(false); // tap-to-open log history
  const [logEverOpened, setLogEverOpened]       = useState(false); // hides the one-time TAP FOR HISTORY label
  const tradeErrorTimer = useRef(null);

  // First-time-per-game hint: fires once, the first time an Ace
  // lands in the player's hand.
  const [aceDrawnCard, setAceDrawnCard]         = useState(null);
  const aceHintShownRef = useRef(false);
  const [roundEndPulse, setRoundEndPulse]       = useState(false);
  const prevPhaseRef = useRef(phase);

  // Refs for card travel animation zones
  const playerHandRef    = useRef(null);
  const playerScrapsRef  = useRef(null);
  const discardRef       = useRef(null);
  const deckRef          = useRef(null);
  const aiHandRef        = useRef(null);
  const aiScrapsRef      = useRef(null);
  const { registerCard, rectOf, fly, hiddenIds, animating, skipAll, flightsOverlay } = useCardMotion();

  // One set for every consumer, so no card component has to know
  // there are two reasons a card can be invisible.
  const allHiddenIds = useMemo(() => {
    if (!pendingDealIds.size) return hiddenIds;
    const s = new Set(hiddenIds);
    for (const id of pendingDealIds) s.add(id);
    return s;
  }, [hiddenIds, pendingDealIds]);

  // Draws are the one cue that has to be SCHEDULED rather than
  // played on the spot: the cards leave the deck well after the
  // trade commits, one every 120ms, and a peel that fires before
  // its card moves reads as belonging to the trade instead. These
  // timers are tracked so skipping the animation cancels the
  // sounds that have not landed yet — otherwise a skip is followed
  // by peels for cards already sitting in the hand.
  const drawSfx = useRef([]);
  const clearDrawSfx = useCallback(() => {
    drawSfx.current.forEach(clearTimeout);
    drawSfx.current = [];
  }, []);
  const scheduleDraws = useCallback((count, land) => {
    for (let i = 0; i < count; i++) {
      drawSfx.current.push(setTimeout(playDraw, land + i * 120));
    }
  }, []);
  useEffect(() => clearDrawSfx, [clearDrawSfx]);

  // ── Layout ─────────────────────────────────────────────────
  // 'wide'  — hand centred, that side's Scraps beside it.
  // 'stack' — hand above its own Scraps, both full width.
  // The mode is chosen on whichever axis is scarce, not on device
  // class; see src/ui/viewport.jsx. Everything that has to know a
  // pixel size — card sizes, fan spread, zone widths, bar chrome —
  // is derived from it here rather than guessed at in a media query.
  const vp = useViewport();
  const mode = layoutMode(vp);
  // `stack` is about ARRANGEMENT, `tight` about SIZE. They agree on a
  // phone and disagree at both ends of the range: a landscape phone
  // gets the wide arrangement AND the small cards, and a portrait
  // tablet gets the stacked arrangement AND the big ones, because
  // 768 x 1024 has room for full-size cards and looked half empty
  // without them.
  const stack = mode === 'stack';
  const tight = vp.w < 700 || vp.h <= SHORT_MAX_H;
  const SZ = SIZES[tight ? 'compact' : 'roomy'];
  // The width the table is actually laid out at. FitBox lays its
  // children out at max(available, mode minimum) and scales the
  // result, so anything that needs a number rather than a
  // percentage — the Scraps overlap maths, the fan's spread — has
  // to use the same figure FitBox will.
  const layoutW = Math.max(vp.w, MODE_MIN_W[mode]);
  const railW = layoutW - 20;
  // Timers and flight builders run long after the render that made
  // them, and a rotation can land between the two. They read sizes
  // through a ref for the same reason every other delayed action in
  // this file reads state through one.
  const szRef = useRef(SZ);
  szRef.current = SZ;

  // ── Round setup ────────────────────────────────────────────
  const startNewRound = useCallback((alternate) => {
    const deal = buildRoundDeal();
    dispatch({ type: 'START_ROUND', deal, alternate });
    // The fresh hands sit behind the BEGIN ROUND interstitial
    // until dealWave flies them out of the deck.
    setSelected([]); setScrapsDiscard([]);
    setAceMode(null); setAceTargets([]);
    setAiAceReveal(null); setAiCounterNotice(null);
    setRevealData(null); setAiSignaledIds(new Set());
    setScrapsShakeIds(new Set()); setScrapsFadeIds(new Set());
    setWaveIds(new Set());
    setPendingDealIds(new Set([...deal.playerHand, ...deal.aiHand].map(c => c.id)));
    setShowInterstitial(true);
  }, []);

  useEffect(() => { startNewRound(false); }, []);

  // ── Dealing wave ───────────────────────────────────────────
  // START_ROUND already put every card in its hand, so there is
  // nothing to predict: each card flies from the deck to the slot
  // it is ALREADY occupying (hidden until its ghost lands). The
  // stagger is a per-card delay inside one batch, so `animating`
  // stays true across the whole deal rather than flickering off
  // between cards and letting the next turn start early.
  function dealWave(playerCards, aiCards) {
    const deckEl = deckRef.current;
    // No deck to fly from: unhide rather than strand the hand
    // invisible, which is the one way this could break the game
    // rather than just the animation.
    if (!deckEl) { setPendingDealIds(new Set()); return; }
    const deckRect = deckEl.getBoundingClientRect();
    const STEP = 90;
    const pSorted = [...playerCards].sort((a, b) => a.value - b.value);
    const moves = [];
    pSorted.forEach((card, i) => moves.push({
      card, fromRect: deckRect, toId: card.id,
      fromSize: szRef.current.pile, toSize: szRef.current.hand,
      arc: ((i % 3) - 1) * 0.5, delay: i * STEP,
    }));
    aiCards.forEach((card, i) => moves.push({
      card: null, faceDown: true, fromRect: deckRect, toId: card.id,
      fromSize: szRef.current.pile, toSize: szRef.current.oppHand,
      arc: ((i % 3) - 1) * 0.5, delay: (pSorted.length + i) * STEP,
    }));
    fly(moves);
    // Batched with fly()'s own update: the motion hook builds its
    // flights in a LAYOUT effect, so the handoff lands before paint
    // and there is no frame where the cards are visible in place.
    setPendingDealIds(new Set());
  }

  function onInterstitialDone() {
    setShowInterstitial(false);
    dispatch({ type: 'INTERSTITIAL_DONE' });
    const s = stateRef.current;
    dealWave(s.playerHand, s.aiHand);
  }

  // ── Score flash + fanfare on score increases ───────────────
  const prevScores = useRef({ p: 0, a: 0 });
  useEffect(() => {
    if (playerScore > prevScores.current.p) {
      setPlayerScoreFlash(true);
      setTimeout(() => setPlayerScoreFlash(false), 600);
      // Deliberately silent. The outcome cue already fired when the
      // reveal appeared; this is the same event's score landing a
      // couple of seconds later, and sounding it again gave every
      // hand two celebrations. The flash above carries this beat.
    }
    if (aiScore > prevScores.current.a) {
      setAiScoreFlash(true);
      setTimeout(() => setAiScoreFlash(false), 600);
    }
    prevScores.current = { p: playerScore, a: aiScore };
  }, [playerScore, aiScore]);

  // ── Persistent stats (item 10) ─────────────────────────────
  // On game over, record the result once. The win screen shows
  // the margin and best-ever margin.
  const recordedRef = useRef(false);
  const [winStats, setWinStats] = useState(null);
  useEffect(() => {
    if (!gameOver || recordedRef.current) return;
    recordedRef.current = true;
    const won = gameOver === 'player';
    const margin = Math.abs(playerScore - aiScore);
    const res = recordGame(difficulty, won, won ? margin : 0);
    if (won) setWinStats({ margin, bestMargin: res.bestMargin, isNewRecord: res.isNewRecord });
  }, [gameOver]);

  // ── Card selection ─────────────────────────────────────────
  function toggleHandCard(card) {
    playSelect();
    setSelected(prev => prev.find(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]);
  }
  function toggleScrapsDiscardCard(card) {
    if (!card.eligibleForDiscard) return;
    playSelect();
    setScrapsDiscard(prev => prev.find(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]);
  }

  // ── Player trade ───────────────────────────────────────────
  function doTradeIn() {
    if (selected.length === 0) return;
    const sel = selected.filter(c => playerHand.find(h => h.id === c.id));
    if (sel.length === 0) return;
    const drawCount = sel.reduce((s, c) => s + tradeInValue(c), 0);
    const netHand = (playerHand.length - sel.length) + drawCount;
    const newScrapsCount = playerScraps.length + sel.length;
    if (netHand > 7) {
      // Over-limit trade: error sound + bouncing copy in the action
      // zone (re-setting the state restarts the bounce on repeat
      // attempts).
      playInvalid();
      setTradeError(null);
      requestAnimationFrame(() =>
        setTradeError(`These ${sel.length} card${sel.length > 1 ? 's' : ''} draw ${drawCount}. Your hand would be ${netHand}/7.`));
      clearTimeout(tradeErrorTimer.current);
      tradeErrorTimer.current = setTimeout(() => setTradeError(null), 2600);
      return;
    }
    if (newScrapsCount > 7) {
      const excess = newScrapsCount - 7;
      setScrapsDiscard([]);
      dispatch({ type: 'PLAYER_TRADE_OVERFLOW_START', cards: [...sel], drawCount, excess });
      return;
    }
    executeTrade(sel, drawCount);
  }

  function executeTrade(tradeCards, drawCount) {
    // FIRST: the real box of each card, right now, in the fan —
    // rotation, selection lift and all. Must be read BEFORE the
    // dispatch, because after it these cards live in the Scraps
    // pile and rectOf would return the destination instead.
    const first = tradeCards.map(c => ({ card: c, rect: rectOf(c.id) }));
    const deckEl = deckRef.current;
    const deckRect = deckEl ? deckEl.getBoundingClientRect() : null;
    const drawn = stateRef.current.deck.slice(0, drawCount);

    setSelected([]);
    clearTimeout(tradeErrorTimer.current);
    setTradeError(null);
    playTransfer();

    // COMMIT: one batched render. TAKE stages the move, the two
    // ARRIVE actions land it — React runs all three through the
    // reducer before re-rendering, so the board reaches its final
    // state in a single paint and the animation is pure decoration
    // over it. That is what makes skipping safe at any moment.
    dispatch({ type: 'PLAYER_TRADE_TAKE', cards: tradeCards });
    dispatch({ type: 'PLAYER_SCRAPS_ARRIVE' });
    drawn.forEach(c => dispatch({ type: 'PLAYER_DRAW_ARRIVE', cardId: c.id }));

    // LAST + PLAY: destinations are measured in the motion hook's
    // layout effect, after the DOM above has been written.
    const STEP = 90;
    const LAND = (tradeCards.length - 1) * STEP + 320;
    const moves = first
      .filter(f => f.rect)
      .map((f, i) => ({
        card: f.card, fromRect: f.rect, toId: f.card.id,
        fromSize: szRef.current.hand, toSize: szRef.current.pile, toScrap: true,
        arc: first.length === 1 ? 0.35 : (i / (first.length - 1) - 0.5) * 1.2,
        delay: i * STEP,
      }));
    if (deckRect) {
      drawn.forEach((card, i) => moves.push({
        card, fromRect: deckRect, toId: card.id,
        fromSize: szRef.current.pile, toSize: szRef.current.hand,
        arc: ((i % 3) - 1) * 0.5, delay: LAND + i * 120,
      }));
      scheduleDraws(drawn.length, LAND);
    }
    fly(moves);
  }

  function confirmScrapsDiscard() {
    if (!pendingTrade || scrapsDiscard.length !== scrapsOverflow) return;
    const discardEl = discardRef.current;
    const discardRect = discardEl ? discardEl.getBoundingClientRect() : null;
    const tradeCards = pendingTrade.cards;
    const drawn = stateRef.current.deck.slice(0, pendingTrade.drawCount);

    // FIRST for both halves of this move: the cards leaving Scraps
    // for the discard, and the cards leaving the hand for Scraps.
    const leaving = scrapsDiscard.map(c => ({ card: c, rect: rectOf(c.id) }));
    const entering = tradeCards.map(c => ({ card: c, rect: rectOf(c.id) }));
    const deckEl = deckRef.current;
    const deckRect = deckEl ? deckEl.getBoundingClientRect() : null;

    dispatch({ type: 'PLAYER_TRADE_WITH_DISCARD', discardCards: [...scrapsDiscard] });
    setScrapsDiscard([]); setSelected([]);
    playTransfer();

    const moves = [];
    if (discardRect) {
      leaving.filter(f => f.rect).forEach((f, i) => moves.push({
        card: f.card, fromRect: f.rect, toRect: discardRect,
        fromSize: szRef.current.pile, toSize: szRef.current.pile, fromScrap: true, toScrap: true,
        arc: i === 0 ? -0.5 : 0.5,
      }));
    }
    entering.filter(f => f.rect).forEach((f, i) => moves.push({
      card: f.card, fromRect: f.rect, toId: f.card.id,
      fromSize: szRef.current.hand, toSize: szRef.current.pile, toScrap: true,
      arc: 0.35, delay: 160 + i * 90,
    }));
    const LAND = 160 + Math.max(0, entering.length - 1) * 90 + 320;
    if (deckRect) {
      drawn.forEach((card, i) => moves.push({
        card, fromRect: deckRect, toId: card.id,
        fromSize: szRef.current.pile, toSize: szRef.current.hand,
        arc: ((i % 3) - 1) * 0.5, delay: LAND + i * 120,
      }));
      scheduleDraws(drawn.length, LAND);
    }
    fly(moves);
  }

  function cancelScrapsDiscard() {
    dispatch({ type: 'PLAYER_TRADE_CANCEL' });
    setScrapsDiscard([]); setSelected([]);
  }

  // ── Player Ace ─────────────────────────────────────────────
  function doPlayAce(ace) {
    if (aiScraps.length < 2) { dispatch({ type: 'LOG', msg: 'Opponent needs at least 2 Scraps cards to target.' }); return; }
    setAceMode(ace); setAceTargets([]); setSelected([]);
    dispatch({ type: 'LOG', msg: "Select 2 cards from opponent's Scraps to remove." });
  }
  function toggleAceTarget(card) {
    playSelect();
    setAceTargets(prev => prev.find(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : prev.length < 2 ? [...prev, card] : prev);
  }

  function confirmAce() {
    if (aceTargets.length !== 2) return;
    // The Ace the player actually tagged, not just the first one in
    // hand — the control is attached to a specific card now.
    const ace = (aceMode && playerHand.find(c => c.id === aceMode.id))
      || playerHand.find(c => c.rank === 'A');
    if (!ace) return;

    // The AI may counter, deciding from the board: how strong the pile
    // being defended is, how strong yours is, and the score.
    //
    // This call used to pass `(difficulty, s.aiHand, s.aiCountersThisRound)`
    // against a signature of `(aiScraps, opponentScraps, aiScore,
    // opponentScore)` — a difficulty STRING where a card array belongs,
    // the AI's hand where its Scraps belonged, and a field that existed
    // nowhere in state. `'hard'.length` is 4, so the `< 2` guard never
    // tripped and scrapsStrength walked the characters of the word into
    // a bogus hand. The result was constant per difficulty and blind to
    // the table: easy true, hard true, i.e. always countered.
    const s = stateRef.current;
    if (shouldCounterAce(s.aiScraps, s.playerScraps, s.aiScore, s.playerScore)) {
      const aiAce = s.aiHand.find(c => c.rank === 'A');
      if (aiAce) {
        setAceMode(null); setAceTargets([]); setSelected([]);
        playAceCounter();
        const stillArmed = s.playerHand.filter(c => c.rank === 'A' && c.id !== ace.id).length > 0;
        dispatch({ type: 'AI_COUNTER_ACE', playerAceId: ace.id, aiAceId: aiAce.id });
        setAiCounterNotice({ playerAce: ace, aiAce, stillArmed });
        setCounterStand(stillArmed);
        return;
      }
    }

    const targets = [...aceTargets];
    // Shake the struck cards where they sit, then send them to the
    // discard from their real positions in the opponent's pile.
    // The strike lands with the SHAKE, not with the cards leaving
    // 520ms later — the shake is the visual of this sound, and the
    // crush is 360ms so it finishes inside it.
    playAceStrike();
    setCounterStand(false);
    setScrapsShakeIds(new Set(targets.map(c => c.id)));
    setTimeout(() => {
      const first = targets.map(c => ({ card: c, rect: rectOf(c.id) }));
      const aceRect = rectOf(ace.id);
      const discardEl = discardRef.current;
      const discardRect = discardEl ? discardEl.getBoundingClientRect() : null;
      setAceMode(null); setAceTargets([]); setSelected([]);
      setScrapsShakeIds(new Set());
      dispatch({ type: 'PLAYER_ACE_APPLY', aceId: ace.id, targetIds: targets.map(c => c.id) });
      if (discardRect) {
        const moves = first.filter(f => f.rect).map((f, i) => ({
          card: f.card, fromRect: f.rect, toRect: discardRect,
          fromSize: szRef.current.pile, toSize: szRef.current.pile, fromScrap: true, toScrap: true,
          arc: i === 0 ? -0.5 : 0.5, delay: i * 90,
        }));
        // The spent Ace goes to the discard too, so the cost of the
        // strike is visible rather than silent.
        if (aceRect) moves.push({ card: ace, fromRect: aceRect, toRect: discardRect,
          fromSize: szRef.current.hand, toSize: szRef.current.pile, arc: 0.4 });
        fly(moves);
      }
    }, 520);
  }

  // ── Opponent-Ace feedback sequence ─────────────────────────
  // Step 1 (only if the player holds an Ace): the counter modal
  //   appears FIRST. The targeted cards are NOT shown — the
  //   counter decision is blind.
  // Step 2 (player allows, or holds no Ace): the copy "OPPONENT
  //   plays an Ace and removes two cards from your Scraps" is
  //   shown with the two targeted cards in the center of the
  //   table. The player clicks OK.
  // Step 3: the two cards animate from the center to the discard
  //   pile, then play resumes. No silent removals ever.
  function handleAiAce(aiAce, targetCards) {
    const s = stateRef.current;
    const playerHasAceNow = s.playerHand.some(c => c.rank === 'A');
    if (playerHasAceNow && s.playerScraps.length >= 2) {
      // Step 1: pause and ask the player — targets stay hidden
      dispatch({ type: 'AI_ACE_PENDING', ace: aiAce, targets: targetCards });
    } else {
      // No Ace to counter with — skip straight to Step 2
      openAiAceReveal(aiAce, targetCards);
    }
  }

  function openAiAceReveal(aiAce, targets) {
    // Dim the targeted cards in the Scraps pile while their copies
    // are shown center-table
    setScrapsFadeIds(new Set(targets.map(c => c.id)));
    setAiAceReveal({ ace: aiAce, targets });
    dispatch({ type: 'LOG', msg: 'Opponent plays an Ace and removes two cards from your Scraps.' });
  }

  function onPlayerCounterAce() {
    if (!pendingAiAce) return;
    playAceCounter();
    dispatch({ type: 'PLAYER_COUNTER_ACE' });
    // Player's turn is NOT consumed — they still need to trade or act.
    //
    // RE-COUNTER, the mirror of the rule on the player's side: being
    // countered does not end an attacker's option if they are still
    // holding an Ace. If the opponent has another and your Scraps is
    // still a legal target, it comes straight back with it, and you may
    // counter that one too. Scheduled rather than dispatched inline so
    // the cancelled Aces are visibly gone before the next one lands.
    const s = stateRef.current;
    const spent = pendingAiAce.ace.id;
    const nextAce = s.aiHand.find(c => c.rank === 'A' && c.id !== spent);
    if (nextAce && s.playerScraps.length >= 2) {
      setTimeout(() => {
        const cur = stateRef.current;
        if (cur.gameOver || cur.pendingAiAce) return;
        if (!cur.aiHand.some(c => c.id === nextAce.id)) return;
        if (cur.playerScraps.length < 2) return;
        const targets = chooseAceTargets(cur.playerScraps);
        if (!targets || targets.length < 2) return;
        playAceStrike();
        dispatch({ type: 'AI_ACE_PENDING', ace: nextAce, targets });
      }, 900);
    }
  }

  function onPlayerAllowAce() {
    if (!pendingAiAce) return;
    // Step 2: reveal the targeted cards. pendingAiAce stays set
    // (AI_ACE_APPLY clears it) but the counter modal hides while
    // the reveal is up.
    openAiAceReveal(pendingAiAce.ace, pendingAiAce.targets);
  }

  // Step 3: OK clicked — fly the two cards from the center of the
  // table to the discard pile and apply the removal.
  function onAiAceRevealOk() {
    if (!aiAceReveal) return;
    const { ace: aiAce, targets } = aiAceReveal;
    // The cards travel from where they actually sit in YOUR Scraps
    // pile, not from the middle of the screen where the reveal
    // overlay happened to show copies of them.
    const first = targets.map(c => ({ card: c, rect: rectOf(c.id) }));
    const discardEl = discardRef.current;
    const discardRect = discardEl ? discardEl.getBoundingClientRect() : null;
    setAiAceReveal(null);
    setScrapsFadeIds(new Set());
    playAceStrike();
    dispatch({ type: 'AI_ACE_APPLY', aceId: aiAce.id, targetIds: targets.map(c => c.id),
      logMsg: `Opponent's Ace removed ${targets.map(c => c.rank + c.suit).join(', ')} from your Scraps.` });
    if (discardRect) {
      fly(first.filter(f => f.rect).map((f, i) => ({
        card: f.card, fromRect: f.rect, toRect: discardRect,
        fromSize: szRef.current.pile, toSize: szRef.current.pile, fromScrap: true, toScrap: true,
        arc: i === 0 ? -0.5 : 0.5, delay: i * 90,
      })));
    }
  }

  // ── AI turn ────────────────────────────────────────────────
  // Two effects, deliberately. The GATE watches for the board to
  // go still and then clears the AI to act; the RUNNER does the
  // acting. They are split because the runner's cleanup clears its
  // own timers, and the AI's own cards set `animating` while they
  // fly — one combined effect would re-run mid-turn and cancel the
  // opponent's move halfway through.
  //
  // `aiGo` is set once per AI phase and never changes while the AI
  // is acting, so the runner starts exactly once. This is what
  // keeps the opponent from moving over the top of your own cards.
  const [aiGo, setAiGo] = useState(null);
  useEffect(() => {
    if (!AI_TURN_PHASES.includes(phase)) { setAiGo(null); return; }
    if (animating) return;            // your cards are still landing
    if (aiCounterNotice) return;      // you are still reading the counter
    if (aceDrawnCard) return;         // the Ace explainer is up; nothing moves
    setAiGo(phase);
  }, [phase, animating, aiCounterNotice, aceDrawnCard]);

  useEffect(() => {
    if (!aiGo || aiGo !== phase) return;
    const timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));

    const FLIGHT_SETTLE = 120;   // the board is already still here
    // ONE ruffle, not a wave. The old gesture lifted every card 22px
    // in sequence over 800ms, which read as the opponent's cards
    // jumping around on their own rather than as somebody thinking.
    // A ruffle is one quick pass across the hand — a small lift and
    // lean, tightly staggered, done once — the way a real hand gets
    // riffled while its owner decides. It resolves before the transfer
    // animation starts, so the two never overlap.
    const RUFFLE_MS = 340;       // one card's pass
    const RUFFLE_STAGGER = 38;   // card-to-card offset across the fan

    // Step 1: the opponent ruffles their hand once, after your cards land
    T(() => {
      const cards = [...stateRef.current.aiHand];
      cards.forEach((card, i) => {
        T(() => {
          setWaveIds(prev => { const n = new Set(prev); n.add(card.id); return n; });
          T(() => setWaveIds(prev => { const n = new Set(prev); n.delete(card.id); return n; }), RUFFLE_MS);
        }, i * RUFFLE_STAGGER);
      });
    }, FLIGHT_SETTLE);

    // Step 2: the AI acts
    T(() => {
      const s = stateRef.current;
      if (s.phase !== phase || s.gameOver) return;

      const action = aiDecide(s.aiHand, s.aiScraps, s.playerScraps, s.deck, difficulty, phase, s.aiScore, s.playerScore);

      if (action.type === 'trade' && action.cards.length > 0) {
        // Animate AI selection: lift cards, then fly to scraps
        setAiSignaledIds(new Set(action.cards.map(c => c.id)));
        T(() => {
          // Same FLIP shape as the player's trade: measure the lifted
          // cards where they sit, commit, then animate the delta.
          const first = action.cards.map(c => ({ card: c, rect: rectOf(c.id) }));
          const deckEl = deckRef.current;
          const deckRect = deckEl ? deckEl.getBoundingClientRect() : null;
          const drawCount = action.cards.reduce((sum, c) => sum + tradeInValue(c), 0);
          const drawn = stateRef.current.deck.slice(0, drawCount);
          setAiSignaledIds(new Set());
          dispatch({ type: 'AI_TRADE_APPLY', cards: action.cards });
          const STEP = 90;
          const moves = first.filter(f => f.rect).map((f, i) => ({
            card: f.card, faceDown: true, fromRect: f.rect, toId: f.card.id,
            fromSize: szRef.current.oppHand, toSize: szRef.current.pile, toScrap: true,
            arc: first.length === 1 ? 0.35 : (i / (first.length - 1) - 0.5) * 1.2,
            delay: i * STEP,
          }));
          // ONLY the transferred cards fly. The replacement draws used
          // to fly face-down from the deck as well, so that the
          // opponent's intake stayed visible — but the motion system
          // hides a card while it is in flight, and the new cards are
          // already in `aiHand` the moment the trade commits. So on a
          // three or four card trade most of the opponent's hand went
          // invisible at once and the fan looked like it had emptied
          // itself, which is what read as "the cards jump around".
          //
          // The intake is still visible; it simply arrives rather than
          // travels. The drawn cards are hidden from the commit, then
          // fade up in place once the transferred cards have landed.
          const LAND = Math.max(0, first.length - 1) * STEP + 320;
          const drawnIds = drawn.map(c => c.id);
          if (drawnIds.length) {
            setPendingDealIds(prev => { const n = new Set(prev); drawnIds.forEach(id => n.add(id)); return n; });
            T(() => {
              setPendingDealIds(prev => { const n = new Set(prev); drawnIds.forEach(id => n.delete(id)); return n; });
              setAiFadeInIds(new Set(drawnIds));
              T(() => setAiFadeInIds(new Set()), 620);
            }, LAND);
            scheduleDraws(drawnIds.length, LAND);
          }
          fly(moves);
        }, 700);
      } else if (action.type === 'ace') {
        const ace = s.aiHand.find(c => c.rank === 'A');
        if (ace && action.targetCards.length >= 2) {
          T(() => handleAiAce(ace, action.targetCards.slice(0, 2)), 300);
        }
      } else if (action.type === 'skip') {
        // No legal move — the AI's trade is skipped (same rule the
        // player is bound by)
        dispatch({ type: 'AI_SKIP' });
      }

      T(() => {
        dispatch({ type: 'ADVANCE_FROM', phase });
      }, 2100);
    }, 800);

    return () => timers.forEach(clearTimeout);
  }, [aiGo]);

  // ── AI signals first (even rounds) ─────────────────────────
  // The player sees "Opponent signals N cards" before selecting.
  useEffect(() => {
    if (!AI_SIGNAL_PHASES.includes(phase)) return;
    const timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));
    T(() => {
      const s = stateRef.current;
      if (s.phase !== phase || s.gameOver) return;
      const aiSig = aiChooseSignal(s.aiHand, null, difficulty, s.aiScore, s.playerScore);
      const aiCards = getBestCardsForSignal(s.aiHand, aiSig) || [];
      setAiSignaledIds(new Set(aiCards.map(c => c.id)));
      T(() => dispatch({ type: 'AI_FIRST_SIGNAL', signal: aiSig, cards: aiCards }), 1000);
    }, 700);
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // ── Player signal ──────────────────────────────────────────
  function doSignal() {
    const cur = selected.filter(c => playerHand.find(h => h.id === c.id));
    if (!isValidSignal(cur)) return;
    const sig = cur.length;
    dispatch({ type: 'PLAYER_SIGNAL', cards: [...cur] });
    if (aiSignal != null) {
      // AI already signaled first — both signals are in
      setTimeout(() => {
        dispatch({ type: 'GO_REVEAL' });
      }, 700);
    } else {
      // Player signaled first — the AI responds after seeing it
      setTimeout(() => {
        const s = stateRef.current;
        const aiSig = aiChooseSignal(s.aiHand, sig, difficulty, s.aiScore, s.playerScore);
        const aiCards = getBestCardsForSignal(s.aiHand, aiSig) || [];
        setAiSignaledIds(new Set(aiCards.map(c => c.id)));
        // Keep aiSignaledIds set — cards stay toggled until reveal
        setTimeout(() => {
          dispatch({ type: 'AI_RESPOND_SIGNAL', signal: aiSig, cards: aiCards, playerSig: sig });
        }, 1000);
      }, 700);
    }
  }

  // ── Reveals + scoring ──────────────────────────────────────
  function resolveSmallHand() {
    if (!playerPlayed || !aiPlayed) return;
    const pH = evaluateBestHand(playerPlayed);
    const aH = evaluateBestHand(aiPlayed);
    const res = pH && aH ? compareHands(pH, aH) : 0;
    let winner = 'tie', pts = 0;
    if (res > 0) { winner = 'player'; pts = 1; }
    else if (res < 0) { winner = 'ai'; pts = 1; }
    if (winner === 'player') playHandWon();
    else if (winner === 'ai') playHandLost();
    const curPhase = phase;
    setRevealData({
      playerCards: [...playerPlayed], aiCards: [...aiPlayed],
      playerHandName: pH?.name || '', aiHandName: aH?.name || '',
      winner, points: pts,
      onContinue: () => {
        setRevealData(null);
        setSelected([]);
        setAiSignaledIds(new Set()); // clear toggled AI cards after reveal
        dispatch({ type: 'SMALL_HAND_SCORED', winner, pts,
          pName: pH?.name || '', aName: aH?.name || '', fromPhase: curPhase });
      },
    });
  }

  function doReplenish() {
    setSelected([]);
    // Work out which cards the REPLENISH action is about to draw
    // (same deck slice the reducer takes) so only the NEW cards
    // ripple in — the held-over cards stay put.
    const s = stateRef.current;
    const pN = Math.max(0, 5 - s.playerHand.length);
    const aN = Math.max(0, 5 - s.aiHand.length);
    const drawn = s.deck.slice(0, pN + aN);
    dispatch({ type: 'REPLENISH' });
    dealWave(drawn.slice(0, pN), drawn.slice(pN, pN + aN));
  }

  function resolveScrap() {
    // Always resolves now, including when a pile is empty: an empty
    // pile is a hand that loses to anything, and the other player takes
    // the 2 points. This used to bail out on a null and leave the game
    // stranded in `scraps-reveal` with no way forward.
    const out = scoreScrapsOutcome(playerScraps, aiScraps, roundWins);
    const { pPts, aPts, winner, fullScrap, aiSweep, pB, aB } = out;
    if (winner === 'player') playRoundWon();
    else if (winner === 'ai') playRoundLost();
    const pBestIds = new Set(getActiveHandCards(pB).map(c => c.id));
    const aBestIds = new Set(getActiveHandCards(aB).map(c => c.id));
    setRevealData({
      playerCards: [...playerScraps].slice(0, 7), aiCards: [...aiScraps].slice(0, 7),
      playerHandName: pB.name, aiHandName: aB.name + (aiSweep ? ' · SWEEP' : ''),
      winner, points: winner === 'player' ? pPts : winner === 'ai' ? aPts : 0,
      bonusLine: fullScrap ? 'INCLUDES +1 FULL SCRAP BONUS' : null,
      playerBestIds: pBestIds, aiBestIds: aBestIds,
      onContinue: () => {
        setRevealData(null);
        dispatch({ type: 'SCRAPS_SCORED', pPts, aPts, winner, fullScrap, aiSweep, pName: pB.name });
        if (fullScrap) {
          setShowFullScrap(true);
          playFullScrap();
        }
      },
    });
  }

  // ── Derived flags ──────────────────────────────────────────
  const isPlayerTurn = ['player-turn-1a','player-turn-1b','player-turn-2a','player-turn-2b'].includes(phase);
  const isSignal = phase === 'signal-player' || phase === 'signal-player-2';
  const isAiSignaling = AI_SIGNAL_PHASES.includes(phase);
  const isReveal = phase === 'reveal-1' || phase === 'reveal-2';
  // The phase flips to the opponent the moment your trade commits,
  // but your cards are still in the air. `settling` covers that
  // gap: the opponent is gated from acting (see the aiGo gate) and
  // the table keeps reading as YOUR turn — your hand stays lit,
  // theirs stays quiet, and the narrator does not hand over early.
  const settling = animating && (AI_TURN_PHASES.includes(phase) || isAiSignaling);
  const isAiThinking = !settling && (AI_TURN_PHASES.includes(phase) || isAiSignaling);
  const isScrapsDiscardMode = pendingTrade !== null;
  const selectedInHand = selected.filter(c => playerHand.find(h => h.id === c.id));
  const selIds = new Set(selectedInHand.map(c => c.id));
  const aceTargetIds = new Set(aceTargets.map(c => c.id));
  const scrapsDiscardIds = new Set(scrapsDiscard.map(c => c.id));
  const selValid = isSignal && !signalLocked && isValidSignal(selectedInHand);
  const playerHasAce = playerHand.some(c => c.rank === 'A');
  // Live trade projection. Computed here rather than inside
  // doTradeIn so the button can state the outcome BEFORE the
  // click instead of the error firing after it.
  const tradeDraw = selectedInHand.reduce((n, c) => n + tradeInValue(c), 0);
  const tradeNetHand = (playerHand.length - selectedInHand.length) + tradeDraw;
  const tradeOverLimit = selectedInHand.length > 0 && tradeNetHand > 7;
  const glowHand = (isPlayerTurn && !aceMode && !isScrapsDiscardMode) || (isSignal && !signalLocked);
  // The Play Ace control is rendered by FannedHand, inside the same
  // wrapper as its card, so the two lean together.
  // ATTACK waits for its own card. The tag used to mount the instant
  // an Ace entered state — which is BEFORE the card has flown into the
  // fan — so the button hung in the air over an empty slot and the Ace
  // arrived underneath it afterwards. It now waits for the flight to
  // land (`!animating`) and for the Ace explainer to be dismissed, and
  // then fades and lifts into place over ~260ms rather than snapping in.
  const canOfferAce = isPlayerTurn && !aceMode && !isScrapsDiscardMode
    && !pendingAiAce && !animating && !aceDrawnCard;
  const aceSlot = useCallback((card, width) => {
    if (!canOfferAce || card.rank !== 'A') return null;
    return (
      <div style={{animation:'aceTagIn 0.26s cubic-bezier(.22,1,.36,1) both'}}>
        <AceTag onClick={() => doPlayAce(card)} disabled={aiScraps.length < 2}
          width={width}/>
      </div>
    );
  }, [canOfferAce, aiScraps.length]);
  const glowPlayerScraps = isScrapsDiscardMode;
  const glowOppScraps = aceMode;

  // No-legal-trade handling: if no trade can keep the hand at 7 or
  // fewer, the only legal move is an Ace (when the opponent's
  // Scraps has 2+ cards) — otherwise the turn is skipped.
  const noLegalTrade = isPlayerTurn && playerHand.length > 0 && !hasLegalTrade(playerHand)
    && !isScrapsDiscardMode && !aceMode;
  const forcedAce = noLegalTrade && playerHasAce && aiScraps.length >= 2;
  const mustSkip  = noLegalTrade && !forcedAce && !pendingAiAce;

  // Retire the full narrator instruction after the player turn that
  // showed it. Effect rather than render-time mutation, so the render
  // that displays the long form stays pure.
  useEffect(() => {
    if (!isPlayerTurn || aceMode || isScrapsDiscardMode || settling) return;
    if (fullHint.round === roundNum) return;
    setFullHint({ round: roundNum, turn: currentTurn });
  }, [isPlayerTurn, aceMode, isScrapsDiscardMode, settling, roundNum, currentTurn, fullHint.round]);

  // ── First-time-per-game hint (regular play only) ────────────
  useEffect(() => {
    if (aceHintShownRef.current) return;
    if (showInterstitial || pendingAiAce || aiAceReveal || aceMode) return;
    // Wait for the cards to finish flying in. The box used to open the
    // moment an Ace entered state, which is BEFORE the draw animation
    // runs — so it covered the table while your own cards were still
    // in the air behind it.
    if (animating) return;
    if (playerHasAce) {
      aceHintShownRef.current = true;
      setAceDrawnCard(playerHand.find(c => c.rank === 'A'));
    }
  }, [playerHasAce, showInterstitial, pendingAiAce, aiAceReveal, aceMode, animating]);

  // ── Skip the animation ─────────────────────────────────────
  // A click anywhere, Enter, or Space lands every in-flight card
  // at once. Safe by construction: the state commit already
  // happened, so skipping only drops the ghosts and unhides the
  // real cards, which are already sitting in their final places.
  useEffect(() => {
    if (!animating) return;
    const onSkip = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      clearDrawSfx();
      skipAll();
    };
    window.addEventListener('mousedown', onSkip);
    window.addEventListener('keydown', onSkip);
    return () => {
      window.removeEventListener('mousedown', onSkip);
      window.removeEventListener('keydown', onSkip);
    };
  }, [animating, skipAll, clearDrawSfx]);

  useEffect(() => {
    if (phase === 'round-end' && prevPhaseRef.current !== 'round-end') {
      setRoundEndPulse(true);
      setTimeout(() => setRoundEndPulse(false), 1500);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  let hint = '';
  // Set when the narrator is running its collapsed form. It changes the
  // WORDS only — the type size is fixed, because a narrator that also
  // resized made the panel jump between turns.
  let hintShort = false;
  // Settling keeps its own branch with an empty string on purpose:
  // dropping the branch entirely would let the next condition fill the
  // hint line while cards are still mid-flight. Silent, not absent.
  if (settling) hint = '';
  else if (aiAceReveal) hint = "Opponent's Ace removes two cards from your Scraps.";
  else if (pendingAiAce) hint = 'Opponent played an Ace. Counter or let it happen?';
  else if (isScrapsDiscardMode) {
    const moving = pendingTrade ? pendingTrade.cards.length : 0;
    const lockedInScraps = playerScraps.some(c => !c.eligibleForDiscard);
    hint = `Trading ${moving} card${moving > 1 ? 's' : ''} would put your Scraps at ${playerScraps.length + moving}/7. `
      + `Select ${scrapsOverflow} to discard, then hit DISCARD.`
      + (lockedInScraps ? ' Dimmed cards were placed this turn and cannot go.' : '');
  }
  else if (aceMode) hint = `Select 2 cards from opponent's Scraps to remove. (${aceTargets.length}/2 selected)`;
  else if (forcedAce) hint = 'Every card in your hand draws more than you have room for. Your only legal move is to play an Ace.';
  else if (isPlayerTurn) {
    // The instruction runs in FULL on the first player turn of a round
    // and collapses to a short reminder for the rest of it.
    //
    // It used to restate all three sentences on every player turn, all
    // match, at 25px — which made a block of tutorial prose the largest
    // and brightest object on the table, permanently, sitting in the
    // middle of the surface where the game wants room. Session 5 cut
    // the score numerals 60 → 44 for exactly this reason and never came
    // back for the narrator. A first-timer needs the full sentence; by
    // the fourth trade of a round nobody is reading it.
    // Full text on the first player turn of ROUND 1 only. By round 2 a
    // player has taken four trade turns and does not need the sentence
    // again; the short form carries from there on.
    if (roundNum === 1 && (fullHint.round !== roundNum || fullHint.turn === currentTurn)) {
      const base = 'Select cards to transfer from your small hand to your Scraps. Both are limited to seven cards.';
      if (playerHasAce && aiScraps.length >= 2) hint = base + ' Or strike with the Ace in your hand.';
      else if (playerHasAce) hint = base + " Your Ace can't strike yet: their Scraps needs 2 cards.";
      else hint = base;
    } else {
      hintShort = true;
      if (playerHasAce && aiScraps.length >= 2) hint = 'Your turn. Transfer cards, or strike with your Ace.';
      else hint = 'Your turn. Transfer cards to your Scraps.';
    }
  }
  else if (isAiSignaling) hint = 'Opponent is choosing their signal...';
  else if (isSignal && !signalLocked && aiSignal != null) hint = `Opponent signals that their hand contains ${aiSignal} card${aiSignal > 1 ? 's' : ''}. Pick your own hand, then hit SIGNAL.`;
  else if (isSignal && !signalLocked) hint =
    'Pick any valid hand. Your opponent sees how many cards you will play, '
    + 'which tells them what you might have.';
  else if (isSignal && signalLocked) hint = 'Signal locked. Waiting for opponent...';
  else if (isReveal) hint = 'Both signals in. Reveal hands?';
  else if (isAiThinking) hint = 'Opponent is thinking...';
  else if (phase === 'replenish') hint = 'Small hand scored. Deal the second hand?';
  else if (phase === 'scraps-reveal') hint = 'Time to play the Scraps hand — best 5-card hand wins. Flushes never count.';
  else if (phase === 'round-end') hint = 'Round complete. Ready for the next round?';

  // The three bottom-bar discs (rules, sound, quit) share one shape.
  // 30px reads as the control; the 44px button around it is the target,
  // per TOUCH_MIN — the disc alone would be half a fingertip.
  const discStyle = {
    background:'transparent',border:'none',color:DS.slateLight,
    width:TOUCH_MIN,height:TOUCH_MIN,cursor:'pointer',flexShrink:0,
    display:'flex',alignItems:'center',justifyContent:'center',padding:0,
  };
  const discInner = {
    display:'flex',alignItems:'center',justifyContent:'center',
    width:30,height:30,borderRadius:'50%',
    background:DS.duskMid,border:`1px solid ${DS.slate}66`,
    fontFamily:F.ui,fontSize:15,fontWeight:700,
  };

  const showNearWin = !gameOver && (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE);

  if (gameOver) return (
    <>
      {gameOver === 'player'
        ? <WinScreen playerScore={playerScore} aiScore={aiScore} onNewGame={() => onExit('difficulty')}
            margin={winStats?winStats.margin:null}
            bestMargin={winStats?winStats.bestMargin:null}
            isNewRecord={winStats?winStats.isNewRecord:false}/>
        : <LoseScreen playerScore={playerScore} aiScore={aiScore} onNewGame={() => onExit('difficulty')}/>
      }
    </>
  );

  // ── Table pieces ───────────────────────────────────────────
  // Each piece is built once and composed two ways below. Every
  // ref the motion system measures rides on the piece itself, so
  // a layout change carries each anchor with the thing it anchors
  // and a card in flight during a rotation still lands on its
  // real destination.
  const oppHandEl = (
    <div ref={aiHandRef} style={{
      opacity:isAiThinking?1:isPlayerTurn?0.5:1,
      transition:'opacity 0.5s',display:'flex',justifyContent:'center',
      flexShrink:0}}>
      <FannedHand cards={aiHand} faceDown aiSignaledIds={aiSignaledIds}
        activeWiggle={isAiThinking} waveIds={waveIds}
        registerEl={registerCard} hiddenIds={allHiddenIds} fadingInIds={aiFadeInIds}
        size={SZ.oppHand} maxWidth={stack?Math.max(120,railW-152):null}/>
    </div>
  );

  const oppScrapsEl = (
    <div ref={aiScrapsRef} style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0,
      alignItems:stack?'stretch':'flex-start',
      opacity:aceMode?1:isAiThinking?1:0.75,transition:'opacity 0.4s'}}>
      {!stack&&<RoundProgressIndicator phase={phase} compact={tight}/>}
      <HorizontalScrapsZone cards={aceMode?aiScraps.map(c=>({...c,eligibleForDiscard:true})):aiScraps}
        label="Opp Scraps" selectable={aceMode}
        selectedIds={aceTargetIds} onCardClick={toggleAceTarget}
        registerEl={registerCard} hiddenIds={allHiddenIds}
        isOpponent={true} glowZone={glowOppScraps}
        size={SZ.pile} width={stack?railW:340} fill={stack}/>
    </div>
  );

  // Deck over discard on one vertical axis, not side by side.
  // Two reasons, and the first is the one that forced it: as a ROW
  // this rail was two cards wide, and at 1024x662 its right edge ran
  // 29px into the narrator panel — 36% of the discard column, with
  // full vertical overlap. At 1440 there was a 67px gap, so it was a
  // narrow-desktop collision that most viewers never saw. As a
  // column the rail is one card wide and cannot reach the panel at
  // any width. The second reason is hierarchy: the discard is the
  // least important object on the table, so it goes UNDER the deck
  // and renders a size smaller rather than claiming equal billing
  // beside it. It stays an anchor for card flight either way —
  // `discardRef` is measured, not predicted, so a smaller pile just
  // means the ghost lands smaller.
  // ...but only where there is height to spend on it, which is exactly
  // where the collision happens. `tight` is the "height is the scarce
  // axis" flag (see the arrangement-vs-size note above), and it is the
  // right test rather than `stack`: a landscape phone keeps the WIDE
  // arrangement on 390px of height, so it wants the row as much as a
  // portrait phone does. Measured cost of getting this wrong — column
  // everywhere — was 0.73 to 0.66 at 375x667 and 0.57 to 0.49 in
  // landscape. The discard stays a size smaller in every layout,
  // because that half is about hierarchy, not about fitting.
  const pileRail = stack || tight;
  const pilesEl = (
    <div style={{display:'flex',flexDirection:pileRail?'row':'column',
      alignItems:pileRail?'flex-start':'center',gap:10,flexShrink:0}}>
      <div ref={deckRef}><DeckPile count={deck.length} size={SZ.pile}/></div>
      <div ref={discardRef}><DiscardPile count={discard.length} size="tiny" abbrev={stack}/></div>
    </div>
  );

  // ACTION ZONE — the game's narrator. In the wide layout it is a
  // fixed-width panel in the middle of the table; stacked, it is
  // a full-width band, because there is nothing to sit beside it.
  // Does the narrator band have anything in it this turn? The panel
  // used to render its background, border and padding unconditionally,
  // so a translucent empty box sat in the middle of the table during
  // every AI turn and every settle. It renders only when it has
  // something to say or something to press.
  const hasActionButtons = isScrapsDiscardMode
    || (isPlayerTurn && !aceMode && !isScrapsDiscardMode && !pendingAiAce && !forcedAce && !counterStand)
    || aceMode || counterStand
    || (isSignal && !signalLocked) || isReveal
    || phase === 'replenish' || phase === 'scraps-reveal' || phase === 'round-end'
    || (pendingAiAce && !aiAceReveal);
  // The narrator's CHROME comes and goes; its SLOT never does.
  //
  // Returning null when the band had nothing to say collapsed the two
  // gutters together, and because the left gutter aligns its contents
  // `flex-end`, the deck slid from the left margin to the middle of the
  // table and sat under the narrator text that arrived a moment later.
  // The panel keeps its flex-basis at all times and only drops its
  // background, border and padding when empty, so the three bands stay
  // on the one centre axis the layout is built around.
  const narratorSilent = !hint && !tradeError && !hasActionButtons;
  const actionEl = (
    <div style={{
      ...(stack
        ? {width:'100%', flexShrink:0}
        : {flexShrink:1, flexBasis:760, maxWidth:760}),
      display:'flex',flexDirection:'column',alignItems:'center',gap:stack?8:10,
      padding:stack?'10px 12px':'14px 20px',
      ...(narratorSilent ? {
        background:'transparent', border:'1px solid transparent',
        // Hold the height too, so the band does not jump as the
        // narrator comes and goes between turns.
        minHeight: tight ? 64 : 92,
      } : {
        background:`rgba(20,31,25,0.7)`,
        border:`1px solid ${DS.slate}22`,
      }),
      borderRadius:14,
    }}>
      {/* Hint — the game's narrator owns this band (item 6).
          The over-limit error takes over while active. */}
      {tradeError ? (
        <div style={{fontFamily:F.ui,fontSize:tight?17:25,color:DS.ember,
          fontWeight:700,textAlign:'center',lineHeight:1.3,
          // Was errBounce on a bounce curve — a 12px overshoot
          // celebrating the news that your move is illegal. It
          // rises once and settles now; the ember and the wording
          // are what carry the urgency.
          animation:'errRise 0.32s cubic-bezier(.22,1,.36,1)'}}>
          {tradeError}
        </div>
      ) : (
        <div key={phase} style={{fontFamily:F.ui,
          fontSize:tight?17:25,
          // Hold three lines' worth of room whatever the copy is. The
          // narrator's height feeds FitBox's scale, so a one-line turn
          // followed by a three-line one resized the WHOLE table —
          // opponent's hand included — between turns. Reserving the
          // tall case means the common turns cost no relayout at all.
          minHeight:'3.9em',display:'flex',alignItems:'center',
          justifyContent:'center',
          color:isScrapsDiscardMode?DS.voltage:pendingAiAce?DS.ember:forcedAce?DS.ember:isAiThinking?DS.voltage:DS.frost,
          fontWeight:isSignal&&!signalLocked&&aiSignal==null?500:700,textAlign:'center',lineHeight:1.3,
          maxWidth:720,
          animation:isAiThinking?'pulse 1s ease infinite'
            :(isSignal&&!signalLocked)?'popIn 0.45s cubic-bezier(.34,1.6,.64,1)':undefined}}>
          {hint}
        </div>
      )}
      {isSignal&&!signalLocked&&(
        <SignalLegalityStrip hand={playerHand} selectedCount={selectedInHand.length} compact={tight}/>
      )}
      {/* Buttons */}
      <div style={{display:'flex',flexWrap:'wrap',gap:stack?8:12,alignItems:'center',justifyContent:'center'}}>
        {isScrapsDiscardMode&&(
          <>
            <BigBtn variant="warning" compact={tight} onClick={confirmScrapsDiscard} disabled={scrapsDiscard.length!==scrapsOverflow}>
              Discard ({scrapsDiscard.length}/{scrapsOverflow})
            </BigBtn>
            <BigBtn variant="ghost" compact={tight} onClick={cancelScrapsDiscard}>Cancel</BigBtn>
          </>
        )}
        {/* After a counter, END TURN is the only alternative to spending
            another Ace. It sits in the middle of the action row; the
            ATTACK tags stay above the Aces still in hand. */}
        {counterStand&&isPlayerTurn&&!aceMode&&(
          <BigBtn variant="ghost" compact={tight}
            onClick={()=>{ setCounterStand(false); setSelected([]); dispatch({ type:'PLAYER_END_TURN' }); }}>
            End Turn
          </BigBtn>
        )}
        {isPlayerTurn&&!aceMode&&!isScrapsDiscardMode&&!pendingAiAce&&!counterStand&&(
          <>
            {!forcedAce&&(
              <TradeInBtn onClick={doTradeIn} disabled={selectedInHand.length===0} compact={tight}
                count={selectedInHand.length} drawCount={tradeDraw}
                projectedHand={tradeNetHand} overLimit={tradeOverLimit}/>
            )}
            {/* Play Ace is NOT in this row any more. It rides on
                top of its own Ace in the hand (see aceSlot), so an
                optional strike stops reading as the expected next
                move and names the card it would spend. */}
          </>
        )}
        {aceMode&&(
          <>
            <BigBtn variant="gold" compact={tight} onClick={confirmAce} disabled={aceTargets.length!==2}>
              Remove ({aceTargets.length}/2)
            </BigBtn>
            <BigBtn variant="ghost" compact={tight} onClick={()=>{setAceMode(null);setAceTargets([]);}}>Cancel</BigBtn>
          </>
        )}
        {isSignal&&!signalLocked&&(
          <BigBtn onClick={doSignal} disabled={!selValid} variant="green" compact={tight}>
            Signal{selValid?` — ${selectedInHand.length} card${selectedInHand.length>1?'s':''}`:' (select a valid hand)'}
          </BigBtn>
        )}
        {isReveal&&(
          <button
            type="button"
            // Busy, not disabled: the build is 580ms and disabling would
            // drop keyboard focus mid-press. aria-busy says the same thing
            // to assistive tech that the shake says to everyone else.
            aria-busy={revealBuilding}
            className={revealBuilding ? 'live-cue-busy' : undefined}
            {...pressStyles(
              el=>{if(!revealBuilding){el.style.background=DS.slateLight;el.style.transform='scale(1.05)';el.style.boxShadow=`0 0 40px ${DS.slateLight}`;}},
              el=>{el.style.background=DS.slate;el.style.transform='scale(1)';el.style.boxShadow=`0 0 20px ${DS.slate}88`;}
            )}
            onClick={()=>{
              if(revealBuilding) return;
              setRevealBuilding(true);
              playRevealBuild(()=>{
                setRevealBuilding(false);
                resolveSmallHand();
              });
            }}
            style={{
              border:'none',cursor:revealBuilding?'wait':'pointer',
              fontFamily:F.ui,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
              padding:stack?'14px 30px':'18px 44px',fontSize:stack?17:22,
              minHeight:TOUCH_MIN,borderRadius:12,
              background:DS.slate,color:DS.ink,
              animation:revealBuilding?'cardShake 0.15s ease-in-out infinite':'none',
              boxShadow:revealBuilding?`0 0 40px ${DS.slate}`:`0 0 20px ${DS.slate}88`,
              transition:'background 60ms, transform 60ms, box-shadow 60ms',
            }}>
            {revealBuilding?'▶▶▶':'Reveal Hands'}
          </button>
        )}
        {phase==='replenish'&&<BigBtn onClick={doReplenish} variant="primary" compact={tight}>Deal Second Hand</BigBtn>}
        {phase==='scraps-reveal'&&<BigBtn onClick={resolveScrap} variant="primary" compact={tight}>Play Scraps Hand</BigBtn>}
        {phase==='round-end'&&<BigBtn onClick={()=>startNewRound(true)} variant="primary" compact={tight}>Next Round →</BigBtn>}
        {pendingAiAce&&!aiAceReveal&&(
          <>
            <BigBtn variant="danger" compact={tight} onClick={onPlayerCounterAce}>
              <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                Counter <IconBolt size={18}/>
              </span>
            </BigBtn>
            <BigBtn variant="ghost" compact={tight} onClick={onPlayerAllowAce}>Let It Happen</BigBtn>
          </>
        )}
      </div>
    </div>
  );

  const visiblePlayerHand = allHiddenIds.size
    ? playerHand.filter(c => !allHiddenIds.has(c.id))
    : playerHand;

  const playerHandEl = (
    <div ref={playerHandRef} style={{
      display:'flex',flexDirection:'column',alignItems:'center',gap:stack?2:5,
      opacity:isPlayerTurn||settling||(isSignal&&!signalLocked)?1:0.6,
      transition:'opacity 0.5s',flexShrink:0}}>
      <FannedHand
        cards={playerHand}
        selectedIds={selIds}
        registerEl={registerCard}
        hiddenIds={allHiddenIds}
        waveIds={waveIds}
        tradeSelectedIds={isScrapsDiscardMode?selIds:new Set()}
        onCardClick={card=>{
          if(isScrapsDiscardMode||pendingAiAce) return;
          if((isPlayerTurn&&!aceMode)||(isSignal&&!signalLocked)) toggleHandCard(card);
        }}
        selectable={(isPlayerTurn&&!aceMode&&!isScrapsDiscardMode&&!pendingAiAce)||(isSignal&&!signalLocked)}
        activeWiggle={glowHand&&!pendingAiAce}
        cardSlot={aceSlot}
        size={SZ.hand} maxWidth={stack?railW:null}
      />
      {/* Name the hand you can actually SEE. Built from playerHand
          directly, this read "PAIR" under an empty fan while the
          round's cards were still in the deck — the same leak as the
          cards themselves, in text. Filtering on the hidden set also
          means the badge settles as a trade's cards land instead of
          describing a hand that is still in the air. */}
      <HandUpgradeBadge cards={visiblePlayerHand} fontSize={stack?13:15}/>
    </div>
  );

  const playerScrapsEl = (
    <div ref={playerScrapsRef} style={{flexShrink:0,
      opacity:isScrapsDiscardMode||isPlayerTurn||settling?1:0.75,transition:'opacity 0.4s'}}>
      <HorizontalScrapsZone
        cards={playerScraps.map(c=>({...c,eligibleForDiscard:isScrapsDiscardMode&&c.eligibleForDiscard}))}
        label="Your Scraps"
        selectable={isScrapsDiscardMode}
        selectedIds={scrapsDiscardIds}
        onCardClick={toggleScrapsDiscardCard}
        discardMode={isScrapsDiscardMode}
        registerEl={registerCard} hiddenIds={allHiddenIds}
        glowZone={glowPlayerScraps}
        size={SZ.pile} width={stack?railW:340} fill={stack}/>
    </div>
  );

  return (
    <div className="app-vh" style={{display:'flex',flexDirection:'column',
      background:DS.dusk,userSelect:'none',overflow:'hidden'}}>
      {/* The table's one heading. The wordmark is on the splash, not
          here, so without this the game screen has no h1 at all and a
          screen reader's heading list is empty. */}
      <h1 className="sr-only">SCRAPS — game table</h1>
      <GameAnnouncer messages={log} hint={hint}/>
      <OpponentBar aiScore={aiScore} aiFlash={aiScoreFlash} roundEndPulse={roundEndPulse}
        difficultyLabel={(difficulty||'').toUpperCase()} compact={tight}/>
      {showNearWin&&<NearWinBanner playerScore={playerScore} aiScore={aiScore}/>}

      {/* Table. Ownership mapping is absolute in BOTH layouts: top
          of screen = opponent's stuff, bottom = yours, everywhere,
          no exceptions. What changes between them is only where a
          side's Scraps sits relative to its hand — beside it when
          there is width to spare, under it when there is not.

          FitBox owns the promise that this never scrolls: it lays
          the bands out at a definite width and scales whatever
          comes back to fit. The `overflow:auto` that used to be on
          the game root and the `overflowX:auto` on this band stack
          were the interim fallbacks from Session 1 and the forest
          reskin; they are gone, and nothing replaces them, because
          there is no longer a case where the table does not fit. */}
      <FitBox modeMinW={MODE_MIN_W[mode]}
        // The table is a real surface now, not a gradient. `backdrop`
        // paints behind the scaled content and is NOT scaled with it,
        // so the wood reaches the edges of the viewport however far
        // the table itself is scaled down; the BOARDS are sized from
        // the card so the furniture stays in proportion to the game.
        backdrop={<TableSurface cardH={CARD_DIMS[SZ.hand].h}/>}
        style={{background:DS.timber}}>
        <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',
          justifyContent:'space-evenly',
          padding:stack?'5px 10px':'8px 14px',gap:stack?5:4}}>

          {stack ? (
            <>
              {/* The round strip gets its own row. It was tried
                  stacked over the piles to save one — but the strip
                  is ~240px of nowrap pills and the opponent's fan
                  needs the rest, which is more than a 375px rail
                  has, and the third pill ran off the edge. On its
                  own row it costs 8px net, because the row it used
                  to share was as tall as the strip and the piles
                  together anyway. */}
              <div style={{display:'flex',justifyContent:'center',flexShrink:0}}>
                <RoundProgressIndicator phase={phase} compact/>
              </div>
              {/* The opponent's face-down hand and the table
                  furniture share a row: neither is something the
                  player acts on, and between them they cost one row
                  instead of two. */}
              <div style={{display:'flex',alignItems:'flex-end',flexShrink:0,
                justifyContent:'space-between',gap:10}}>
                {oppHandEl}
                {pilesEl}
              </div>
              {oppScrapsEl}
              {actionEl}
              {playerScrapsEl}
              <div style={{display:'flex',justifyContent:'center',flexShrink:0}}>{playerHandEl}</div>
            </>
          ) : (
            <>
              {/* ── TOP BAND: opponent hand, with their Scraps beside it ── */}
              <div style={{display:'flex',alignItems:'center',gap:18,flexShrink:0}}>
                <div style={{flex:'1 1 0',minWidth:0}}/>
                {oppHandEl}
                <div style={{flex:'1 1 0',minWidth:0,display:'flex',justifyContent:'flex-start'}}>
                  {oppScrapsEl}
                </div>
              </div>

              {/* ── MIDDLE BAND: action zone centred, piles in the left gutter ──
                  All three bands share ONE centre axis: both hands and
                  this panel sit on it, each side's Scraps hangs in the
                  right gutter, the table furniture hangs in the left.
                  That only holds while the two gutters are the same
                  width, so both are `flex:'1 1 0'` and neither is a
                  content-sized column.

                  Session 5 made this one `flex:'0 1 auto'` to stop the
                  rail colliding with the panel at 1024x662. It did —
                  but it also packed the panel hard against the rail and
                  dumped every spare pixel into the right gutter, and
                  the offset grows with the window: measured 12px left
                  of the axis at 1024 (invisible, which is why it
                  survived a session), 224px at 1440, 464px at 1920,
                  where the whole table plainly read as shoved left.

                  The collision is held off by the MISSING `minWidth:0`
                  instead, unlike its mirror on the right: a flex item's
                  default `min-width:auto` stops this column shrinking
                  below the rail, so the panel — `flexShrink:1` with
                  760px of slack — is the one that gives way, and a flex
                  item cannot overlap its sibling in any case.
                  `flex-end` mirrors the right gutter's `flex-start`:
                  both gutters hold their contents against the centre
                  column, so the table stays one mass rather than one
                  object pinned to each edge of a 1920px screen. */}
              <div style={{display:'flex',alignItems:'center',gap:18,flexShrink:0,
                minHeight:tight?0:150}}>
                <div style={{flex:'1 1 0',display:'flex',justifyContent:'flex-end',
                  alignItems:'center'}}>
                  {pilesEl}
                </div>
                {actionEl}
                <div style={{flex:'1 1 0',minWidth:0}}/>
              </div>

              {/* ── BOTTOM BAND: player hand, with YOUR Scraps beside it ──
                  `flex-end`, not `center`: the hand's best-hand name and
                  the Scraps zone's now both hang below their own pile, and
                  bottom-aligning the two columns is what puts them on one
                  line instead of two arbitrary heights. */}
              <div style={{display:'flex',alignItems:'flex-end',gap:18,flexShrink:0}}>
                <div style={{flex:'1 1 0',minWidth:0}}/>
                {playerHandEl}
                <div style={{flex:'1 1 0',minWidth:0,display:'flex',justifyContent:'flex-start'}}>
                  {playerScrapsEl}
                </div>
              </div>
            </>
          )}
        </div>
      </FitBox>

      {/* Bottom bar — tap the log line to open the full history */}
      <div style={{position:'relative',flexShrink:0}}>
        {showLogPanel&&(
          <div style={{position:'absolute',bottom:'100%',left:0,right:0,
            animation:'slideUp 0.18s ease',zIndex:60,
            boxShadow:'0 -8px 30px rgba(0,0,0,.5)'}}>
            <GameLog messages={log}/>
          </div>
        )}
        <PlayerBar playerScore={playerScore} playerFlash={playerScoreFlash}
          roundEndPulse={roundEndPulse} compact={tight}>
          {/* The log is the ONLY record of what the opponent did while
              an animation was playing, and a truncated line behind a
              small chevron reads as decoration. The label sits there
              until the player opens it once, then never again. */}
          <button type="button"
            onClick={()=>{setShowLogPanel(v=>!v);setLogEverOpened(true);}}
            title={showLogPanel?'Hide log history':'Show log history'}
            aria-expanded={showLogPanel}
            aria-label={showLogPanel?'Hide log history':'Show log history'}
            style={{fontFamily:F.mono,fontSize:stack?13:15,color:showLogPanel?DS.frost:DS.slateLight,
            flex:1,minWidth:0,cursor:'pointer',display:'flex',alignItems:'center',gap:8,
            minHeight:TOUCH_MIN,
            background:'transparent',border:'none',padding:0,textAlign:'left'}}>
            <IconChevron size={14} color={DS.slate} up={!showLogPanel}/>
            {!logEverOpened&&(
              <span style={{flexShrink:0,fontFamily:F.mono,fontSize:11,fontWeight:700,
                letterSpacing:'0.14em',color:DS.voltage,border:`1px solid ${DS.voltage}66`,
                borderRadius:5,padding:'2px 7px'}}>TAP FOR HISTORY</span>
            )}
            <span style={{overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
              {log[log.length-1]||''}
            </span>
          </button>
          {/* The rules button was a 28px circle — fine under a
              cursor, half a fingertip on a phone. The disc still
              reads at 30px; the BUTTON around it is 44. */}
          <button onClick={()=>setShowRules(true)} title="Rules"
            aria-label="Rules" style={discStyle}>
            <span aria-hidden="true" style={discInner}>?</span>
          </button>
          {/* Sound and Quit. Until 2026-08-30 a match could not be
              left, paused or silenced: `onExit` fired only from the
              win and lose screens, and no mute existed anywhere. So an
              accidental tap on HARD committed you to a full match to
              10, and a game that makes a sound on every card tap could
              not be opened quietly. */}
          <button onClick={()=>setMuted(m=>{const n=!m;setAudioMuted(n);return n;})}
            title={muted?'Sound off':'Sound on'}
            aria-label={muted?'Turn sound on':'Turn sound off'}
            aria-pressed={muted} style={discStyle}>
            <span aria-hidden="true" style={discInner}>{muted?'\u2715':'\u266A'}</span>
          </button>
          <button onClick={()=>setConfirmQuit(true)} title="Quit to menu"
            aria-label="Quit to menu" style={discStyle}>
            <span aria-hidden="true" style={{...discInner,fontSize:13}}>{'\u23CF'}</span>
          </button>
        </PlayerBar>
      </div>

      {/* The rules ARE the storyboard now. RulesModal was a separate,
          worse explanation of the same rules that truncated on a phone
          before it reached the house rule. */}
      {showRules&&<Walkthrough asReference onDone={()=>setShowRules(false)}/>}
      {confirmQuit&&<QuitConfirmModal onCancel={()=>setConfirmQuit(false)} onQuit={onExit}/>}
      {revealData&&<RevealOverlay {...revealData} onDismiss={revealData.onContinue}
        playerBestIds={revealData.playerBestIds||null}
        aiBestIds={revealData.aiBestIds||null}/>}
      {showFullScrap&&<FullScrapLightbox onDone={()=>setShowFullScrap(false)}/>}
      {flightsOverlay}
      {showInterstitial&&<RoundInterstitial roundNum={roundNum} onDone={onInterstitialDone}/>}
      {pendingAiAce&&!aiAceReveal&&(
        <AceCounterModal
          onCounter={onPlayerCounterAce}
          onAllow={onPlayerAllowAce}
          playerScraps={playerScraps}
        />
      )}
      {aiAceReveal&&(
        <OpponentAceReveal targets={aiAceReveal.targets} onOk={onAiAceRevealOk}/>
      )}
      {aiCounterNotice&&(
        <AiCounterNotice
          playerAce={aiCounterNotice.playerAce}
          aiAce={aiCounterNotice.aiAce}
          stillArmed={aiCounterNotice.stillArmed}
          onOk={()=>setAiCounterNotice(null)}
        />
      )}
      {mustSkip&&!revealData&&!showInterstitial&&!aiAceReveal&&!aiCounterNotice&&(
        <SkipTurnModal onOk={()=>dispatch({type:'PLAYER_SKIP'})}/>
      )}
      {aceDrawnCard&&<AceDrawnLightbox ace={aceDrawnCard} onDismiss={()=>setAceDrawnCard(null)}/>}
    </div>
  );
}
