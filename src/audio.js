// ============================================================
// SCRAPS — Sound. Direction: CARDBOARD & BONE.
//
// Chosen by Stan in the Foley Bench on 2026-08-26, from two
// directions built out across twelve cues:
//   https://claude.ai/code/artifact/2b99d5e2-f9b1-400e-9609-ee2b3dd210b8
//
// The rule that defines the direction: NO OSCILLATOR EVER PLAYS
// A NOTE. There is exactly one sine in this file (`thud`) and it
// is a body under an impact, not a pitch — it never lasts long
// enough to hum along to. Everything else is a physical event:
// an exciter generated as raw sample data in JS, played through
// parallel high-Q bandpass filters that act as the modal body of
// a material. Change the material, change the object.
//
// This replaced ten unrelated cues built from oscillator melodies
// (a square-wave "denied" buzz, a victory arpeggio, a rising sine
// crescendo). Nothing of that vocabulary survives on the table.
//
// Still no audio files, and none are needed.
// ============================================================

let ctx = null;
let bus = null;

// Mute. One flag on the master bus rather than a guard at every call
// site: cues are scheduled ahead on the audio clock, so silencing the
// output is both simpler and more complete than trying to not-start
// thirty individual sounds. The gain stays 0.6 in the muted state's
// memory so unmuting restores the mix exactly.
const BUS_GAIN = 0.6;
let muted = false;

export function setAudioMuted(next) {
  muted = !!next;
  if (bus) bus.gain.value = muted ? 0 : BUS_GAIN;
  return muted;
}
export function isAudioMuted() { return muted; }

function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    // A compressor, not just a gain. The win screen fires a pop
    // per firework — roughly twenty inside eight seconds, over
    // the top of a 1.15s drum roll — and trimmed cues sit near
    // full scale by design, so stacked cues would otherwise clip
    // the output rather than the individual sounds.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    bus = ctx.createGain();
    bus.gain.value = muted ? 0 : BUS_GAIN;
    bus.connect(comp);
    comp.connect(ctx.destination);
  }
  // Browsers suspend a context created before a user gesture.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// Kernel
// ─────────────────────────────────────────────────────────────

// SEEDED, not Math.random(), and this is load-bearing.
//
// A six-millisecond noise burst exciting a Q-26 resonator is a
// lottery: whether a large sample happens to land early decides
// how hard the body rings. Measured across twenty renders, the
// peak of `roundLost` spanned 3.41x — the same cue arriving up to
// three times louder than the last time you heard it. That is not
// pleasant variation, it is a broken mix, and it also makes the
// TRIM table below unmeasurable, since every render disagrees.
//
// So the exciter is a deterministic xorshift instead. Every cue
// is now bit-identical every time it plays, TRIM can be measured
// exactly rather than estimated, and variety is added where it is
// actually wanted: `seed` gives repeated taps inside one cue
// their own character, and playFireworkPop randomises pitch and
// level out loud.
function noiseBuf(c, dur, curve = 3, attack = 0.004, seed = 1) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  const aN = Math.max(1, Math.floor(n * attack));
  let x = (seed * 0x9E3779B9) >>> 0 || 1;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    const r = (x / 0x100000000) * 2 - 1;
    const env = i < aN ? i / aN : Math.pow(1 - (i - aN) / (n - aN), curve);
    const v = r * env;
    d[i] = v;
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
  }
  // Normalise the exciter so a cue's energy depends on its
  // envelope and its body, never on which samples came out big.
  if (peak > 0) { const k = 1 / peak; for (let i = 0; i < n; i++) d[i] *= k; }
  return b;
}

function src(c, buffer, t, gain = 1) {
  const s = c.createBufferSource();
  s.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(g);
  s.start(t);
  return g;
}

function lp(c, freq, q = 0.7) {
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q; return f;
}
function bp(c, freq, q = 3) {
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; return f;
}

