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
// hand runs: first-player scrap, second-player scrap,
// first-player trade, second-player trade, then signals — and
// whoever trades first also signals first.
// ============================================================

import {
  createDeck, shuffle, dealRound, scrapValue, HAND_LIMIT,
  evaluateBestHand, compareHands,
} from './engine.js';
import { WIN_SCORE } from '../styles/theme.js';

// ── Phase vocabulary ─────────────────────────────────────────
export const PLAYER_TURN_PHASES = ['player-turn-1a','player-turn-1b','player-turn-2a','player-turn-2b'];
export const AI_TURN_PHASES     = ['ai-turn-1a','ai-turn-1b','ai-turn-2a','ai-turn-2b'];
export const AI_SIGNAL_PHASES   = ['signal-ai','signal-ai-2'];

// ── Match rules ──────────────────────────────────────────────
// NORMAL and HARD play the game straight: the same rules on both sides
// of the table, and HARD is only a better player. UNFAIR is
// the one mode that tilts the table, and it does it in the open — every
// one of these is stated on the difficulty picker (Stan, 2026-09-18):
//
//   herAce         she starts every round holding an Ace
//   signalsSecond  she always sees your signal before choosing hers
//   tiesToHer      a tied hand, private or Scraps, is hers
//   herPick        SHE chooses which two cards your Ace removes
//
// They live in STATE, set once when the match is created, so the reducer
// stays pure and nothing downstream has to be told the difficulty.
export const FAIR_RULES = Object.freeze({
  herAce: false, signalsSecond: false, tiesToHer: false, herPick: false,
});
export const UNFAIR_RULES = Object.freeze({
  herAce: true, signalsSecond: true, tiesToHer: true, herPick: true,
});
export const rulesFor = (difficulty) => (difficulty === 'unfair' ? UNFAIR_RULES : FAIR_RULES);

// ── Dealer / turn-order helpers ──────────────────────────────

// Odd rounds (1,3,5…): opponent deals → player acts first.
// Even rounds (2,4,6…): player deals → opponent acts first.
export function firstActorForRound(roundNum) {
  return roundNum % 2 === 1 ? 'player' : 'ai';
}

// The four scrap turns of a hand, in order:
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
export function nextPhaseAfterTrade(phase, roundNum, rules = FAIR_RULES) {
  const handNum = phase.includes('-1') ? 1 : 2;
  const order = tradeOrder(roundNum, handNum);
  const i = order.indexOf(phase);
  if (i === -1) return phase; // not a trade phase — no change
  if (i < order.length - 1) return order[i + 1];
  // All four trades done → signal stage, first actor signals first.
  // Under `signalsSecond` that is always you, whoever dealt: the scrap
  // turns still alternate with the dealer, only the signal order is fixed.
  const f = rules.signalsSecond ? 'player' : firstActorForRound(roundNum);
  if (f === 'player') return handNum === 1 ? 'signal-player' : 'signal-player-2';
  return handNum === 1 ? 'signal-ai' : 'signal-ai-2';
}

// ── Win check: first to WIN_SCORE, flat ──────────────────────
//
// The win-by-2 clause was dropped on 2026-09-13 (Stan's call). It is
// a flat race now: the first score to reach WIN_SCORE takes the game.
//
// There is no tie to resolve and no simultaneous crossing to worry
// about, and that is a property of the scoring rather than luck.
// Every scoring event in this game pays exactly ONE side —
// SMALL_HAND_SCORED credits a single winner, and scoreScrapsOutcome
// fills either pPts or aPts but never both. So the scores can never
// move together, and the trailing player cannot arrive at WIN_SCORE
// in the same event as the leader. The old `>= 2` margin test was
// the only thing standing between a 10-10 board and a deadlock, and
// a 10-10 board was already unreachable.
export function checkWin(pScore, aScore) {
  const maxScore = Math.max(pScore, aScore);
  if (maxScore < WIN_SCORE) return null;
  return pScore > aScore ? 'player' : pScore < aScore ? 'ai' : null;
}

