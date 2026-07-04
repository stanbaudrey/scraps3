// ============================================================
// SCRAPS — Turn flow / state machine tests
// Run with: npm test
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  gameReducer, createInitialState, buildRoundDeal,
  firstActorForRound, tradeOrder, nextPhaseAfterTrade,
  scoreScrapsOutcome, checkWin,
} from './reducer.js';
import { tradeInValue, RANK_VALUES } from './engine.js';

let nextId = 0;
const c = (rank, suit = '♠') => ({ id: nextId++, rank, suit, value: RANK_VALUES[rank] });
const cards = (...specs) => specs.map(s => Array.isArray(s) ? c(s[0], s[1]) : c(s));

// Start a fresh state on a given round number (dealer alternates
// each round; round 1 = player first, round 2 = AI first, ...)
function freshRound(roundNum) {
  let s = createInitialState();
  for (let r = 1; r <= roundNum; r++) {
    s = gameReducer(s, { type: 'START_ROUND', deal: buildRoundDeal('jump', r > 1), alternate: r > 1 });
  }
  return gameReducer(s, { type: 'INTERSTITIAL_DONE' });
}

// Simulate one trade in the current phase, tracking who traded.
function playOneTrade(s, tally) {
  const phase = s.phase;
  const handNum = phase.includes('-1') ? 1 : 2;
  if (phase.startsWith('player')) {
    tally.push(`player-h${handNum}`);
    // pick a low card so the trade is always legal
    const card = s.playerHand.find(x => tradeInValue(x) === 1) || s.playerHand[0];
    let t = gameReducer(s, { type: 'PLAYER_TRADE_TAKE', cards: [card] });
    // flush the animation arrivals (scraps landing + draws)
    t = gameReducer(t, { type: 'PLAYER_SCRAPS_ARRIVE' });
    for (const d of t.arrivals.player.toHand.map(x => x.id)) {
      t = gameReducer(t, { type: 'PLAYER_DRAW_ARRIVE', cardId: d });
    }
    return t;
  }
  tally.push(`ai-h${handNum}`);
  const card = s.aiHand.find(x => tradeInValue(x) === 1) || s.aiHand[0];
  let t = gameReducer(s, { type: 'AI_TRADE_APPLY', cards: [card] });
  return gameReducer(t, { type: 'ADVANCE_FROM', phase });
}

function runHandOfTrades(s, tally) {
  let guard = 0;
  while (s.phase.includes('-turn-') && guard++ < 10) s = playOneTrade(s, tally);
  return s;
}

describe('dealer-aware turn order', () => {
  it('round 1 (odd): player acts first, sequence alternates correctly', () => {
    let s = freshRound(1);
    expect(s.phase).toBe('player-turn-1a');
    expect(tradeOrder(1, 1)).toEqual(['player-turn-1a', 'ai-turn-1a', 'player-turn-1b', 'ai-turn-1b']);
  });

  it('round 2 (even): AI acts first, and the player STILL gets two trades', () => {
    expect(firstActorForRound(2)).toBe('ai');
    expect(tradeOrder(2, 1)).toEqual(['ai-turn-1a', 'player-turn-1a', 'ai-turn-1b', 'player-turn-1b']);
    // The old bug: 'ai-turn-1a' jumped straight to 'player-turn-1b',
    // giving the player one trade to the AI's two.
    expect(nextPhaseAfterTrade('ai-turn-1a', 2)).toBe('player-turn-1a');
  });

  it('both players get exactly two trades per small hand in an ODD round', () => {
    let s = freshRound(1);
    const tally = [];
    s = runHandOfTrades(s, tally);
    expect(tally.filter(t => t === 'player-h1')).toHaveLength(2);
    expect(tally.filter(t => t === 'ai-h1')).toHaveLength(2);
    expect(tally).toEqual(['player-h1', 'ai-h1', 'player-h1', 'ai-h1']);
  });

  it('both players get exactly two trades per small hand in an EVEN round', () => {
    let s = freshRound(2);
    expect(s.phase).toBe('ai-turn-1a');
    const tally = [];
    s = runHandOfTrades(s, tally);
    expect(tally.filter(t => t === 'player-h1')).toHaveLength(2);
    expect(tally.filter(t => t === 'ai-h1')).toHaveLength(2);
    expect(tally).toEqual(['ai-h1', 'player-h1', 'ai-h1', 'player-h1']);
  });

  it('hand 2 starts with the round first actor, not hard-coded to the player', () => {
    // Even round: after replenish, the AI (first actor) trades first
    let s = freshRound(2);
    s = { ...s, phase: 'replenish', playerHand: s.playerHand.slice(0, 3), aiHand: s.aiHand.slice(0, 3) };
    s = gameReducer(s, { type: 'REPLENISH' });
    expect(s.phase).toBe('ai-turn-2a');
    expect(s.playerHand).toHaveLength(5);
    expect(s.aiHand).toHaveLength(5);

    // Odd round: player first
    let o = freshRound(1);
    o = { ...o, phase: 'replenish' };
    o = gameReducer(o, { type: 'REPLENISH' });
    expect(o.phase).toBe('player-turn-2a');
  });
});

