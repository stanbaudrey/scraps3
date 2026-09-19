// ============================================================
// SCRAPS — the HARD brain, held to its claims
//
// Three kinds of test. The fast evaluator is held to the engine's own
// (they must never disagree about which hand wins). The view is held to
// its promise that she cannot see your cards. And the behaviours Stan
// asked for by name are each pinned as a case: the cheapest sure winner,
// the cheapest loser, never giving up a hand she is winning.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  createDeck, shuffle, evaluateBestHand, compareHands, getValidSignals,
  getBestCardsForSignal, isValidSignal, HAND_LIMIT, SCRAPS_LIMIT,
} from './engine.js';
import { gameReducer, createInitialState, buildRoundDeal, UNFAIR_RULES } from './reducer.js';
import {
  scoreCards, bestPlayOf, listPlays, readSignal, viewFor, chooseSignal,
  chooseTurn, chooseCounter, worstTwo, cheapestTwo, equity, CAT, herTurn, herSignal,
} from './brain.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cards by rank out of one real deck, so ids are the ids the game uses
// and no card is ever handed out twice.
function dealer() {
  const deck = createDeck();
  return (...ranks) => ranks.map(r => {
    const at = deck.findIndex(c => c.rank === String(r));
    if (at < 0) throw new Error(`no ${r} left in the deck`);
    return deck.splice(at, 1)[0];
  });
}

// A view built by hand: only what viewFor would give her.
function view(over) {
  return {
    seat: 'ai', rng: seeded(11), hand: [], pile: [], oppPile: [], discard: [],
    oppHandCount: 6, deckCount: 30, oppScrappedThisHand: 0,
    myScore: 0, oppScore: 0, myWins: 0, oppWins: 0,
    handNum: 1, myTurnsLeft: 0, oppTurnsLeft: 0, tie: 0.5, oppPicksMyTargets: false,
    ...over,
  };
}

describe('the fast evaluator', () => {
  it('ranks any two sets of cards exactly as the engine does', () => {
    const rng = seeded(3);
    for (let i = 0; i < 4000; i++) {
      const d = shuffle(createDeck(), rng);
      const a = d.slice(0, 1 + Math.floor(rng() * 9));
      const b = d.slice(12, 13 + Math.floor(rng() * 9));
      const slow = Math.sign(compareHands(evaluateBestHand(a), evaluateBestHand(b)));
      const fast = Math.sign(scoreCards(a) - scoreCards(b));
      if (slow !== fast) {
        throw new Error(`disagree on [${a.map(c => c.rank)}] vs [${b.map(c => c.rank)}]: engine ${slow}, fast ${fast}`);
      }
    }
  });

  it('names the same category as the engine', () => {
    const rng = seeded(5);
    for (let i = 0; i < 1500; i++) {
      const cards = shuffle(createDeck(), rng).slice(0, 1 + Math.floor(rng() * 9));
      expect(CAT(scoreCards(cards))).toBe(evaluateBestHand(cards).rank);
    }
  });

  it('finds the strongest hand a set of cards can legally signal', () => {
    const rng = seeded(7);
    for (let i = 0; i < 1500; i++) {
      const hand = shuffle(createDeck(), rng).slice(0, 1 + Math.floor(rng() * 7));
      let best = null;
      for (const sig of getValidSignals(hand)) {
        const h = evaluateBestHand(getBestCardsForSignal(hand, sig));
        if (!best || compareHands(h, best) > 0) best = h;
      }
      const fast = bestPlayOf(hand.map(c => c.value));
      expect(CAT(fast)).toBe(best.rank);
      // and every play she lists is one the game would accept
      for (const p of listPlays(hand)) expect(isValidSignal(p.cards)).toBe(true);
      expect(Math.max(...listPlays(hand).map(p => p.score))).toBe(scoreCards(
        listPlays(hand).sort((x, y) => y.score - x.score)[0].cards));
    }
  });
});

describe('she does not peek', () => {
  it('a view holds no card she could not see across a real table', () => {
    const rng = seeded(21);
    let s = createInitialState();
    s = gameReducer(s, { type: 'START_ROUND', deal: buildRoundDeal({ rng }), alternate: false });
    s = gameReducer(s, { type: 'INTERSTITIAL_DONE' });
    // you scrap two cards, and signal, so there is hidden state of every kind
    s = gameReducer(s, { type: 'PLAYER_TRADE_TAKE', cards: s.playerHand.slice(0, 2) });
    s = gameReducer(s, { type: 'PLAYER_SCRAPS_ARRIVE' });
    s = { ...s, playerPlayed: s.playerHand.slice(0, 1), playerSignal: 1 };

    const v = viewFor(s, 'ai', rng);
    const allowed = new Set([...s.aiHand, ...s.aiScraps, ...s.playerScraps, ...s.discard].map(c => c.id));
    const found = [];
    (function walk(x) {
      if (!x || typeof x !== 'object') return;
      if (typeof x.id === 'number' && 'rank' in x) found.push(x.id);
      for (const k of Object.keys(x)) walk(x[k]);
    }(v));
    expect(found.length).toBeGreaterThan(0);
    for (const id of found) expect(allowed.has(id)).toBe(true);
    const hidden = [...s.playerHand, ...s.deck, ...s.arrivals.player.toHand].map(c => c.id);
    for (const id of hidden) expect(found.includes(id)).toBe(false);
    // counts, never cards
    expect(v.oppHandCount).toBe(s.playerHand.length + s.arrivals.player.toHand.length);
    expect(v.deckCount).toBe(s.deck.length);
    expect(v).not.toHaveProperty('deck');
    expect(v).not.toHaveProperty('playerHand');
    expect(v).not.toHaveProperty('playerPlayed');
  });
});