// ── Scraps scoring (pure, testable) ──────────────────────────
// Winning the Scraps hand is worth 2 points. Winning both small
// hands AND the Scraps hand is a Clean Sweep: 2 + 1 bonus = 3
// points at the Scraps reveal, for 5 total on the round. The AI
// sweeping all three works the same way.
// An EMPTY Scraps pile is a hand, not an error — it simply loses to
// anything. Reaching zero is reachable in normal play: an Ace discards
// two cards and every Ace guard admits a pile of exactly 2, so a pile
// can be emptied on the last trade turn with no turn left to refill.
//
// This used to return `null` for an empty pile, and `resolveScrap`
// answered that by logging and returning — which stranded the game at
// the `scraps-reveal` phase whose only control was the button that had
// just done nothing. A dead end with no exit.
//
// rank -1 sorts below High Card (0), so compareHands gives the point
// to the other player. Two empty piles compare equal and tie.
export const EMPTY_SCRAPS_HAND = {
  rank: -1, name: 'Empty Scraps hand', cards: [], tiebreakers: [],
};

export function scoreScrapsOutcome(playerScraps, aiScraps, roundWins, rules = FAIR_RULES) {
  const pB = evaluateBestHand(playerScraps) || EMPTY_SCRAPS_HAND;
  const aB = evaluateBestHand(aiScraps) || EMPTY_SCRAPS_HAND;
  const res = compareHands(pB, aB) || (rules.tiesToHer ? -1 : 0);
  let pPts = 0, aPts = 0, winner = 'tie';
  const rw = { ...roundWins };
  if (res > 0)      { pPts = 2; rw.player++; winner = 'player'; }
  else if (res < 0) { aPts = 2; rw.ai++;     winner = 'ai'; }
  const cleanSweep = rw.player === 3;
  const aiSweep   = rw.ai === 3;
  if (cleanSweep) pPts++;
  if (aiSweep)   aPts++;
  return { pPts, aPts, winner, cleanSweep, aiSweep, pB, aB };
}

// ── Private hand scoring (pure, testable) ────────────────────
// Who takes a private hand, from the two sets of played cards. It lived
// inside GameScreen's resolveSmallHand until 2026-09-18; it is here so
// the table and tools/ai-arena.mjs cannot disagree about a result, and
// so `tiesToHer` has exactly one place to be true.
export function scoreSmallHand(playerPlayed, aiPlayed, rules = FAIR_RULES) {
  const pH = evaluateBestHand(playerPlayed);
  const aH = evaluateBestHand(aiPlayed);
  const res = (pH && aH ? compareHands(pH, aH) : 0) || (rules.tiesToHer ? -1 : 0);
  const winner = res > 0 ? 'player' : res < 0 ? 'ai' : 'tie';
  return { winner, pts: winner === 'tie' ? 0 : 1, pH, aH,
    tieBroken: !!(rules.tiesToHer && pH && aH && compareHands(pH, aH) === 0) };
}

// ── Round setup (impure: shuffles) ───────────────────────────
// Called by the UI, never by the reducer, so the reducer stays
// pure. Deals a straight, unrigged round: five cards to each
// hand, two to each Scraps pile, rest to the deck.
//
// `herAce` (UNFAIR) puts one Ace in her opening five. The
// deck is still the same 52 cards: one Ace is lifted out before the
// deal, she is dealt four instead of five, and the Ace joins them at a
// random seat in her hand. Everything else is dealt as it always is.
export function buildRoundDeal({ rng = Math.random, herAce = false } = {}) {
  let d = shuffle(createDeck(), rng);
  let planted = null;
  if (herAce) {
    // ANY of the four Aces, picked at random, never "the first one in
    // the deck". Lifting out the first would leave the other three all
    // sitting behind it, which quietly pushes Aces away from your opening
    // hand as well: a second, hidden tilt on top of the stated one. With
    // a random Ace lifted, the other 51 cards are still an even shuffle.
    const aces = d.filter(c => c.rank === 'A');
    planted = aces[Math.floor(rng() * aces.length)];
    d = d.filter(c => c.id !== planted.id);
    // dealRound takes her five from positions 5 to 9; seat the Ace there.
    const seat = 5 + Math.floor(rng() * 5);
    d = [...d.slice(0, seat), planted, ...d.slice(seat)];
  }
  const deal = dealRound(d);
  const remainingDeck = deal.remainingDeck;
  const playerHand = deal.playerHand;
  const aiHand = deal.aiHand;
  const playerScrapsInit = deal.playerScraps;
  const aiScrapsInit = deal.aiScraps;

  return {
    deck: remainingDeck,
    playerHand,
    aiHand,
    playerScraps: playerScrapsInit.map(c => ({ ...c, turnAdded: 0, eligibleForDiscard: true })),
    aiScraps:     aiScrapsInit.map(c => ({ ...c, turnAdded: 0, eligibleForDiscard: true })),
  };
}