// A modal body: parallel high-Q bandpasses, one per mode of a
// real object. Wood, bone and cardstock differ almost entirely
// in where these sit and how fast they die.
function body(c, out, modes, t) {
  const inn = c.createGain();
  modes.forEach(m => {
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = m.f;
    f.Q.value = m.q;
    const g = c.createGain();
    g.gain.setValueAtTime(m.g, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + m.d);
    inn.connect(f); f.connect(g); g.connect(out);
  });
  return inn;
}

// The one sine in the file. A body under an impact, never a note.
function thud(c, out, t, f0, f1, dur, gain) {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(18, f1), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}

const MAT = {
  cardstock: [{f:1650,q:9,g:.5,d:.05},{f:3120,q:12,g:.34,d:.035},{f:5400,q:9,g:.18,d:.022}],
  wood:      [{f: 420,q:11,g:.6,d:.20},{f: 980,q:14,g:.4,d:.14},{f:1720,q:10,g:.22,d:.09}],
  woodHi:    [{f: 610,q:11,g:.6,d:.17},{f:1340,q:14,g:.4,d:.12},{f:2280,q:10,g:.2,d:.08}],
  bone:      [{f:1450,q:26,g:.62,d:.085},{f:2870,q:30,g:.45,d:.06},{f:4900,q:20,g:.2,d:.035}],
  boneLow:   [{f: 900,q:26,g:.62,d:.10},{f:1780,q:30,g:.45,d:.07},{f:3040,q:20,g:.2,d:.04}],
  felt:      [{f: 260,q:5,g:.7,d:.09},{f: 520,q:6,g:.28,d:.06}],
};
const scaleMat = (m, k) => m.map(x => ({ ...x, f: x.f * k }));

function tap(c, out, t, mat, { gain = 1, exc = 0.006, curve = 4, seed = 1 } = {}) {
  src(c, noiseBuf(c, exc, curve, 0.0006, seed), t, gain).connect(body(c, out, mat, t));
}

function friction(c, out, t, { dur = .18, f0 = 900, f1 = 2600, q = 1.6, gain = .5, curve = 1.5, attack = .25, seed = 1 } = {}) {
  const g = src(c, noiseBuf(c, dur, curve, attack, seed), t, gain);
  const f = bp(c, f0, q);
  f.frequency.setValueAtTime(f0, t);
  f.frequency.linearRampToValueAtTime(f1, t + dur);
  g.connect(f); f.connect(out);
}

function crack(c, out, t, mat, { gain = 1, sub = true, k = 1, seed = 1 } = {}) {
  src(c, noiseBuf(c, 0.0022, 6, 0.0002, seed), t, gain * 1.4)
    .connect(body(c, out, scaleMat(mat, k), t));
  if (sub) thud(c, out, t, 132 * k, 44 * k, 0.10, 0.34 * gain);
}

// ─────────────────────────────────────────────────────────────
// The mix
//
// TRIM is not a taste knob — it is what makes the hierarchy real.
// Raw peaks across this kit spanned 75:1, which put the game-won
// drum roll 25 dB UNDER an Ace strike: a nine-tap flourish you
// would not have heard over the sound it was celebrating. Each
// cue is normalised to a declared target instead, measured
// offline in the Foley Bench against these exact parameters:
//
//   select .16 · draw .22 · invalid/handWon/handLost .34
//   transfer .30 · roundLost .46 · roundWon .50
//   gameLost .66 · gameWon .72 · aceCounter .80 · fullScrap .94
//   aceStrike .56  (was .80 — softened and dropped 30% on
//                   2026-08-30 at Stan's call; it was the
//                   loudest thing on the table)
//
// So the cue you hear thirty times a game can never end up
// louder than the one you may never hear at all.
//
// These are measured against THIS file, not against the bench —
// the first port carried the bench's numbers over and nine of the
// thirteen landed off target, `select` by 49%, because a bench
// trim came from a single render of a then-random exciter. With
// the exciter seeded these are exact and reproducible.
//
// Retuning any cue's parameters invalidates its trim. Re-measure
// by rendering renderCue() into an OfflineAudioContext at gain 1
// and dividing the target above by the peak.
// ─────────────────────────────────────────────────────────────
const TRIM = {
  select:     3.4706,
  transfer:   2.2417,
  draw:       2.1066,
  aceStrike:  2.6548,   // re-measured 2026-08-30 after the softening
  aceCounter: 2.7208,
  invalid:    2.1378,
  handWon:   14.5225,
  handLost:  12.6639,
  roundWon:   9.3941,
  roundLost: 17.1335,
  gameWon:   27.3075,
  gameLost:   2.8005,
  fullScrap:  1.9105,
  revealBuild: 9.0647,
};

