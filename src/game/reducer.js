// ============================================================
// SCRAPS — Game state machine
//
// A single pure reducer owns the entire game state: cards, scores,
// signals, and — most importantly — the phase. Every state change
// is an action dispatched from the UI or a timer; the reducer
// decides what is legal next. Because the reducer is pure (same
// state + same action always produce the same result, no side
// effects), React.StrictMode's double-invocation in development
// is harmless. This replaces the old pattern of setState calls
// nested inside other setState updater callbacks, which
// double-fired under StrictMode and duplicated AI draws and log
// lines.
//
// Turn order is dealer-aware. The dealer alternates each round;
// the NON-dealer acts first. Odd rounds: opponent deals, the
// player acts first (matching the original convention). Every
// small hand runs: first-player trade, second-player trade,
// first-player trade, second-player trade, then signals — and
// whoever trades first also signals first.
// ============================================================

import {
  createDeck, shuffle, dealRound, tradeInValue, HAND_LIMIT,
  evaluateBestHand, compareHands,
} from './engine.js';
import { WIN_SCORE } from '../styles/theme.js';

// ── Phase vocabulary ─────────────────────────────────────────
export const PLAYER_TURN_PHASES = ['player-turn-1a','player-turn-1b','player-turn-2a','player-turn-2b'];
export const AI_TURN_PHASES     = ['ai-turn-1a','ai-turn-1b','ai-turn-2a','ai-turn-2b'];
export const AI_SIGNAL_PHASES   = ['signal-ai','signal-ai-2'];

// ── Dealer / turn-order helpers ──────────────────────────────

// Odd rounds (1,3,5…): opponent deals → player acts first.
// Even rounds (2,4,6…): player deals → opponent acts first.
export function firstActorForRound(roundNum) {
  return roundNum % 2 === 1 ? 'player' : 'ai';
}

// The four trade turns of a small hand, in order:
// first actor, second actor, first actor, second actor.
export function tradeOrder(roundNum, handNum) {
  const f = firstActorForRound(roundNum);
  const s = f === 'player' ? 'ai' : 'player';
  return [
    `${f}-turn-${handNum}a`,
    `${s}-turn-${handNum}a`,
    `${f}-turn-${handNum}b`,
    `${s}-turn-${handNum}b`,
  ];
}

// Given the phase a trade (or skip, or Ace) just completed in,
// return the next phase. After the fourth trade of a hand, play
// moves to the signal stage — and the first actor signals first.
export function nextPhaseAfterTrade(phase, roundNum) {
  const handNum = phase.includes('-1') ? 1 : 2;
  const order = tradeOrder(roundNum, handNum);
  const i = order.indexOf(phase);
  if (i === -1) return phase; // not a trade phase — no change
  if (i < order.length - 1) return order[i + 1];
  // All four trades done → signal stage, first actor signals first
  const f = firstActorForRound(roundNum);
  if (f === 'player') return handNum === 1 ? 'signal-player' : 'signal-player-2';
  return handNum === 1 ? 'signal-ai' : 'signal-ai-2';
}

// ── Win check: first to WIN_SCORE, win by 2 ──────────────────
export function checkWin(pScore, aScore) {
  const maxScore = Math.max(pScore, aScore);
  if (maxScore < WIN_SCORE) return null;
  if (Math.abs(pScore - aScore) >= 2) {
    return pScore > aScore ? 'player' : 'ai';
  }
  return null; // no winner yet — need more points
}

// ── Scraps scoring (pure, testable) ──────────────────────────
// Winning the Scraps hand is worth 2 points. Winning both small
// hands AND the Scraps hand is a Full Scrap: 2 + 1 bonus = 3
// points at the Scraps reveal, for 5 total on the round. The AI
// sweeping all three works the same way.
export function scoreScrapsOutcome(playerScraps, aiScraps, roundWins) {
  const pB = evaluateBestHand(playerScraps);
  const aB = evaluateBestHand(aiScraps);
  if (!pB || !aB) return null;
  const res = compareHands(pB, aB);
  let pPts = 0, aPts = 0, winner = 'tie';
  const rw = { ...roundWins };
  if (res > 0)      { pPts = 2; rw.player++; winner = 'player'; }
  else if (res < 0) { aPts = 2; rw.ai++;     winner = 'ai'; }
  const fullScrap = rw.player === 3;
  const aiSweep   = rw.ai === 3;
  if (fullScrap) pPts++;
  if (aiSweep)   aPts++;
  return { pPts, aPts, winner, fullScrap, aiSweep, pB, aB };
}