// ── The Hand 2 refill (pure, testable) ───────────────────────
// Each hand draws back up to five, off the top of the deck, the
// player's cards first. ONE function for it, because two callers have
// to name the same cards: REPLENISH below, which runs after the Hand 1
// score has taken the played cards out of the hands, and PLAY HAND 2 in
// GameScreen (`dealSecondHand`), which works the refill out BEFORE that
// commit so the new cards can already be sitting hidden in their gaps
// when the table comes back. Two copies of this arithmetic would be two
// answers the moment either changed.
export const HAND_REFILL = 5;
export function planReplenish(playerHand, aiHand, deck) {
  const pN = Math.max(0, HAND_REFILL - playerHand.length);
  const aN = Math.max(0, HAND_REFILL - aiHand.length);
  const drawn = deck.slice(0, pN + aN);
  return { player: drawn.slice(0, pN), ai: drawn.slice(pN, pN + aN), take: pN + aN };
}

// ── The deck running low (pure, testable) ────────────────────
// A round starts with 38 cards in the deck, and until 2026-09-18 that
// was always plenty: the old HARD scrapped four cards a round and the
// deck finished a round with about fourteen left. The new one scraps in
// volume, as a good player does, and two volume scrappers ran the deck
// DRY in 7% of rounds in the arena. A dry deck is not a small thing: a
// scrap draws nothing, the Hand 2 refill deals nothing, and a player can
// reach a signal with no cards to signal with, which is a dead end.
//
// So the discards go back under the deck before it can happen, the way
// any card table handles it. The SHUFFLE cannot live in the reducer (it
// would stop being pure, and the table reads the top of the deck BEFORE
// it dispatches a draw, to animate it), so whoever is driving, the table
// or the arena, asks `deckNeedsRefresh` after every change and dispatches
// DECK_REFRESH with the discards already shuffled. The reducer checks
// they really are the discards, puts them UNDER what is left, and
// empties the discard. 12 is more than any one action can draw: a scrap
// is capped by the 7-card hand, and the refill deals at most ten.
export const DECK_LOW = 12;
export const deckNeedsRefresh = (state) =>
  state.deck.length < DECK_LOW && state.discard.length > 0 && !state.gameOver;