// Every cue routes through here, so a cue is written at its
// natural level and the trim is applied in exactly one place.
function cue(name) {
  const c = getAudioCtx();
  if (!c) return;
  const out = c.createGain();
  out.gain.value = TRIM[name] || 1;
  out.connect(bus);
  // A sound must never take the game down with it.
  try { renderCue(name, c, out, c.currentTime + 0.02); } catch (e) {}
}

// ─────────────────────────────────────────────────────────────
// Voices
//
// The DSP for every cue lives here, keyed by cue name, and takes
// (context, output, startTime) so the SAME function can be
// scheduled on the live context or rendered into an
// OfflineAudioContext. That is what `renderCue` below is for:
// it makes the TRIM table verifiable instead of a promise, which
// matters because those numbers go stale the moment a cue's
// parameters are retuned and nothing else would notice.
// ─────────────────────────────────────────────────────────────
const VOICES = {

  /** Card toggled in your small hand. The most frequent sound in
   *  the game by a wide margin — a dozen fire before one trade —
   *  so it is the quietest thing here and has no tail to stack. */
  select: (c, o, t) =>
    tap(c, o, t, scaleMat(MAT.cardstock, 0.72), { gain: 0.8, exc: .014, curve: 2.6 }),

  /** Trade commits; cards fly hand → Scraps. Friction sweeping up
   *  under a slow swell, then a slap as it lands on felt. The
   *  sweep is what makes it directional — you hear the card
   *  leave.
   *
   *  Stan took this to 360ms in the bench, then cut it back to
   *  260ms on the preview and asked for it quieter. Quieter is a
   *  TARGET change, not a gain change: the trim renormalises this
   *  function's own gains away, so `gain` below sets the balance
   *  between the slide and the slap and nothing else. The level
   *  you hear is TRIM's target, which went .38 → .30. */
  transfer: (c, o, t) => {
    friction(c, o, t, { dur: 0.26, f0: 820, f1: 2700, gain: 0.35 });
    tap(c, o, t + 0.26 * 0.92, MAT.felt, { gain: 0.385, exc: .010, curve: 3 });
  },

  /** Replacement card, deck → hand. Darker and drier than the
   *  transfer and a quarter of its length: a draw is an intake,
   *  not an action. */
  draw: (c, o, t) =>
    friction(c, o, t, { dur: .09, f0: 700, f1: 1500, gain: 0.4, q: 2.2, attack: .3 }),

  /** An Ace is spent to strip two cards off the opponent's
   *  Scraps. The signature moment — and Stan picked the option
   *  with no crack in it at all: noise through a lowpass
   *  collapsing from 6 kHz to 200 in an eighth of a second. A
   *  card box being stood on. The least sharp option, and the
   *  most violent. */
  aceStrike: (c, o, t) => {
    // Softened 2026-08-30: the sweep used to open at 6000 Hz with a
    // Q of 1.4, which put a bright crack on top of the impact and made
    // the loudest cue in the game also the sharpest. It opens at 3000
    // now with a gentler Q and a slower fall, so it reads as weight
    // rather than as a snap. The declared TARGET dropped .80 → .56 in
    // the same pass; both changes are in the trim below, which was
    // RE-MEASURED rather than scaled — retuning a cue's parameters
    // invalidates its old trim, and nothing warns you.
    const speed = 0.155;
    const g = src(c, noiseBuf(c, speed + .06, 2.2, .01), t, 0.34);
    const f = lp(c, 3000, 0.85);
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(180, t + speed);
    g.connect(f); f.connect(o);
    thud(c, o, t + speed * .6, 84, 30, .17, 0.22);
  },

  /** The strike answered with an Ace of their own. The same crack
   *  a fifth lower, 145ms later. The interval is the whole
   *  message: something came back, and it was bigger. */
  aceCounter: (c, o, t) => {
    crack(c, o, t, MAT.bone, { gain: .85 });
    crack(c, o, t + 0.145, MAT.bone, { gain: 1.05, k: 0.62 });
  },

  /** Trade rejected — hand or Scraps would exceed seven. Felt
   *  with no ring, under a lowpass at 500 Hz. Deliberately not a
   *  buzzer: nothing scolds, the move simply doesn't land. */
  invalid: (c, o, t) => {
    const f = lp(c, 500, .9); f.connect(o);
    tap(c, f, t, MAT.felt, { gain: 0.8, exc: .02, curve: 2 });
    thud(c, o, t, 70, 38, .12, 0.16);
  },

  /** One of the two small hands scores, 1 pt. Two knuckles on
   *  wood, 130ms apart — the universal "that one's mine" on a
   *  card table. Fires twice a round, so it has to survive
   *  repetition better than any other outcome cue. */
  handWon: (c, o, t) => {
    tap(c, o, t, MAT.wood, { gain: .7225, exc: .005, curve: 5, seed: 3 });
    tap(c, o, t + 0.13, MAT.wood, { gain: .85, exc: .005, curve: 5, seed: 9 });
  },

  /** A small hand lost. NOT a Foley Bench selection — the bench
   *  has no small-hand-lost cue, and reusing round-lost would
   *  fire a round-scale sound twice a round. This is round-lost's
   *  falling wood at the HAND target instead, which keeps the
   *  kit's one real mechanism intact at both scales: rising means
   *  you won it, falling means you didn't. */
  handLost: (c, o, t) => {
    tap(c, o, t, MAT.wood, { gain: .8, exc: .006, curve: 5, seed: 5 });
    tap(c, o, t + 0.135, scaleMat(MAT.wood, 0.74), { gain: .7, exc: .008, curve: 3.2, seed: 11 });
  },

  /** The Scraps hand resolves your way — the round, 2 pts. Wood
   *  climbing a minor third each. Pitch direction does all the
   *  work; the same three taps falling is the loss. */
  roundWon: (c, o, t) => {
    for (let i = 0; i < 3; i++)
      tap(c, o, t + i * 0.115, scaleMat(MAT.woodHi, Math.pow(1.19, i)),
        { gain: .8 + i * .1, exc: .005, curve: 4.5, seed: i + 2 });
  },

  /** The Scraps hand resolves against you. Wood dropping a
   *  fourth, damped harder than the win, and shorter. A loss cue
   *  that lingers is the fastest route to a muted tab. */
  roundLost: (c, o, t) => {
    tap(c, o, t, MAT.wood, { gain: .8, exc: .006, curve: 5, seed: 5 });
    tap(c, o, t + 0.135, scaleMat(MAT.wood, 0.74), { gain: .7, exc: .008, curve: 3.2, seed: 11 });
  },

  /** First to 10, win by 2. Nine knuckle taps accelerating over
   *  900ms, alternating two wood pitches. No melody and no
   *  fanfare — a table being hammered. */
  gameWon: (c, o, t) => {
    let dt = .145, at = t;
    for (let i = 0; i < 9; i++) {
      tap(c, o, at, i % 2 ? MAT.woodHi : MAT.wood, { gain: .55 + i * .045, exc: .005, curve: 5, seed: i + 2 });
      at += dt; dt = Math.max(.038, dt * 0.72);
    }
  },

  /** The opponent reaches the win condition. Two dead felt drops,
   *  the second lower and later than you expect. The pause is the
   *  point. It ends the match rather than mocking you. */
  gameLost: (c, o, t) => {
    tap(c, o, t, MAT.felt, { gain: .8, exc: .016, curve: 2.4 });
    thud(c, o, t, 110, 44, .16, 0.176);
    tap(c, o, t + 0.3, scaleMat(MAT.felt, .78), { gain: .88, exc: .024, curve: 2 });
    thud(c, o, t + 0.3, 80, 28, .3, 0.24);
  },

  /** Both small hands AND the Scraps hand — 5 pts, the rarest
   *  event in the game. The drum roll, a double crack a fifth
   *  apart, and a sub that runs on well past both. Most players
   *  will never hear it, which is what justifies the length. */
  fullScrap: (c, o, t) => {
    let dt = .155, at = t;
    for (let i = 0; i < 11; i++) {
      tap(c, o, at, i % 2 ? MAT.woodHi : MAT.wood, { gain: .45 + i * .04, exc: .005, curve: 5, seed: i + 2 });
      at += dt; dt = Math.max(.034, dt * .74);
    }
    crack(c, o, at, MAT.bone, { gain: 1.1, sub: false });
    crack(c, o, at + .15, MAT.boneLow, { gain: 1.25, sub: false });
    thud(c, o, at + .15, 150, 26, .85, .5);
  },

  /** The REVEAL button's build-up.
   *
   *  NOT a Foley Bench cue — the bench has no build, and the
   *  sound this replaces was a sine sweeping 200→900 Hz, which is
   *  a note and cannot stay. A build in this direction is fingers
   *  drumming faster and then stopping: taps accelerating into a
   *  gap, which the reveal lands in. */
  revealBuild: (c, o, t) => {
    let dt = .085, at = t;
    for (let i = 0; i < 11 && at - t < 0.5; i++) {
      tap(c, o, at, MAT.woodHi, { gain: .32 + i * .05, exc: .004, curve: 5.5, seed: i + 2 });
      at += dt; dt = Math.max(.026, dt * 0.86);
    }
  },
};

