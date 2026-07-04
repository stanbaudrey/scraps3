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

import { useReducer, useState, useEffect, useCallback, useRef } from "react";
import {
  evaluateBestHand, getBestCardsForSignal, getActiveHandCards, compareHands,
  aiDecide, aiChooseSignal, isValidSignal, hasLegalTrade, tradeInValue,
} from "../game/engine.js";
import {
  gameReducer, createInitialState, buildRoundDeal, scoreScrapsOutcome,
  AI_TURN_PHASES, AI_SIGNAL_PHASES,
} from "../game/reducer.js";
import { TUTORIAL_STEPS } from "../game/tutorial.js";
import { DS, F, GS, WIN_SCORE } from "../styles/theme.js";
import { playClick, playWhoosh, playVictoryFanfare, playCrescendo } from "../audio.js";
import { useFlyingCards } from "../components/flight.jsx";
import { FannedHand, HorizontalScrapsZone, DiscardPile, BestHandBadge } from "../components/cards.jsx";
import { ScoreCorners, RoundProgressIndicator, NearWinBanner } from "../components/hud.jsx";
import { BigBtn, TradeInBtn } from "../components/buttons.jsx";
import {
  RoundInterstitial, RevealOverlay, FullScrapLightbox, WinScreen, LoseScreen,
  AceCounterModal, RulesModal, TutorialOverlay, SkipTurnModal,
} from "../components/overlays.jsx";

