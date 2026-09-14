// ============================================================
// SCRAPS — Engine tests
// Run with: npm test
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  evaluateBestHand, compareHands, getValidSignals, getBestCardsForSignal,
  isValidSignal, hasLegalTrade, legalTradeFallback, aiDecide, scrapValue,
  createDeck, RANKS, RANK_VALUES,
} from './engine.js';

// Card factory: c('K') → {id, rank, value}
//
// It used to take a suit, and the array form `'K'` existed only
// to pass one. Both are gone with the suits themselves (2026-09-13).
// The array form is kept accepted and its second element ignored, so
// that this file and reducer.test.js can share a shape — a card is a
// rank and an id now, and two kings differ only by id.
let nextId = 0;
const c = (rank) => ({ id: nextId++, rank, value: RANK_VALUES[rank] });
const cards = (...ranks) => ranks.map(c);

// The six tests that lived here checked that a flush never scores:
// five suited cards evaluating as High Card, a suited straight never
// reaching Straight Flush, and so on. They were deleted on
// 2026-09-13 rather than reworded, because there is nothing left to
// assert — cards carry no suit, so a flush is not a hand this engine
// declines to score, it is a hand that cannot be dealt.
//
// What replaces them is the invariant that actually matters now, and
// it is a stronger one than the tests it replaces: the SHAPE OF THE
// DECK. Session 2 measured four-of-a-kind in 2.8% of rounds on the
// old two-deck shoe against 0.7% on one and cut it to a single deck
// to fix the balance. Nothing guarded that afterwards. The four-fold
// loop in createDeck() used to iterate SUITS, so removing suits put
// the one number the game's balance rests on inside the change —
// exactly the kind of edit that looks cosmetic and is not.
describe('deck shape — the balance fix from Session 2, guarded', () => {
  it('is a single 52-card deck', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('holds exactly four of every rank, and only known ranks', () => {
    const counts = new Map();
    for (const card of createDeck()) counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
    expect([...counts.keys()].sort()).toEqual([...RANKS].sort());
    for (const rank of RANKS) expect(counts.get(rank)).toBe(4);
  });

  it('gives every card a unique id, which is now the only thing separating two fours', () => {
    const deck = createDeck();
    expect(new Set(deck.map(card => card.id)).size).toBe(deck.length);
  });

  it('carries no suit on any card', () => {
    expect(createDeck().every(card => card.suit === undefined)).toBe(true);
  });

  it('values every card in step with RANK_VALUES', () => {
    expect(createDeck().every(card => card.value === RANK_VALUES[card.rank])).toBe(true);
  });
});

describe('no-legal-trade detection (7-card hand limit)', () => {
  it('a 7-card hand of all court cards has no legal trade (every card draws 2+)', () => {
    const hand = cards('10', 'J', 'Q', 'K', '10', 'J', 'Q');
    expect(hasLegalTrade(hand)).toBe(false);
    expect(legalTradeFallback(hand)).toBeNull();
  });

  it('a 7-card hand with even one low card (2–9) has a legal trade', () => {
    const hand = cards('10', 'J', 'Q', 'K', '10', 'J', '3');
    expect(hasLegalTrade(hand)).toBe(true);
    expect(legalTradeFallback(hand).rank).toBe('3');
  });

  it('a 6-card hand of court cards is still legal (6 − 1 + 2 = 7)', () => {
    const hand = cards('10', 'J', 'Q', 'K', '10', 'J');
    expect(hasLegalTrade(hand)).toBe(true);
  });

  it('a 6-card hand of all Aces has no legal trade (6 − 1 + 3 = 8)', () => {
    const hand = cards('A', 'A', 'A', 'A', 'A', 'A');
    expect(hasLegalTrade(hand)).toBe(false);
  });
});

describe('AI respects the same limits as the player', () => {
  const stuckHandWithAce = () => cards('10', 'J', 'Q', 'K', '10', 'J', 'A');
  const stuckHandNoAce = () => cards('10', 'J', 'Q', 'K', '10', 'J', 'Q');

  for (const difficulty of ['easy', 'medium', 'hard']) {
    it(`${difficulty}: forced to play the Ace when it is the only legal move`, () => {
      const oppScraps = cards('5', '5', '9');
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
        const opp = cards('6', '6', 'J');
        const action = aiDecide(hand, scraps, opp, [], difficulty, 'ai-turn-1b', 0, 0);
        if (action.type === 'trade') {
          const drawN = action.cards.reduce((s, x) => s + scrapValue(x), 0);
          const net = hand.length - action.cards.length + drawN;
          expect(net).toBeLessThanOrEqual(7);
        }
      }
    });
  }
});

// ── The wheel straight ───────────────────────────────────────
// Regression guard: A-2-3-4-5 used to take its tiebreaker from
// Math.max(...ranks), reading the Ace as 14, so the LOWEST straight in
// the game beat every straight up to king-high and tied Broadway.
describe('the wheel is the lowest straight, not the highest', () => {
  const wheel    = () => cards('A','2','3','4','5');
  const sixHigh  = () => cards('2','3','4','5','6');
  const kingHigh = () => cards('9','10','J','Q','K');
  const broadway = () => cards('10','J','Q','K','A');

  it('scores the wheel as a Straight with a high of 5', () => {
    const h = evaluateBestHand(wheel());
    expect(h.rank).toBe(4);
    expect(h.name).toBe('Straight');
    expect(h.tiebreakers).toEqual([5]);
  });

  it('loses to every other straight', () => {
    for (const better of [sixHigh(), kingHigh(), broadway()]) {
      expect(compareHands(evaluateBestHand(wheel()), evaluateBestHand(better))).toBeLessThan(0);
    }
  });

  it('does not tie Broadway', () => {
    expect(compareHands(evaluateBestHand(wheel()), evaluateBestHand(broadway()))).not.toBe(0);
  });

  it('picks the better straight out of a pile that contains both', () => {
    // A,2,3,4,5,6,K holds the wheel AND 2-3-4-5-6. The six-high wins.
    const pile = cards('A','2','3','4','5','6','K');
    const best = evaluateBestHand(pile);
    expect(best.rank).toBe(4);
    expect(best.tiebreakers).toEqual([6]);
  });

  it('still ranks Broadway as the highest straight', () => {
    expect(evaluateBestHand(broadway()).tiebreakers).toEqual([14]);
  });
});
