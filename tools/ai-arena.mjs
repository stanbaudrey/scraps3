// ============================================================
// SCRAPS — the arena: whole matches, bot against bot, no browser
//
//   node tools/ai-arena.mjs                 the standard card, 400 matches a pairing
//   N=2000 node tools/ai-arena.mjs          more matches, tighter numbers
//   node tools/ai-arena.mjs brain classic   one pairing: <her seat> <your seat>
//   RULES=unfair node tools/ai-arena.mjs brain brain
//   SEED=7 ...                              a different set of deals
//
// WHY IT EXISTS. "HARD is not hard enough" cannot be fixed by feel, and a
// shuffled game cannot be driven to the state you want to look at. This
// plays complete matches through the REAL reducer, the same actions the
// table dispatches, with a seeded shuffle, so a change to her brain is a
// number before it is an opinion. It is not part of `npm test`: a card
// takes a minute or two.
//
// WHAT IT CANNOT TELL YOU. It measures bots against bots. Stan's target
// for HARD is that a strong PERSON wins about half, and no bot here is a
// person; `sharp` is the nearest thing, a scripted player who scraps in
// volume, reads a signal the obvious way and throws Aces late. Treat a
// result here as "did she get better", never as "she wins N% against
// people". That number only comes from real records.
//
// Policies:
//   brain    the HARD brain (src/game/brain.js). Plays either seat.
//   classic  HARD as it was before 2026-09-18 (engine.aiDecide 'hard').
//   normal   NORMAL, the cautious one (engine 'easy').
//   sharp    the scripted good player described above.
// ============================================================

import {
  shuffle, scrapValue, HAND_LIMIT, SCRAPS_LIMIT, evaluateBestHand, hasLegalTrade,
  aiDecide, aiChooseSignal, getBestCardsForSignal, shouldCounterAce,
  chooseAceTargets, getValidSignals,
} from '../src/game/engine.js';
import {
  gameReducer, createInitialState, buildRoundDeal, scoreSmallHand,
  scoreScrapsOutcome, rulesFor, deckNeedsRefresh,
} from '../src/game/reducer.js';
import {
  viewFor, chooseTurn, chooseSignal, chooseCounter, worstTwo, cheapestTwo,
  scoreCards, bestPlayOf, CAT, TUNE,
} from '../src/game/brain.js';
const TUNE_DEFAULT = { ...TUNE };

// mulberry32: small, fast, good enough to deal cards.
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

// A seat's cards, whichever side of the table it is.
const seatOf = (s, seat) => seat === 'ai'
  ? { hand: s.aiHand, pile: s.aiScraps, oppPile: s.playerScraps, me: s.aiScore, opp: s.playerScore }
  : { hand: s.playerHand, pile: s.playerScraps, oppPile: s.aiScraps, me: s.playerScore, opp: s.aiScore };

// ── Policies ─────────────────────────────────────────────────
const engineBot = (difficulty) => ({
  turn(s, seat) {
    const v = seatOf(s, seat);
    return aiDecide(v.hand, v.pile, v.oppPile, [], difficulty, s.phase.replace(/^player/, 'ai'), v.me, v.opp);
  },
  signal(s, seat, oppSignal) {
    const v = seatOf(s, seat);
    const sig = aiChooseSignal(v.hand, oppSignal, difficulty, v.me, v.opp);
    return getBestCardsForSignal(v.hand, sig) || [v.hand[0]];
  },
  counter(s, seat) {
    const v = seatOf(s, seat);
    return shouldCounterAce(v.pile, v.oppPile, v.me, v.opp);
  },
  targets: (pile) => (difficulty === 'hard' ? chooseAceTargets(pile) : [...pile].sort((a, b) => b.value - a.value).slice(0, 2)),
});