export function GameScreen({ mode, difficulty, onExit }) {
  // ── Game state machine ─────────────────────────────────────
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const {
    deck, playerHand, aiHand, playerScraps, aiScraps, discard,
    playerScore, aiScore, roundWins, phase, roundNum,
    playerSignal, aiSignal, playerPlayed, aiPlayed, signalLocked,
    pendingTrade, scrapsOverflow, pendingAiAce, gameOver, log,
  } = state;

  // Timers read the freshest state through this ref, so a timeout
  // scheduled seconds ago never acts on a stale snapshot.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── UI-local state (selections, animations, overlays) ──────
  const [selected, setSelected]             = useState([]);
  const [scrapsDiscard, setScrapsDiscard]   = useState([]);
  const [aceMode, setAceMode]               = useState(false);
  const [aceTargets, setAceTargets]         = useState([]);
  const [showRules, setShowRules]           = useState(false);
  const [tutStep, setTutStep]               = useState(0);
  const [revealData, setRevealData]         = useState(null);
  const [revealBuilding, setRevealBuilding] = useState(false);
  const [showFullScrap, setShowFullScrap]   = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [waveIds, setWaveIds]               = useState(new Set());
  const [aiSignaledIds, setAiSignaledIds]   = useState(new Set());
  const [scrapsShakeIds, setScrapsShakeIds] = useState(new Set());
  const [scrapsFadeIds, setScrapsFadeIds]   = useState(new Set());
  const [fadingInIds, setFadingInIds]       = useState(new Set());
  const [playerScoreFlash, setPlayerScoreFlash] = useState(false);
  const [aiScoreFlash, setAiScoreFlash]         = useState(false);

  // Refs for card travel animation zones
  const playerHandRef    = useRef(null);
  const playerScrapsRef  = useRef(null);
  const discardRef       = useRef(null);
  const aiHandRef        = useRef(null);
  const aiScrapsRef      = useRef(null);
  const { launchFlight, FlightsOverlay } = useFlyingCards();

  const tutStepData = mode === 'tutorial' ? TUTORIAL_STEPS[tutStep] : null;

  // ── Tutorial step advancement ──────────────────────────────
  const tutAdvance = useCallback((trigger) => {
    if (mode !== 'tutorial') return;
    setTutStep(prev => {
      const next = TUTORIAL_STEPS.findIndex((s, i) => i > prev && s.autoAdvanceOn === trigger);
      if (next !== -1) return next;
      return prev;
    });
  }, [mode]);

  // Phase-based tutorial step sync: when phase changes, find matching step
  useEffect(() => {
    if (mode !== 'tutorial') return;
    setTutStep(prev => {
      const next = TUTORIAL_STEPS.findIndex((s, i) => i >= prev && s.phase === phase);
      if (next !== -1 && next !== prev) return next;
      return prev;
    });
  }, [phase, mode]);

  // ── Round setup ────────────────────────────────────────────
  const startNewRound = useCallback((alternate) => {
    const deal = buildRoundDeal(mode, alternate);
    dispatch({ type: 'START_ROUND', deal, alternate });
    setSelected([]); setScrapsDiscard([]);
    setAceMode(false); setAceTargets([]);
    setRevealData(null); setAiSignaledIds(new Set());
    setScrapsShakeIds(new Set()); setScrapsFadeIds(new Set());
    setWaveIds(new Set()); setFadingInIds(new Set());
    setShowInterstitial(true);
  }, [mode]);

  useEffect(() => { startNewRound(false); }, []);

  function onInterstitialDone() {
    setShowInterstitial(false);
    dispatch({ type: 'INTERSTITIAL_DONE' });
  }

  // ── Score flash + fanfare on score increases ───────────────
  const prevScores = useRef({ p: 0, a: 0 });
  useEffect(() => {
    if (playerScore > prevScores.current.p) {
      setPlayerScoreFlash(true);
      setTimeout(() => setPlayerScoreFlash(false), 600);
      playVictoryFanfare(false);
    }
    if (aiScore > prevScores.current.a) {
      setAiScoreFlash(true);
      setTimeout(() => setAiScoreFlash(false), 600);
    }
    prevScores.current = { p: playerScore, a: aiScore };
  }, [playerScore, aiScore]);

  // ── Card selection ─────────────────────────────────────────
  function toggleHandCard(card) {
    playClick();
    setSelected(prev => prev.find(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]);
  }
  function toggleScrapsDiscardCard(card) {
    if (!card.eligibleForDiscard) return;
    playClick();
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
      dispatch({ type: 'LOG', msg: `That trade would give you ${netHand} cards — over the 7-card limit.` });
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
    // Launch one arc per card from its actual fan position
    const handEl   = playerHandRef.current;
    const scrapsEl = playerScrapsRef.current;
    if (handEl && scrapsEl) {
      const handRect   = handEl.getBoundingClientRect();
      const scrapsRect = scrapsEl.getBoundingClientRect();
      const cardW = 104, cardH = 146;
      const n = tradeCards.length;
      const colCenterX = handRect.left + handRect.width * 0.5;
      const toRect = { x: scrapsRect.left + scrapsRect.width / 2 - cardW / 2,
                       y: scrapsRect.top + 10,
                       width: cardW, height: cardH };
      tradeCards.forEach((card, i) => {
        const spreadFrac = n === 1 ? 0 : (i / (n - 1)) - 0.5;
        const fromX = colCenterX - cardW / 2 + spreadFrac * 200;
        const fromRect = { x: fromX, y: handRect.bottom - cardH - 20,
                           width: cardW, height: cardH };
        const arcOffset = n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.4;
        setTimeout(() => launchFlight(card, fromRect, toRect, true, arcOffset), i * 80);
      });
    }
    // Compute the draws now (same slice the reducer takes) so the
    // fade-in timers know which card ids are inbound.
    const drawn = stateRef.current.deck.slice(0, drawCount);
    const FLIGHT_LAND = (tradeCards.length - 1) * 80 + 820; // last card lands

    // 1. Cards leave hand + deck immediately; turn advances
    dispatch({ type: 'PLAYER_TRADE_TAKE', cards: tradeCards });
    setSelected([]);
    playWhoosh();
    tutAdvance('trade-complete');

    // 2. Traded cards land in Scraps AFTER the flight
    setTimeout(() => dispatch({ type: 'PLAYER_SCRAPS_ARRIVE' }), FLIGHT_LAND);

    // 3. Replacement cards fade into the hand one by one
    drawn.forEach((card, i) => {
      const delay = FLIGHT_LAND + 100 + i * 200;
      setTimeout(() => {
        dispatch({ type: 'PLAYER_DRAW_ARRIVE', cardId: card.id });
        setFadingInIds(ids => { const n = new Set(ids); n.add(card.id); return n; });
        setTimeout(() => {
          setFadingInIds(ids => { const n = new Set(ids); n.delete(card.id); return n; });
        }, 700);
      }, delay);
    });
  }

  function confirmScrapsDiscard() {
    if (!pendingTrade || scrapsDiscard.length !== scrapsOverflow) return;
    // Visual only — arc from scraps to discard
    const scrapsEl  = playerScrapsRef.current;
    const discardEl = discardRef.current;
    if (scrapsEl && discardEl) {
      const scrapsRect  = scrapsEl.getBoundingClientRect();
      const discardRect = discardEl.getBoundingClientRect();
      const cardW = 80, cardH = 112;
      const toRect = { x: discardRect.left + discardRect.width / 2 - cardW / 2,
                       y: discardRect.top + discardRect.height / 2 - cardH / 2,
                       width: cardW, height: cardH };
      const n = scrapsDiscard.length;
      scrapsDiscard.forEach((card, i) => {
        const spreadFrac = n === 1 ? 0 : (i / (n - 1)) - 0.5;
        const fromX = scrapsRect.left + scrapsRect.width / 2 - cardW / 2 + spreadFrac * 20;
        const fromRect = { x: fromX, y: scrapsRect.top + i * 15, width: cardW, height: cardH };
        const arcOffset = n === 1 ? 0 : (i / (n - 1) - 0.5);
        setTimeout(() => launchFlight(card, fromRect, toRect, false, arcOffset), i * 80);
      });
    }
    dispatch({ type: 'PLAYER_TRADE_WITH_DISCARD', discardCards: [...scrapsDiscard] });
    setScrapsDiscard([]); setSelected([]);
    tutAdvance('trade-complete');
  }

  function cancelScrapsDiscard() {
    dispatch({ type: 'PLAYER_TRADE_CANCEL' });
    setScrapsDiscard([]); setSelected([]);
  }

  // ── Player Ace ─────────────────────────────────────────────
  function doPlayAce() {
    if (aiScraps.length < 2) { dispatch({ type: 'LOG', msg: 'Opponent needs at least 2 Scraps cards to target.' }); return; }
    setAceMode(true); setAceTargets([]); setSelected([]);
    dispatch({ type: 'LOG', msg: "Select 2 cards from opponent's Scraps to remove." });
  }
  function toggleAceTarget(card) {
    playClick();
    setAceTargets(prev => prev.find(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : prev.length < 2 ? [...prev, card] : prev);
  }

  function confirmAce() {
    if (aceTargets.length !== 2) return;
    const ace = playerHand.find(c => c.rank === 'A');
    if (!ace) return;
    const targets = [...aceTargets];
    // Animate the targeted cards before removing
    setScrapsShakeIds(new Set(targets.map(c => c.id)));
    setTimeout(() => {
      setScrapsFadeIds(new Set(targets.map(c => c.id)));
      setTimeout(() => {
        setAceMode(false); setAceTargets([]); setSelected([]);
        setScrapsShakeIds(new Set()); setScrapsFadeIds(new Set());
        dispatch({ type: 'PLAYER_ACE_APPLY', aceId: ace.id, targetIds: targets.map(c => c.id) });
        tutAdvance('ace-played');
      }, 500);
    }, 600);
  }

  // ── AI Ace → counter prompt if the player holds an Ace ─────
  function handleAiAce(aiAce, targetCards) {
    const s = stateRef.current;
    const playerHasAceNow = s.playerHand.some(c => c.rank === 'A');
    if (playerHasAceNow && s.playerScraps.length >= 2 && mode !== 'tutorial') {
      // Pause and ask player — don't reveal targets yet
      dispatch({ type: 'AI_ACE_PENDING', ace: aiAce, targets: targetCards });
    } else {
      // No player ace — animate and execute immediately
      setScrapsShakeIds(new Set(targetCards.map(c => c.id)));
      dispatch({ type: 'LOG', msg: `Opponent Ace! Targeting ${targetCards.map(c => c.rank + c.suit).join(', ')} from your Scraps.` });
      setTimeout(() => {
        setScrapsFadeIds(new Set(targetCards.map(c => c.id)));
        setTimeout(() => {
          setScrapsShakeIds(new Set()); setScrapsFadeIds(new Set());
          dispatch({ type: 'AI_ACE_APPLY', aceId: aiAce.id, targetIds: targetCards.map(c => c.id),
            logMsg: `Removed ${targetCards.map(c => c.rank + c.suit).join(', ')} from your Scraps.` });
        }, 500);
      }, 700);
    }
  }

  function onPlayerCounterAce() {
    if (!pendingAiAce) return;
    dispatch({ type: 'PLAYER_COUNTER_ACE' });
    // Player's turn is NOT consumed — they still need to trade or act
  }

  function onPlayerAllowAce() {
    if (!pendingAiAce) return;
    const { ace: aiAce, targets } = pendingAiAce;
    setScrapsShakeIds(new Set(targets.map(c => c.id)));
    setTimeout(() => {
      setScrapsFadeIds(new Set(targets.map(c => c.id)));
      setTimeout(() => {
        setScrapsShakeIds(new Set()); setScrapsFadeIds(new Set());
        dispatch({ type: 'AI_ACE_APPLY', aceId: aiAce.id, targetIds: targets.map(c => c.id),
          logMsg: `Allowed. ${targets.map(c => c.rank + c.suit).join(', ')} removed from your Scraps.` });
      }, 500);
    }, 600);
  }

  // ── AI turn ────────────────────────────────────────────────
  // One effect per AI phase entry. All timers are registered and
  // cleared on cleanup, and every dispatch is a pure action, so
  // StrictMode cannot duplicate draws or log lines.
  useEffect(() => {
    if (!AI_TURN_PHASES.includes(phase)) return;
    const timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));

    const FLIGHT_SETTLE = 820;   // player cards land in scraps
    const WAVE_DURATION = 800;   // full wave animation

    // Step 1: the AI hand does the wave after the player's cards land
    T(() => {
      const cards = [...stateRef.current.aiHand];
      cards.forEach((card, i) => {
        const delay = i * Math.floor(WAVE_DURATION / Math.max(cards.length, 1));
        T(() => {
          setWaveIds(prev => { const n = new Set(prev); n.add(card.id); return n; });
          T(() => setWaveIds(prev => { const n = new Set(prev); n.delete(card.id); return n; }), 450);
        }, delay);
      });
    }, FLIGHT_SETTLE);

    // Step 2: the AI acts
    T(() => {
      const s = stateRef.current;
      if (s.phase !== phase || s.gameOver) return;

      // Tutorial script override: on ai-turn-1a, trade the seeded 5s
      if (mode === 'tutorial' && phase === 'ai-turn-1a') {
        const fivesInHand = s.aiHand.filter(c => c.rank === '5').slice(0, 2);
        const fallback = aiDecide(s.aiHand, s.aiScraps, s.playerScraps, s.deck, difficulty, phase, s.aiScore, s.playerScore);
        const fivesToTrade = fivesInHand.length >= 2 ? fivesInHand
          : (fallback.type === 'trade' ? fallback.cards : []);
        if (fivesToTrade.length > 0) {
          setAiSignaledIds(new Set(fivesToTrade.map(c => c.id)));
          T(() => {
            setAiSignaledIds(new Set());
            dispatch({ type: 'AI_TRADE_APPLY', cards: fivesToTrade,
              logMsg: 'Opponent trades in two 5s — now has Four of a Kind!' });
          }, 800);
        }
        T(() => {
          tutAdvance('ai-turn-complete');
          dispatch({ type: 'ADVANCE_FROM', phase });
        }, 1600);
        return;
      }

      const action = aiDecide(s.aiHand, s.aiScraps, s.playerScraps, s.deck, difficulty, phase, s.aiScore, s.playerScore);

      if (action.type === 'trade' && action.cards.length > 0) {
        // Animate AI selection: lift cards, then fly to scraps
        setAiSignaledIds(new Set(action.cards.map(c => c.id)));
        T(() => {
          const aiHandEl   = aiHandRef.current;
          const aiScrapsEl = aiScrapsRef.current;
          if (aiHandEl && aiScrapsEl) {
            const handR   = aiHandEl.getBoundingClientRect();
            const scrapsR = aiScrapsEl.getBoundingClientRect();
            const cw = 104, ch = 146;
            const to = { x: scrapsR.left + scrapsR.width / 2 - cw / 2, y: scrapsR.top + 10, width: cw, height: ch };
            const n = action.cards.length;
            const handCenterX = handR.left + handR.width / 2;
            action.cards.forEach((card, i) => {
              const spreadFrac = n === 1 ? 0 : (i / (n - 1)) - 0.5;
              const fx = handCenterX - cw / 2 + spreadFrac * Math.min(handR.width * 0.5, 120);
              const from = { x: fx, y: handR.top + handR.height / 2 - ch / 2, width: cw, height: ch };
              const arcOffset = n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.4;
              setTimeout(() => launchFlight(card, from, to, true, arcOffset), i * 80);
            });
          }
        }, 600);
        T(() => {
          setAiSignaledIds(new Set());
          dispatch({ type: 'AI_TRADE_APPLY', cards: action.cards });
        }, 800);
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
        tutAdvance('ai-turn-complete');
        dispatch({ type: 'ADVANCE_FROM', phase });
      }, 1400);
    }, 800);

    return () => timers.forEach(clearTimeout);
  }, [phase]);

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
        tutAdvance('signal-complete');
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
          tutAdvance('signal-complete');
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
    dispatch({ type: 'REPLENISH' });
  }

  function resolveScrap() {
    const out = scoreScrapsOutcome(playerScraps, aiScraps, roundWins);
    if (!out) { dispatch({ type: 'LOG', msg: 'Not enough cards in Scraps.' }); return; }
    const { pPts, aPts, winner, fullScrap, aiSweep, pB, aB } = out;
    const pBestIds = new Set(getActiveHandCards(pB).map(c => c.id));
    const aBestIds = new Set(getActiveHandCards(aB).map(c => c.id));
    setRevealData({
      playerCards: [...playerScraps].slice(0, 7), aiCards: [...aiScraps].slice(0, 7),
      playerHandName: pB.name, aiHandName: aB.name + (aiSweep ? ' 🏆 SWEEP' : ''),
      winner, points: winner === 'player' ? pPts : winner === 'ai' ? aPts : 0,
      bonusLine: fullScrap ? 'INCLUDES +1 FULL SCRAP BONUS' : null,
      playerBestIds: pBestIds, aiBestIds: aBestIds,
      onContinue: () => {
        setRevealData(null);
        dispatch({ type: 'SCRAPS_SCORED', pPts, aPts, winner, fullScrap, aiSweep, pName: pB.name });
        if (fullScrap) {
          setShowFullScrap(true);
          playVictoryFanfare(true);
        }
      },
    });
  }

  // ── Derived flags ──────────────────────────────────────────
  const isPlayerTurn = ['player-turn-1a','player-turn-1b','player-turn-2a','player-turn-2b'].includes(phase);
  const isSignal = phase === 'signal-player' || phase === 'signal-player-2';
  const isAiSignaling = AI_SIGNAL_PHASES.includes(phase);
  const isReveal = phase === 'reveal-1' || phase === 'reveal-2';
  const isAiThinking = AI_TURN_PHASES.includes(phase) || isAiSignaling;
  const isScrapsDiscardMode = pendingTrade !== null;
  const selectedInHand = selected.filter(c => playerHand.find(h => h.id === c.id));
  const selIds = new Set(selectedInHand.map(c => c.id));
  const aceTargetIds = new Set(aceTargets.map(c => c.id));
  const scrapsDiscardIds = new Set(scrapsDiscard.map(c => c.id));
  const selValid = isSignal && !signalLocked && isValidSignal(selectedInHand);
  const playerHasAce = playerHand.some(c => c.rank === 'A');
  const glowHand = (isPlayerTurn && !aceMode && !isScrapsDiscardMode) || (isSignal && !signalLocked);
  const glowPlayerScraps = isScrapsDiscardMode;
  const glowOppScraps = aceMode;

  // No-legal-trade handling: if no trade can keep the hand at 7 or
  // fewer, the only legal move is an Ace (when the opponent's
  // Scraps has 2+ cards) — otherwise the turn is skipped.
  const noLegalTrade = isPlayerTurn && playerHand.length > 0 && !hasLegalTrade(playerHand)
    && !isScrapsDiscardMode && !aceMode;
  const forcedAce = noLegalTrade && playerHasAce && aiScraps.length >= 2;
  const mustSkip  = noLegalTrade && !forcedAce && !pendingAiAce;

  let hint = '';
  if (pendingAiAce) hint = 'Opponent played an Ace. Counter or let it happen?';
  else if (isScrapsDiscardMode) hint = `Select ${scrapsOverflow} card${scrapsOverflow > 1 ? 's' : ''} to discard from your Scraps, then hit DISCARD.`;
  else if (aceMode) hint = `Select 2 cards from opponent's Scraps to remove. (${aceTargets.length}/2 selected)`;
  else if (forcedAce) hint = 'Due to the 7-card hand limit, your only legal move is to play an Ace.';
  else if (isPlayerTurn) {
    const ordinal = (phase === 'player-turn-1a' || phase === 'player-turn-2a') ? 'first' : 'second';
    hint = playerHasAce && aiScraps.length >= 2
      ? `Select cards for your ${ordinal} trade-in. Or play an Ace.`
      : `Select cards from your hand for your ${ordinal} trade-in.`;
  }
  else if (isAiSignaling) hint = 'Opponent is choosing their signal...';
  else if (isSignal && !signalLocked && aiSignal != null) hint = `Opponent signals ${aiSignal} card${aiSignal > 1 ? 's' : ''}. Toggle the cards you want to play — must be a valid poker hand. Hit SIGNAL.`;
  else if (isSignal && !signalLocked) hint = 'Toggle the cards you want to play — must be a valid poker hand. Hit SIGNAL.';
  else if (isSignal && signalLocked) hint = 'Signal locked. Waiting for opponent...';
  else if (isReveal) hint = 'Both signals in. Reveal hands?';
  else if (isAiThinking) hint = 'Opponent is thinking...';
  else if (phase === 'replenish') hint = 'Small hand scored. Deal the second hand?';
  else if (phase === 'scraps-reveal') hint = 'Time to play the Scraps hand — best 5-card hand wins. Flushes never count.';
  else if (phase === 'round-end') hint = 'Round complete. Ready for the next round?';

  const showNearWin = !gameOver && (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE);

  if (gameOver) return (
    <>
      <style>{GS}</style>
      {gameOver === 'player'
        ? <WinScreen playerScore={playerScore} aiScore={aiScore} onNewGame={() => onExit('difficulty')}/>
        : <LoseScreen playerScore={playerScore} aiScore={aiScore} onNewGame={() => onExit('difficulty')}/>
      }
    </>
  );

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:DS.dusk,userSelect:'none',overflow:'auto'}}>
      <style>{GS}</style>
      <ScoreCorners playerScore={playerScore} aiScore={aiScore} playerFlash={playerScoreFlash} aiFlash={aiScoreFlash} phase={phase}/>
      {showNearWin&&<NearWinBanner playerScore={playerScore} aiScore={aiScore}/>}

      {/* Table */}
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',
        minHeight:0,overflow:'hidden',background:`radial-gradient(ellipse at 50% 40%,${DS.duskLight} 0%,${DS.dusk} 100%)`}}>

        {/* THREE-COLUMN LAYOUT: [Discard narrow] [Hands+Actions center] [Scraps right] */}
        <div style={{position:'relative',zIndex:1,flex:1,display:'flex',
          flexDirection:'row',minHeight:0,overflow:'hidden'}}>

          {/* COLUMN 1: Discard — narrow, left edge */}
          <div ref={discardRef} style={{
            width:110, flexShrink:0,
            display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',
            padding:'12px 8px',opacity:0.5}}>
            <DiscardPile count={discard.length}/>
          </div>

          {/* COLUMN 2: Both Hands + Action Panel between them */}
          <div style={{flex:'1 1 0',display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'space-around',
            padding:'8px 4px',gap:2,minHeight:0,overflow:'hidden'}}>

            {/* Opponent hand */}
            <div ref={aiHandRef} style={{
              opacity:isAiThinking?1:isPlayerTurn?0.5:1,
              transition:'opacity 0.5s',width:'100%',display:'flex',justifyContent:'center',
              flexShrink:0}}>
              <FannedHand cards={aiHand} faceDown aiSignaledIds={aiSignaledIds}
                activeWiggle={isAiThinking} waveIds={waveIds}/>
            </div>

            {/* ACTION ZONE — between the two hands */}
            <div style={{
              flexShrink:0, width:'100%',
              display:'flex',flexDirection:'column',alignItems:'center',gap:10,
              padding:'8px 16px',
              background:`rgba(26,26,40,0.7)`,
              borderTop:`1px solid ${DS.slate}22`,
              borderBottom:`1px solid ${DS.slate}22`,
            }}>
              {/* Hint */}
              <div style={{fontFamily:F.ui,fontSize:22,
                color:isScrapsDiscardMode?DS.voltage:pendingAiAce?DS.ember:forcedAce?DS.ember:isAiThinking?DS.voltage:DS.frost,
                fontWeight:700,textAlign:'center',lineHeight:1.3,
                animation:isAiThinking?'pulse 1s ease infinite':undefined}}>
                {hint}
              </div>
              {/* Buttons */}
              <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',justifyContent:'center'}}>
                {isScrapsDiscardMode&&(
                  <>
                    <BigBtn variant="warning" onClick={confirmScrapsDiscard} disabled={scrapsDiscard.length!==scrapsOverflow}>
                      Discard ({scrapsDiscard.length}/{scrapsOverflow})
                    </BigBtn>
                    <BigBtn variant="ghost" onClick={cancelScrapsDiscard}>Cancel</BigBtn>
                  </>
                )}
                {isPlayerTurn&&!aceMode&&!isScrapsDiscardMode&&!pendingAiAce&&(
                  <>
                    {!forcedAce&&!(tutStepData&&tutStepData.forceAce)&&(
                      <TradeInBtn onClick={doTradeIn} disabled={selected.length===0} count={selected.length}/>
                    )}
                    {playerHasAce&&aiScraps.length>=2&&(
                      <BigBtn variant="danger" onClick={doPlayAce}>Play Ace ⚡</BigBtn>
                    )}
                    {tutStepData&&tutStepData.forceAce&&!playerHasAce&&(
                      <span style={{fontFamily:F.ui,color:DS.ember,fontSize:15,fontWeight:700}}>
                        No Ace in hand — trade active
                      </span>
                    )}
                  </>
                )}
                {aceMode&&(
                  <>
                    <BigBtn variant="danger" onClick={confirmAce} disabled={aceTargets.length!==2}>
                      Remove ({aceTargets.length}/2)
                    </BigBtn>
                    <BigBtn variant="ghost" onClick={()=>{setAceMode(false);setAceTargets([]);}}>Cancel</BigBtn>
                  </>
                )}
                {isSignal&&!signalLocked&&(
                  <BigBtn onClick={doSignal} disabled={!selValid} variant="green">
                    Signal{selValid?` — ${selectedInHand.length} card${selectedInHand.length>1?'s':''}`:' (select a valid hand)'}
                  </BigBtn>
                )}
                {isReveal&&(
                  <button
                    onMouseEnter={e=>{if(!revealBuilding){e.currentTarget.style.background=DS.slateLight;e.currentTarget.style.transform='scale(1.05)';e.currentTarget.style.boxShadow=`0 0 40px ${DS.slateLight}`;} }}
                    onMouseLeave={e=>{e.currentTarget.style.background=DS.slate;e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow=`0 0 20px ${DS.slate}88`;}}
                    onClick={()=>{
                      if(revealBuilding) return;
                      setRevealBuilding(true);
                      playCrescendo(()=>{
                        setRevealBuilding(false);
                        resolveSmallHand();
                      });
                    }}
                    style={{
                      border:'none',cursor:revealBuilding?'wait':'pointer',
                      fontFamily:F.ui,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
                      padding:'18px 44px',fontSize:22,borderRadius:12,
                      background:DS.slate,color:DS.ink,
                      animation:revealBuilding?'cardShake 0.15s ease-in-out infinite':'none',
                      boxShadow:revealBuilding?`0 0 40px ${DS.slate}`:`0 0 20px ${DS.slate}88`,
                      transition:'background 60ms, transform 60ms, box-shadow 60ms',
                    }}>
                    {revealBuilding?'▶▶▶':'Reveal Hands'}
                  </button>
                )}
                {phase==='replenish'&&<BigBtn onClick={doReplenish} variant="primary">Deal Second Hand</BigBtn>}
                {phase==='scraps-reveal'&&<BigBtn onClick={resolveScrap} variant="primary">Play Scraps Hand</BigBtn>}
                {phase==='round-end'&&<BigBtn onClick={()=>startNewRound(true)} variant="primary">Next Round →</BigBtn>}
                {pendingAiAce&&(
                  <>
                    <BigBtn variant="danger" onClick={onPlayerCounterAce}>Counter ⚡</BigBtn>
                    <BigBtn variant="ghost" onClick={onPlayerAllowAce}>Let It Happen</BigBtn>
                  </>
                )}
              </div>
            </div>

            {/* Player hand */}
            <div ref={playerHandRef} style={{
              display:'flex',flexDirection:'column',alignItems:'center',gap:5,
              opacity:isPlayerTurn||(isSignal&&!signalLocked)?1:0.6,
              transition:'opacity 0.5s',width:'100%',flexShrink:0}}>
              <FannedHand
                cards={playerHand}
                selectedIds={selIds}
                fadingInIds={fadingInIds}
                tradeSelectedIds={isScrapsDiscardMode?selIds:new Set()}
                onCardClick={card=>{
                  if(isScrapsDiscardMode||pendingAiAce) return;
                  if((isPlayerTurn&&!aceMode)||(isSignal&&!signalLocked)) toggleHandCard(card);
                }}
                selectable={(isPlayerTurn&&!aceMode&&!isScrapsDiscardMode&&!pendingAiAce)||(isSignal&&!signalLocked)}
                activeWiggle={glowHand&&!pendingAiAce}
              />
              <BestHandBadge cards={playerHand}/>
            </div>
          </div>

          {/* COLUMN 3: Scraps piles — right side */}
          <div style={{width:460,flexShrink:0,display:'flex',flexDirection:'column',
            justifyContent:'space-around',padding:'12px 12px 12px 4px',gap:12}}>

            {/* Opponent Scraps */}
            <div ref={aiScrapsRef} style={{display:'flex',flexDirection:'column',gap:5,alignItems:'center',
              opacity:aceMode?1:isAiThinking?1:0.7,transition:'opacity 0.4s'}}>
              <BestHandBadge cards={aiScraps}/>
              <HorizontalScrapsZone cards={aceMode?aiScraps.map(c=>({...c,eligibleForDiscard:true})):aiScraps}
                label="OPP" selectable={aceMode}
                selectedIds={aceTargetIds} onCardClick={toggleAceTarget}
                isOpponent={true} glowZone={glowOppScraps}
                slideRight={true}/>
            </div>

            {/* Round progress — center of scraps column */}
            <div style={{display:'flex',justifyContent:'center'}}>
              <RoundProgressIndicator phase={phase}/>
            </div>

            {/* Player Scraps */}
            <div ref={playerScrapsRef} style={{display:'flex',flexDirection:'column',gap:5,alignItems:'center',
              opacity:isScrapsDiscardMode?1:isPlayerTurn?1:0.7,transition:'opacity 0.4s'}}>
              <HorizontalScrapsZone
                cards={playerScraps.map(c=>({...c,eligibleForDiscard:isScrapsDiscardMode&&c.eligibleForDiscard}))}
                label="YOU"
                selectable={isScrapsDiscardMode}
                selectedIds={scrapsDiscardIds}
                onCardClick={toggleScrapsDiscardCard}
                discardMode={isScrapsDiscardMode}
                glowZone={glowPlayerScraps}/>
              <BestHandBadge cards={playerScraps}/>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — log + ? only */}
      <div style={{background:DS.dusk,borderTop:`1px solid ${DS.slate}22`,
        padding:'6px 20px 8px',display:'flex',alignItems:'center',
        justifyContent:'space-between',flexShrink:0,gap:12}}>
        <div style={{fontFamily:F.mono,fontSize:13,color:DS.slate,
          flex:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
          {log[log.length-1]||''}
        </div>
        {mode==='jump'&&(
          <button onClick={()=>setShowRules(true)} style={{
            background:DS.voltage,border:'none',color:DS.ink,
            borderRadius:'50%',width:28,height:28,cursor:'pointer',
            fontFamily:F.ui,fontSize:13,fontWeight:900,flexShrink:0,
            boxShadow:`0 0 10px ${DS.voltage}88`}}>?</button>
        )}
      </div>

      {showRules&&<RulesModal onClose={()=>setShowRules(false)}/>}
      {mode==='tutorial'&&tutStepData&&<TutorialOverlay step={tutStepData} onOk={()=>setTutStep(i=>i+1)}/>}
      {revealData&&<RevealOverlay {...revealData} onDismiss={revealData.onContinue}
        playerBestIds={revealData.playerBestIds||null}
        aiBestIds={revealData.aiBestIds||null}/>}
      {showFullScrap&&<FullScrapLightbox onDone={()=>setShowFullScrap(false)}/>}
      <FlightsOverlay/>
      {showInterstitial&&<RoundInterstitial roundNum={roundNum} onDone={onInterstitialDone}/>}
      {pendingAiAce&&(
        <AceCounterModal
          onCounter={onPlayerCounterAce}
          onAllow={onPlayerAllowAce}
          playerScraps={playerScraps}
        />
      )}
      {mustSkip&&!revealData&&!showInterstitial&&(
        <SkipTurnModal onOk={()=>dispatch({type:'PLAYER_SKIP'})}/>
      )}
    </div>
  );
}
