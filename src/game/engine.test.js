// ============================================================
// SCRAPS — Engine tests
// Run with: npm test
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  evaluateBestHand, compareHands, getValidSignals, getBestCardsForSignal,
  isValidSignal, hasLegalTrade, legalTradeFallback, aiDecide, tradeInValue,
  RANK_VALUES,
} from './engine.js';

// Card factory: c('K','♠') → {id, rank, suit, value}
let nextId = 0;
const c = (rank, suit = '♠') => ({ id: nextId++, rank, suit, value: RANK_VALUES[rank] });
const cards = (...specs) => specs.map(s => Array.isArray(s) ? c(s[0], s[1]) : c(s));

describe('flush ban — flushes never exist, anywhere', () => {
  it('five suited non-connected cards evaluate as High Card, not a Flush', () => {
    const suited = cards(['K','♥'], ['J','♥'], ['9','♥'], ['7','♥'], ['2','♥']);
    const best = evaluateBestHand(suited);
    expect(best.name).toBe('High Card');
    expect(best.rank).toBe(0);
  });

  it('a suited hand never beats a pair (flushes never win any hand)', () => {
    const suited = cards(['K','♥'], ['J','♥'], ['9','♥'], ['7','♥'], ['2','♥']);
    const pair = cards(['3','♠'], ['3','♦'], ['5','♣'], ['8','♥'], ['10','♠']);
    expect(compareHands(evaluateBestHand(suited), evaluateBestHand(pair))).toBeLessThan(0);
  });

  it('a five-card suited straight scores as a plain Straight, never a Straight Flush', () => {
    const suitedStraight = cards(['5','♦'], ['6','♦'], ['7','♦'], ['8','♦'], ['9','♦']);
    const best = evaluateBestHand(suitedStraight);
    expect(best.name).toBe('Straight');
    expect(best.rank).toBe(4);
  });

  it('a suited straight loses to a Full House (i.e. it is not rank 8)', () => {
    const suitedStraight = cards(['5','♦'], ['6','♦'], ['7','♦'], ['8','♦'], ['9','♦']);
    const fullHouse = cards(['2','♠'], ['2','♦'], ['2','♣'], ['4','♥'], ['4','♠']);
    expect(compareHands(evaluateBestHand(suitedStraight), evaluateBestHand(fullHouse))).toBeLessThan(0);
  });

  it('a suited straight ties an offsuit straight of the same high card', () => {
    const suited = cards(['5','♦'], ['6','♦'], ['7','♦'], ['8','♦'], ['9','♦']);
    const offsuit = cards(['5','♠'], ['6','♥'], ['7','♣'], ['8','♠'], ['9','♥']);
    expect(compareHands(evaluateBestHand(suited), evaluateBestHand(offsuit))).toBe(0);
  });

  it('getValidSignals never offers signal 5 for a flush-only hand', () => {
    const suited = cards(['K','♥'], ['J','♥'], ['9','♥'], ['7','♥'], ['2','♥']);
    expect(getValidSignals(suited)).not.toContain(5);
  });

  it('getValidSignals offers signal 5 for a suited straight (as a straight)', () => {
    const suitedStraight = cards(['5','♦'], ['6','♦'], ['7','♦'], ['8','♦'], ['9','♦']);
    expect(getValidSignals(suitedStraight)).toContain(5);
    const played = getBestCardsForSignal(suitedStraight, 5);
    expect(played).toHaveLength(5);
    expect(evaluateBestHand(played).name).toBe('Straight');
  });

  it('isValidSignal rejects a 5-card flush and accepts a suited straight', () => {
    expect(isValidSignal(cards(['K','♥'], ['J','♥'], ['9','♥'], ['7','♥'], ['2','♥']))).toBe(false);
    expect(isValidSignal(cards(['5','♦'], ['6','♦'], ['7','♦'], ['8','♦'], ['9','♦']))).toBe(true);
  });
});

describe('no-legal-trade detection (7-card hand limit)', () => {
  it('a 7-card hand of all court cards has no legal trade (every card draws 2+)', () => {
    const hand = cards('10', 'J', 'Q', 'K', ['10','♥'], ['J','♥'], ['Q','♥']);
    expect(hasLegalTrade(hand)).toBe(false);
    expect(legalTradeFallback(hand)).toBeNull();
  });

  it('a 7-card hand with even one low card (2–9) has a legal trade', () => {
    const hand = cards('10', 'J', 'Q', 'K', ['10','♥'], ['J','♥'], '3');
    expect(hasLegalTrade(hand)).toBe(true);
    expect(legalTradeFallback(hand).rank).toBe('3');
  });

  it('a 6-card hand of court cards is still legal (6 − 1 + 2 = 7)', () => {
    const hand = cards('10', 'J', 'Q', 'K', ['10','♥'], ['J','♥']);
    expect(hasLegalTrade(hand)).toBe(true);
  });

  it('a 6-card hand of all Aces has no legal trade (6 − 1 + 3 = 8)', () => {
    const hand = cards('A', ['A','♥'], ['A','♦'], ['A','♣'], ['A','♠'], ['A','♥']);
    expect(hasLegalTrade(hand)).toBe(false);
  });
});

describe('AI respects the same limits as the player', () => {
  const stuckHandWithAce = () => cards('10', 'J', 'Q', 'K', ['10','♥'], ['J','♥'], 'A');
  const stuckHandNoAce = () => cards('10', 'J', 'Q', 'K', ['10','♥'], ['J','♥'], ['Q','♥']);

  for (const difficulty of ['easy', 'medium', 'hard']) {
    it(`${difficulty}: forced to play the Ace when it is the only legal move`, () => {
      const oppScraps = cards(['5','♦'], ['5','♣'], '9');
      const action = aiDecide(stuckHandWithAce(), [], oppScraps, [], difficulty, 'ai-turn-1a');
      expect(action.type).toBe('ace');
      expect(action.targetCards).toHaveLength(2);
    });

    it(`${difficulty}: skips when no trade and no Ace play is possible`, () => {
      const action = aiDecide(stuckHandNoAce(), [], cards('5'), [], difficulty, 'ai-turn-1a');
      expect(action.type).toBe('skip');
    });

    it(`${difficulty}: never returns a trade that would exceed the 7-card hand limit`, () => {
      // 200 random-ish hands: every trade returned must keep net ≤ 7
      for (let trial = 0; trial < 200; trial++) {
        const ranks = ['2','3','5','7','9','10','J','Q','K','A'];
        const size = 5 + (trial % 3);
        const hand = Array.from({ length: size }, (_, i) => c(ranks[(trial + i * 3) % ranks.length]));
        const scraps = cards('4', '8');
        const opp = cards(['6','♦'], ['6','♣'], 'J');
        const action = aiDecide(hand, scraps, opp, [], difficulty, 'ai-turn-1b', 0, 0);
        if (action.type === 'trade') {
          const drawN = action.cards.reduce((s, x) => s + tradeInValue(x), 0);
          const net = hand.length - action.cards.length + drawN;
          expect(net).toBeLessThanOrEqual(7);
        }
      }
    });
  }
});