// ── Round setup (impure: shuffles) ───────────────────────────
// Called by the UI, never by the reducer, so the reducer stays
// pure. Handles the tutorial's scripted deal: no Aces in the
// player's starting hand, an Ace as the first drawn card, and the
// opponent seeded with 5s for the four-of-a-kind setup.
export function buildRoundDeal(mode, alternate) {
  const d = shuffle(createDeck());
  const deal = dealRound(d);
  let remainingDeck = deal.remainingDeck;
  let playerHand = deal.playerHand;
  let aiHand = deal.aiHand;
  let playerScrapsInit = deal.playerScraps;
  let aiScrapsInit = deal.aiScraps;

  if (mode === 'tutorial' && !alternate) {
    // Tutorial: player's STARTING HAND must NOT have an Ace
    // Remove any Aces from starting hand, put them in deck
    const handAces = playerHand.filter(c => c.rank === 'A');
    if (handAces.length > 0) {
      const aceIds = new Set(handAces.map(c => c.id));
      playerHand = playerHand.filter(c => !aceIds.has(c.id));
      remainingDeck = [...handAces, ...remainingDeck];
    }
    // Put one Ace at position 0 of remaining deck (first card drawn on first trade)
    const aceInDeck = remainingDeck.findIndex(c => c.rank === 'A');
    if (aceInDeck > 0) {
      const ace = remainingDeck[aceInDeck];
      remainingDeck = [ace, ...remainingDeck.filter((_, i) => i !== aceInDeck)];
    }
    // Pad player hand back to 5 with non-ace cards from deck if needed
    while (playerHand.length < 5 && remainingDeck.length > 0) {
      const next = remainingDeck.findIndex(c => c.rank !== 'A');
      if (next >= 0) {
        playerHand = [...playerHand, remainingDeck[next]];
        remainingDeck = remainingDeck.filter((_, i) => i !== next);
      } else break;
    }
    // Set AI starting Scraps to two 5s (scripted for four-of-a-kind setup)
    const allFives = [
      ...remainingDeck.filter(c => c.rank === '5'),
      ...aiScrapsInit.filter(c => c.rank === '5'),
    ];
    if (allFives.length >= 2) {
      const fivesToUse = allFives.slice(0, 2);
      const fiveIds = new Set(fivesToUse.map(c => c.id));
      const origAiScraps = aiScrapsInit.filter(c => !fiveIds.has(c.id));
      remainingDeck = remainingDeck.filter(c => !fiveIds.has(c.id));
      remainingDeck = [...origAiScraps, ...remainingDeck];
      aiScrapsInit = fivesToUse;
      // Also put 2 more 5s at top of AI's hand pool: seed them into the
      // AI hand so the scripted first AI turn can trade them in
      const moreFives = remainingDeck.filter(c => c.rank === '5').slice(0, 2);
      if (moreFives.length === 2) {
        const moreFiveIds = new Set(moreFives.map(c => c.id));
        remainingDeck = [
          ...moreFives,
          ...remainingDeck.filter(c => !moreFiveIds.has(c.id)),
        ];
      }
    }
  }

  return {
    deck: remainingDeck,
    playerHand,
    aiHand,
    playerScraps: playerScrapsInit.map(c => ({ ...c, turnAdded: 0, eligibleForDiscard: true })),
    aiScraps:     aiScrapsInit.map(c => ({ ...c, turnAdded: 0, eligibleForDiscard: true })),
  };
}