describe('signal order follows the dealer', () => {
  it('odd round: after four trades, the PLAYER signals first', () => {
    let s = freshRound(1);
    s = runHandOfTrades(s, []);
    expect(s.phase).toBe('signal-player');
  });

  it('even round: after four trades, the AI signals first, then the player', () => {
    let s = freshRound(2);
    s = runHandOfTrades(s, []);
    expect(s.phase).toBe('signal-ai');
    // AI announces its signal — the player sees it before selecting
    const aiCards = [s.aiHand[0]];
    s = gameReducer(s, { type: 'AI_FIRST_SIGNAL', signal: 1, cards: aiCards });
    expect(s.phase).toBe('signal-player');
    expect(s.aiSignal).toBe(1);
    expect(s.log[s.log.length - 1]).toBe('Opponent signals 1 card.');
    // Player signals; both are in → reveal
    s = gameReducer(s, { type: 'PLAYER_SIGNAL', cards: [s.playerHand[0]] });
    s = gameReducer(s, { type: 'GO_REVEAL' });
    expect(s.phase).toBe('reveal-1');
  });

  it('odd round: player signals, AI responds knowing the player signal, then reveal', () => {
    let s = freshRound(1);
    s = runHandOfTrades(s, []);
    s = gameReducer(s, { type: 'PLAYER_SIGNAL', cards: [s.playerHand[0]] });
    expect(s.signalLocked).toBe(true);
    s = gameReducer(s, { type: 'AI_RESPOND_SIGNAL', signal: 1, cards: [s.aiHand[0]], playerSig: 1 });
    expect(s.phase).toBe('reveal-1');
  });
});

describe('no-legal-trade skip', () => {
  it('PLAYER_SKIP passes the turn without touching cards', () => {
    let s = freshRound(1);
    const handBefore = s.playerHand.map(x => x.id);
    s = gameReducer(s, { type: 'PLAYER_SKIP' });
    expect(s.phase).toBe('ai-turn-1a');
    expect(s.playerHand.map(x => x.id)).toEqual(handBefore);
    expect(s.log[s.log.length - 1]).toMatch(/skipped/);
  });

  it('AI_SKIP logs the skip; the turn advances on the usual timer action', () => {
    let s = freshRound(2); // AI first
    s = gameReducer(s, { type: 'AI_SKIP' });
    expect(s.log[s.log.length - 1]).toMatch(/Opponent has no legal trades/);
    s = gameReducer(s, { type: 'ADVANCE_FROM', phase: 'ai-turn-1a' });
    expect(s.phase).toBe('player-turn-1a');
  });

  it('the reducer rejects a player trade that would exceed the 7-card limit', () => {
    let s = freshRound(1);
    // Force a 7-card hand of court cards, then try to trade one
    const bigHand = cards('10', 'J', 'Q', 'K', ['10','♥'], ['J','♥'], ['Q','♥']);
    s = { ...s, playerHand: bigHand };
    const t = gameReducer(s, { type: 'PLAYER_TRADE_TAKE', cards: [bigHand[0]] });
    expect(t.playerHand).toHaveLength(7); // unchanged
    expect(t.phase).toBe('player-turn-1a'); // turn NOT consumed
    expect(t.log[t.log.length - 1]).toMatch(/over the 7-card limit/);
  });
});

