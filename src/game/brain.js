// ============================================================
// SCRAPS — the HARD brain (2026-09-18)
//
// HARD used to be a ladder of if-statements in engine.js, and it lost
// for reasons that had nothing to do with luck: it compared how MANY
// cards you signalled rather than what they had to be (so it gave up
// holding trips against your two pair, and played two pair into your
// trips), it conceded a hand by throwing its HIGHEST card, and it
// scrapped exactly one card a turn, so it saw a third of the cards a
// person does and its pile never reached seven.
//
// This replaces the ladder with one method, used for every decision:
//
//   1. list every legal option
//   2. deal the cards she CANNOT see at random, many times over, in a
//      way that agrees with everything she HAS seen
//   3. keep the option that leaves her best off on average, measured in
//      her chance of winning the MATCH, not in points
//
// SHE DOES NOT PEEK, and that is enforced rather than promised. Every
// decision here is made from a `view` (viewFor, below), which holds her
// own cards, the two face-up piles, the discard, and COUNTS of the rest.
// Your hand and the order of the deck are not in it, so there is nothing
// to read. brain.test.js checks that no card id outside the public set
// can be found anywhere inside a view. What she does do is count: the
// deck is fresh every round, and by the second hand she has usually seen
// twenty of its 52 cards.
//
// The same code plays EITHER seat. The game only ever seats it as her;
// tools/ai-arena.mjs seats it on both sides to measure it.
// ============================================================

import {
  scrapValue, HAND_LIMIT, SCRAPS_LIMIT, hasLegalTrade,
  aiDecide, aiChooseSignal, getBestCardsForSignal, shouldCounterAce,
} from './engine.js';
import { tradeOrder, FAIR_RULES } from './reducer.js';
import { WIN_SCORE } from '../styles/theme.js';

// The numbers her judgement rests on, in one place so the arena can turn
// each one off and measure what it is worth (`node tools/ai-arena.mjs
// brain:hold=0 brain`). The game never touches this object.
//   samples   imagined deals per decision
//   hold      how much of an attack's worth a scrap that KEEPS the Ace is
//             credited with while she can still afford to wait (0 = throw
//             it the moment throwing beats scrapping)
//   exposure  how often a player holding an Ace is taken to use it on her
//   shield    how much of that her own Ace, held back to counter, removes
//   keepBias  how much better than a random handful your hand is taken to
//             be, per card she watched you scrap this hand
//   aceCarry  what an Ace carried into Hand 2 is worth, in Scraps hands
//   carry     how much weight the cards she would KEEP get when she picks a
//             Hand 1 play (0 = always the play likeliest to win the hand)
//
// Measured 2026-09-18, 2,000 matches each against the default, her seat
// worth about 52% by itself: samples 64 to 200 gained 4 points and 200 to
// 600 nothing; keepBias 0.6 to 0.3 gained 3 (0.6 had her giving up hands
// she would have won); hold, exposure and aceCarry each measured inside
// the noise, and stay because they cost nothing and read as good play.
export const TUNE = { samples: 200, hold: 0.95, exposure: 0.6, shield: 0.65, keepBias: 0.3, aceCarry: 0.12, carry: 1 };

// ── A fast evaluator ─────────────────────────────────────────
// engine.evaluateBestHand tries every five-card combination, which is
// right for naming a hand on screen and far too slow to call a few
// thousand times a decision. Cards have no suit, so the best hand in any
// set falls straight out of how many of each rank it holds. This returns
// one NUMBER that sorts exactly as compareHands sorts the two hands;
// brain.test.js holds the two evaluators to each other over random sets.
const B = 15;
const pack = (rank, a = 0, b = 0, c = 0, d = 0, e = 0) =>
  ((((rank * B + a) * B + b) * B + c) * B + d) * B + e;
export const CAT = (score) => Math.floor(score / (B ** 5));

const CNT = new Int8Array(15);
function fill(lists) {
  CNT.fill(0);
  let n = 0;
  for (const list of lists) for (const v of list) { CNT[v]++; n++; }
  return n;
}
const vals = (cards) => cards.map(c => c.value);