// ── Initial state ────────────────────────────────────────────
export function createInitialState() {
  return {
    roundNum: 1,
    phase: 'init',
    currentTurn: 0,
    deck: [], playerHand: [], aiHand: [],
    playerScraps: [], aiScraps: [], discard: [],
    playerScore: 0, aiScore: 0,
    roundWins: { player: 0, ai: 0 },
    playerSignal: null, aiSignal: null,
    playerPlayed: null, aiPlayed: null,
    signalLocked: false,
    pendingTrade: null, scrapsOverflow: 0,
    pendingAiAce: null,
    // Cards in transit: removed from hand/deck but not yet landed
    // in scraps/hand, so animations can play before they appear.
    arrivals: { player: { toScraps: [], toHand: [] } },
    gameOver: null,
    log: ['Welcome to SCRAPS.'],
  };
}

// ── Helpers ──────────────────────────────────────────────────
const tagScraps = (arr, t) => arr.map(c => ({ ...c, eligibleForDiscard: c.turnAdded < t }));
const addLog = (state, msg) => [...state.log, msg];

// ── The reducer ──────────────────────────────────────────────
export function gameReducer(state, action) {
  switch (action.type) {

    case 'LOG':
      return { ...state, log: addLog(state, action.msg) };

    // Fresh round: new shuffled double deck, discard pile EMPTIED,
    // all per-round flow state reset. Dealer alternates via roundNum.
    case 'START_ROUND': {
      const roundNum = action.alternate ? state.roundNum + 1 : state.roundNum;
      return {
        ...state,
        roundNum,
        deck: action.deal.deck,
        playerHand: action.deal.playerHand,
        aiHand: action.deal.aiHand,
        playerScraps: action.deal.playerScraps,
        aiScraps: action.deal.aiScraps,
        discard: [], // the discard pile resets every round
        playerSignal: null, aiSignal: null,
        playerPlayed: null, aiPlayed: null,
        signalLocked: false,
        pendingTrade: null, scrapsOverflow: 0,
        pendingAiAce: null,
        arrivals: { player: { toScraps: [], toHand: [] } },
        currentTurn: 1,
        phase: 'dealing',
      };
    }

    // The "BEGIN ROUND N" interstitial finished — start the first
    // trade turn. The non-dealer acts first.
    case 'INTERSTITIAL_DONE': {
      const first = firstActorForRound(state.roundNum);
      const msg = first === 'player'
        ? `Round ${state.roundNum} — Opponent deals. You go first.`
        : `Round ${state.roundNum} — You deal. Opponent goes first.`;
      return {
        ...state,
        phase: `${first}-turn-1a`,
        log: addLog(state, msg),
      };
    }

    // ── Player trade (normal path) ───────────────────────────
    // Cards leave the hand and deck immediately; they sit in
    // `arrivals` until the flight animation lands, then the
    // ARRIVE actions below move them into scraps/hand.
    case 'PLAYER_TRADE_TAKE': {
      const cards = action.cards;
      if (!cards || cards.length === 0) return state;
      const ids = new Set(cards.map(c => c.id));
      if (!cards.every(c => state.playerHand.some(h => h.id === c.id))) return state;
      const drawCount = cards.reduce((s, c) => s + tradeInValue(c), 0);
      const net = (state.playerHand.length - cards.length) + drawCount;
      if (net > HAND_LIMIT) {
        return { ...state, log: addLog(state, `That trade would give you ${net} cards — over the 7-card limit.`) };
      }
      const drawn = state.deck.slice(0, drawCount);
      const tagged = cards.map(c => ({ ...c, turnAdded: state.currentTurn, eligibleForDiscard: false }));
      return {
        ...state,
        playerHand: state.playerHand.filter(c => !ids.has(c.id)),
        deck: state.deck.slice(drawCount),
        arrivals: { player: { toScraps: tagged, toHand: drawn } },
        currentTurn: state.currentTurn + 1,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum),
        log: addLog(state, `Traded ${cards.length} card(s) to Scraps. Drew ${drawCount}.`),
      };
    }

    // Traded cards land in the player's Scraps after the flight.
    case 'PLAYER_SCRAPS_ARRIVE': {
      const inbound = state.arrivals.player.toScraps;
      if (inbound.length === 0) return state;
      return {
        ...state,
        playerScraps: [...state.playerScraps, ...inbound],
        arrivals: { player: { ...state.arrivals.player, toScraps: [] } },
      };
    }

    // One drawn replacement card fades into the player's hand.
    case 'PLAYER_DRAW_ARRIVE': {
      const card = state.arrivals.player.toHand.find(c => c.id === action.cardId);
      if (!card) return state;
      if (state.playerHand.some(c => c.id === card.id)) return state;
      return {
        ...state,
        playerHand: [...state.playerHand, card],
        arrivals: { player: { ...state.arrivals.player, toHand: state.arrivals.player.toHand.filter(c => c.id !== card.id) } },
      };
    }

    // ── Player trade with Scraps overflow ────────────────────
    // The trade would push Scraps past 7, so the player must pick
    // cards to discard first. Older scraps become eligible.
    case 'PLAYER_TRADE_OVERFLOW_START': {
      return {
        ...state,
        pendingTrade: { cards: action.cards, drawCount: action.drawCount },
        scrapsOverflow: action.excess,
        playerScraps: tagScraps(state.playerScraps, state.currentTurn),
        log: addLog(state, `Select ${action.excess} card${action.excess > 1 ? 's' : ''} to discard from your Scraps, then hit DISCARD.`),
      };
    }

    case 'PLAYER_TRADE_WITH_DISCARD': {
      if (!state.pendingTrade) return state;
      const { cards, drawCount } = state.pendingTrade;
      const discardIds = new Set(action.discardCards.map(c => c.id));
      const tradeIds = new Set(cards.map(c => c.id));
      const drawn = state.deck.slice(0, drawCount);
      return {
        ...state,
        playerScraps: [
          ...state.playerScraps.filter(c => !discardIds.has(c.id)),
          ...cards.map(c => ({ ...c, turnAdded: state.currentTurn, eligibleForDiscard: false })),
        ],
        playerHand: [...state.playerHand.filter(c => !tradeIds.has(c.id)), ...drawn],
        deck: state.deck.slice(drawCount),
        discard: [...state.discard, ...action.discardCards],
        pendingTrade: null, scrapsOverflow: 0,
        currentTurn: state.currentTurn + 1,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum),
        log: addLog(state, `Discarded ${action.discardCards.length} from Scraps. Traded ${cards.length} card(s). Drew ${drawCount}.`),
      };
    }

    case 'PLAYER_TRADE_CANCEL':
      return { ...state, pendingTrade: null, scrapsOverflow: 0, log: addLog(state, 'Trade cancelled.') };

    // ── No legal trade: the turn is skipped ──────────────────
    case 'PLAYER_SKIP': {
      if (!PLAYER_TURN_PHASES.includes(state.phase)) return state;
      return {
        ...state,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum),
        log: addLog(state, 'You have no legal trades available. Your trade is skipped.'),
      };
    }

    case 'AI_SKIP': {
      if (!AI_TURN_PHASES.includes(state.phase)) return state;
      return {
        ...state,
        log: addLog(state, 'Opponent has no legal trades. Their trade is skipped.'),
      };
      // Phase advances via the usual ADVANCE_FROM timer.
    }

    // ── AI trade ─────────────────────────────────────────────
    // Applied in one pure step (the lift/flight animation runs in
    // the UI before this dispatch). Enforces the same overflow
    // discard the player faces.
    case 'AI_TRADE_APPLY': {
      const cards = action.cards;
      if (!cards || cards.length === 0) return state;
      if (!cards.every(c => state.aiHand.some(h => h.id === c.id))) return state;
      const ids = new Set(cards.map(c => c.id));
      const drawN = cards.reduce((s, c) => s + tradeInValue(c), 0);
      const drawn = state.deck.slice(0, drawN);
      const tagged = cards.map(c => ({ ...c, turnAdded: state.currentTurn, eligibleForDiscard: false }));
      const newSC = state.aiScraps.length + cards.length;
      let aiScraps, discard = state.discard;
      if (newSC > 7) {
        const el = state.aiScraps.filter(c => c.eligibleForDiscard);
        const ex = newSC - 7;
        const td = el.slice(0, ex);
        const dIds = new Set(td.map(c => c.id));
        discard = [...discard, ...td];
        aiScraps = [...state.aiScraps.filter(c => !dIds.has(c.id)), ...tagged];
      } else {
        aiScraps = [...state.aiScraps, ...tagged];
      }
      return {
        ...state,
        aiHand: [...state.aiHand.filter(c => !ids.has(c.id)), ...drawn],
        deck: state.deck.slice(drawN),
        aiScraps, discard,
        log: addLog(state, action.logMsg || `Opponent traded ${cards.length} card(s) to Scraps.`),
      };
    }

    // Advance out of an AI turn (fires on the animation timer).
    // Guarded: only advances if we're still in the phase the timer
    // was scheduled for, so a stale timer can't double-advance.
    case 'ADVANCE_FROM': {
      if (state.phase !== action.phase) return state;
      return { ...state, phase: nextPhaseAfterTrade(state.phase, state.roundNum) };
    }

    // ── Aces ─────────────────────────────────────────────────
    case 'PLAYER_ACE_APPLY': {
      const ace = state.playerHand.find(c => c.id === action.aceId);
      if (!ace) return state;
      const targetIds = new Set(action.targetIds);
      const targets = state.aiScraps.filter(c => targetIds.has(c.id));
      return {
        ...state,
        playerHand: state.playerHand.filter(c => c.id !== ace.id),
        aiScraps: state.aiScraps.filter(c => !targetIds.has(c.id)),
        discard: [...state.discard, ace, ...targets],
        currentTurn: state.currentTurn + 1,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum),
        log: addLog(state, `Ace played! Removed ${targets.map(c => c.rank + c.suit).join(', ')} from opponent's Scraps.`),
      };
    }

    // The AI played an Ace and the player holds one: pause for the
    // counter decision. The turn phase still advances on schedule.
    case 'AI_ACE_PENDING':
      return { ...state, pendingAiAce: { ace: action.ace, targets: action.targets } };

    case 'AI_ACE_APPLY': {
      const ace = state.aiHand.find(c => c.id === action.aceId);
      if (!ace) return state;
      const targetIds = new Set(action.targetIds);
      const targets = state.playerScraps.filter(c => targetIds.has(c.id));
      return {
        ...state,
        aiHand: state.aiHand.filter(c => c.id !== ace.id),
        playerScraps: state.playerScraps.filter(c => !targetIds.has(c.id)),
        discard: [...state.discard, ace, ...targets],
        pendingAiAce: null,
        log: addLog(state, action.logMsg || `Removed ${targets.map(c => c.rank + c.suit).join(', ')} from your Scraps.`),
      };
    }

    // Counter = CANCEL only. Both aces discarded. No cards removed
    // from either Scraps. The player's turn is not consumed.
    case 'PLAYER_COUNTER_ACE': {
      if (!state.pendingAiAce) return state;
      const aiAce = state.pendingAiAce.ace;
      const playerAce = state.playerHand.find(c => c.rank === 'A');
      if (!playerAce) return state;
      return {
        ...state,
        playerHand: state.playerHand.filter(c => c.id !== playerAce.id),
        aiHand: state.aiHand.filter(c => c.id !== aiAce.id),
        discard: [...state.discard, playerAce, aiAce],
        pendingAiAce: null,
        log: addLog(state, 'You counter the Ace! Both Aces cancelled and discarded. Your turn continues.'),
      };
    }

    // ── Signals ──────────────────────────────────────────────
    // Whoever traded first this round signals first.
    case 'PLAYER_SIGNAL':
      return {
        ...state,
        playerSignal: action.cards.length,
        playerPlayed: [...action.cards],
        signalLocked: true,
      };

    // AI signals FIRST (even rounds): the player must see the
    // opponent's signal before selecting their own hand.
    case 'AI_FIRST_SIGNAL': {
      if (!AI_SIGNAL_PHASES.includes(state.phase)) return state;
      return {
        ...state,
        aiSignal: action.signal,
        aiPlayed: [...action.cards],
        phase: state.phase === 'signal-ai' ? 'signal-player' : 'signal-player-2',
        log: addLog(state, `Opponent signals ${action.signal} card${action.signal > 1 ? 's' : ''}.`),
      };
    }

    // AI signals SECOND (odd rounds), after seeing the player's.
    case 'AI_RESPOND_SIGNAL': {
      return {
        ...state,
        aiSignal: action.signal,
        aiPlayed: [...action.cards],
        phase: state.phase === 'signal-player' ? 'reveal-1' : 'reveal-2',
        log: addLog(state, `You signal ${action.playerSig}. Opponent signals ${action.signal}.`),
      };
    }

    // Both signals are in (AI signaled first) — go to the reveal.
    case 'GO_REVEAL': {
      if (state.phase !== 'signal-player' && state.phase !== 'signal-player-2') return state;
      return {
        ...state,
        phase: state.phase === 'signal-player' ? 'reveal-1' : 'reveal-2',
        log: addLog(state, `You signal ${state.playerSignal}.`),
      };
    }

    // ── Small hand scored ────────────────────────────────────
    case 'SMALL_HAND_SCORED': {
      const { winner, pts, pName, aName, fromPhase } = action;
      const nP = state.playerScore + (winner === 'player' ? pts : 0);
      const nA = state.aiScore + (winner === 'ai' ? pts : 0);
      const rw = { ...state.roundWins };
      if (winner === 'player') rw.player++;
      if (winner === 'ai') rw.ai++;
      const playedIds = new Set([
        ...(state.playerPlayed || []).map(c => c.id),
        ...(state.aiPlayed || []).map(c => c.id),
      ]);
      const msg = winner === 'player' ? `You win! ${pName}. +1 pt`
        : winner === 'ai' ? `Opponent wins. ${aName}. +1 pt` : 'Tie.';
      const gameOver = checkWin(nP, nA);
      return {
        ...state,
        playerScore: nP, aiScore: nA, roundWins: rw,
        playerHand: state.playerHand.filter(c => !playedIds.has(c.id)),
        aiHand: state.aiHand.filter(c => !playedIds.has(c.id)),
        discard: [...state.discard, ...(state.playerPlayed || []), ...(state.aiPlayed || [])],
        playerSignal: null, aiSignal: null,
        playerPlayed: null, aiPlayed: null,
        signalLocked: false,
        gameOver,
        phase: gameOver ? state.phase : (fromPhase === 'reveal-1' ? 'replenish' : 'scraps-reveal'),
        log: addLog(state, msg),
      };
    }

    // ── Replenish for the second small hand ──────────────────
    // Hand 2 starts with the round's first actor — NOT hard-coded
    // to the player.
    case 'REPLENISH': {
      const pN = Math.max(0, 5 - state.playerHand.length);
      const aN = Math.max(0, 5 - state.aiHand.length);
      const drawn = state.deck.slice(0, pN + aN);
      const first = firstActorForRound(state.roundNum);
      return {
        ...state,
        playerHand: [...state.playerHand, ...drawn.slice(0, pN)],
        aiHand: [...state.aiHand, ...drawn.slice(pN, pN + aN)],
        deck: state.deck.slice(pN + aN),
        playerScraps: state.playerScraps.map(c => ({ ...c, eligibleForDiscard: true })),
        aiScraps: state.aiScraps.map(c => ({ ...c, eligibleForDiscard: true })),
        currentTurn: state.currentTurn + 1,
        phase: `${first}-turn-2a`,
        log: addLog(state, 'Hands replenished. Second small hand begins.'),
      };
    }

    // ── Scraps hand scored ───────────────────────────────────
    case 'SCRAPS_SCORED': {
      const { pPts, aPts, winner, fullScrap, aiSweep, pName } = action;
      const nP = state.playerScore + pPts;
      const nA = state.aiScore + aPts;
      let log = state.log;
      if (fullScrap) log = [...log, `FULL SCRAP! ${pName}. +${pPts} pts`];
      else log = [...log, winner === 'player' ? `You win Scraps! ${pName}. +${pPts} pts`
        : winner === 'ai' ? `Opponent wins Scraps. +${aPts} pts` : 'Scraps tied.'];
      if (aiSweep) log = [...log, 'Opponent sweeps the round! +1 bonus pt.'];
      const gameOver = checkWin(nP, nA);
      return {
        ...state,
        playerScore: nP, aiScore: nA,
        roundWins: { player: 0, ai: 0 },
        gameOver,
        phase: gameOver ? state.phase : 'round-end',
        log,
      };
    }

    default:
      return state;
  }
}