// `brain:hold=0,samples=200` plays the brain with those numbers changed,
// on that seat only, so one setting can be played against another.
const brainBot = (rng, spec = '') => {
  const over = Object.fromEntries(spec.split(',').filter(Boolean).map(kv => {
    const [k, v] = kv.split('='); return [k, Number(v)];
  }));
  const as = (fn) => (...args) => { Object.assign(TUNE, TUNE_DEFAULT, over); return fn(...args); };
  return {
    turn: as((s, seat) => chooseTurn(viewFor(s, seat, rng))),
    signal: as((s, seat, oppSignal) => chooseSignal(viewFor(s, seat, rng), oppSignal)),
    counter: as((s, seat, targets) => chooseCounter(viewFor(s, seat, rng), targets)),
    targets: (pile) => worstTwo(pile),
  };
};

// The scripted good player. No card counting and no imagined deals: just
// the habits a person who is good at this game has.
const sharpBot = () => ({
  turn(s, seat) {
    const v = seatOf(s, seat);
    const last = /2b$/.test(s.phase);
    const ace = v.hand.find(c => c.rank === 'A');
    if (!hasLegalTrade(v.hand)) {
      return ace && v.oppPile.length >= 2 ? { type: 'ace', targetCards: worstTwo(v.oppPile) } : { type: 'skip' };
    }
    // An Ace goes late, and only when it turns a losing Scraps hand around.
    if (ace && v.oppPile.length >= 2 && /2[ab]$/.test(s.phase)) {
      const t = worstTwo(v.oppPile);
      const gone = new Set(t.map(c => c.id));
      const mine = scoreCards(v.pile);
      if (scoreCards(v.oppPile) >= mine && (scoreCards(v.oppPile.filter(c => !gone.has(c.id))) < mine || last)) {
        return { type: 'ace', targetCards: t };
      }
    }
    // Scrap every loose card, and any card that pairs the pile.
    const counts = {};
    for (const c of v.hand) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const inPile = new Set(v.pile.map(c => c.rank));
    const want = v.hand.filter(c => c.rank !== 'A' && (counts[c.rank] === 1 || inPile.has(c.rank)))
      .sort((a, b) => (inPile.has(b.rank) - inPile.has(a.rank)) || (a.value - b.value));
    const cards = [];
    let pile = [...v.pile], discards = [];
    for (const c of want) {
      const draws = [...cards, c].reduce((n, x) => n + scrapValue(x), 0);
      if (v.hand.length - cards.length - 1 + draws > HAND_LIMIT) continue;
      if (pile.length - discards.length + cards.length + 1 > SCRAPS_LIMIT) {
        // give up the pile card that costs least, if it costs nothing
        const before = scoreCards([...pile.filter(x => !discards.includes(x)), ...cards, c]);
        const spare = pile.filter(x => !discards.includes(x))
          .map(x => ({ x, s: scoreCards([...pile.filter(y => y !== x && !discards.includes(y)), ...cards, c]) }))
          .sort((p, q) => q.s - p.s || p.x.value - q.x.value)[0];
        if (!spare || CAT(spare.s) < CAT(before)) continue;
        discards.push(spare.x);
      }
      cards.push(c);
    }
    if (cards.length) return { type: 'trade', cards, discards };
    const low = [...v.hand].filter(c => v.hand.length - 1 + scrapValue(c) <= HAND_LIMIT).sort((a, b) => a.value - b.value)[0];
    if (!low) return { type: 'skip' };
    const over = v.pile.length + 1 - SCRAPS_LIMIT;
    return { type: 'trade', cards: [low], discards: over > 0 ? [...v.pile].sort((a, b) => a.value - b.value).slice(0, over) : [] };
  },
  signal(s, seat, oppSignal) {
    const v = seatOf(s, seat);
    if (!v.hand.length) return [];
    const best = getBestCardsForSignal(v.hand, Math.max(...getValidSignals(v.hand)));
    if (!oppSignal) return best;
    // Reads the count the way Stan described it: what it must be, whether
    // the best hand beats that kind, and a low card if it cannot.
    const kind = { 1: 0, 2: 1, 3: 3, 4: 2, 5: 4 }[oppSignal];
    const mine = evaluateBestHand(best).rank;
    if (mine >= kind) return best;
    return [[...v.hand].sort((a, b) => a.value - b.value)[0]];
  },
  counter: () => true,
  targets: (pile) => worstTwo(pile),
});