// Best hand of at most five cards among CNT's cards.
function scoreCNT(n) {
  let quad = 0, t1 = 0, t2 = 0, p1 = 0, p2 = 0;
  for (let v = 14; v >= 2; v--) {
    const c = CNT[v];
    if (c >= 4) { if (!quad) quad = v; else if (!t1) t1 = v; else if (!t2) t2 = v; }
    else if (c === 3) { if (!t1) t1 = v; else if (!t2) t2 = v; }
    else if (c === 2) { if (!p1) p1 = v; else if (!p2) p2 = v; }
  }
  const top = (skipA, skipB, k) => {
    const out = [];
    for (let v = 14; v >= 2 && out.length < k; v--) {
      if (v === skipA || v === skipB) continue;
      // a rank held more than once still only fills the kicker seats it has
      for (let i = 0; i < CNT[v] && out.length < k; i++) out.push(v);
    }
    return out;
  };
  if (quad) return pack(7, quad, n > 4 ? top(quad, 0, 1)[0] || 0 : 0);
  if (t1 && (t2 || p1)) return pack(6, t1, Math.max(t2, p1));
  if (n >= 5) {
    for (let h = 14; h >= 6; h--) {
      if (CNT[h] && CNT[h - 1] && CNT[h - 2] && CNT[h - 3] && CNT[h - 4]) return pack(4, h);
    }
    if (CNT[14] && CNT[2] && CNT[3] && CNT[4] && CNT[5]) return pack(4, 5);
  }
  if (t1) { const k = top(t1, 0, Math.min(2, n - 3)); return pack(3, t1, k[0] || 0, k[1] || 0); }
  if (p1 && p2) return pack(2, p1, p2, n > 4 ? top(p1, p2, 1)[0] || 0 : 0);
  if (p1) { const k = top(p1, 0, Math.min(3, n - 2)); return pack(1, p1, k[0] || 0, k[1] || 0, k[2] || 0); }
  const k = top(0, 0, Math.min(5, n));
  return pack(0, k[0] || 0, k[1] || 0, k[2] || 0, k[3] || 0, k[4] || 0);
}
export function scoreOf(...valueLists) {
  const n = fill(valueLists);
  return n === 0 ? -1 : scoreCNT(n);
}
export const scoreCards = (cards) => scoreOf(vals(cards));

// The strongest hand these cards could legally SIGNAL. Not the same as
// their best poker hand: a pair with three kickers is not a play, the
// pair alone is. One card, a pair, trips, two pair or quads, or five
// that make a straight or better.
function bestPlayCNT(n) {
  let quad = 0, t1 = 0, t2 = 0, p1 = 0, p2 = 0, hi = 0;
  for (let v = 14; v >= 2; v--) {
    const c = CNT[v];
    if (c && !hi) hi = v;
    if (c >= 4) { if (!quad) quad = v; else if (!t1) t1 = v; else if (!t2) t2 = v; }
    else if (c === 3) { if (!t1) t1 = v; else if (!t2) t2 = v; }
    else if (c === 2) { if (!p1) p1 = v; else if (!p2) p2 = v; }
  }
  if (quad) return pack(7, quad);
  if (t1 && (t2 || p1)) return pack(6, t1, Math.max(t2, p1));
  if (n >= 5) {
    for (let h = 14; h >= 6; h--) {
      if (CNT[h] && CNT[h - 1] && CNT[h - 2] && CNT[h - 3] && CNT[h - 4]) return pack(4, h);
    }
    if (CNT[14] && CNT[2] && CNT[3] && CNT[4] && CNT[5]) return pack(4, 5);
  }
  if (t1) return pack(3, t1);
  if (p1 && p2) return pack(2, p1, p2);
  // a rank held three times is also a pair, and may be the higher one
  const pr = Math.max(p1, t1);
  if (pr) return pack(1, pr);
  return pack(0, hi);
}
export function bestPlayOf(...valueLists) {
  const n = fill(valueLists);
  return n === 0 ? -1 : bestPlayCNT(n);
}

// ── Match equity ─────────────────────────────────────────────
// Her chance of winning the MATCH from a score, mid-round included,
// taking every hand still to come as a coin flip. It is what turns "a
// point" into the right amount of wanting: on 9 a private hand is the
// whole match and nothing is worth saving for later; with you on 9 every
// hand is a must-win; at 3-3 a Scraps hand is worth about two private
// ones. `k` is the next event of the round (0 Hand 1, 1 Hand 2, 2 the
// Scraps hand), `wa` and `wp` the hands each side has taken this round,
// because three of three pays the CLEAN SWEEP bonus.
const EQ = new Map();
export function equity(a, p, k = 0, wa = 0, wp = 0) {
  if (a >= WIN_SCORE) return 1;
  if (p >= WIN_SCORE) return 0;
  const key = ((((a * 16 + p) * 4 + k) * 4 + wa) * 4) + wp;
  const hit = EQ.get(key);
  if (hit !== undefined) return hit;
  const v = k < 2
    ? 0.5 * equity(a + 1, p, k + 1, wa + 1, wp) + 0.5 * equity(a, p + 1, k + 1, wa, wp + 1)
    : 0.5 * equity(a + 2 + (wa === 2 ? 1 : 0), p, 0, 0, 0)
    + 0.5 * equity(a, p + 2 + (wp === 2 ? 1 : 0), 0, 0, 0);
  EQ.set(key, v);
  return v;
}
// What winning rather than losing the hand in play is worth.
const handSwing = (a, p, k, wa, wp) =>
  equity(a + 1, p, k + 1, wa + 1, wp) - equity(a, p + 1, k + 1, wa, wp + 1);