// How long each voice actually rings for, used only by the
// offline measurement below.
export const CUE_DUR = {
  select: .16, transfer: .32, draw: .20, aceStrike: .36, aceCounter: .62,
  invalid: .24, handWon: .46, handLost: .56, roundWon: .68, roundLost: .56,
  gameWon: 1.15, gameLost: .85, fullScrap: 1.75, revealBuild: .70,
};

/** Schedule a cue into any context — the live one or an offline
 *  one — and return the trim it is played at. The offline path is
 *  how the TRIM table gets checked. */
export function renderCue(name, c, out, t) {
  const v = VOICES[name];
  if (!v) return 1;
  v(c, out, t);
  return TRIM[name] || 1;
}

// ─────────────────────────────────────────────────────────────
// Cues
// ─────────────────────────────────────────────────────────────

export function playSelect()     { cue('select'); }
export function playTransfer()   { cue('transfer'); }
export function playDraw()       { cue('draw'); }
export function playAceStrike()  { cue('aceStrike'); }
export function playAceCounter() { cue('aceCounter'); }
export function playInvalid()    { cue('invalid'); }
export function playHandWon()    { cue('handWon'); }
export function playHandLost()   { cue('handLost'); }
export function playRoundWon()   { cue('roundWon'); }
export function playRoundLost()  { cue('roundLost'); }
export function playGameWon()    { cue('gameWon'); }
export function playGameLost()   { cue('gameLost'); }
export function playFullScrap()  { cue('fullScrap'); }