describe('scoring', () => {
  it('a Full Scrap awards 2 + 1 = 3 at the Scraps reveal, 5 total on the round', () => {
    let s = freshRound(1);
    // Two small-hand wins
    s = { ...s, playerPlayed: [s.playerHand[0]], aiPlayed: [s.aiHand[0]], phase: 'reveal-1' };
    s = gameReducer(s, { type: 'SMALL_HAND_SCORED', winner: 'player', pts: 1, pName: 'Pair', aName: '', fromPhase: 'reveal-1' });
    s = { ...s, playerPlayed: [s.playerHand[0]], aiPlayed: [s.aiHand[0]], phase: 'reveal-2' };
    s = gameReducer(s, { type: 'SMALL_HAND_SCORED', winner: 'player', pts: 1, pName: 'Pair', aName: '', fromPhase: 'reveal-2' });
    expect(s.playerScore).toBe(2);
    expect(s.roundWins.player).toBe(2);

    // Scraps: player quads vs AI junk → win + full scrap bonus
    const pScraps = cards('9', ['9','♥'], ['9','♦'], ['9','♣'], '4');
    const aScraps = cards('2', '5', ['7','♥'], ['J','♦'], '3');
    const out = scoreScrapsOutcome(pScraps, aScraps, s.roundWins);
    expect(out.winner).toBe('player');
    expect(out.fullScrap).toBe(true);
    expect(out.pPts).toBe(3); // 2 for scraps + 1 full scrap bonus

    s = gameReducer(s, { type: 'SCRAPS_SCORED', ...out, pName: out.pB.name });
    expect(s.playerScore).toBe(5); // 1 + 1 + 3
    expect(s.log[s.log.length - 1]).toBe(`FULL SCRAP! ${out.pB.name}. +3 pts`);
  });

  it('an AI sweep awards the same 2 + 1 on the AI side', () => {
    const pScraps = cards('2', '5', ['7','♥'], ['J','♦'], '3');
    const aScraps = cards('9', ['9','♥'], ['9','♦'], ['9','♣'], '4');
    const out = scoreScrapsOutcome(pScraps, aScraps, { player: 0, ai: 2 });
    expect(out.aiSweep).toBe(true);
    expect(out.aPts).toBe(3);
  });

  it('flushes never win the Scraps hand', () => {
    const suited = cards(['K','♥'], ['J','♥'], ['9','♥'], ['7','♥'], ['2','♥']);
    const pair = cards(['3','♠'], ['3','♦'], ['5','♣'], ['8','♥'], ['10','♠']);
    const out = scoreScrapsOutcome(suited, pair, { player: 0, ai: 0 });
    expect(out.winner).toBe('ai'); // the pair beats the would-be flush
  });

  it('win requires reaching 11 AND leading by 2', () => {
    expect(checkWin(11, 10)).toBeNull();
    expect(checkWin(12, 10)).toBe('player');
    expect(checkWin(10, 12)).toBe('ai');
    expect(checkWin(10, 9)).toBeNull();
  });
});

describe('discard pile resets every round', () => {
  it('discards accumulate during a round, then START_ROUND empties the pile', () => {
    let s = freshRound(1);
    // Put cards in the discard via a scored small hand
    s = { ...s, playerPlayed: [s.playerHand[0]], aiPlayed: [s.aiHand[0]], phase: 'reveal-1' };
    s = gameReducer(s, { type: 'SMALL_HAND_SCORED', winner: 'player', pts: 1, pName: 'High Card', aName: '', fromPhase: 'reveal-1' });
    expect(s.discard.length).toBeGreaterThan(0);
    // Next round: discard pile must be empty
    s = gameReducer(s, { type: 'START_ROUND', deal: buildRoundDeal('jump', true), alternate: true });
    expect(s.discard).toHaveLength(0);
    expect(s.roundNum).toBe(2);
  });
});