// What winning rather than losing the Scraps hand is worth, seen from
// event k, averaging over the private hands still to be played.
function scrapsSwing(a, p, k, wa, wp) {
  if (a >= WIN_SCORE || p >= WIN_SCORE) return 0;
  if (k < 2) return 0.5 * scrapsSwing(a + 1, p, k + 1, wa + 1, wp)
    + 0.5 * scrapsSwing(a, p + 1, k + 1, wa, wp + 1);
  return equity(a + 2 + (wa === 2 ? 1 : 0), p, 0, 0, 0)
    - equity(a, p + 2 + (wp === 2 ? 1 : 0), 0, 0, 0);
}

// ── What a sharp opponent shows up with ──────────────────────
// The share of showdowns in which the best hand a good player HOLDS falls
// in each category: one card, pair, two pair, trips, straight, (no
// flush), full house, quads. Measured in the arena over 1,500 matches of
// the brain against itself on 2026-09-18 (tools/ai-arena.mjs prints it as
// "best hand held at a showdown"; re-measure if her scrapping changes). Used only where she
// cannot do better: judging her own hand BEFORE any signal exists.
// Once you have signalled she stops guessing and counts (readSignal).
const SHOWN = [0.083, 0.318, 0.334, 0.095, 0.067, 0, 0.092, 0.011];
const BELOW = SHOWN.map((_, i) => SHOWN.slice(0, i).reduce((s, x) => s + x, 0));
function beatsTypical(score) {
  if (score < 0) return 0;
  const cat = CAT(score);
  const topV = Math.floor(score / (B ** 4)) % B;
  return BELOW[cat] + SHOWN[cat] * Math.max(0, Math.min(1, (topV - 2) / 12.5));
}

// ── The view: everything she is allowed to know ──────────────
export function viewFor(state, seat = 'ai', rng = Math.random) {
  const me = seat === 'ai';
  const rules = state.rules || FAIR_RULES;
  const hand = me ? state.aiHand : state.playerHand;
  const pile = me ? state.aiScraps : state.playerScraps;
  const oppPile = me ? state.playerScraps : state.aiScraps;
  const inFlight = state.arrivals?.player?.toHand?.length || 0;
  const oppHandCount = me ? state.playerHand.length + inFlight : state.aiHand.length;
  const m = /-turn-([12])([ab])$/.exec(state.phase || '');
  const handNum = m ? Number(m[1]) : /-2$|reveal-2/.test(state.phase || '') ? 2 : 1;
  let myTurnsLeft = 0, oppTurnsLeft = 0;
  if (m) {
    const after = tradeOrder(state.roundNum, handNum);
    const rest = after.slice(after.indexOf(state.phase) + 1);
    myTurnsLeft = rest.filter(ph => ph.startsWith(seat)).length;
    oppTurnsLeft = rest.length - myTurnsLeft;
  }
  const since = state.handStartTurn ?? 1;
  return {
    seat, rng,
    hand: hand.map(c => ({ ...c })),
    pile: pile.map(c => ({ ...c })),
    oppPile: oppPile.map(c => ({ ...c })),
    discard: state.discard.map(c => ({ ...c })),
    oppHandCount,
    deckCount: state.deck.length,
    oppScrappedThisHand: oppPile.filter(c => (c.turnAdded ?? 0) >= since).length,
    myScore: me ? state.aiScore : state.playerScore,
    oppScore: me ? state.playerScore : state.aiScore,
    myWins: me ? state.roundWins.ai : state.roundWins.player,
    oppWins: me ? state.roundWins.player : state.roundWins.ai,
    handNum, myTurnsLeft, oppTurnsLeft,
    // A tie is a win for her under UNFAIR, a loss for you.
    tie: rules.tiesToHer ? (me ? 1 : 0) : 0.5,
    // Under UNFAIR she picks what YOUR Ace removes.
    oppPicksMyTargets: !!rules.herPick && !me,
  };
}

// Every card she cannot see: your hand and the deck, as one pool.
function unseenPool(view) {
  const seen = new Set();
  for (const list of [view.hand, view.pile, view.oppPile, view.discard]) {
    for (const c of list) seen.add(c.id);
  }
  const pool = [];
  for (let id = 0; id < 52; id++) if (!seen.has(id)) pool.push((id % 13) + 2);
  return pool;
}