/** The build-up, then `onDone`. Timed to the 580ms the previous
 *  sine crescendo took, so the reveal choreography is unchanged
 *  and the callback still owns the transition. */
export function playRevealBuild(onDone) {
  if (!getAudioCtx()) { setTimeout(onDone, 580); return; }
  cue('revealBuild');
  setTimeout(onDone, 580);
}

/** One per firework on the win screen — roughly twenty across
 *  eight seconds, over the top of the drum roll. Kept far below
 *  every table cue and randomised in pitch and level so twenty of
 *  them don't read as one sound repeating. The compressor on the
 *  bus is here mostly for this. */
export function playFireworkPop() {
  const c = getAudioCtx();
  if (!c) return;
  const o = c.createGain();
  o.gain.value = 0.5 + Math.random() * 0.3;
  o.connect(bus);
  crack(c, o, c.currentTime + 0.02,
    scaleMat(MAT.boneLow, 0.75 + Math.random() * 0.6),
    { gain: 0.16, sub: false, seed: 1 + Math.floor(Math.random() * 4096) });
}

// ─────────────────────────────────────────────────────────────
// Splash wordmark — untouched by the Cardboard & Bone port, and
// closer to it than it first looks.
//
// Chosen by ear in the splash-identity session from a live
// comparison of sixteen options, and timed to the 0.82s
// square-up animation. Two of its three layers are already this
// direction's vocabulary: a bed of card edges brushing past each
// other, and the deck landing flush at the end. Only the middle
// layer — six triangle taps on a G major pentatonic, one per
// letter on the letters' own 0.028s stagger — is tonal.
//
// Left exactly as it was, byte for byte, including its direct
// connection to ctx.destination rather than the trimmed bus, so
// its level is unchanged. Whether those six taps should become
// cardstock is Stan's call, not a side effect of porting the
// table's kit. It plays on the splash, before a table exists.
// ─────────────────────────────────────────────────────────────
export function playSquareUp() {
  const ctx = getAudioCtx(); if(!ctx) return;
  const t0 = ctx.currentTime;

  // 1. Card edges brushing past each other while the hand is loose.
  //    The noise swells and falls with sin() rather than decaying from
  //    full, so it reads as a movement rather than a hit.
  const bedDur = 0.30;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * bedDur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / d.length)) * 0.9;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2600, t0);
  bp.frequency.exponentialRampToValueAtTime(1100, t0 + bedDur);
  bp.Q.value = 0.7;
  const bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.075, t0);
  bedGain.gain.exponentialRampToValueAtTime(0.001, t0 + bedDur);
  src.connect(bp); bp.connect(bedGain); bedGain.connect(ctx.destination);
  src.start(t0); src.stop(t0 + bedDur);

  // 2. One tap per letter, on the letters' own 0.028s stagger.
  const PENT = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
  PENT.forEach((f, i) => {
    const at = t0 + 0.16 + i * 0.028;
    const o = ctx.createOscillator();
    o.type = 'triangle';                    // no odd-harmonic bite, unlike square
    o.frequency.setValueAtTime(f, at);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 0.11);
    o.connect(lp); lp.connect(g); g.connect(ctx.destination);
    o.start(at); o.stop(at + 0.12);
  });

  // 3. The deck landing flush, under the last of the taps.
  const end = t0 + 0.60;
  const low = ctx.createOscillator();
  low.type = 'triangle';
  low.frequency.setValueAtTime(190, end);
  low.frequency.exponentialRampToValueAtTime(120, end + 0.20);
  const lowGain = ctx.createGain();
  lowGain.gain.setValueAtTime(0.0001, end);
  lowGain.gain.exponentialRampToValueAtTime(0.085, end + 0.012);
  lowGain.gain.exponentialRampToValueAtTime(0.001, end + 0.22);
  low.connect(lowGain); lowGain.connect(ctx.destination);
  low.start(end); low.stop(end + 0.23);
}