function makePolicy(name, rng) {
  if (name.startsWith('brain')) return brainBot(rng, name.split(':')[1]);
  if (name === 'classic') return engineBot('hard');
  if (name === 'normal') return engineBot('easy');
  if (name === 'sharp') return sharpBot();
  throw new Error(`unknown policy "${name}"`);
}

// ── One match, through the real reducer ──────────────────────
function playMatch(herName, youName, rules, rng, stats) {
  const her = makePolicy(herName, rng), you = makePolicy(youName, rng);
  let s = createInitialState(rules);
  const go = (action) => {
    s = gameReducer(s, action);
    // the table does this from an effect; here it follows every action
    if (deckNeedsRefresh(s)) { stats.refreshes++; s = gameReducer(s, { type: 'DECK_REFRESH', cards: shuffle(s.discard, rng) }); }
  };
  let guard = 0;
  for (let round = 1; !s.gameOver; round++) {
    go({ type: 'START_ROUND', deal: buildRoundDeal({ rng, herAce: rules.herAce }), alternate: round > 1 });
    go({ type: 'INTERSTITIAL_DONE' });
    while (!s.gameOver && s.phase !== 'round-end') {
      if (++guard > 5000) throw new Error(`stuck in phase ${s.phase}`);
      const phase = s.phase;
      if (phase.startsWith('player-turn')) yourTurn();
      else if (phase.startsWith('ai-turn')) herTurn();
      else if (phase === 'signal-ai' || phase === 'signal-ai-2') {
        const cards = her.signal(s, 'ai', null);
        go({ type: 'AI_FIRST_SIGNAL', signal: cards.length, cards });
      } else if (phase === 'signal-player' || phase === 'signal-player-2') {
        const cards = you.signal(s, 'player', s.aiSignal);
        go({ type: 'PLAYER_SIGNAL', cards });
        if (s.aiSignal != null) go({ type: 'GO_REVEAL' });
        else {
          const hers = her.signal(s, 'ai', cards.length);
          go({ type: 'AI_RESPOND_SIGNAL', signal: hers.length, cards: hers, playerSig: cards.length });
        }
      } else if (phase === 'reveal-1' || phase === 'reveal-2') {
        // The best hand each side COULD have shown, which is what a hand is
        // really up against (a conceded low card says nothing about it).
        for (const h of [s.aiHand, s.playerHand]) {
          const c = CAT(bestPlayOf(h.map(x => x.value)));
          stats.held[c] = (stats.held[c] || 0) + 1;
        }
        const r = scoreSmallHand(s.playerPlayed, s.aiPlayed, rules);
        stats.shown[r.aH.rank] = (stats.shown[r.aH.rank] || 0) + 1;
        stats.shown[r.pH.rank] = (stats.shown[r.pH.rank] || 0) + 1;
        stats.hands[r.winner]++; stats.handsPlayed++;
        go({ type: 'SMALL_HAND_SCORED', winner: r.winner, pts: r.pts, pName: r.pH.name, aName: r.aH.name, fromPhase: phase });
      } else if (phase === 'replenish') go({ type: 'REPLENISH' });
      else if (phase === 'scraps-reveal') {
        go({ type: 'HANDS_DISCARDED' });
        stats.pileSize.ai += s.aiScraps.length; stats.pileSize.player += s.playerScraps.length;
        stats.deckLeft += s.deck.length; if (s.deck.length === 0) stats.deckDry++;
        const out = scoreScrapsOutcome(s.playerScraps, s.aiScraps, s.roundWins, rules);
        stats.scraps[out.winner]++;
        if (out.cleanSweep) stats.sweeps.player++;
        if (out.aiSweep) stats.sweeps.ai++;
        stats.rounds++;
        go({ type: 'SCRAPS_SCORED', ...out, pName: out.pB.name });
      } else throw new Error(`arena does not know phase "${phase}"`);
    }
  }
  return s;

  function yourTurn() {
    const phase = s.phase;
    for (let tries = 0; s.phase === phase && tries < 6; tries++) {
      const act = you.turn(s, 'player');
      if (s.counterStand && act.type !== 'ace') { go({ type: 'PLAYER_END_TURN' }); return; }
      if (act.type === 'skip') { go({ type: 'PLAYER_SKIP' }); return; }
      if (act.type === 'ace') {
        stats.aces.player++;
        const ace = s.playerHand.find(c => c.rank === 'A');
        const targets = rules.herPick ? cheapestTwo(s.aiScraps) : act.targetCards.slice(0, 2);
        const herAce = s.aiHand.find(c => c.rank === 'A');
        if (herAce && her.counter(s, 'ai', targets)) {
          stats.counters.ai++;
          go({ type: 'AI_COUNTER_ACE', playerAceId: ace.id, aiAceId: herAce.id });
        } else {
          go({ type: 'PLAYER_ACE_APPLY', aceId: ace.id, targetIds: targets.map(c => c.id) });
        }
        continue;
      }
      stats.scrapped.player += act.cards.length;
      const over = s.playerScraps.length + act.cards.length - SCRAPS_LIMIT;
      if (over > 0) {
        const drawCount = act.cards.reduce((n, c) => n + scrapValue(c), 0);
        go({ type: 'PLAYER_TRADE_OVERFLOW_START', cards: act.cards, drawCount, excess: over });
        const named = (act.discards || []).slice(0, over);
        const discardCards = named.length === over ? named : s.playerScraps.slice(0, over);
        go({ type: 'PLAYER_SCRAP_WITH_DISCARD', discardCards });
      } else {
        go({ type: 'PLAYER_TRADE_TAKE', cards: act.cards });
        go({ type: 'PLAYER_SCRAPS_ARRIVE' });
        for (const c of [...s.arrivals.player.toHand]) go({ type: 'PLAYER_DRAW_ARRIVE', cardId: c.id });
      }
      return;
    }
    if (s.phase === phase) go({ type: s.counterStand ? 'PLAYER_END_TURN' : 'PLAYER_SKIP' });
  }

  function herTurn() {
    const phase = s.phase;
    const act = her.turn(s, 'ai');
    if (act.type === 'trade' && act.cards.length) {
      stats.scrapped.ai += act.cards.length;
      go({ type: 'AI_TRADE_APPLY', cards: act.cards, discards: act.discards });
    } else if (act.type === 'ace') {
      // After your counter she comes straight back if she holds another.
      let targets = act.targetCards.slice(0, 2);
      for (let n = 0; n < 4; n++) {
        const ace = s.aiHand.find(c => c.rank === 'A');
        if (!ace || s.playerScraps.length < 2) break;
        stats.aces.ai++;
        const yours = s.playerHand.find(c => c.rank === 'A');
        if (yours && you.counter(s, 'player', targets)) {
          stats.counters.player++;
          go({ type: 'AI_ACE_PENDING', ace, targets });
          go({ type: 'PLAYER_COUNTER_ACE' });
          targets = her.targets(s.playerScraps);
          continue;
        }
        go({ type: 'AI_ACE_APPLY', aceId: ace.id, targetIds: targets.map(c => c.id) });
        break;
      }
    } else {
      go({ type: 'AI_SKIP' });
    }
    go({ type: 'ADVANCE_FROM', phase });
  }
}