// The first `k` of a fresh shuffle of `pool`, without shuffling the rest.
function draw(pool, k, rng) {
  const n = pool.length;
  k = Math.min(k, n);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return k;
}

const choose = (n, k) => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return r;
};
// Chance that your hand holds at least one of the Aces she has not seen.
function oppAceChance(pool, oppHandCount, fewer = 0) {
  const aces = Math.max(0, pool.filter(v => v === 14).length - fewer);
  if (!aces || !oppHandCount) return 0;
  const U = pool.length - fewer;
  return 1 - choose(U - aces, oppHandCount) / choose(U, oppHandCount);
}

// ── Reading your signal ──────────────────────────────────────
// A count of two or more names the KIND of hand exactly, and the cards
// she has seen say which ranks it can still be. Any particular set of k
// cards is as likely to be in your hand as any other set of k, so every
// possibility is weighed by how many ways it can still be made from the
// cards she has not seen. Returns [[score, weight], ...].
export function readSignal(pool, count) {
  const u = new Int8Array(15);
  for (const v of pool) u[v]++;
  const out = [];
  if (count === 2) {
    for (let v = 2; v <= 14; v++) { const w = choose(u[v], 2); if (w) out.push([pack(1, v), w]); }
  } else if (count === 3) {
    for (let v = 2; v <= 14; v++) { const w = choose(u[v], 3); if (w) out.push([pack(3, v), w]); }
  } else if (count === 4) {
    for (let v = 2; v <= 14; v++) {
      if (u[v] === 4) out.push([pack(7, v), 1]);
      for (let lo = 2; lo < v; lo++) {
        const w = choose(u[v], 2) * choose(u[lo], 2);
        if (w) out.push([pack(2, v, lo), w]);
      }
    }
  } else if (count === 5) {
    for (let h = 14; h >= 5; h--) {
      const ranks = h === 5 ? [14, 2, 3, 4, 5] : [h, h - 1, h - 2, h - 3, h - 4];
      const w = ranks.reduce((s, v) => s * u[v], 1);
      if (w) out.push([pack(4, h), w]);
    }
    for (let t = 2; t <= 14; t++) {
      if (u[t] === 4) out.push([pack(7, t, 14), pool.length - 4]);
      const wt = choose(u[t], 3);
      if (!wt) continue;
      for (let p = 2; p <= 14; p++) {
        if (p === t) continue;
        const w = wt * choose(u[p], 2);
        if (w) out.push([pack(6, t, p), w]);
      }
    }
  }
  return out;
}

// Your hand, imagined. You scrap what you do not want and keep what you
// do, so the cards still in your hand are better than a random handful:
// for every few cards she watched you scrap this hand, one more card is
// dealt in and the weakest loose one thrown back.
function imagineOppHand(pool, n, scrapped, rng) {
  const extra = Math.min(4, Math.round(scrapped * TUNE.keepBias));
  const got = draw(pool, n + extra, rng);
  const hand = pool.slice(0, got);
  for (let drop = 0; drop < extra && hand.length > n; drop++) {
    let worst = -1, worstKey = Infinity;
    for (let i = 0; i < hand.length; i++) {
      const v = hand[i];
      if (v === 14) continue;
      let same = 0;
      for (const w of hand) if (w === v) same++;
      const key = (same > 1 ? 100 : 0) + v;
      if (key < worstKey) { worstKey = key; worst = i; }
    }
    if (worst < 0) break;
    hand.splice(worst, 1);
  }
  return hand;
}

// ── Her plays ────────────────────────────────────────────────
// Every distinct hand she could signal. Cards of one rank are
// interchangeable, so options are listed by rank, not by card.
export function listPlays(hand) {
  const by = new Map();
  for (const c of hand) { if (!by.has(c.value)) by.set(c.value, []); by.get(c.value).push(c); }
  const ranks = [...by.keys()].sort((a, b) => b - a);
  const plays = [];
  const add = (cards) => plays.push({ cards, score: scoreCards(cards) });
  for (const v of ranks) {
    const g = by.get(v);
    add([g[0]]);
    if (g.length >= 2) add(g.slice(0, 2));
    if (g.length >= 3) add(g.slice(0, 3));
    if (g.length >= 4) {
      add(g.slice(0, 4));
      // quads may carry a fifth card, which is a free way to be rid of one
      for (const k of ranks) if (k !== v) add([...g.slice(0, 4), by.get(k)[0]]);
    }
  }
  for (const hi of ranks) for (const lo of ranks) {
    if (lo >= hi) continue;
    if (by.get(hi).length >= 2 && by.get(lo).length >= 2) add([...by.get(hi).slice(0, 2), ...by.get(lo).slice(0, 2)]);
    if (by.get(hi).length >= 3 && by.get(lo).length >= 2) add([...by.get(hi).slice(0, 3), ...by.get(lo).slice(0, 2)]);
    if (by.get(lo).length >= 3 && by.get(hi).length >= 2) add([...by.get(lo).slice(0, 3), ...by.get(hi).slice(0, 2)]);
  }
  for (let h = 14; h >= 5; h--) {
    const need = h === 5 ? [14, 2, 3, 4, 5] : [h, h - 1, h - 2, h - 3, h - 4];
    if (need.every(v => by.has(v))) add(need.map(v => by.get(v)[0]));
  }
  return plays;
}