describe('reading your signal', () => {
  it('knows a count of three is three of a kind, and which ranks it can still be', () => {
    const pool = createDeck().filter(c => c.rank !== 'K' && c.rank !== '9').map(c => c.value);
    const read = readSignal([...pool, 9, 9], 3);   // only two nines unseen: no trip nines
    expect(read.every(([score]) => CAT(score) === 3)).toBe(true);
    const ranks = read.map(([score]) => Math.floor(score / 15 ** 4) % 15);
    expect(ranks).not.toContain(13);
    expect(ranks).not.toContain(9);
    expect(ranks).toContain(14);
  });

  it('rules out four of a kind in any rank she has seen a card of', () => {
    // every rank seen once: a count of four can only be two pair
    const pool = createDeck().filter(c => c.id >= 13).map(c => c.value);
    expect(readSignal(pool, 4).every(([score]) => CAT(score) === 2)).toBe(true);
    // nothing seen: quads are possible again
    expect(readSignal(createDeck().map(c => c.value), 4).some(([score]) => CAT(score) === 7)).toBe(true);
  });
});

describe("Stan's cases", () => {
  it('you signal THREE, her best is a pair of Kings: she gives up ONE card, and not a King', () => {
    const take = dealer();
    const hand = take('K', 'K', 'J', '7', '4');
    const cards = chooseSignal(view({ hand, pile: take('8', '3'), oppPile: take('Q', '6') }), 3);
    expect(cards).toHaveLength(1);
    expect(cards[0].rank).not.toBe('K');
    // the card she can best do without: the lone low one, not the Jack,
    // which is worth two draws when scrapped
    expect(cards[0].rank).toBe('4');
  });

  it('you signal TWO, she holds a full house: she plays only what is needed and keeps the rest', () => {
    const take = dealer();
    const hand = take('K', 'K', 'K', '5', '5');
    // all four Aces accounted for, so nothing you can hold beats Kings
    const cards = chooseSignal(view({ hand, discard: take('A', 'A', 'A', 'A') }), 2);
    expect(cards.length).toBeLessThan(5);
    expect(cards.every(c => c.rank === 'K')).toBe(true);
  });

  it('with Aces still out, the sure winner against a pair is the three Kings', () => {
    const take = dealer();
    const hand = take('K', 'K', 'K', '5', '5');
    const cards = chooseSignal(view({ hand }), 2);
    expect(cards.length).toBeLessThan(5);
    // trips or two pair beat every pair; a bare pair of Kings does not
    expect(CAT(scoreCards(cards))).toBeGreaterThan(1);
  });

  it('you signal FOUR, she holds three of a kind: she plays it (the old HARD gave the hand up)', () => {
    const take = dealer();
    const hand = take('9', '9', '9', 'Q', '4');
    const cards = chooseSignal(view({ hand, oppHandCount: 5 }), 4);
    expect(cards.map(c => c.rank)).toEqual(['9', '9', '9']);
  });

  it('you signal THREE, she holds two pair: she does not throw four cards at a hand she cannot win', () => {
    const take = dealer();
    const hand = take('Q', 'Q', '8', '8', '3');
    const cards = chooseSignal(view({ hand }), 3);
    expect(cards).toHaveLength(1);
    expect(cards[0].rank).toBe('3');
  });

  it('in Hand 2 there is nothing to save for, so she plays to win', () => {
    const take = dealer();
    const hand = take('K', 'K', '7', '7', '2');
    const cards = chooseSignal(view({ hand, handNum: 2 }), 2);
    expect(CAT(scoreCards(cards))).toBe(2);   // two pair beats every pair
  });

  it('on match point she stops saving cards', () => {
    expect(equity(9, 0, 0, 0, 0)).toBeGreaterThan(0.85);
    const take = dealer();
    const hand = take('K', 'K', 'K', '5', '5');
    // Going first on 9: the biggest hand she has, because this hand is the match.
    const cards = chooseSignal(view({ hand, myScore: 9, oppScore: 9 }), null);
    expect(CAT(scoreCards(cards))).toBe(6);
  });
});

