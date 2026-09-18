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

import { useReducer, useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import {
  evaluateBestHand, getBestCardsForSignal, getActiveHandCards, compareHands,
  aiDecide, aiChooseSignal, isValidSignal, hasLegalTrade, scrapValue,
  shouldCounterAce, chooseAceTargets, signalHandLabel,
} from "../game/engine.js";
import {
  gameReducer, createInitialState, buildRoundDeal, scoreScrapsOutcome,
  checkWin, planReplenish, AI_TURN_PHASES, AI_SIGNAL_PHASES,
} from "../game/reducer.js";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { setAudioMuted, isAudioMuted,
  playSelect, playScrap, playDraw, playAceStrike, playAceCounter,
  playInvalid, playRevealBuild,
  playArmDraw, playLock, playWhoosh, playHerWhoosh, playChips, playClash } from "../audio.js";
import { useCardMotion, prefersReducedMotion, screenPose } from "../components/flight.jsx";
import { useImpactFx, AttackTagEcho, shakeElement } from "../components/impact.jsx";
import { THROW, CLASH, RM_FADE, throwMotion, knockOffPair, clashMotions, fadeMotion }
  from "../components/throwMotion.js";
import { FannedHand, HorizontalScrapsZone, HandUpgradeBadge, CARD_DIMS, sortByValue } from "../components/cards.jsx";
import { OpponentBar, PlayerBar, RoundProgressIndicator, GameLog, GameAnnouncer } from "../components/hud.jsx";
import { BigBtn, ScrapBtn, SignalBtn, AceTag, TOUCH_MIN, pressStyles } from "../components/buttons.jsx";
import { IconBolt, IconChevron } from "../components/icons.jsx";
import { TableSurface } from "../components/backdrop.jsx";
import { Walkthrough } from "./Walkthrough.jsx";
import { recordGame } from "../game/stats.js";
import { useViewport, usePointerVerb, layoutMode, MODE_MIN_W, SHORT_MAX_H, FitBox } from "../ui/viewport.jsx";
import {
  AceCounterModal, SkipTurnModal, QuitConfirmModal,
  OpponentAceReveal, AiCounterNotice, AceDrawnLightbox,
} from "../components/overlays.jsx";
import { TableStage } from "../components/interstitials.jsx";

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
// The Scraps pile is a size SMALLER than the hand in both modes, and
// that is a legibility constraint before it is a taste one.
//
// A pile of 7 divides its width between 7 cards, so the exposed band
// per card is (zoneW − cardW) / 6. At `small` in the side-by-side
// layout's 340px that lands at 40px of an 80px card — HALF — and a
// rank that fills its card loses its right half to the next card:
// measured, a full pile read "2 5 7 1 J Q K" with the 10 showing as
// a 1 and the Q and K colliding. At `tiny` the same 340px exposes
// 43px of a 60px card, or 72%, and all seven ranks are legible.
//
// It also happens to be what Stan asked for in his notes ("there's
// too much shit onscreen ... maybe the scraps are smaller"), and it
// puts the hierarchy the right way up: the hand is the thing you act
// on and should be the biggest thing on the table.
//
// DO NOT change a pile size here without re-checking the exposure —
// and change it HERE rather than inside the zone. flight.jsx derives
// a ghost's landing scale from CARD_DIMS[toSize] against the
// measured rect, so a zone that quietly rendered a size other than
// the one GameScreen passed would land every flight at the wrong
// size.
const SIZES = {
  roomy:   { hand:'normal', oppHand:'normal', pile:'tiny' },
  compact: { hand:'small',  oppHand:'tiny',   pile:'tiny' },
};

// ─────────────────────────────────────────────────────────────
// Where cards come from, and where they go.
//
// The deck and the discard used to be two real piles ON the table,
// measured for every flight. Stan took them off it on 2026-09-13:
// neither is a thing a player acts on, and between them they held a
// whole column of a surface that is short of width and a whole row of
// one that is short of height.
//
// They are still ANCHORS — they just have no pixels. Each answers with
// a plain rect OUTSIDE the viewport, which flight.jsx takes exactly as
// happily as a card's id; `fromRect` / `toRect` are what the two piles
// always used anyway, since neither was ever a registered card.
//
// The DECK sits on the DEALER's side, so a deal reads as somebody
// dealing it. Odd rounds the opponent deals and the cards come down
// over the top edge; even rounds you deal and they come up past the
// bottom. (firstActorForRound in the reducer says it the other way
// round — odd rounds the NON-dealer, you, acts first.)
//
// The DISCARD is off the RIGHT edge at all times (Stan moved it from the
// left on 2026-09-14), and cards thrown away spin out to it — see
// `discardAnchor` below.
//
// A rect literal rather than a DOMRect: Ghost only reads left/top/
// width/height (plus the optional trueW/rot a real card carries), and
// a card measured off-screen has no DOMRect to borrow.
// The Scraps hand-off (2026-09-15, Stan). `scraps: 520` used to be the
// third entry in GameScreen's own HANDOFF and was the whole beat: the
// hand 2 reveal closed, the narrator said "Scraps hands up." for half a
// second over a table still holding two dead hands, and the Scraps
// reveal opened over the top of it. Nobody could read the line and
// nothing was being asked.
//
// It is a beat with a job now. The table comes back, both private hands
// are swept off it to the discard, and the player is asked for the last
// hand of the round. `ready` counts from the START of the sweep rather
// than from its end: the trailing cards are still leaving as the prompt
// lands, which reads as one continuous motion instead of
// sweep-stop-ask. It is a plain timer and not a wait on `animating`, so
// a flight that never reports back cannot strand the round with no way
// forward.
const SCRAPS_HANDOFF = { sweep: 240, step: 45, ready: 800 };
// PLAY HAND 2 to the first card leaving the deck: long enough to see the
// held-over cards move over and the new gaps open, short of reading as a
// wait. See dealSecondHand.
const HANDOFF = { deal: 220 };

// A card's pose on screen, as the scripted flights take it (throwMotion.js):
// its centre, its signed angle, and its scale against the natural box of
// `size`. `r` is a rect from the motion hook's rectOf.
const poseOf = (r, size) => ({
  x: r.left + r.width / 2, y: r.top + r.height / 2, rot: r.rot || 0,
  s: (r.trueW || r.width) / CARD_DIMS[size].w,
});

// `rig` is for the attack bench only (tools/bench/attack.jsx): a fixed
// deal instead of a shuffle, and any starting state over the default. The
// game itself never passes it. The Ace attack needs an Ace in your hand, a
// pile of hers worth hitting and, for her counter, an Ace in hers and a
// reason to spend it, and a shuffle will not produce that on demand.
const initGame = (rig) => (rig && rig.state
  ? { ...createInitialState(), ...rig.state }
  : createInitialState());

const OFF_MARGIN = 40;
const rectAt = (left, top, d) => ({
  left, top, width: d.w, height: d.h,
  right: left + d.w, bottom: top + d.h, x: left, y: top,
});

export function GameScreen({ difficulty, onExit, rig = null }) {
  // ── Game state machine ─────────────────────────────────────
  const [state, dispatch] = useReducer(gameReducer, rig, initGame);
  const rigRef = useRef(rig);
  const {
    // `deck` and `discard` are no longer read here: the two piles came
    // off the table on 2026-09-13 and nothing renders their counts.
    // They are still owned by the reducer, and every draw still slices
    // the real deck — this component just has no reason to look at it.
    playerHand, aiHand, playerScraps, aiScraps,
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
  // ── THE THROW (Stan's pick off The Chopping Block, 2026-09-16) ──
  // The Ace attack's own choreography: ATTACK lifts the Ace out of the
  // fan and the table goes dark around her pile; REMOVE throws it.
  //
  // `strike` is the throw in progress, from REMOVE until the table
  // lights come back: `{ countered, impacted }`. It is UI state and
  // deliberately NOT the game's: the hit commits to the reducer only at
  // the moment of impact, after the hit-stop, because until then her
  // targets are still sitting in her pile waiting to be struck. That is
  // the old 520ms shake-then-commit, stretched into a throw. Everything
  // the timeline needs to finish itself — its timers, the commit, the
  // counter notice — lives in `strikeRef`, so a skip can land all of it
  // in one call (finishStrike) and the board is correct either way.
  const [strike, setStrike] = useState(null);
  const strikeRef = useRef(null);
  // The ATTACK tag's press, played on a copy of the tag (impact.jsx).
  const [tagEcho, setTagEcho] = useState(null);
  const armTimers = useRef([]);
  // Bumped when her pile is hit, so its remaining cards hop.
  const [joltKey, setJoltKey] = useState(0);
  // Where the pool of light sits in the dim: her pile, in the dim
  // layer's own unscaled pixels. Measured when the dim turns on.
  const [dimSpot, setDimSpot] = useState(null);
  const dimRef = useRef(null);
  // FitBox's settled scale, reported by FitBox itself (its transform eases
  // there over 260ms, so a rect read too early is the old scale).
  const [tableK, setTableK] = useState(1);
  const frameRef = useRef(null);   // FitBox's outer box — the table that shakes
  const shakeRef = useRef(null);
  const fx = useImpactFx();
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
  // The interstitial layer (interstitials.jsx). ONE piece of state
  // for every full-screen moment between hands: null while the table
  // is live, `{kind:'sign'}` for ROUND N, `{kind:'reveal', ...}` for a
  // hand result and everything that can follow it — the Clean Sweep
  // beat, the sweep out of the round, the match screen. The two
  // derived flags below keep the guards further down readable.
  const [stage, setStage]                   = useState(null);
  const revealData = stage && stage.kind === 'reveal' ? stage : null;
  const showInterstitial = !!stage && stage.kind === 'sign';
  const tableWoodRef = useRef(null);
  const [revealBuilding, setRevealBuilding] = useState(false);
  // The beat between hand 2 and the Scraps hand (2026-09-15, Stan).
  // False for the moment the table comes back and sweeps both private
  // hands off it; true once the wood is down to the two Scraps piles
  // and the last hand of the round is the player's to call. There is
  // no third value — the sweep is the only thing that happens while
  // this is false, and `phase === 'scraps-reveal'` is what says we are
  // in the beat at all.
  const [scrapsReady, setScrapsReady] = useState(false);
  // `autoReveal` lived here until 2026-09-14: when the player signalled
  // INTO an opponent signal already on the table, the reveal ran itself
  // and SHOW 'EM never appeared. Stan put the button back for that case
  // ("keep that clickable button in place because it's a big deal"), so
  // every reveal is now pressed for, whoever signalled first.
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
  // NOTHING SPEAKS UNTIL THE CARDS ARE DOWN (Stan, 2026-09-16: "don't
  // show the first narrator copy until after all the cards are dealt,
  // then animate in the narrator box and first instructions").
  //
  //   'pending'  a deal is built and waiting — the ROUND sign is up, or
  //              the Hand 2 cards are sitting hidden in their gaps
  //   'dealing'  the wave is in the air
  //   null       every card has landed: the table is live
  //
  // While it is not null the narrator band is silent and empty, the
  // turn's buttons and the ATTACK tag stay off, your hand does not
  // wiggle, and the opponent is gated from moving — the whole "it is
  // your turn" signal arrives at once, when the last card lands. A
  // STATE rather than a ref because a wave with nothing to fly never
  // sets `animating`, and the effect that ends the hold still has to
  // re-run to see it.
  const [dealStage, setDealStage] = useState('pending');
  const dealHold = dealStage !== null;
  // Bumped each time a hold ends. The narrator panel is keyed on it, so
  // its entrance runs once per deal and never on an ordinary turn.
  const [narratorEpoch, setNarratorEpoch] = useState(0);
  const dealTimer = useRef(null);
  useEffect(() => () => clearTimeout(dealTimer.current), []);
  const [aiSignaledIds, setAiSignaledIds]   = useState(new Set());
  const [scrapsFadeIds, setScrapsFadeIds]   = useState(new Set());
  const [tradeError, setTradeError]             = useState(null); // over-limit trade message
  const [showLogPanel, setShowLogPanel]         = useState(false); // tap-to-open log history
  const [logEverOpened, setLogEverOpened]       = useState(false); // hides the one-time CLICK/TAP FOR HISTORY label
  const tradeErrorTimer = useRef(null);

  // First-time-per-game hint: fires once, the first time an Ace
  // lands in the player's hand.
  const [aceDrawnCard, setAceDrawnCard]         = useState(null);
  const aceHintShownRef = useRef(false);

  // Refs for card travel animation zones
  const playerHandRef    = useRef(null);
  const playerScrapsRef  = useRef(null);
  const aiHandRef        = useRef(null);
  const aiScrapsRef      = useRef(null);
  const { registerCard, rectOf, fly, hiddenIds, animating, skipAll, flightsOverlay } = useCardMotion();

  // Both read through refs rather than closing over render values, for
  // the same reason every delayed action in this file does: a flight is
  // routinely built inside a timer scheduled a second or two earlier,
  // and a rotation (or a new round) can land in between.
  const deckAnchor = useCallback(() => {
    const d = CARD_DIMS[szRef.current.pile];
    const dealerIsOpponent = stateRef.current.roundNum % 2 === 1;
    return rectAt(
      window.innerWidth / 2 - d.w / 2,
      dealerIsOpponent ? -d.h - OFF_MARGIN : window.innerHeight + OFF_MARGIN,
      d);
  }, []);
  // `rot` is the flourish. Ghost turns a card from the angle it sat at
  // to its destination's `rot` across the flight, so a destination with
  // a big angle IS the toss — no new animation, no new code path. The
  // two cards of an Ace strike leave together, so they get different
  // angles; spinning in lockstep reads as one object, not two cards.
  const discardAnchor = useCallback((i = 0) => {
    const d = CARD_DIMS[szRef.current.pile];
    // The spin turns the same way the card is travelling, so it reads as
    // thrown rather than as flipped. It was negative while the discard
    // sat off the LEFT edge; moving it right flips the sign with it.
    return { ...rectAt(window.innerWidth + OFF_MARGIN * 3, window.innerHeight * 0.42 - d.h / 2, d),
      rot: 105 + (i % 2) * 55 };
  }, []);

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
  // its card moves reads as belonging to the scrap instead. These
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
  // Click or Tap, for the one line on the table that names the gesture.
  const pointerVerb = usePointerVerb();
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
    const deal = rigRef.current && rigRef.current.deal
      ? rigRef.current.deal() : buildRoundDeal();
    dispatch({ type: 'START_ROUND', deal, alternate });
    // The fresh hands sit behind the BEGIN ROUND interstitial
    // until dealWave flies them out of the deck.
    setSelected([]); setScrapsDiscard([]);
    setAceMode(null); setAceTargets([]);
    setAiAceReveal(null); setAiCounterNotice(null);
    setAiSignaledIds(new Set());
    setScrapsFadeIds(new Set());
    setWaveIds(new Set());
    setScrapsReady(false);
    // Silent from here until the deal that the sign's tap starts lands.
    clearTimeout(dealTimer.current);
    setDealStage('pending');
    // The two cards that START in each Scraps pile are hidden with the
    // hands and dealt with them (Stan, 2026-09-14). They used to be
    // simply THERE the moment the interstitial lifted, which made the
    // round look like it began with four cards already played.
    setPendingDealIds(new Set([...deal.playerHand, ...deal.aiHand,
      ...deal.playerScraps, ...deal.aiScraps].map(c => c.id)));
    // ROUND N, on the wood. When this follows a Scraps reveal the
    // stage is already up and mid-sweep; the sign simply replaces the
    // reveal inside it, so the boards never cut.
    setStage({ kind: 'sign' });
  }, []);

  useEffect(() => { startNewRound(false); }, []);

  // ── Dealing wave ───────────────────────────────────────────
  // START_ROUND already put every card in its hand, so there is
  // nothing to predict: each card flies from the deck to the slot
  // it is ALREADY occupying (hidden until its ghost lands). The
  // stagger is a per-card delay inside one batch, so `animating`
  // stays true across the whole deal rather than flickering off
  // between cards and letting the next turn start early.
  function dealWave(playerCards, aiCards, playerScrapsCards = [], aiScrapsCards = []) {
    // The deck is a computed rect now, so there is no longer a "no
    // deck to fly from" case to fall back out of — see deckAnchor.
    const deckRect = deckAnchor();
    const STEP = 90;
    // ORDER (Stan, 2026-09-14 evening): one seat, then the other. All
    // five of a player's hand cards, then both of that player's Scraps
    // cards, and only then the other player's seven. It used to be both
    // hands and then both piles interleaved, which read as the dealer
    // running round the table twice. The NON-dealer is dealt first, as
    // at a real table: odd rounds she deals, so you are; even rounds you
    // deal, so she is. `deckAnchor` already puts the deck on the dealer's
    // edge, so the two agree. The Hand 2 deal (hands only) follows
    // the same rule. Your hand deals in value order because the fan is
    // sorted, which is LEFT TO RIGHT into gaps that are already open
    // (Stan, 2026-09-16): every card is laid out hidden in its final slot
    // before its ghost leaves, so the gaps stand open and fill one by one
    // across the fan. Hers is face down and deals in slot order, which is
    // left to right as well.
    setDealStage('dealing');
    const playerFirst = stateRef.current.roundNum % 2 === 1;
    const moves = [];
    let n = 0;
    const seat = (hand, scraps, mine) => {
      const h = mine ? [...hand].sort((a, b) => a.value - b.value) : hand;
      h.forEach((card, i) => moves.push(mine ? {
        card, fromRect: deckRect, toId: card.id,
        fromSize: szRef.current.pile, toSize: szRef.current.hand,
        arc: ((i % 3) - 1) * 0.5, delay: n++ * STEP,
      } : {
        card: null, faceDown: true, fromRect: deckRect, toId: card.id,
        fromSize: szRef.current.pile, toSize: szRef.current.oppHand,
        arc: ((i % 3) - 1) * 0.5, delay: n++ * STEP,
      }));
      // Face up, because a Scraps pile is public from the moment it exists.
      [...scraps].sort((a, b) => a.value - b.value).forEach(card => moves.push({
        card, fromRect: deckRect, toId: card.id, toScrap: true,
        fromSize: szRef.current.pile, toSize: szRef.current.pile,
        arc: mine ? 0.45 : -0.45, delay: n++ * STEP,
      }));
    };
    if (playerFirst) { seat(playerCards, playerScrapsCards, true); seat(aiCards, aiScrapsCards, false); }
    else { seat(aiCards, aiScrapsCards, false); seat(playerCards, playerScrapsCards, true); }
    fly(moves);
    // Batched with fly()'s own update: the motion hook builds its
    // flights in a LAYOUT effect, so the handoff lands before paint
    // and there is no frame where the cards are visible in place.
    setPendingDealIds(new Set());
  }

  function onInterstitialDone() {
    setStage(null);
    dispatch({ type: 'INTERSTITIAL_DONE' });
    const s = stateRef.current;
    dealWave(s.playerHand, s.aiHand, s.playerScraps, s.aiScraps);
  }

  // There used to be a score-flash effect here, popping the HUD's
  // number whenever a score rose. Gone 2026-09-14: the reveal on the
  // table rolls the score up itself as the point lands (ScoreRoll in
  // interstitials.jsx), and by the time the HUD is visible again the
  // number is simply correct. Two animations for one point was the
  // thing the redesign named.

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
  function doScrap() {
    if (selected.length === 0) return;
    const sel = selected.filter(c => playerHand.find(h => h.id === c.id));
    if (sel.length === 0) return;
    const drawCount = sel.reduce((s, c) => s + scrapValue(c), 0);
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
    const deckRect = deckAnchor();
    const drawn = stateRef.current.deck.slice(0, drawCount);

    setSelected([]);
    clearTimeout(tradeErrorTimer.current);
    setTradeError(null);
    playScrap();

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
      // LEFT TO RIGHT (Stan, 2026-09-16). The drawn cards already sit
      // hidden in their sorted slots from the commit above, so their
      // gaps open as the scrapped cards leave; flown in deck order they
      // then filled those gaps in a scatter across the fan. Sorted the
      // same way the fan sorts (stable, so two equal ranks keep the
      // order the fan puts them in), they fill from the left.
      sortByValue(drawn).forEach((card, i) => moves.push({
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
    const discardRect = discardAnchor();
    const tradeCards = pendingTrade.cards;
    const drawn = stateRef.current.deck.slice(0, pendingTrade.drawCount);

    // FIRST for both halves of this move: the cards leaving Scraps
    // for the discard, and the cards leaving the hand for Scraps.
    const leaving = scrapsDiscard.map(c => ({ card: c, rect: rectOf(c.id) }));
    const entering = tradeCards.map(c => ({ card: c, rect: rectOf(c.id) }));
    const deckRect = deckAnchor();

    dispatch({ type: 'PLAYER_SCRAP_WITH_DISCARD', discardCards: [...scrapsDiscard] });
    setScrapsDiscard([]); setSelected([]);
    playScrap();

    const moves = [];
    if (discardRect) {
      leaving.filter(f => f.rect).forEach((f, i) => moves.push({
        card: f.card, fromRect: f.rect, toRect: discardAnchor(i),
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
      // Left to right, as in executeTrade.
      sortByValue(drawn).forEach((card, i) => moves.push({
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
  // THE THROW, in three presses. ATTACK arms it (doPlayAce): the tag is
  // struck, the Ace comes up out of your fan and hovers, and the table
  // goes dark around her pile. Each card you pick lifts and lights, the
  // way any picked card does (toggleAceTarget). REMOVE throws it
  // (confirmAce): drawn back, thrown spinning into the gap between the
  // two targets, a hit-stop, and both cards knocked off the table while
  // the Ace spins away. If she counters, her Ace comes up out of her hand
  // and is thrown back at yours a beat later, and SHE wins the collision.

  // The table's scale on screen, read off a real element.
  const tableScale = () => {
    const el = aiScrapsRef.current;
    if (!el || !el.offsetWidth) return 1;
    return el.getBoundingClientRect().width / el.offsetWidth || 1;
  };
  // What every distance and speed in the attack is multiplied by. They
  // were tuned on the bench's 960px table at 1. The table's own scale
  // covers a table shrunk to fit, but not a NARROW one: a portrait phone
  // runs its table at scale 1 on 390px, and at full speed the two
  // knocked-off cards left by the sides in half a second instead of
  // falling through the table. So the viewport's width caps it too, at
  // the 0.62 the bench's phone table used for 390px.
  const motionScale = (k = tableScale()) =>
    Math.min(1.3, Math.max(0.5, Math.min(k, window.innerWidth / 630)));

  function doPlayAce(ace, e) {
    if (aiScraps.length < 2) { dispatch({ type: 'LOG', msg: 'Opponent needs at least 2 Scraps cards to target.' }); return; }
    if (strikeRef.current) return;
    playArmDraw();
    const tag = e && e.currentTarget;
    if (tag && tag.offsetWidth && !prefersReducedMotion()) {
      const pose = screenPose(tag);
      const K = motionScale();
      armTimers.current.forEach(clearTimeout);
      setTagEcho({ key: performance.now(), ...pose, natW: tag.offsetWidth });
      armTimers.current = [
        // The spark: a ring and a spit of green off the tag, on the snap.
        setTimeout(() => {
          fx.ring(pose.x, pose.y, { r0: 10 * K, r1: 76 * K, dur: 0.34, color: DS.voltageCharge, lw: 4 * K });
          fx.burst(pose.x, pose.y, { n: 14, kind: 'sparks', spread: Math.PI * 1.7,
            sp: [120, 380], g: 700, life: [0.3, 0.6], K });
        }, 220),
        setTimeout(() => setTagEcho(null), 420),
      ];
    }
    setAceMode(ace); setAceTargets([]); setSelected([]);
    dispatch({ type: 'LOG', msg: "Select 2 cards from opponent's Scraps to discard." });
  }
  function toggleAceTarget(card) {
    if (strikeRef.current) return;
    // The pile has already played the select for this click (its own
    // onClick and onKeyDown do); this used to play a second one on top.
    // A target being added gets its own small lock under the select.
    if (!aceTargets.some(c => c.id === card.id) && aceTargets.length < 2) playLock();
    setAceTargets(prev => prev.find(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : prev.length < 2 ? [...prev, card] : prev);
  }

  function confirmAce() {
    if (aceTargets.length !== 2 || strikeRef.current) return;
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
    const aiAce = shouldCounterAce(s.aiScraps, s.playerScraps, s.aiScore, s.playerScore)
      ? (s.aiHand.find(c => c.rank === 'A') || null) : null;
    const stillArmed = !!aiAce && s.playerHand.some(c => c.rank === 'A' && c.id !== ace.id);
    const targets = [...aceTargets];
    const sz = szRef.current;
    const k = tableScale();
    const K = motionScale(k);
    // FIRST, as ever: every card that is about to move, where it is now.
    const aceRect = rectOf(ace.id);
    const targetRects = targets.map(c => rectOf(c.id));
    const herRect = aiAce ? rectOf(aiAce.id) : null;

    const st = {
      countered: !!aiAce, committed: false, impacted: false, timers: [], t0: performance.now(),
      notice: aiAce ? { playerAce: ace, aiAce, stillArmed } : null,
      // THE COMMIT, in one place, so the timeline and a skip both land
      // here and it can only ever happen once.
      commit() {
        if (st.committed) return;
        st.committed = true;
        if (aiAce) {
          dispatch({ type: 'AI_COUNTER_ACE', playerAceId: ace.id, aiAceId: aiAce.id });
          setCounterStand(stillArmed);
        } else {
          dispatch({ type: 'PLAYER_ACE_APPLY', aceId: ace.id, targetIds: targets.map(c => c.id) });
        }
        setAceMode(null); setAceTargets([]); setSelected([]);
      },
    };
    strikeRef.current = st;
    const later = (fn, ms) => { st.timers.push(setTimeout(fn, ms)); };
    const rm = prefersReducedMotion();
    setCounterStand(false);
    setStrike({ countered: !!aiAce, impacted: rm });

    const measured = aceRect && targetRects.every(Boolean) && (!aiAce || herRect);

    // REDUCED MOTION, or a table that could not be measured: nothing
    // travels. The hit commits at once and every card that leaves fades
    // where it stands over 280ms. The sounds all still play — a motion
    // preference is not a sound preference.
    if (rm || !measured) {
      st.impacted = true;
      const moves = [];
      const fade = (card, rect, size, extra) => rect && moves.push({ card, fromSize: size,
        motion: fadeMotion(poseOf(rect, size)), rmSafe: true, ...extra });
      if (aiAce) {
        playAceCounter();
        fade(ace, aceRect, sz.hand);
        fade(null, herRect, sz.oppHand, { faceDown: true });
      } else {
        playAceStrike(); playChips();
        targets.forEach((c, i) => fade(c, targetRects[i], sz.pile, { fromScrap: true, kraft: true }));
        fade(ace, aceRect, sz.hand);
      }
      st.commit();
      fly(moves);
      later(endStrike, RM_FADE);
      return;
    }

    const centers = targetRects.map(r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
    const P = { x: (centers[0].x + centers[1].x) / 2, y: (centers[0].y + centers[1].y) / 2 };
    const pileW = CARD_DIMS[sz.pile].w * k, handW = CARD_DIMS[sz.hand].w;

    if (!aiAce) {
      // ── It lands ──
      const m = throwMotion({ rest: poseOf(aceRect, sz.hand), impact: P, K,
        s1: pileW * 1.02 / handW, arc: stack ? 0.12 : 0.18 });
      // The ghost's clock and every timer below start at this instant.
      fly([{ card: ace, fromSize: sz.hand, motion: m, trails: 3, hideIds: [ace.id],
        born: performance.now() }]);
      later(playWhoosh, THROW.draw);
      // Contact. The ring goes out and holds still for the hit-stop.
      later(() => {
        st.impacted = true;
        playAceStrike(); playChips();
        fx.ring(P.x, P.y, { r0: 10 * K, r1: 120 * K, dur: 0.36, color: DS.frost, lw: 6 * K,
          wait: THROW.hold / 1000 });
        setStrike(v => v && { ...v, impacted: true });
      }, m.impactAt);
      // The hit-stop ends: the table jumps, chips fly, the two targets
      // are knocked up and off and the rest of her pile hops. Measured
      // HERE, still in her pile, then committed, then flown.
      later(() => {
        const poses = targets.map((c, i) => ({ ...poseOf(rectOf(c.id) || targetRects[i], sz.pile), id: c.id }));
        st.commit();
        const floorY = window.innerHeight + CARD_DIMS[sz.pile].h * k + 40;
        const pair = knockOffPair(poses, K, floorY);
        fly(pair.map(({ motion, pose }) => ({
          card: targets.find(c => c.id === pose.id), fromScrap: true, kraft: true,
          fromSize: sz.pile, motion })));
        shakeRef.current = shakeElement(frameRef.current, 10 * K, 320);
        fx.burst(P.x, P.y, { n: 26, kind: 'chips', spread: Math.PI * 1.3, sp: [200, 620], g: 1500, K });
        fx.burst(P.x, P.y, { n: 8, kind: 'paper', spread: Math.PI, sp: [150, 420], g: 900,
          life: [0.6, 1], K });
        setJoltKey(n => n + 1);
        later(endStrike, Math.max(THROW.rebound, ...pair.map(p => p.motion.dur)));
      }, m.commitAt);
      return;
    }

    // ── She counters, and wins ──
    // Yours is drawn back and thrown as ever; hers comes up out of her
    // hand and is thrown a beat later, quicker, and meets yours short of
    // her pile: halfway across, and lower than halfway, so hers has come
    // further in less time. Yours is smashed back down past your hand;
    // hers stands up, lit, holds the table, then leaves for the discard
    // pile. Her notice opens once both are gone (endStrike).
    const mine = poseOf(aceRect, sz.hand);
    const meet = { x: mine.x + (P.x - mine.x) * 0.5, y: mine.y + (P.y - mine.y) * 0.45 };
    const cm = clashMotions({ mine, hers: poseOf(herRect, sz.hand), meet, K,
      s1: pileW * 1.1 / handW, floorY: window.innerHeight + CARD_DIMS[sz.pile].h * k + 40 });
    const t0 = performance.now();
    // Hers is second in the list, so it is drawn over yours at the hit.
    fly([
      { card: ace, fromSize: sz.hand, motion: cm.mine, trails: 3, hideIds: [ace.id], born: t0 },
      { card: aiAce, fromSize: sz.hand, motion: cm.hers, trails: 2, hideIds: [aiAce.id], born: t0 },
    ]);
    // Your throw, then hers a beat after it, higher (Stan, 2026-09-17).
    later(playWhoosh, cm.myThrowAt);
    later(playHerWhoosh, cm.herThrowAt);
    later(() => {
      st.impacted = true;
      playClash();
      fx.ring(meet.x, meet.y, { r0: 10 * K, r1: 110 * K, dur: 0.32, color: DS.ember, lw: 6 * K,
        wait: CLASH.hold / 1000 });
      setStrike(v => v && { ...v, impacted: true });
    }, cm.clashAt);
    later(() => {
      st.commit();
      shakeRef.current = shakeElement(frameRef.current, 9 * K, 280);
      // Her embers spray the way her hit went: down her line, at you.
      fx.burst(meet.x, meet.y, { n: 20, kind: 'ember', ang: cm.hitAng, spread: Math.PI * 1.1,
        sp: [180, 560], g: 900, life: [0.35, 0.7], K });
      later(endStrike, cm.dur - cm.commitAt);
    }, cm.commitAt);
  }

  // The lights come back. For a counter, this is when her notice opens:
  // after the two Aces have gone, not over the top of them.
  function endStrike() {
    const st = strikeRef.current;
    if (!st) return;
    st.timers.forEach(clearTimeout);
    strikeRef.current = null;
    setStrike(null);
    if (st.notice) setAiCounterNotice(st.notice);
  }

  // A click or Enter while the attack is in the air lands all of it:
  // the hit commits if it has not (with its sound, so a skipped attack is
  // never a silent one), the effects clear, and the table comes back.
  function finishStrike() {
    const st = strikeRef.current;
    if (!st) return;
    st.timers.forEach(clearTimeout);
    st.timers = [];
    if (!st.impacted) {
      st.impacted = true;
      if (st.countered) playAceCounter(); else playAceStrike();
    }
    st.commit();
    fx.stop();
    if (shakeRef.current) { try { shakeRef.current.cancel(); } catch (err) { /* already gone */ } }
    shakeRef.current = null;
    endStrike();
  }
  const finishStrikeRef = useRef(finishStrike);
  finishStrikeRef.current = finishStrike;
  useEffect(() => () => {
    armTimers.current.forEach(clearTimeout);
    if (strikeRef.current) strikeRef.current.timers.forEach(clearTimeout);
  }, []);

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
  // `afterCounter`: this Ace follows one the player just cancelled.
  // Every entry into the sequence comes through HERE, because this is
  // the one place that asks whether the player actually holds an Ace
  // before offering the counter — see onPlayerCounterAce for the path
  // that used to skip it.
  function handleAiAce(aiAce, targetCards, afterCounter = false) {
    const s = stateRef.current;
    const playerHasAceNow = s.playerHand.some(c => c.rank === 'A');
    if (playerHasAceNow && s.playerScraps.length >= 2) {
      // Step 1: pause and ask the player — targets stay hidden
      dispatch({ type: 'AI_ACE_PENDING', ace: aiAce, targets: targetCards, afterCounter });
    } else {
      // No Ace to counter with — skip straight to Step 2
      openAiAceReveal(aiAce, targetCards, afterCounter);
    }
  }

  function openAiAceReveal(aiAce, targets, afterCounter = false) {
    // Dim the targeted cards in the Scraps pile while their copies
    // are shown center-table
    setScrapsFadeIds(new Set(targets.map(c => c.id)));
    setAiAceReveal({ ace: aiAce, targets, afterCounter });
    dispatch({ type: 'LOG', msg: afterCounter
      ? 'She had another Ace. It removes two cards from your Scraps.'
      : 'Opponent plays an Ace and removes two cards from your Scraps.' });
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
    // counter that one too — IF you still hold an Ace. Scheduled rather
    // than dispatched inline so the cancelled Aces are visibly gone
    // before the next one lands.
    //
    // THE PHANTOM COUNTER (Stan, 2026-09-14: "I counter her first Ace,
    // she plays a second, and I am asked whether I'd like to counter
    // again BUT I only had the one Ace"). This timer used to dispatch
    // AI_ACE_PENDING directly, which opens the counter prompt with no
    // check at all; the check lives in handleAiAce, and only the AI
    // runner's first Ace went through it. Every Ace goes through it
    // now, and the prompt cannot open on a hand with no Ace in it — the
    // effect on `pendingAiAce` below is the same rule stated as an
    // invariant, so no future entry path can reintroduce this.
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
        handleAiAce(nextAce, targets, true);
      }, 900);
    }
  }

  function onPlayerAllowAce() {
    if (!pendingAiAce) return;
    // Step 2: reveal the targeted cards. pendingAiAce stays set
    // (AI_ACE_APPLY clears it) but the counter modal hides while
    // the reveal is up.
    openAiAceReveal(pendingAiAce.ace, pendingAiAce.targets, pendingAiAce.afterCounter);
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
    const discardRect = discardAnchor();
    setAiAceReveal(null);
    setScrapsFadeIds(new Set());
    playAceStrike();
    dispatch({ type: 'AI_ACE_APPLY', aceId: aiAce.id, targetIds: targets.map(c => c.id),
      logMsg: `Opponent's Ace removed ${targets.map(c => c.rank).join(', ')} from your Scraps.` });
    if (discardRect) {
      fly(first.filter(f => f.rect).map((f, i) => ({
        card: f.card, fromRect: f.rect, toRect: discardAnchor(i),
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
  // The AI phase in which the opponent has already COMMITTED her move.
  //
  // Her turn has two halves and the narrator only has copy for the
  // first. Deciding: "She's thinking..." (it said "Opponent is
  // thinking..." until 2026-09-16). Acting: her cards fly, `animating`
  // goes true, `settling` silences the band. Then the cards land and
  // `animating` drops — but the phase does not advance for another 2.1s,
  // so the narrator came BACK with its thinking line over a move she had
  // visibly already made. That is the flash Stan reported on 2026-09-14.
  //
  // Reset at the top of each runner pass rather than compared against
  // the phase alone, because phase names repeat across rounds and a
  // stale 'ai-turn-1a' would silence a genuine think in round three.
  const [aiMoveDone, setAiMoveDone] = useState(null);
  // The explainer, mirrored into a ref so the RUNNER can check it too.
  // Effects flush in declaration order and this gate is declared above
  // the effect that opens the explainer, so on the tick where an Ace
  // lands the gate reads `aceDrawnCard` as still false, clears the AI
  // to act, and only learns about the box on the NEXT pass.
  const aceDrawnRef = useRef(null);
  aceDrawnRef.current = aceDrawnCard;
  useEffect(() => {
    if (!AI_TURN_PHASES.includes(phase)) { setAiGo(null); return; }
    // A deal is pending or in the air. `animating` alone does not cover
    // it: the Hand 2 cards sit hidden in their gaps for a beat BEFORE
    // their wave launches, with nothing flying, and she would have
    // started her turn in that beat.
    if (dealHold) { setAiGo(null); return; }
    // Your Ace attack is still playing out, or its lights are still down.
    // Held rather than merely waited on, because a counter's notice opens
    // at the END of the attack, in the same render that clears `strike`.
    if (strike) { setAiGo(null); return; }
    if (animating) return;            // your cards are still landing
    if (aiCounterNotice) return;      // you are still reading the counter
    // The Ace explainer is up: NOTHING moves until OKAY. `setAiGo(null)`
    // rather than a bare `return`, because a bare return leaves a
    // previously-set aiGo standing and the runner keeps its timers —
    // which is exactly what Stan saw, the opponent's hand ruffling and
    // trading behind the lightbox. Clearing it tears the runner's
    // timers down through its own cleanup, and the turn restarts intact
    // when the box closes: the runner is idempotent from the top of a
    // phase, and its first action is 800ms in, so nothing has happened
    // yet to repeat.
    if (aceDrawnCard) { setAiGo(null); return; }
    setAiGo(phase);
  }, [phase, animating, aiCounterNotice, aceDrawnCard, dealHold, strike]);

  useEffect(() => {
    if (!aiGo || aiGo !== phase) return;
    setAiMoveDone(null);
    const timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));

    const FLIGHT_SETTLE = 120;   // the board is already still here
    // ONE ruffle, not a wave. The old gesture lifted every card 22px
    // in sequence over 800ms, which read as the opponent's cards
    // jumping around on their own rather than as somebody thinking.
    // A ruffle is one quick pass across the hand — a small lift and
    // lean, tightly staggered, done once — the way a real hand gets
    // riffled while its owner decides. It resolves before the scrap
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
      // Belt and braces against the explainer. The gate above tears
      // these timers down, but a timer that has already been handed to
      // the event loop cannot be recalled — this is the check that
      // actually guarantees the opponent does not move behind the box.
      if (aceDrawnRef.current) return;

      const action = aiDecide(s.aiHand, s.aiScraps, s.playerScraps, s.deck, difficulty, phase, s.aiScore, s.playerScore);

      if (action.type === 'trade' && action.cards.length > 0) {
        // Animate AI selection: lift cards, then fly to scraps
        setAiSignaledIds(new Set(action.cards.map(c => c.id)));
        T(() => {
          // Same FLIP shape as the player's trade: measure the lifted
          // cards where they sit, commit, then animate the delta.
          const first = action.cards.map(c => ({ card: c, rect: rectOf(c.id) }));
          const deckRect = deckAnchor();
          const drawCount = action.cards.reduce((sum, c) => sum + scrapValue(c), 0);
          const drawn = stateRef.current.deck.slice(0, drawCount);
          setAiSignaledIds(new Set());
          setAiMoveDone(phase);
          dispatch({ type: 'AI_TRADE_APPLY', cards: action.cards });
          const STEP = 90;
          const moves = first.filter(f => f.rect).map((f, i) => ({
            card: f.card, faceDown: true, fromRect: f.rect, toId: f.card.id,
            fromSize: szRef.current.oppHand, toSize: szRef.current.pile, toScrap: true,
            arc: first.length === 1 ? 0.35 : (i / (first.length - 1) - 0.5) * 1.2,
            delay: i * STEP,
          }));
          // ONLY the scrapped cards fly. The replacement draws used
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
          // fade up in place once the scrapped cards have landed.
          // The replacement draws fly in from the deck AFTER the
          // scrapped cards have landed, exactly as the player's own
          // trade does (see executeTrade). That ordering is the whole
          // point of the gesture: cards leave the hand and their slots
          // stand empty, then new ones arrive from the deck to fill
          // them. A card is hidden while it is in flight, so the gap is
          // real rather than drawn.
          //
          // They briefly faded in place instead, which removed the gap
          // entirely — the hand refilled itself the instant the trade
          // committed, so nothing ever looked like it left. That was a
          // wrong fix for the vanishing-cards bug, whose real cause was
          // the ruffle stripping each card's fan transform.
          const LAND = Math.max(0, first.length - 1) * STEP + 320;
          if (deckRect && drawn.length) {
            drawn.forEach((card, i) => moves.push({
              card: null, faceDown: true, fromRect: deckRect, toId: card.id,
              fromSize: szRef.current.pile, toSize: szRef.current.oppHand,
              arc: ((i % 3) - 1) * 0.5, delay: LAND + i * 120,
            }));
            scheduleDraws(drawn.length, LAND);
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
        setAiMoveDone(phase);
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
      // AI already signaled first — both signals are in. A beat, then
      // the reveal phase, where SHOW 'EM waits to be pressed exactly as
      // it does when you signalled first.
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
    const curPhase = phase;
    // The outcome cue is not played here any more. The reveal plays it
    // as the score rolls (RevealScene in interstitials.jsx), which is
    // the moment the point actually lands; here was two seconds early.
    //
    // Whether this result ENDS THE MATCH is worked out the same way the
    // reducer will when it applies these points, because the reveal
    // has to know: a match-ending result runs straight on into the
    // match screen and never hands back.
    const endsIt = !!checkWin(
      playerScore + (winner === 'player' ? pts : 0),
      aiScore + (winner === 'ai' ? pts : 0));
    const action = { type: 'SMALL_HAND_SCORED', winner, pts,
      pName: pH?.name || '', aName: aH?.name || '', fromPhase: curPhase };
    setSelected([]);
    setAiSignaledIds(new Set());   // clear toggled AI cards behind the stage
    // A match-ending result commits AT ONCE: `gameOver` is what records
    // the stats and freezes the phase machine, and the reveal owns the
    // screen from here to NEW GAME. Anything else commits on the tap
    // that dismisses the reveal — the phase it leaves behind runs the
    // next step (see the hand-offs below).
    if (endsIt) dispatch(action);
    setStage({
      kind: 'reveal', key: `${roundNum}-${curPhase}`,
      which: curPhase === 'reveal-1' ? 'hand1' : 'hand2',
      playerCards: [...playerPlayed], aiCards: [...aiPlayed],
      playerHandName: pH?.name || '', aiHandName: aH?.name || '',
      winner, pts, endsIt,
      before: { p: playerScore, a: aiScore },
      // Hand 1's PLAY HAND 2 commits the score AND the second hand's
      // cards in one step — see dealSecondHand. Hand 2's continue still
      // commits the score alone, and `scraps-reveal` takes it from there.
      onContinue: curPhase === 'reveal-1'
        ? () => dealSecondHand(action)
        : () => { setStage(null); dispatch(action); },
    });
  }

  // PLAY HAND 2. The score and the refill commit together, and the new
  // cards go into their slots HIDDEN, so the table comes back with the
  // gaps for them already open and the held-over cards moving straight
  // to where they belong (Stan, 2026-09-16: "identify what ranks are
  // about to be dealt, open those gaps in the hand, and fill them
  // left-to-right").
  //
  // It used to take two steps with the table showing in between:
  // SMALL_HAND_SCORED took the played cards out and the held-over ones
  // closed up into the middle of the fan, then REPLENISH 220ms later
  // pushed them back out again to make room — so every Hand 2 opened
  // with your cards sliding in and then sliding back.
  //
  // That split existed to let the refill be worked out AFTER the score
  // committed, from the hands the score leaves behind. Those hands are
  // simply the current ones minus the two played sets, which is exactly
  // and only what SMALL_HAND_SCORED removes — so `planReplenish`, the
  // same function REPLENISH runs, names the identical cards from the
  // snapshot taken here. reducer.test.js holds the two to that.
  //
  // The wave waits a beat (HANDOFF.deal) so the gaps are seen opening
  // first, and dealHold keeps the narrator, the buttons and the opponent
  // quiet from this press until the last card is down.
  function dealSecondHand(scored) {
    const s = stateRef.current;
    const played = new Set([...(s.playerPlayed || []), ...(s.aiPlayed || [])].map(c => c.id));
    const plan = planReplenish(
      s.playerHand.filter(c => !played.has(c.id)),
      s.aiHand.filter(c => !played.has(c.id)), s.deck);
    setStage(null);
    setSelected([]);
    dispatch(scored);
    dispatch({ type: 'REPLENISH' });
    setPendingDealIds(new Set([...plan.player, ...plan.ai].map(c => c.id)));
    setDealStage('pending');
    clearTimeout(dealTimer.current);
    dealTimer.current = setTimeout(() => dealWave(plan.player, plan.ai), HANDOFF.deal);
  }

  // The table clearing itself down to the two Scraps piles. Measured
  // FIRST, committed, THEN flown — the FLIP order every move on this
  // table uses, and the reason the ghosts can be dropped at any frame
  // and still leave a correct board. Face-down cards fly as backs
  // (`card: null, faceDown: true`), the same shape dealWave uses for
  // the opponent's seat.
  function sweepHandsAway() {
    const s = stateRef.current;
    if (!s.playerHand.length && !s.aiHand.length) return;
    const going = [
      ...s.playerHand.map(c => ({ card: c, faceDown: false, size: szRef.current.hand })),
      ...s.aiHand.map(c => ({ card: c, faceDown: true, size: szRef.current.oppHand })),
    ].map(g => ({ ...g, rect: rectOf(g.card.id) })).filter(g => g.rect);
    dispatch({ type: 'HANDS_DISCARDED' });
    if (!going.length) return;
    playScrap();
    fly(going.map((g, i) => ({
      card: g.faceDown ? null : g.card, faceDown: g.faceDown,
      fromRect: g.rect, toRect: discardAnchor(i),
      fromSize: g.size, toSize: szRef.current.pile,
      arc: ((i % 3) - 1) * 0.4, delay: i * SCRAPS_HANDOFF.step,
    })));
  }

  function resolveScrap() {
    // Leaving the beat: the next round enters it fresh.
    setScrapsReady(false);
    // Always resolves now, including when a pile is empty: an empty
    // pile is a hand that loses to anything, and the other player takes
    // the 2 points. This used to bail out on a null and leave the game
    // stranded in `scraps-reveal` with no way forward.
    const out = scoreScrapsOutcome(playerScraps, aiScraps, roundWins);
    const { pPts, aPts, winner, cleanSweep, aiSweep, pB, aB } = out;
    const pBestIds = new Set(getActiveHandCards(pB).map(c => c.id));
    const aBestIds = new Set(getActiveHandCards(aB).map(c => c.id));
    const endsIt = !!checkWin(playerScore + pPts, aiScore + aPts);
    const action = { type: 'SCRAPS_SCORED', pPts, aPts, winner, cleanSweep, aiSweep, pName: pB.name };
    if (endsIt) dispatch(action);
    setStage({
      kind: 'reveal', key: `${roundNum}-scraps`, which: 'scraps',
      playerCards: [...playerScraps].slice(0, 7), aiCards: [...aiScraps].slice(0, 7),
      playerHandName: pB.name, aiHandName: aB.name,
      playerBestIds: pBestIds, aiBestIds: aBestIds,
      // The Scraps hand is 2. A Clean Sweep's third point is the beat's
      // own tick, whichever side swept — the reveal reads `cleanSweep`
      // and `aiSweep` and adds it there.
      winner, pts: winner === 'tie' ? 0 : 2, cleanSweep, aiSweep, endsIt,
      before: { p: playerScore, a: aiScore },
      // The Scraps reveal sweeps itself off the table and THEN hands
      // back. The score commits and the next round starts in the same
      // render, so START_ROUND lands with SCRAPS_SCORED and the ROUND N
      // sign appears on the wood the sweep has just cleared, with no
      // frame of the old round's table between the two.
      onSwept: () => { dispatch(action); startNewRound(true); },
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
  // `scraps-reveal` is a beat the player acts on now, not a phase the
  // game passes through: the table clears down to the two Scraps piles
  // and waits on PLAY SCRAPS HAND. `scrapsAsk` is the half of it that
  // has a question in it; before that the sweep is still running.
  const isScrapsHandoff = phase === 'scraps-reveal';
  const scrapsAsk = isScrapsHandoff && scrapsReady;
  const selectedInHand = selected.filter(c => playerHand.find(h => h.id === c.id));
  const selIds = new Set(selectedInHand.map(c => c.id));
  const aceTargetIds = new Set(aceTargets.map(c => c.id));
  const scrapsDiscardIds = new Set(scrapsDiscard.map(c => c.id));
  const selValid = isSignal && !signalLocked && isValidSignal(selectedInHand);
  const playerHasAce = playerHand.some(c => c.rank === 'A');
  // Live trade projection. Computed here rather than inside
  // doScrap so the button can state the outcome BEFORE the
  // click instead of the error firing after it.
  const tradeDraw = selectedInHand.reduce((n, c) => n + scrapValue(c), 0);
  const tradeNetHand = (playerHand.length - selectedInHand.length) + tradeDraw;
  const tradeOverLimit = selectedInHand.length > 0 && tradeNetHand > 7;
  // Not while a deal is still landing: the lean is the "your turn" cue,
  // and it arrives with the narrator, not before it (see dealStage).
  const glowHand = !dealHold && ((isPlayerTurn && !aceMode && !isScrapsDiscardMode) || (isSignal && !signalLocked));
  // The Play Ace control is rendered by FannedHand, inside the same
  // wrapper as its card, so the two lean together.
  // ATTACK waits for its own card. The tag used to mount the instant
  // an Ace entered state — which is BEFORE the card has flown into the
  // fan — so the button hung in the air over an empty slot and the Ace
  // arrived underneath it afterwards. It now waits for the flight to
  // land (`!animating`) and for the Ace explainer to be dismissed, and
  // then fades and lifts into place over ~260ms rather than snapping in.
  const canOfferAce = isPlayerTurn && !aceMode && !isScrapsDiscardMode
    && !pendingAiAce && !animating && !aceDrawnCard && !dealHold && !strike;
  const aceSlot = useCallback((card, width) => {
    if (!canOfferAce || card.rank !== 'A') return null;
    return (
      <div style={{animation:'aceTagIn 0.26s cubic-bezier(.22,1,.36,1) both'}}>
        <AceTag onClick={(e) => doPlayAce(card, e)} disabled={aiScraps.length < 2}
          width={width}/>
      </div>
    );
  }, [canOfferAce, aiScraps.length]);
  const glowPlayerScraps = isScrapsDiscardMode;
  // "Act here" is for picking. Once REMOVE is pressed the pile is a
  // target, not a choice, and the glow goes.
  const glowOppScraps = !!aceMode && !strike;
  // The attack's dim, from ATTACK until the lights come back. Three
  // things stay lit above it: her pile (with its buttons), the narrator
  // band, and the armed Ace itself. When she counters it stays down
  // under her notice until you close it (her notice only ever opens at
  // the end of a clash): lifting it as the notice's own backdrop came in
  // flipped the table from warm dark to green in one beat.
  const dimOn = !!aceMode || !!strike || !!aiCounterNotice;
  const rmNow = prefersReducedMotion();

  // No-legal-trade handling: if no trade can keep the hand at 7 or
  // fewer, the only legal move is an Ace (when the opponent's
  // Scraps has 2+ cards) — otherwise the turn is skipped.
  const noLegalTrade = isPlayerTurn && playerHand.length > 0 && !hasLegalTrade(playerHand)
    && !isScrapsDiscardMode && !aceMode;
  const forcedAce = noLegalTrade && playerHasAce && aiScraps.length >= 2;
  const mustSkip  = noLegalTrade && !forcedAce && !pendingAiAce;

  // THE INVARIANT behind the counter prompt: it is never asked of a
  // player with no Ace. If the pending Ace is ever on the table while
  // the hand holds none — whatever path put it there — it resolves the
  // way "Let It Happen" would, straight to the reveal. Belt and braces
  // over the routing fix in onPlayerCounterAce; see the note there.
  useEffect(() => {
    if (!pendingAiAce || aiAceReveal || playerHasAce) return;
    openAiAceReveal(pendingAiAce.ace, pendingAiAce.targets, pendingAiAce.afterCounter);
  }, [pendingAiAce, aiAceReveal, playerHasAce]);

  // The deal has landed: lift the hold and let the narrator in. A skip
  // (a click anywhere mid-deal drops every ghost) lands here too, the
  // moment `animating` clears, so skipping a deal also skips the wait.
  useEffect(() => {
    if (dealStage !== 'dealing' || animating) return;
    setDealStage(null);
    setNarratorEpoch(n => n + 1);
  }, [dealStage, animating]);

  // THE DIM'S GEOMETRY. The dim lives inside the scaled table (see
  // `dimLayer`), and the table is scaled and centred inside its frame, so
  // on a table shrunk to fit there is bare wood beside it and below it
  // that the dim has to reach too. It is measured to cover EXACTLY the
  // frame, and no further: an overhang past the frame is overflow, and
  // overflow in a clipped box is something to scroll (FitBox's
  // `fit-frame` note has the day that bit). The pool of light sits on
  // her pile, from her real cards. Everything is in the table's own
  // unscaled pixels, which is what the dim is laid out in.
  //
  // Measured when the dim comes on and whenever the table re-lays itself
  // out under it. Kept through the fade-out, so the wood at the edges
  // does not pop back early, then dropped: stale overhangs after a later
  // resize could reach past the frame.
  useLayoutEffect(() => {
    if (!dimOn) {
      const t = setTimeout(() => setDimSpot(null), 450);
      return () => clearTimeout(t);
    }
    const dim = dimRef.current, frame = frameRef.current;
    const table = dim && dim.offsetParent;
    if (!dim || !frame || !table || !table.offsetWidth) return undefined;
    // The overhangs come from LAYOUT sizes and the scale FitBox settled
    // on, never from the transform on screen, which may still be easing
    // toward it: arming an attack adds REMOVE under her pile, the table
    // grows, and FitBox rescales it a frame or two later. The table is
    // centred in the frame and hangs from its top edge.
    const k = tableK || 1;
    const W = table.offsetWidth, H = table.offsetHeight;
    const side = Math.max(0, (frame.clientWidth - W * k) / 2 / k);
    const spot = { l: side, r: side, t: 0, b: Math.max(0, (frame.clientHeight - H * k) / k),
      rx: 0, ry: 0, cx: 0, cy: 0 };
    // Her pile, in the table's own pixels. Rects at any instant give
    // this correctly, eased scale or not: both ends are read together.
    const tr = table.getBoundingClientRect();
    const kv = tr.width / W || 1;
    const rects = stateRef.current.aiScraps.map(c => rectOf(c.id)).filter(Boolean);
    if (rects.length) {
      const d = CARD_DIMS[szRef.current.pile];
      const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
      const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
      spot.cx = ((left + right) / 2 - tr.left) / kv + side;
      spot.cy = ((top + bottom) / 2 - tr.top) / kv;
      spot.rx = Math.max((right - left) / kv * 0.95, d.w * 2.4);
      spot.ry = d.h * 1.9;
    }
    setDimSpot(spot);
    return undefined;
  }, [dimOn, vp.w, vp.h, stack, tight, rectOf, tableK]);

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
    // Nor over a deal. An Ace dealt into Hand 2 is IN the hand, hidden in
    // its gap, for a beat before its card flies — with nothing animating
    // yet, so the check below alone would open the box over an empty slot.
    if (dealHold) return;
    // Wait for the cards to finish flying in. The box used to open the
    // moment an Ace entered state, which is BEFORE the draw animation
    // runs — so it covered the table while your own cards were still
    // in the air behind it.
    if (animating) return;
    if (playerHasAce) {
      aceHintShownRef.current = true;
      setAceDrawnCard(playerHand.find(c => c.rank === 'A'));
    }
  }, [playerHasAce, showInterstitial, pendingAiAce, aiAceReveal, aceMode, animating, dealHold]);

  // ── Skip the animation ─────────────────────────────────────
  // A click anywhere, Enter, or Space lands every in-flight card
  // at once. Safe by construction: the state commit already
  // happened, so skipping only drops the ghosts and unhides the
  // real cards, which are already sitting in their final places.
  useEffect(() => {
    if (!animating) return;
    const onSkip = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      // The attack is the one flight worth protecting from its own
      // button: the second click of a double-click on REMOVE, a key held
      // down, or a second tap right behind the first would otherwise skip
      // the whole throw it just started. A deliberate click still lands it.
      const st = strikeRef.current;
      if (st && (e.detail > 1 || e.repeat || performance.now() - st.t0 < 250)) return;
      clearDrawSfx();
      // An Ace attack in the air commits and clears in the same beat, so
      // dropping its ghosts never leaves the Ace back in your hand.
      finishStrikeRef.current();
      skipAll();
    };
    window.addEventListener('mousedown', onSkip);
    window.addEventListener('keydown', onSkip);
    return () => {
      window.removeEventListener('mousedown', onSkip);
      window.removeEventListener('keydown', onSkip);
    };
  }, [animating, skipAll, clearDrawSfx]);

  // ── The hand-offs of a round ───────────────────────────────
  //
  // Hand 2's no longer lives here: PLAY HAND 2 commits the score and
  // the refill together and schedules its own deal (dealSecondHand), so
  // the `replenish` phase is passed through inside one commit and never
  // rendered. What is left is the Scraps one. Its results screen commits
  // the score, and the phase it leaves behind runs the sweep — an effect
  // keyed on the phase runs on the other side of the commit, where the
  // hands it sweeps are real. Its timings are SCRAPS_HANDOFF at the top
  // of this file.

  // The self-running reveal (the `autoReveal` effect) sat here until
  // 2026-09-14. Every reveal is pressed for now — see SHOW 'EM below.
  useEffect(() => {
    if (revealData || gameOver) return undefined;
    if (phase === 'scraps-reveal') {
      const sweep = setTimeout(() => sweepHandsAway(), SCRAPS_HANDOFF.sweep);
      const ask   = setTimeout(() => setScrapsReady(true), SCRAPS_HANDOFF.ready);
      return () => { clearTimeout(sweep); clearTimeout(ask); };
    }
    // 'round-end' no longer runs a timer here. The Scraps reveal starts
    // the next round itself from `onSwept` (resolveScrap), so that
    // START_ROUND lands in the same render as SCRAPS_SCORED and the
    // ROUND N sign appears on the wood the sweep has just cleared. A
    // hand-off here would have shown the OLD round's table between the
    // two — the exact cut the whole redesign exists to remove.
    return undefined;
  }, [phase, revealData, gameOver]);

  let hint = '';
  // The rendered form, when the copy wants emphasis the announcer
  // cannot carry. Falls back to `hint` whenever it is null.
  let hintNode = null;
  // Set when the narrator is running its collapsed form. It changes the
  // WORDS only — the type size is fixed, because a narrator that also
  // resized made the panel jump between turns.
  let hintShort = false;
  // Settling keeps its own branch with an empty string on purpose:
  // dropping the branch entirely would let the next condition fill the
  // hint line while cards are still mid-flight. Silent, not absent.
  // The deal first, the words after (dealStage). The band is not merely
  // quiet here, it is EMPTY — no panel, no buttons — and the panel
  // animates in with its first line once the last card lands.
  if (dealHold) hint = '';
  else if (settling) hint = '';
  else if (aiAceReveal) hint = aiAceReveal.afterCounter
    ? 'She had another Ace. It discards two cards from your Scraps.'
    : "Opponent's Ace discards two cards from your Scraps.";
  else if (pendingAiAce) hint = pendingAiAce.afterCounter
    ? 'She had another Ace. Counter again, or let it happen?'
    : 'Opponent played an Ace. Counter or let it happen?';
  else if (isScrapsDiscardMode) {
    const moving = pendingTrade ? pendingTrade.cards.length : 0;
    const lockedInScraps = playerScraps.some(c => !c.eligibleForDiscard);
    hint = `That would put your Scraps at ${playerScraps.length + moving}. `
      + `Pick ${scrapsOverflow} to discard first.`
      + (lockedInScraps ? ' Dimmed cards were placed this turn and cannot go.' : '');
  }
  // The running count came OFF this line on 2026-09-13 (Stan). It is
  // still in the REMOVE button, which is where a count belongs — on the
  // control it gates. Saying it twice made the instruction re-render on
  // every tap and read as a progress bar rather than a sentence.
  // Quiet while the Ace is in the air: the throw is the sentence.
  else if (strike) hint = '';
  else if (aceMode) hint = "Select 2 cards from opponent's Scraps to discard.";
  else if (forcedAce) hint = 'Every card in your hand draws more than you have room for. Your only legal move is to attack with an Ace.';
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
    // the fourth scrap of a round nobody is reading it.
    // Full text on the first player turn of ROUND 1 only. By round 2 a
    // player has taken four scrap turns and does not need the sentence
    // again; the short form carries from there on.
    if (roundNum === 1 && (fullHint.round !== roundNum || fullHint.turn === currentTurn)) {
      const base = 'Pick cards to move into your Scraps, then draw fresh ones. Seven card limits.';
      if (playerHasAce && aiScraps.length >= 2) hint = base + ' Or attack with the Ace in your hand.';
      else if (playerHasAce) hint = base + " Your Ace can't attack yet: their Scraps needs 2 cards.";
      else hint = base;
    } else {
      hintShort = true;
      if (playerHasAce && aiScraps.length >= 2) hint = 'Your turn. Scrap cards, or attack with your Ace.';
      else hint = 'Your turn. Scrap cards.';
    }
  }
  else if (isAiSignaling) hint = 'Opponent is choosing her signal...';
  // Stan's copy, 2026-09-14: the count and nothing else. The line used
  // to append "Select any legal poker hand of your own", which is what
  // the button beneath it already says, and the instruction crowded out
  // the one number the beat is about.
  else if (isSignal && !signalLocked && aiSignal != null) {
    hint = `Opponent signals ${aiSignal}.`;
  }
  else if (isSignal && !signalLocked) {
    hint = 'Select any legal poker hand. Opponent sees how many cards you select before she makes her play.';
    // The same sentence with the one load-bearing word emphasised. It
    // is the whole point of a signal — she learns the COUNT and nothing
    // else — and it was the word a reader skated over. Kept as a second
    // value rather than turned into markup in `hint` itself, because
    // `hint` is also what GameAnnouncer reads to a screen reader and a
    // React element is not a string.
    hintNode = (<>Select any legal poker hand. Opponent sees how <b style={{color:DS.frost}}>many</b> cards
      you select before she makes her play.</>);
  }
  // There is nobody to wait for when she signalled first: her count is
  // already on the table and this is the 700ms before SHOW 'EM appears.
  else if (isSignal && signalLocked) hint = aiSignal != null ? 'Signal locked.' : 'Signal locked. Waiting for her...';
  // The reveal phase says NOTHING (Stan, 2026-09-14: "omit 'Both signals
  // in.' — just centre the SHOW 'EM button in the narrator box"). The
  // button is the whole band there; see `showEm` below.
  else if (isReveal) hint = '';
  // Only while she is actually deciding. Once she has committed, the
  // band stays quiet through the handover — the log line already says
  // what she did, and the alternative is the narrator announcing a
  // thought after the move. See aiMoveDone.
  else if (isAiThinking && aiMoveDone !== phase) hint = 'She’s thinking...';
  // The hand-offs. `replenish` has no line: PLAY HAND 2 passes through
  // it inside one commit (dealSecondHand), and the deal hold keeps the
  // band empty until that deal lands anyway.
  // Stan's copy, 2026-09-15. Silent while the sweep runs: the table
  // clearing itself is the sentence, and a narrator talking over it
  // would be the third thing moving.
  else if (isScrapsHandoff) hint = scrapsAsk ? 'Two hands done. Time for Scraps.' : '';
  else if (phase === 'round-end') hint = 'Round complete.';

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

  // The banner owns its own threshold now that it is a MATCH POINT
  // warning rather than a win-by-2 explainer — see hud.jsx. This only
  // has to know the game is still running.
  // The MATCH POINT banner that sat under the top bar is gone
  // (Stan, 2026-09-14): the stage covers the HUD exactly when the
  // stakes peak, so the warning lives on the stage now — a line on
  // the ROUND sign and under the reveal's score row.

  // `gameOver` used to short-circuit this whole render into WinScreen or
  // LoseScreen. It no longer does: the reveal that ended the match is
  // still up, on the table, running on into the match screen (see
  // resolveSmallHand / resolveScrap), and the frozen table renders
  // underneath it exactly as it did before the reveal opened.

  // ── Table pieces ───────────────────────────────────────────
  // Each piece is built once and composed two ways below. Every
  // ref the motion system measures rides on the piece itself, so
  // a layout change carries each anchor with the thing it anchors
  // and a card in flight during a rotation still lands on its
  // real destination.
  // ── The two pile buttons ───────────────────────────────────
  // DISCARD (the over-7 trade) and REMOVE (the Ace strike) each act on
  // ONE pile, and in the wide layout that pile is in the right gutter,
  // a long way from the narrator band. Stan (2026-09-14): "move the
  // DISCARD button to directly above the Scraps hand to further
  // clarify where the action is. Same for REMOVE: beneath the
  // opponent's Scraps." Stacked, the piles sit against the band
  // anyway, so the buttons stay in it. Compact sizing on the pile,
  // because two of them have to share a 340px column.
  const pileBtnCompact = stack ? tight : true;
  const discardBtns = isScrapsDiscardMode ? (
    <>
      <BigBtn compact={pileBtnCompact} onClick={confirmScrapsDiscard} disabled={scrapsDiscard.length!==scrapsOverflow}>
        Discard ({scrapsDiscard.length}/{scrapsOverflow})
      </BigBtn>
      <BigBtn variant="ghost" compact={pileBtnCompact} onClick={cancelScrapsDiscard}>Cancel</BigBtn>
    </>
  ) : null;
  const removePair = (
    <>
      <BigBtn compact={pileBtnCompact} onClick={confirmAce} disabled={aceTargets.length!==2}>
        Remove ({aceTargets.length}/2)
      </BigBtn>
      <BigBtn variant="ghost" compact={pileBtnCompact} onClick={()=>{setAceMode(null);setAceTargets([]);}}>Cancel</BigBtn>
    </>
  );
  const removeBtns = aceMode && !strike ? removePair : null;
  // `hidden` keeps a row's space and takes away the row. Under her pile
  // the REMOVE row stays laid out, invisible, for the whole attack: that
  // column sets the wide table's height, so dropping the row the moment
  // REMOVE is pressed rescaled the table while the Ace was in the air
  // and it landed ~18px off the gap it was aimed at (1024x662).
  const pileBtnRow = (btns, hidden = false) => btns && (
    <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',alignSelf:'stretch',
      animation:'errRise 0.26s cubic-bezier(.22,1,.36,1)',visibility:hidden?'hidden':undefined}}>
      {btns}
    </div>
  );

  const oppHandEl = (
    <div ref={aiHandRef} style={{
      opacity:isAiThinking?1:isPlayerTurn?0.5:1,
      transition:'opacity 0.5s',display:'flex',justifyContent:'center',
      flexShrink:0}}>
      <FannedHand cards={aiHand} faceDown aiSignaledIds={aiSignaledIds}
        activeWiggle={isAiThinking} waveIds={waveIds}
        registerEl={registerCard} hiddenIds={allHiddenIds}
        showEmpty={!isScrapsHandoff}
        size={SZ.oppHand} maxWidth={stack?Math.max(120,railW-152):null}/>
    </div>
  );

  const oppScrapsEl = (
    <div ref={aiScrapsRef} style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0,
      alignItems:stack?'stretch':'flex-start',
      // Fully opaque through the whole attack, never 0.75: an opacity
      // below 1 is a stacking context, and it would pull the pile back
      // down under the attack's dim.
      opacity:dimOn?1:isAiThinking?1:0.75,transition:'opacity 0.4s'}}>
      {!stack&&<RoundProgressIndicator phase={phase} compact={tight}/>}
      {/* Her pile and its REMOVE row, lifted above the attack's dim
          while it is down (z 31 over the dim's 30). */}
      <div style={{display:'flex',flexDirection:'column',gap:8,
        alignItems:stack?'stretch':'flex-start',
        position:'relative',zIndex:dimOn?31:undefined}}>
        <HorizontalScrapsZone cards={aceMode?aiScraps.map(c=>({...c,eligibleForDiscard:true})):aiScraps}
          label="Opponent's Scraps" selectable={!!aceMode&&!strike}
          selectedIds={aceTargetIds} onCardClick={toggleAceTarget}
          registerEl={registerCard} hiddenIds={allHiddenIds}
          isOpponent={true} glowZone={glowOppScraps}
          joltKey={joltKey}
          size={SZ.pile} width={stack?railW:340} fill={stack}/>
        {/* REMOVE, under her pile, in the wide layout — see pileBtns. */}
        {!stack&&(aceMode||strike)&&pileBtnRow(removePair, !!strike)}
      </div>
    </div>
  );

  // The deck-over-discard rail that used to live here is GONE (Stan,
  // 2026-09-13). It was the last piece of table furniture that was not
  // part of the game: two labelled piles a player never touched, which
  // cost the wide layout a gutter column and the stacked one a row, on
  // the axis each of those layouts is shortest on. Cards now come in
  // over the dealer's edge of the screen and thrown-away cards spin off
  // the left one — see deckAnchor / discardAnchor above.
  //
  // The one thing that went with it is the live DECK COUNT, which no
  // surface states any more. Flagged rather than replaced: the deck is
  // rebuilt every round and a round cannot exhaust it, so the number
  // was reference a player never had to act on.

  // ACTION ZONE — the game's narrator. In the wide layout it is a
  // fixed-width panel in the middle of the table; stacked, it is
  // a full-width band, because there is nothing to sit beside it.
  // Does the narrator band have anything in it this turn? The panel
  // used to render its background, border and padding unconditionally,
  // so a translucent empty box sat in the middle of the table during
  // every AI turn and every settle. It renders only when it has
  // something to say or something to press.
  // The over-7 DISCARD and the Ace's REMOVE sit in this band only when
  // the layout is stacked; in the wide layout they sit on their piles
  // (see pileBtns below), so they do not count as the band's buttons.
  const hasActionButtons = !dealHold && ((stack && isScrapsDiscardMode)
    || (isPlayerTurn && !aceMode && !isScrapsDiscardMode && !pendingAiAce && !forcedAce && !counterStand)
    || (stack && aceMode && !strike) || (counterStand && !strike)
    || (isSignal && !signalLocked) || isReveal || scrapsAsk
    || (pendingAiAce && !aiAceReveal));
  // SHOW 'EM owns the whole band: no narrator line above it, the button
  // centred in a box the same height as a normal turn's, so the table
  // does not jump between the signal and the reveal.
  const showEm = isReveal;
  // The band's TALL CASE, derived from the same numbers the band is
  // built out of rather than measured once in a browser and left to
  // drift. Three real cases, because `stack` and `tight` disagree on a
  // landscape phone: small type inside the wide layout's roomier box.
  //   stack        24 + 66.3 + 8  + 54 = 152
  //   wide, tight  34 + 66.3 + 10 + 62 = 172
  //   wide, roomy  34 + 97.5 + 10 + 62 = 204
  const NARRATOR_H = Math.round(
      (stack ? 24 : 34)           // padding, top + bottom
    + (tight ? 17 : 25) * 3.9     // the narrator's three-line slot
    + (stack ? 8 : 10)            // the gap above the buttons
    + (stack ? 54 : 62));         // the tallest button row it can hold
  const narratorSilent = !hint && !tradeError && !hasActionButtons;

  // THE SLOT AND THE PANEL ARE TWO DIFFERENT THINGS, and that is the
  // whole fix for the table jumping between turns (Stan, 2026-09-15:
  // "the narrator box enlarges, causing everything else to snap into a
  // new size ... hold the non-narrator-box elements at a certain
  // distance").
  //
  // FitBox scales the table by its natural height, so every pixel this
  // band gains or loses resizes THE OPPONENT'S HAND. The band already
  // reserved three lines for the copy, which covered most turns — but
  // it still collapsed to 64px when it had nothing to say and grew a
  // button row when it did, and each of those moved every card on the
  // table. So the SLOT is NARRATOR_H at all times and the PANEL floats
  // centred inside it: the chrome still shrinks to whatever is being
  // said, the cards never hear about it.
  //
  // `minHeight`, not `height`: a turn whose buttons wrap to two rows
  // grows the slot rather than overflowing it. Rare, and no worse than
  // what the band did before.
  //
  // The slot also carries the flex-basis the layout is built around.
  // Returning null when the band had nothing to say collapsed the two
  // gutters together, and because the left gutter aligns its contents
  // `flex-end`, the deck slid from the left margin to the middle of the
  // table and sat under the narrator text that arrived a moment later.
  const actionEl = (
    <div style={{
      ...(stack
        ? {width:'100%', flexShrink:0}
        : {flexShrink:1, flexBasis:760, maxWidth:760}),
      minHeight: NARRATOR_H,
      display:'flex',flexDirection:'column',justifyContent:'center',
      // Above the attack's dim, so the instruction and (stacked) REMOVE
      // read at full strength while the table around them is dark.
      position:'relative',zIndex:dimOn?31:undefined,
    }}>
    {/* THE ENTRANCE (Stan, 2026-09-16). Keyed on the deal it follows,
        so it runs once per deal — the box rises and fades in, then its
        first words and buttons a beat behind it — and never on an
        ordinary turn, when the panel is the same element throughout.
        Before a deal lands there is nothing in it at all. Under reduced
        motion `.narrator-in` swaps the travel for a plain fade
        (index.html). */}
    <div key={`panel-${narratorEpoch}`} className={narratorEpoch ? 'narrator-in' : undefined}
      style={{
      width:'100%',
      display:'flex',flexDirection:'column',alignItems:'center',gap:stack?8:10,
      // More room under the button than over the narrator (Stan,
      // 2026-09-14: the action button "seems like it's resting on the
      // floor of the box").
      padding:stack?'10px 12px 14px':'14px 20px 20px',
      animation: narratorEpoch ? 'narratorIn 420ms cubic-bezier(.22,1,.36,1) both' : undefined,
      ...(narratorSilent ? {
        background:'transparent', border:'1px solid transparent',
      } : {
        background:`rgba(20,31,25,0.7)`,
        border:`1px solid ${DS.slate}22`,
      }),
      // SHOW 'EM is the whole band, and its box stays a full-height one
      // rather than hugging the button: the press that matters most
      // should not arrive in a smaller frame than the turn before it.
      // Every other turn lets the chrome shrink to what it holds.
      ...(showEm ? { justifyContent:'center', minHeight: NARRATOR_H } : {}),
      borderRadius:14,
    }}>
      {!dealHold && (
      <div style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:stack?8:10,
        animation: narratorEpoch ? 'narratorCopyIn 360ms cubic-bezier(.22,1,.36,1) 140ms both' : undefined}}>
      {/* Hint — the game's narrator owns this band (item 6).
          The over-limit error takes over while active. SHOW 'EM
          renders no narrator at all. */}
      {showEm ? null : tradeError ? (
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
        <div key={phase} data-narrator="1" style={{fontFamily:F.ui,
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
          {/* ONE child, always. This div is a flex container (it
              centres the copy in a fixed three-line slot), so every
              child is a flex ITEM — a hint carrying a <b> arrived as
              three items and laid the sentence out in three columns
              with the emphasised word stranded in the middle. The span
              keeps it one item and lets the text wrap normally. */}
          <span>{hintNode || hint}</span>
        </div>
      )}
      {/* The PLAYABLE strip used to sit here: five mono pills naming
          every legal signal shape, struck through where the hand could
          not make one. Removed 2026-09-13 (Stan). It was a legend for a
          control that can now speak for itself — SELECT HAND names the
          hand you have actually picked (A THREE, TWO PAIR, FULL HOUSE)
          and stays inert until it is legal, which answers the same
          question in the place the player is already looking. */}
      {/* Buttons */}
      <div style={{display:'flex',flexWrap:'wrap',gap:stack?8:12,alignItems:'center',justifyContent:'center'}}>
        {stack&&discardBtns}
        {/* After a counter, END TURN is the only alternative to spending
            another Ace. It sits in the middle of the action row; the
            ATTACK tags stay above the Aces still in hand. */}
        {counterStand&&isPlayerTurn&&!aceMode&&!strike&&(
          <BigBtn variant="ghost" compact={tight}
            onClick={()=>{ setCounterStand(false); setSelected([]); dispatch({ type:'PLAYER_END_TURN' }); }}>
            End Turn
          </BigBtn>
        )}
        {isPlayerTurn&&!aceMode&&!isScrapsDiscardMode&&!pendingAiAce&&!counterStand&&(
          <>
            {!forcedAce&&(
              <ScrapBtn onClick={doScrap} disabled={selectedInHand.length===0} compact={tight}
                count={selectedInHand.length} drawCount={tradeDraw}
                projectedHand={tradeNetHand} overLimit={tradeOverLimit}/>
            )}
            {/* Play Ace is NOT in this row any more. It rides on
                top of its own Ace in the hand (see aceSlot), so an
                optional strike stops reading as the expected next
                move and names the card it would spend. */}
          </>
        )}
        {stack&&removeBtns}
        {isSignal&&!signalLocked&&(
          <SignalBtn onClick={doSignal} disabled={!selValid} compact={tight}
            handLabel={selValid?signalHandLabel(selectedInHand):null}/>
        )}
        {showEm&&(
          <button
            type="button"
            // Busy, not disabled: the build is 580ms and disabling would
            // drop keyboard focus mid-press. aria-busy says the same thing
            // to assistive tech that the shake says to everyone else.
            aria-busy={revealBuilding}
            className={revealBuilding ? 'live-cue-busy' : undefined}
            // Voltage, like every filled button (Stan, 2026-09-14). It
            // was slate, the one filled control on the table that was
            // not green, on the press that matters most.
            {...pressStyles(
              el=>{if(!revealBuilding){el.style.background=DS.voltageHover;el.style.transform='scale(1.05)';el.style.boxShadow=`0 0 40px ${DS.voltage}`;}},
              el=>{el.style.background=DS.voltage;el.style.transform='scale(1)';el.style.boxShadow=`0 0 20px ${DS.voltage}66`;}
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
              background:DS.voltage,color:DS.ink,
              // CHARGING (Stan, 2026-09-16). The label stays SHOW 'EM. It
              // used to swap to three play arrows, which iOS draws as emoji,
              // and the button itself winds up instead: one 580ms pass of
              // `showEmCharge` (index.html) that vibrates faster and harder
              // as it goes and brightens from voltage toward voltageCharge,
              // until the reveal takes over. 580 is the revealBuild cue's
              // length, and the keyframes put a shake peak on each of its
              // eleven accelerating taps. The colours travel as custom
              // properties so the hex stays in theme.js. Reduced motion
              // lands on the charged frame with the `live-cue-busy` collar;
              // nothing travels.
              '--charge-0':DS.voltage,'--charge-1':DS.voltageHover,'--charge-2':DS.voltageCharge,
              '--charge-glow-0':`${DS.voltage}66`,'--charge-glow-1':`${DS.voltage}AA`,
              animation:revealBuilding?'showEmCharge 580ms linear forwards':'popIn 0.45s cubic-bezier(.34,1.6,.64,1)',
              boxShadow:`0 0 20px ${DS.voltage}66`,
              transition:'background 60ms, transform 60ms, box-shadow 60ms',
            }}>
            {'Show \u2019em'}
          </button>
        )}
        {/* DEAL SECOND HAND, PLAY SCRAPS HAND and NEXT ROUND used to
            be three buttons in this row, each one sitting behind a
            results screen the player had already dismissed with a
            CONTINUE. Two presses for one decision, three times a round.
            Each moved ONTO its results screen as that screen's own
            continuation (resolveSmallHand / resolveScrap). The first is
            a named button there again since 2026-09-16: PLAY HAND 2 on
            the Hand 1 reveal, which also deals the hand (dealSecondHand). */}
        {/* PLAY SCRAPS HAND. This one came BACK on 2026-09-15 (Stan):
            it was one of the three buttons the note above describes
            moving onto the results screen ahead of it, and the half
            second it left behind turned out to be the one hand-off
            that wanted a beat of its own. It is not a second press for
            a decision already made — the hand 2 reveal it follows is
            about hand 2, and this asks for the Scraps hand. */}
        {scrapsAsk&&(
          <BigBtn compact={tight} onClick={()=>{ playSelect(); resolveScrap(); }}>
            Play Scraps Hand
          </BigBtn>
        )}
        {pendingAiAce&&!aiAceReveal&&(
          <>
            <BigBtn compact={tight} onClick={onPlayerCounterAce}>
              <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                Counter <IconBolt size={18}/>
              </span>
            </BigBtn>
            <BigBtn variant="ghost" compact={tight} onClick={onPlayerAllowAce}>Let It Happen</BigBtn>
          </>
        )}
      </div>
      </div>
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
        showEmpty={!isScrapsHandoff}
        // The armed Ace, up out of the fan and over the dim.
        raisedId={aceMode?aceMode.id:null} raisedStill={rmNow}
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
    <div ref={playerScrapsRef} style={{flexShrink:0,display:'flex',flexDirection:'column',
      alignItems:'center',gap:10,
      opacity:isScrapsDiscardMode||isPlayerTurn||settling?1:0.75,transition:'opacity 0.4s'}}>
      {/* DISCARD, over your pile, in the wide layout — see pileBtns. */}
      {!stack&&pileBtnRow(discardBtns)}
      <HorizontalScrapsZone
        cards={playerScraps.map(c=>({...c,eligibleForDiscard:isScrapsDiscardMode&&c.eligibleForDiscard}))}
        label="Your Scraps"
        selectable={isScrapsDiscardMode}
        selectedIds={scrapsDiscardIds}
        onCardClick={toggleScrapsDiscardCard}
        discardMode={isScrapsDiscardMode}
        registerEl={registerCard} hiddenIds={allHiddenIds}
        // The over-7 prompt's cue is the bolder one (GlowPulse `strong`).
        glowZone={glowPlayerScraps} glowStrong
        size={SZ.pile} width={stack?railW:340} fill={stack}/>
    </div>
  );

  // THE DIM (The Throw). The table goes dark around her pile for the
  // attack, and only for the attack. It lives INSIDE the scaled table so
  // the lit things can sit above it in the same stacking context (her
  // pile and the band at z 31, the armed Ace at 40, the dim at 30), and
  // it is stretched to the edges of the table's frame by `dimSpot` — see
  // the geometry effect above. Unmeasured, it is the table's own box.
  const shade = (a) => DS.shade + a;
  const dimBg = dimSpot && dimSpot.rx
    ? `radial-gradient(ellipse ${dimSpot.rx}px ${dimSpot.ry}px at ${dimSpot.cx}px ${dimSpot.cy}px, `
      + `${shade('00')} 0%, ${shade('00')} 45%, ${shade('80')} 78%, ${shade('A8')} 100%)`
    : shade('A8');
  const dimFade = dimOn ? 'opacity 360ms ease 200ms' : 'opacity 400ms ease';
  const dimLayer = (
    <div ref={dimRef} aria-hidden="true" className="attack-dim" style={{
      position:'absolute', zIndex:30, pointerEvents:'none', background:dimBg,
      left:dimSpot?-dimSpot.l:0, right:dimSpot?-dimSpot.r:0,
      top:dimSpot?-dimSpot.t:0, bottom:dimSpot?-dimSpot.b:0,
      opacity:dimOn?1:0, transition:dimFade,
    }}/>
  );
  const barDim = (
    <div aria-hidden="true" className="attack-dim" style={{
      position:'absolute', inset:0, zIndex:41, pointerEvents:'none',
      background:shade('8C'), opacity:dimOn?1:0, transition:dimFade,
    }}/>
  );

  return (
    <>
    {/* `inert` while a stage is up: the layer is opaque, so nothing
        under it may take focus or be read. Without this a keyboard
        user's Tab walked straight through the wood onto the HUD's
        buttons, and Enter opened the rules behind the reveal. The
        stage and the flights render OUTSIDE this div, below, so they
        stay live. (React 18 passes `inert` through as a plain
        attribute; an empty string sets it, undefined removes it.) */}
    <div className="app-vh" inert={stage ? '' : undefined}
      style={{display:'flex',flexDirection:'column',
      background:DS.dusk,userSelect:'none',overflow:'hidden'}}>
      {/* The table's one heading. The wordmark is on the splash, not
          here, so without this the game screen has no h1 at all and a
          screen reader's heading list is empty. */}
      <h1 className="sr-only">SCRAPS — game table</h1>
      <GameAnnouncer messages={log} hint={hint}/>
      {/* The score bars go down with the table when an Ace attack dims
          it, so the brightest thing on screen is never a score. */}
      <div style={{position:'relative',flexShrink:0}}>
        <OpponentBar aiScore={aiScore}
          difficultyLabel={(difficulty||'').toUpperCase()} compact={tight}/>
        {barDim}
      </div>

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
      <FitBox modeMinW={MODE_MIN_W[mode]} frameRef={frameRef} onFit={setTableK}
        // The table is a real surface now, not a gradient. `backdrop`
        // paints behind the scaled content and is NOT scaled with it,
        // so the wood reaches the edges of the viewport however far
        // the table itself is scaled down; the BOARDS are sized from
        // the card so the furniture stays in proportion to the game.
        backdrop={<TableSurface cardH={CARD_DIMS[SZ.hand].h} anchorRef={tableWoodRef}/>}
        style={{background:DS.timber}}>
        {dimLayer}
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
              {/* The opponent's face-down hand used to share this row
                  with the deck and discard piles, which is why it was
                  `space-between` and hugged the left edge. With the
                  piles off the table it has the row to itself and
                  belongs on the centre axis with everything else. */}
              <div style={{display:'flex',alignItems:'flex-end',flexShrink:0,
                justifyContent:'center'}}>
                {oppHandEl}
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
                  The left gutter is EMPTY now that the pile rail has
                  gone off the table, but it stays: it is what holds the
                  narrator on the same centre axis as the two hands, and
                  it is why the right gutter can carry each side's
                  Scraps without dragging the middle of the table left.
                  Both are `flex:'1 1 0'`; drop one and the panel walks
                  sideways as the window widens. */}
              <div style={{display:'flex',alignItems:'center',gap:18,flexShrink:0,
                minHeight:tight?0:150}}>
                <div style={{flex:'1 1 0',minWidth:0}}/>
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
        {barDim}
        <PlayerBar playerScore={playerScore} compact={tight}>
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
                borderRadius:5,padding:'2px 7px',textTransform:'uppercase'}}>{`${pointerVerb} for history`}</span>
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
          before it reached the house rule; deleted 2026-09-14. Its
          privacy notice moved to the generated /privacy page, which the
          storyboard footer links to. */}
      {showRules&&<Walkthrough asReference onDone={()=>setShowRules(false)}/>}
      {confirmQuit&&<QuitConfirmModal onCancel={()=>setConfirmQuit(false)} onQuit={onExit}/>}
      {/* The interstitial layer: ROUND N, every reveal, the Clean Sweep
          beat, the sweep, the match screen. Opaque wood over the whole
          viewport, aligned to the table's own boards. */}
      {pendingAiAce&&!aiAceReveal&&(
        <AceCounterModal
          onCounter={onPlayerCounterAce}
          onAllow={onPlayerAllowAce}
          targets={pendingAiAce.targets}
          afterCounter={!!pendingAiAce.afterCounter}
        />
      )}
      {aiAceReveal&&(
        <OpponentAceReveal targets={aiAceReveal.targets} onOk={onAiAceRevealOk}
          afterCounter={!!aiAceReveal.afterCounter}/>
      )}
      {aiCounterNotice&&(
        <AiCounterNotice
          playerAce={aiCounterNotice.playerAce}
          aiAce={aiCounterNotice.aiAce}
          stillArmed={aiCounterNotice.stillArmed}
          onOk={()=>setAiCounterNotice(null)}
        />
      )}
      {mustSkip&&!dealHold&&!revealData&&!showInterstitial&&!aiAceReveal&&!aiCounterNotice&&(
        <SkipTurnModal onOk={()=>dispatch({type:'PLAYER_SKIP'})}/>
      )}
      {aceDrawnCard&&<AceDrawnLightbox ace={aceDrawnCard} onDismiss={()=>setAceDrawnCard(null)}/>}
    </div>
    {/* Outside the inert root, deliberately — see the comment on it.
        The sign reads the scores for its MATCH POINT line. */}
    {stage&&<TableStage stage={stage.kind==='sign'?{...stage,roundNum,playerScore,aiScore}:stage}
      cardH={CARD_DIMS[SZ.hand].h} tableAnchorRef={tableWoodRef}
      onSignDone={onInterstitialDone}
      onContinue={stage.onContinue} onSwept={stage.onSwept}
      onNewGame={()=>onExit('difficulty')}
      difficulty={difficulty} winStats={winStats}/>}
    {flightsOverlay}
    {/* The Throw's press and its debris, over everything, flights included. */}
    {tagEcho&&<AttackTagEcho key={tagEcho.key} echo={tagEcho}/>}
    {fx.layer}
    </>
  );
}