// ── Choosing a signal ────────────────────────────────────────
// `oppSignal` is your count when you signalled first, null when she must
// go first. Returns the cards to play.
//
// Hand 1 is where holding back pays: whatever she does not play is still
// hers in Hand 2, so the cheapest hand that is sure to win beats the
// biggest one, and a hand that cannot win is conceded with the card she
// can best do without, never her best. Keeping is not free, though. Hand
// 2 only deals her back up to five, so every card kept is a fresh card
// not drawn: a pair is worth carrying over, a loose low card is not.
// Hand 2 has no later, so there she simply plays to win.
export function chooseSignal(view, oppSignal = null) {
  const { hand, rng } = view;
  const plays = listPlays(hand);
  if (plays.length === 0) return [];
  const pool = unseenPool(view);
  const k = view.handNum - 1;
  const a = view.myScore, p = view.oppScore, wa = view.myWins, wp = view.oppWins;
  const eWin = equity(a + 1, p, k + 1, wa + 1, wp);
  const eLose = equity(a, p + 1, k + 1, wa, wp + 1);
  const eTie = view.tie === 1 ? eWin : view.tie === 0 ? eLose : equity(a, p, k + 1, wa, wp);

  // What she is up against: [[score, weight], ...]
  let against;
  if (oppSignal && oppSignal >= 2) {
    against = readSignal(pool, oppSignal);
  } else {
    against = [];
    for (let i = 0; i < TUNE.samples * 3; i++) {
      const h = imagineOppHand(pool, view.oppHandCount, view.oppScrappedThisHand, rng);
      const best = bestPlayOf(h);
      if (oppSignal === 1) {
        // One card from you means nothing better to play, nearly always.
        against.push([pack(0, Math.max(...h, 0)), CAT(best) === 0 ? 1 : 0.15]);
      } else {
        against.push([best, 1]);
      }
    }
  }
  const total = against.reduce((s, [, w]) => s + w, 0) || 1;

  // What the cards she keeps are worth in Hand 2.
  const swing2 = k === 0 ? handSwing(a, p, 1, wa, wp) : 0;
  const sSwing = scrapsSwing(a, p, 2, wa, wp);
  // WHAT THE CARDS SHE KEEPS ARE WORTH. Measured, not assumed, and the
  // measurement is not what intuition says: Hand 2 deals her back up to
  // five, so a kept card is a fresh card not drawn, and a LOW pair
  // carried over wins Hand 2 slightly less often than two fresh cards do
  // (45% against 50% over 40,000 deals; a pair of Queens, 53%). What
  // makes a kept pair worth having is the other thing she can do with
  // it: scrap it, which puts a made pair in her pile for the 2-point
  // hand. So a kept set is worth the better of its two uses, played in
  // her hand or scrapped into her pile, and every option is tried
  // against the SAME imagined cards. With a fresh set each, the luck of
  // the draw was bigger than the difference between keeping a Jack and
  // keeping a four.
  const REFILLS = 32;
  const refills = [];
  if (k === 0) for (let i = 0; i < REFILLS; i++) { draw(pool, 17, rng); refills.push(pool.slice(0, 17)); }
  const pileV = vals(view.pile), oppV = vals(view.oppPile);
  const carry = (keep) => {
    if (k !== 0) return 0;
    const kv = vals(keep);
    // the refill to five, and roughly what two scrap turns will show her
    const see = Math.max(0, 5 - kv.length) + 4;
    let inHand = 0, inPile = 0;
    for (const r of refills) {
      const opp = scoreOf(oppV, r.slice(13, 17));
      const beats = (mine) => (mine > opp ? 1 : mine === opp ? view.tie : 0);
      const more = r.slice(9, 13);
      inHand += swing2 * beatsTypical(bestPlayOf(kv, r.slice(0, see))) + sSwing * beats(scoreOf(pileV, more));
      inPile += swing2 * beatsTypical(bestPlayOf(r.slice(0, 9 - Math.ceil(kv.length / 2))))
        + sSwing * beats(scoreOf(pileV, kv, more));
    }
    const aces = kv.filter(v => v === 14).length;
    // A ten or a face card is worth two draws when it is scrapped.
    const fuel = kv.filter(v => v >= 10 && v <= 13).length;
    // An Ace carried over is an attack still to come, or a counter.
    return Math.max(inHand, inPile) / REFILLS + swing2 * fuel * 0.004
      + sSwing * (aces > 0 ? TUNE.aceCarry : 0) + sSwing * (aces > 1 ? TUNE.aceCarry * 0.4 : 0);
  };
  // Nothing is worth keeping for a Hand 2 that will not be played: on 9,
  // or with you on 9, the hand in play can be the last of the match.
  const goesOn = (w, t) => w * (a + 1 < WIN_SCORE ? 1 : 0) + t + (1 - w - t) * (p + 1 < WIN_SCORE ? 1 : 0);

  let bestPlay = null, bestV = -Infinity;
  for (const play of plays) {
    let w = 0, t = 0;
    for (const [s, wt] of against) { if (play.score > s) w += wt; else if (play.score === s) t += wt; }
    w /= total; t /= total;
    const ids = new Set(play.cards.map(c => c.id));
    const v = w * eWin + t * eTie + (1 - w - t) * eLose
      + TUNE.carry * goesOn(w, t) * carry(hand.filter(c => !ids.has(c.id)))
      // dead heat: spend fewer and lower cards
      - play.cards.length * 1e-6 - play.score * 1e-13;
    if (v > bestV) { bestV = v; bestPlay = play; }
  }
  return bestPlay.cards;
}