describe('her turns', () => {
  it('only ever makes a legal scrap, through the real reducer, and names her own discards', () => {
    const rng = seeded(33);
    let scrapped = 0, turns = 0;
    for (let i = 0; i < 150; i++) {
      let s = createInitialState();
      s = gameReducer(s, { type: 'START_ROUND', deal: buildRoundDeal({ rng }), alternate: true });
      s = gameReducer(s, { type: 'INTERSTITIAL_DONE' });        // round 2: she acts first
      expect(s.phase).toBe('ai-turn-1a');
      // a full pile, so a scrap has to give something up
      if (i % 3 === 0) s = { ...s, aiScraps: [...s.aiScraps, ...s.deck.slice(0, 5).map(c => ({ ...c, turnAdded: 0 }))], deck: s.deck.slice(5) };
      const act = herTurn(s, 'hard', rng);
      expect(['trade', 'ace', 'skip']).toContain(act.type);
      if (act.type !== 'trade') continue;
      turns++; scrapped += act.cards.length;
      const before = s.aiScraps.length;
      const next = gameReducer(s, { type: 'AI_TRADE_APPLY', cards: act.cards, discards: act.discards });
      expect(next.aiHand.length).toBeLessThanOrEqual(HAND_LIMIT);
      expect(next.aiScraps.length).toBeLessThanOrEqual(SCRAPS_LIMIT);
      expect(next.aiScraps.length).toBe(Math.min(SCRAPS_LIMIT, before + act.cards.length));
      // what she gave up was already in the pile, and is in the discard now
      for (const d of act.discards) {
        expect(s.aiScraps.some(c => c.id === d.id)).toBe(true);
        expect(next.discard.some(c => c.id === d.id)).toBe(true);
      }
    }
    // She scraps in volume now. The old HARD averaged exactly 1.00 here.
    expect(scrapped / turns).toBeGreaterThan(2);
  });

  it('throws an Ace she cannot keep: last turn of the round, your pile ahead, no counter possible', () => {
    const take = dealer();
    const v = view({
      hand: take('A', '9', '4', '2', '6'), pile: take('J', 'J', '3', '8', '5'),
      oppPile: take('Q', 'Q', 'Q', '7', '7', '10', '2'),
      discard: take('A', 'A', 'A'),   // the other three Aces are gone: you cannot counter
      handNum: 2, myTurnsLeft: 0, oppTurnsLeft: 0,
    });
    const act = chooseTurn(v);
    expect(act.type).toBe('ace');
    expect(act.targetCards.map(c => c.rank).sort()).toEqual(['Q', 'Q']);
  });

  it('counters for cards that matter and not for cards that do not', () => {
    const take = dealer();
    const pile = take('10', '10', '10', '6', '6', '2', '3');
    const base = { hand: take('A', '9', '4'), pile, oppPile: take('K', 'K', '8', '5'), handNum: 2, discard: take('A', 'A', 'A') };
    const tens = pile.filter(c => c.rank === '10').slice(0, 2);
    const junk = pile.filter(c => c.rank === '2' || c.rank === '3');
    expect(chooseCounter(view(base), tens)).toBe(true);
    expect(chooseCounter(view(base), junk)).toBe(false);
  });

  it('picks the two cards a pile will miss most, and the two it will miss least', () => {
    const take = dealer();
    const pile = take('9', '9', '9', 'K', 'K', '4', '2');
    // a nine AND a King: that leaves a pair of nines, where taking two
    // nines would leave the Kings, a better pair
    expect(worstTwo(pile).map(c => c.rank).sort()).toEqual(['9', 'K']);
    expect(cheapestTwo(pile).map(c => c.rank).sort()).toEqual(['2', '4']);
  });
});

describe('UNFAIR', () => {
  it('a tie is hers, so she does not pay extra to break one', () => {
    const rng = seeded(41);
    let s = createInitialState(UNFAIR_RULES);
    s = gameReducer(s, { type: 'START_ROUND', deal: buildRoundDeal({ rng, herAce: true }), alternate: false });
    expect(viewFor(s, 'ai').tie).toBe(1);
    expect(viewFor(s, 'player').tie).toBe(0);
    expect(viewFor(createInitialState(), 'ai').tie).toBe(0.5);
  });

  it('NORMAL is still the old cautious player, one card a turn', () => {
    const rng = seeded(43);
    let s = createInitialState();
    s = gameReducer(s, { type: 'START_ROUND', deal: buildRoundDeal({ rng }), alternate: true });
    s = gameReducer(s, { type: 'INTERSTITIAL_DONE' });
    const act = herTurn(s, 'easy', rng);
    if (act.type === 'trade') expect(act.cards).toHaveLength(1);
    const sig = herSignal(s, null, 'easy', rng);
    expect(sig.cards).toHaveLength(sig.signal);
  });
});