// ── A pairing, many matches ──────────────────────────────────
const NAMES = ['one card', 'pair', 'two pair', 'trips', 'straight', '', 'full house', 'quads'];
function runPairing(herName, youName, rulesName, n, seed) {
  const rng = seeded(seed);
  const rules = rulesFor(rulesName);
  const stats = { rounds: 0, handsPlayed: 0, hands: { player: 0, ai: 0, tie: 0 }, scraps: { player: 0, ai: 0, tie: 0 },
    sweeps: { player: 0, ai: 0 }, scrapped: { player: 0, ai: 0 }, pileSize: { player: 0, ai: 0 },
    aces: { player: 0, ai: 0 }, counters: { player: 0, ai: 0 }, shown: {}, held: {}, refreshes: 0, deckLeft: 0, deckDry: 0 };
  let herWins = 0, margin = 0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const end = playMatch(herName, youName, rules, rng, stats);
    if (end.gameOver === 'ai') herWins++;
    margin += end.aiScore - end.playerScore;
  }
  const pct = (x, d) => `${(100 * x / d).toFixed(1)}%`;
  const per = (x) => (x / stats.rounds).toFixed(2);
  const se = 100 * Math.sqrt(0.25 / n);
  console.log(`\nHER ${herName}  vs  YOU ${youName}   ${rulesName === 'unfair' ? 'UNFAIR rules' : 'fair rules'}   ${n} matches, seed ${seed}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  she wins ${pct(herWins, n)} of matches (give or take ${se.toFixed(1)}), average margin ${(margin / n).toFixed(2)}, ${(stats.rounds / n).toFixed(1)} rounds a match`);
  console.log(`  private hands   her ${pct(stats.hands.ai, stats.handsPlayed)}  you ${pct(stats.hands.player, stats.handsPlayed)}  tied ${pct(stats.hands.tie, stats.handsPlayed)}`);
  console.log(`  Scraps hand     her ${pct(stats.scraps.ai, stats.rounds)}  you ${pct(stats.scraps.player, stats.rounds)}   clean sweeps a round: her ${per(stats.sweeps.ai)} you ${per(stats.sweeps.player)}`);
  console.log(`  a round         scrapped her ${per(stats.scrapped.ai)} you ${per(stats.scrapped.player)}   pile her ${per(stats.pileSize.ai)} you ${per(stats.pileSize.player)}   Aces thrown her ${per(stats.aces.ai)} you ${per(stats.aces.player)}   countered by her ${per(stats.counters.ai)} by you ${per(stats.counters.player)}`);
  console.log(`  deck            ${per(stats.deckLeft)} cards left at the Scraps hand, ran dry in ${pct(stats.deckDry, stats.rounds)} of rounds, discards shuffled back in ${pct(stats.refreshes, stats.rounds)} of rounds`);
  const shownTotal = Object.values(stats.shown).reduce((a, b) => a + b, 0);
  console.log(`  shown at a showdown: ${NAMES.map((nm, i) => (nm && stats.shown[i] ? `${nm} ${pct(stats.shown[i], shownTotal)}` : null)).filter(Boolean).join(', ')}`);
  const heldTotal = Object.values(stats.held).reduce((a, b) => a + b, 0);
  console.log(`  best hand held at a showdown: ${NAMES.map((nm, i) => (nm && stats.held[i] ? `${nm} ${pct(stats.held[i], heldTotal)}` : null)).filter(Boolean).join(', ')}`);
  return herWins / n;
}

const N = Number(process.env.N || 400);
const SEED = Number(process.env.SEED || 1);
const [a, b] = process.argv.slice(2);
if (a && b) {
  runPairing(a, b, process.env.RULES || 'fair', N, SEED);
} else {
  runPairing('classic', 'sharp', 'fair', N, SEED);
  runPairing('brain', 'sharp', 'fair', N, SEED);
  runPairing('brain', 'classic', 'fair', N, SEED);
  runPairing('classic', 'brain', 'fair', N, SEED);
  runPairing('brain', 'brain', 'fair', N, SEED);
  runPairing('brain', 'brain', 'unfair', N, SEED);
  runPairing('brain', 'sharp', 'unfair', N, SEED);
}