// ── Ace targets ──────────────────────────────────────────────
// The two cards whose loss leaves a pile weakest. engine.chooseAceTargets
// guesses at this from "importance"; with a fast evaluator all 21 pairs
// can simply be tried.
export function worstTwo(pile) {
  if (pile.length <= 2) return pile.slice(0, 2);
  const v = vals(pile);
  let best = null, bestS = Infinity, bestSum = -1;
  for (let i = 0; i < pile.length; i++) for (let j = i + 1; j < pile.length; j++) {
    const s = scoreOf(v.filter((_, x) => x !== i && x !== j));
    const sum = v[i] + v[j];
    if (s < bestS || (s === bestS && sum > bestSum)) { bestS = s; bestSum = sum; best = [pile[i], pile[j]]; }
  }
  return best;
}
// UNFAIR: she picks what YOUR Ace removes, so she gives up
// the two cards her pile will miss least.
export function cheapestTwo(pile) {
  if (pile.length <= 2) return pile.slice(0, 2);
  const v = vals(pile);
  let best = null, bestS = -Infinity, bestSum = Infinity;
  for (let i = 0; i < pile.length; i++) for (let j = i + 1; j < pile.length; j++) {
    const s = scoreOf(v.filter((_, x) => x !== i && x !== j));
    const sum = v[i] + v[j];
    if (s > bestS || (s === bestS && sum < bestSum)) { bestS = s; bestSum = sum; best = [pile[i], pile[j]]; }
  }
  return best;
}

// A pile that must shed `over` cards: which of the cards ALREADY in it go.
// One at a time, each time the card whose loss costs least, low cards
// first among equals.
function trim(existing, adding, over) {
  const keep = [...existing];
  const gone = [];
  const addV = vals(adding);
  for (let n = 0; n < over && keep.length; n++) {
    let at = 0, bestS = -Infinity;
    for (let i = 0; i < keep.length; i++) {
      const s = scoreOf(vals(keep.filter((_, x) => x !== i)), addV) - keep[i].value * 1e-3;
      if (s > bestS) { bestS = s; at = i; }
    }
    gone.push(keep.splice(at, 1)[0]);
  }
  return { pile: [...keep, ...adding], discards: gone };
}