// ── Initial state ────────────────────────────────────────────
export function createInitialState(rules = FAIR_RULES) {
  return {
    rules,
    roundNum: 1,
    phase: 'init',
    currentTurn: 0,
    handStartTurn: 1,
    deck: [], playerHand: [], aiHand: [],
    playerScraps: [], aiScraps: [], discard: [],
    playerScore: 0, aiScore: 0,
    roundWins: { player: 0, ai: 0 },
    playerSignal: null, aiSignal: null,
    playerPlayed: null, aiPlayed: null,
    signalLocked: false,
    pendingTrade: null, scrapsOverflow: 0,
    pendingAiAce: null,
    // She countered your Ace and you still hold one: the turn is ATTACK
    // or END TURN, and nothing may be scrapped (Stan, 2026-09-18). Set by
    // AI_COUNTER_ACE, cleared by the turn ending or an attack landing.
    counterStand: false,
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
        pendingAiAce: null, counterStand: false,
        arrivals: { player: { toScraps: [], toHand: [] } },
        currentTurn: 1,
        // The turn this HAND began on. A pile card whose turnAdded is at
        // or past it was scrapped during the hand in play, which is public
        // (you watched it go in) and is how the HARD brain knows how much
        // of your hand you have turned over. See brain.js, viewFor.
        handStartTurn: 1,
        phase: 'dealing',
      };
    }

    // The "BEGIN ROUND N" interstitial finished — start the first
    // trade turn. The non-dealer acts first.
    case 'INTERSTITIAL_DONE': {
      const first = firstActorForRound(state.roundNum);
      const msg = first === 'player'
        ? `Round ${state.roundNum} - She dealt. You go first.`
        : `Round ${state.roundNum} - You dealt. She goes first.`;
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
      if (state.counterStand) return state;   // no scrapping after a counter
      const cards = action.cards;
      if (!cards || cards.length === 0) return state;
      const ids = new Set(cards.map(c => c.id));
      if (!cards.every(c => state.playerHand.some(h => h.id === c.id))) return state;
      const drawCount = cards.reduce((s, c) => s + scrapValue(c), 0);
      const net = (state.playerHand.length - cards.length) + drawCount;
      if (net > HAND_LIMIT) {
        return { ...state, log: addLog(state, `That would give you ${net} cards, over the 7-card limit.`) };
      }
      const drawn = state.deck.slice(0, drawCount);
      const tagged = cards.map(c => ({ ...c, turnAdded: state.currentTurn, eligibleForDiscard: false }));
      return {
        ...state,
        playerHand: state.playerHand.filter(c => !ids.has(c.id)),
        deck: state.deck.slice(drawCount),
        arrivals: { player: { toScraps: tagged, toHand: drawn } },
        currentTurn: state.currentTurn + 1,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules),
        log: addLog(state, `Scrapped ${cards.length} card${cards.length > 1 ? 's' : ''}. Drew ${drawCount}.`),
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

    // ── Player scrap with Scraps overflow ────────────────────
    // The scrap would push Scraps past 7, so the player must pick
    // cards to discard first. Older scraps become eligible.
    case 'PLAYER_TRADE_OVERFLOW_START': {
      if (state.counterStand) return state;
      return {
        ...state,
        pendingTrade: { cards: action.cards, drawCount: action.drawCount },
        scrapsOverflow: action.excess,
        playerScraps: tagScraps(state.playerScraps, state.currentTurn),
        log: addLog(state, `Pick ${action.excess} to discard first.`),
      };
    }

    case 'PLAYER_SCRAP_WITH_DISCARD': {
      if (!state.pendingTrade || state.counterStand) return state;
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
        phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules),
        log: addLog(state, `Discarded ${action.discardCards.length} from Scraps. Scrapped ${cards.length} card${cards.length > 1 ? 's' : ''}. Drew ${drawCount}.`),
      };
    }

    case 'PLAYER_TRADE_CANCEL':
      return { ...state, pendingTrade: null, scrapsOverflow: 0, log: addLog(state, 'Scrap cancelled.') };

    // ── No legal trade: the turn is skipped ──────────────────
    // Ending your turn by choice, after the opponent countered your Ace
    // and you chose not to spend another one. Distinct from PLAYER_SKIP,
    // which is the forced case and logs a different reason.
    case 'PLAYER_END_TURN': {
      if (!PLAYER_TURN_PHASES.includes(state.phase)) return state;
      return {
        ...state,
        counterStand: false,
        currentTurn: state.currentTurn + 1,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules),
        log: addLog(state, 'You end your turn.'),
      };
    }

    case 'PLAYER_SKIP': {
      if (!PLAYER_TURN_PHASES.includes(state.phase)) return state;
      return {
        ...state,
        counterStand: false,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules),
        log: addLog(state, 'You have nothing legal to scrap. Your turn is skipped.'),
      };
    }

    case 'AI_SKIP': {
      if (!AI_TURN_PHASES.includes(state.phase)) return state;
      return {
        ...state,
        log: addLog(state, 'She has nothing legal to scrap. Her turn is skipped.'),
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
      const drawN = cards.reduce((s, c) => s + scrapValue(c), 0);
      const drawn = state.deck.slice(0, drawN);
      const tagged = cards.map(c => ({ ...c, turnAdded: state.currentTurn, eligibleForDiscard: false }));
      const newSC = state.aiScraps.length + cards.length;
      let aiScraps, discard = state.discard;
      if (newSC > 7) {
        // The same rule the player is held to: any card ALREADY in the
        // pile may go, the ones arriving now may not. (This used to read
        // the stored eligibleForDiscard flag, which is only refreshed at
        // the Hand 2 refill, so in Hand 1 she could be left holding more
        // than seven. She never scrapped enough for it to happen.)
        // `action.discards` is her own choice of what to give up; without
        // one, or with a bad one, the oldest cards go, as before.
        const ex = newSC - 7;
        const named = (action.discards || [])
          .map(d => state.aiScraps.find(c => c.id === d.id)).filter(Boolean);
        const td = named.length === ex ? named : state.aiScraps.slice(0, ex);
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
        log: addLog(state, action.logMsg || `She scrapped ${cards.length} card${cards.length > 1 ? 's' : ''}.`),
      };
    }

    // Advance out of an AI turn (fires on the animation timer).
    // Guarded: only advances if we're still in the phase the timer
    // was scheduled for, so a stale timer can't double-advance.
    case 'ADVANCE_FROM': {
      if (state.phase !== action.phase) return state;
      return { ...state, phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules) };
    }

    // ── Aces ─────────────────────────────────────────────────
    case 'PLAYER_ACE_APPLY': {
      const ace = state.playerHand.find(c => c.id === action.aceId);
      if (!ace) return state;
      const targetIds = new Set(action.targetIds);
      const targets = state.aiScraps.filter(c => targetIds.has(c.id));
      return {
        ...state,
        counterStand: false,
        playerHand: state.playerHand.filter(c => c.id !== ace.id),
        aiScraps: state.aiScraps.filter(c => !targetIds.has(c.id)),
        discard: [...state.discard, ace, ...targets],
        currentTurn: state.currentTurn + 1,
        phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules),
        log: addLog(state, `Ace played! Removed ${targets.map(c => c.rank).join(', ')} from her Scraps.`),
      };
    }

    // The AI countered the player's Ace. Counter = CANCEL: both Aces
    // are discarded and nothing leaves either Scraps pile.
    //
    // This case did not exist until 2026-08-30. `GameScreen` had been
    // dispatching AI_COUNTER_ACE since the mechanic was written, it
    // fell through to `default: return state`, and so the counter did
    // nothing at all while the UI announced it. Paired with a call to
    // shouldCounterAce that passed the difficulty STRING where the AI's
    // Scraps belonged, that made the Ace inert on both selectable
    // difficulties. Neither the engine nor the reducer was at fault,
    // which is why 37 tests missed it: the defect lived in the wiring
    // between them.
    //
    // Turn handling, and it is deliberately NOT the same as
    // PLAYER_ACE_APPLY's: playing an Ace always ends your turn, but
    // having one COUNTERED only ends it if you are out of Aces. Still
    // holding one means you still have a strike, so the turn stays live
    // and you may spend it — and the opponent may counter that one too,
    // if it still holds an Ace of its own.
    case 'AI_COUNTER_ACE': {
      const playerAce = state.playerHand.find(c => c.id === action.playerAceId);
      const aiAce     = state.aiHand.find(c => c.id === action.aiAceId);
      if (!playerAce || !aiAce) return state;
      const playerHand = state.playerHand.filter(c => c.id !== playerAce.id);
      const stillArmed = playerHand.some(c => c.rank === 'A');
      return {
        ...state,
        playerHand,
        aiHand: state.aiHand.filter(c => c.id !== aiAce.id),
        discard: [...state.discard, playerAce, aiAce],
        counterStand: stillArmed,
        ...(stillArmed ? {} : {
          currentTurn: state.currentTurn + 1,
          phase: nextPhaseAfterTrade(state.phase, state.roundNum, state.rules),
        }),
        // Holding another Ace, the only moves left are to attack with it
        // or end the turn: no scrapping after a counter (Stan, 2026-09-18).
        log: addLog(state, stillArmed
          ? 'She countered your Ace. Both Aces discarded. Attack again, or end your turn.'
          : 'She countered your Ace. Both Aces discarded. Your turn is over.'),
      };
    }

    // The AI played an Ace and the player holds one: pause for the
    // counter decision. The turn phase still advances on schedule.
    // `afterCounter` rides along so the prompt can say "she had another
    // Ace" when this one follows a counter (GameScreen.handleAiAce).
    case 'AI_ACE_PENDING':
      return { ...state, pendingAiAce: { ace: action.ace, targets: action.targets,
        afterCounter: !!action.afterCounter } };

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
        log: addLog(state, action.logMsg || `Removed ${targets.map(c => c.rank).join(', ')} from your Scraps.`),
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
        log: addLog(state, 'You countered her Ace. Both Aces discarded.'),
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
        log: addLog(state, `She signals ${action.signal} card${action.signal > 1 ? 's' : ''}.`),
      };
    }

    // AI signals SECOND (odd rounds), after seeing the player's.
    case 'AI_RESPOND_SIGNAL': {
      return {
        ...state,
        aiSignal: action.signal,
        aiPlayed: [...action.cards],
        phase: state.phase === 'signal-player' ? 'reveal-1' : 'reveal-2',
        log: addLog(state, `You signal ${action.playerSig}. She signals ${action.signal}.`),
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

    // ── Hand scored ──────────────────────────────────────────
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
        : winner === 'ai' ? `She wins. ${aName}. +1 pt` : 'Tie.';
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

    // ── Replenish for the second hand ────────────────────────
    // Hand 2 starts with the round's first actor — NOT hard-coded
    // to the player.
    case 'REPLENISH': {
      const plan = planReplenish(state.playerHand, state.aiHand, state.deck);
      const first = firstActorForRound(state.roundNum);
      return {
        ...state,
        playerHand: [...state.playerHand, ...plan.player],
        aiHand: [...state.aiHand, ...plan.ai],
        deck: state.deck.slice(plan.take),
        playerScraps: state.playerScraps.map(c => ({ ...c, eligibleForDiscard: true })),
        aiScraps: state.aiScraps.map(c => ({ ...c, eligibleForDiscard: true })),
        currentTurn: state.currentTurn + 1,
        handStartTurn: state.currentTurn + 1,
        phase: `${first}-turn-2a`,
        log: addLog(state, 'Fresh cards. Second hand.'),
      };
    }

    // ── The discards go back under the deck ──────────────────
    // See deckNeedsRefresh. `action.cards` is the discard pile, shuffled
    // by the caller; anything else is refused, so this can only ever
    // move the cards that are really there.
    case 'DECK_REFRESH': {
      const cards = action.cards || [];
      const want = new Set(state.discard.map(c => c.id));
      if (!cards.length || cards.length !== want.size || !cards.every(c => want.has(c.id))) return state;
      return {
        ...state,
        deck: [...state.deck, ...cards.map(({ id, rank, value }) => ({ id, rank, value }))],
        discard: [],
        log: addLog(state, 'The discards are shuffled back under the deck.'),
      };
    }

    // ── Both private hands are over ──────────────────────────
    // Hand 2 is scored, so whatever is still sitting in either hand
    // will never be played: it leaves the table for the discard, and
    // the two Scraps piles are the only cards on the wood when the
    // Scraps hand is played. `discard` is exactly the right word here
    // and the only one — these cards are not scrapped, they are done.
    //
    // The PHASE is untouched on purpose. This is the table being
    // cleared, not a step of the machine; `scraps-reveal` is already
    // where the game is and the Scraps reveal is still what follows.
    // Idempotent, so React.StrictMode's double-invoke (and any second
    // pass of the hand-off effect) costs nothing.
    case 'HANDS_DISCARDED': {
      if (!state.playerHand.length && !state.aiHand.length) return state;
      return {
        ...state,
        playerHand: [], aiHand: [],
        discard: [...state.discard, ...state.playerHand, ...state.aiHand],
      };
    }

    // ── Scraps hand scored ───────────────────────────────────
    case 'SCRAPS_SCORED': {
      const { pPts, aPts, winner, cleanSweep, aiSweep, pName } = action;
      const nP = state.playerScore + pPts;
      const nA = state.aiScore + aPts;
      let log = state.log;
      if (cleanSweep) log = [...log, `CLEAN SWEEP! ${pName}. +${pPts} pts`];
      else log = [...log, winner === 'player' ? `You win Scraps! ${pName}. +${pPts} pts`
        : winner === 'ai' ? `She wins Scraps. +${aPts} pts` : 'Scraps tied.'];
      if (aiSweep) log = [...log, 'CLEAN SWEEP for her. +1 bonus pt.'];
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