// ── Weighing positions ───────────────────────────────────────
// Each position is where one option leaves her: a hand, a pile, your
// pile, how many cards it draws, whether she still holds an Ace. They are
// all tried against the SAME imagined deals, so the comparison between
// two options is not drowned by the luck of two different sets of cards.
function weigh(view, pool, positions) {
  const { rng } = view;
  const k = view.handNum - 1;
  const a = view.myScore, p = view.oppScore, wa = view.myWins, wp = view.oppWins;
  const hSwing = handSwing(a, p, k, wa, wp);
  const sSwing = scrapsSwing(a, p, k, wa, wp);
  // Turns still to come this round, for each side, after this move.
  const later = view.handNum === 1 ? 2 : 0;
  const myMore = Math.round((view.myTurnsLeft + later) * 2);
  const oppMore = Math.round((view.oppTurnsLeft + later) * 1.8);
  const handMore = view.myTurnsLeft * 2;
  const maxDraw = Math.min(view.deckCount, Math.max(0, ...positions.map(o => o.draws)));
  const aceOdds = oppAceChance(pool, view.oppHandCount);

  for (const o of positions) {
    o.value = 0;
    o.handV = vals(o.hand); o.pileV = vals(o.pile); o.oppV = vals(o.oppPile);
    // How likely her pile is to take a hit before the round ends: you
    // have to hold an Ace, choose to use it, and get it past her counter.
    const exposed = o.pile.length >= 2
      ? (o.oppAceOdds ?? aceOdds) * TUNE.exposure * (o.holdsAce ? 1 - TUNE.shield : 1) : 0;
    o.exposed = (view.oppTurnsLeft + later) > 0 ? exposed : 0;
    if (o.exposed > 0) {
      const lost = new Set((view.oppPicksMyTargets ? cheapestTwo(o.pile) : worstTwo(o.pile)).map(c => c.id));
      o.hitV = vals(o.pile.filter(c => !lost.has(c.id)));
    }
  }
  for (let i = 0; i < TUNE.samples; i++) {
    const need = maxDraw + handMore + myMore + oppMore;
    const got = draw(pool, need, rng);
    const seg = (from, len) => pool.slice(Math.min(from, got), Math.min(from + len, got));
    const mine = seg(maxDraw + handMore, myMore);
    const theirs = seg(maxDraw + handMore + myMore, oppMore);
    const seeLater = seg(maxDraw, handMore);
    const oppCache = new Map();
    for (const o of positions) {
      const drawn = seg(0, Math.min(o.draws, maxDraw));
      const pH = beatsTypical(bestPlayOf(o.handV, drawn, seeLater));
      const base = (i + 0.5) / TUNE.samples < o.exposed ? o.hitV : o.pileV;
      const my = scoreOf(base, mine);
      let opp = oppCache.get(o.oppPile);
      if (opp === undefined) { opp = scoreOf(o.oppV, theirs); oppCache.set(o.oppPile, opp); }
      const pS = my > opp ? 1 : my === opp ? view.tie : 0;
      o.value += (hSwing * pH + sSwing * pS) / TUNE.samples;
    }
  }
  return { sSwing };
}

// ── Choosing a turn ──────────────────────────────────────────
// Returns { type:'trade', cards, discards } | { type:'ace', targetCards }
// | { type:'skip' }.
export function chooseTurn(view) {
  const { hand, pile, oppPile } = view;
  const aces = hand.filter(c => c.rank === 'A');
  const canAttack = aces.length > 0 && oppPile.length >= 2;
  const targets = canAttack
    ? (view.oppPicksMyTargets ? cheapestTwo(oppPile) : worstTwo(oppPile)) : null;
  if (!hasLegalTrade(hand)) {
    return canAttack ? { type: 'ace', targetCards: targets } : { type: 'skip' };
  }
  const pool = unseenPool(view);

  // Every legal scrap, one per distinct set of ranks.
  const seenKey = new Set();
  const options = [];
  const n = hand.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const cards = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) cards.push(hand[i]);
    const key = cards.map(c => c.value).sort((x, y) => x - y).join(',');
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    const draws = cards.reduce((s, c) => s + scrapValue(c), 0);
    // The rule is on what she is OWED, as it is for you: a scrap that would
    // draw her past seven is illegal even if the deck could not pay it.
    if (n - cards.length + draws > HAND_LIMIT) continue;
    const over = pile.length + cards.length - SCRAPS_LIMIT;
    if (over > pile.length) continue;
    const ids = new Set(cards.map(c => c.id));
    const kept = hand.filter(c => !ids.has(c.id));
    const t = over > 0 ? trim(pile, cards, over) : { pile: [...pile, ...cards], discards: [] };
    options.push({ kind: 'trade', cards, discards: t.discards, hand: kept, pile: t.pile, oppPile,
      draws, holdsAce: kept.some(c => c.rank === 'A') });
  }
  if (options.length === 0) {
    return canAttack ? { type: 'ace', targetCards: targets } : { type: 'skip' };
  }

  // Attacking: it lands, or you counter and both Aces are gone. `stand`
  // is the table left exactly as it is, which no turn can choose; it is
  // only there to measure what the attack adds.
  let landed = null, countered = null, stand = null;
  if (canAttack) {
    const gone = new Set(targets.map(c => c.id));
    const rest = hand.filter(c => c.id !== aces[0].id);
    const holds = rest.some(c => c.rank === 'A');
    landed = { kind: 'ace', hand: rest, pile, oppPile: oppPile.filter(c => !gone.has(c.id)), draws: 0, holdsAce: holds };
    countered = { kind: 'ace', hand: rest, pile, oppPile, draws: 0, holdsAce: holds,
      oppAceOdds: oppAceChance(pool, view.oppHandCount, 1) };
    stand = { kind: 'stand', hand, pile, oppPile, draws: 0, holdsAce: true };
    options.push(landed, countered, stand);
  }
  weigh(view, pool, options);

  let best = null;
  for (const o of options) if (o.kind === 'trade' && (!best || o.value > best.value)) best = o;
  if (canAttack) {
    const counterOdds = oppAceChance(pool, view.oppHandCount) * 0.85;
    const attack = (1 - counterOdds) * landed.value + counterOdds * countered.value;
    // WHEN to throw it. Every attack costs one scrap turn, whenever it is
    // made, and her last scrap turn of the round is the cheapest one to
    // give up, while an Ace thrown late leaves you the fewest turns to
    // rebuild. So while she still has a turn for each Ace she holds, a
    // scrap that keeps the Ace is credited with what the throw would
    // add, and she waits. On her last turn there is no later: an Ace
    // still in her hand when the round ends is discarded with the rest.
    const turnsAfter = view.myTurnsLeft + (view.handNum === 1 ? 2 : 0);
    const canWait = turnsAfter >= aces.length;
    const hold = canWait && best.holdsAce ? Math.max(0, attack - stand.value) * TUNE.hold : 0;
    if (attack > best.value + hold) return { type: 'ace', targetCards: targets };
  }
  return { type: 'trade', cards: best.cards, discards: best.discards };
}

// ── Countering ───────────────────────────────────────────────
// You have thrown an Ace at two named cards of hers. She counters when
// keeping those two is worth more than keeping her Ace. The old rule
// never looked at which cards were in danger.
export function chooseCounter(view, targets) {
  const ace = view.hand.find(c => c.rank === 'A');
  if (!ace) return false;
  const pool = unseenPool(view);
  const gone = new Set(targets.map(c => c.id));
  const rest = view.hand.filter(c => c.id !== ace.id);
  const allow = { hand: view.hand, pile: view.pile.filter(c => !gone.has(c.id)), oppPile: view.oppPile,
    draws: 0, holdsAce: true, oppAceOdds: oppAceChance(pool, view.oppHandCount, 1) };
  const counter = { hand: rest, pile: view.pile, oppPile: view.oppPile, draws: 0,
    holdsAce: rest.some(c => c.rank === 'A'), oppAceOdds: oppAceChance(pool, view.oppHandCount, 1) };
  const { sSwing } = weigh(view, pool, [allow, counter]);
  // The Ace she would keep can still be thrown, if your pile is worth it.
  const canUse = view.oppPile.length >= 2 && (view.myTurnsLeft + (view.handNum === 1 ? 2 : 0)) > 0;
  return counter.value > allow.value + (canUse ? 0.08 * sSwing : 0);
}

// ── What the game calls ──────────────────────────────────────
// NORMAL is the old cautious player, untouched. HARD and UNFAIR are the
// same brain; the second only plays under tilted rules.
const thinks = (difficulty) => difficulty === 'hard' || difficulty === 'unfair';

export function herTurn(state, difficulty, rng = Math.random) {
  if (!thinks(difficulty)) {
    return aiDecide(state.aiHand, state.aiScraps, state.playerScraps, [], difficulty,
      state.phase, state.aiScore, state.playerScore);
  }
  return chooseTurn(viewFor(state, 'ai', rng));
}

// `playerSignal` is your count if you signalled first, else null.
export function herSignal(state, playerSignal, difficulty, rng = Math.random) {
  if (!thinks(difficulty)) {
    const sig = aiChooseSignal(state.aiHand, playerSignal, difficulty, state.aiScore, state.playerScore);
    const cards = getBestCardsForSignal(state.aiHand, sig) || [];
    return { signal: cards.length || sig, cards };
  }
  const cards = chooseSignal(viewFor(state, 'ai', rng), playerSignal);
  return { signal: cards.length, cards };
}

export function herCounter(state, targets, difficulty, rng = Math.random) {
  if (!state.aiHand.some(c => c.rank === 'A')) return false;
  if (!thinks(difficulty)) {
    return shouldCounterAce(state.aiScraps, state.playerScraps, state.aiScore, state.playerScore);
  }
  return chooseCounter(viewFor(state, 'ai', rng), targets);
}
