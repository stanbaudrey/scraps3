// ============================================================
// SCRAPS — Sound. Direction: CARDBOARD & BONE, amended.
//
// Chosen by Stan in the Foley Bench on 2026-08-26:
//   https://claude.ai/code/artifact/2b99d5e2-f9b1-400e-9609-ee2b3dd210b8
// Amended by him in The Woodshed on 2026-09-13, from 74 options
// across all 14 cues:
//   https://claude.ai/code/artifact/14df5fce-5d63-4932-8cb0-2ef264bd0213
//
// THE RULE, as it now stands. Everything here is still a struck
// object and still modal synthesis — an exciter generated as raw
// sample data in JS, played through parallel high-Q resonators
// that act as the body of a material. What changed is that SOME
// OF THE WOOD IS NOW TUNED.
//
//   A physical event on the table is an untuned object.
//   A score outcome is a tuned bar.
//
// So an oscillator does now sound a pitch, which the 2026-08-26
// version of this file forbade outright. It is not a melody
// instrument sneaking in: `bar()` builds a xylophone or marimba
// from its real partials, and a xylophone bar IS a struck piece
// of wood. The undercut arch on a real bar tunes its second
// partial to 3x the fundamental and its third to about 6x, and
// those exact ratios are what this synthesises. The direction
// survives the amendment; the vocabulary widened by one object.
//
// `thud` is still the one sine that is NOT a note — a body under
// an impact, never long enough to hum along to.
//
// What Stan did NOT take is worth recording, because it closes
// the question rather than leaving it open: the bench offered
// four BRASS options on every one of the nine messaging cues
// (trumpet, cornet, flugelhorn, harmon mute) and he took none of
// them. There is no brass in this game and none is pending.
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
    // A compressor, not just a gain. Cues stack — seven slaps
    // under a Scraps reveal, a run of draws under the sweep, a
    // bar landing over the tail of the last one — and trimmed
    // cues sit near full scale by design, so stacked cues would
    // otherwise clip the output rather than the individual
    // sounds. (It was added for the win screen's firework pops,
    // which went on 2026-09-14; the reason it stays is above.)
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
// their own character. (The firework pop, the one cue that
// randomised out loud, went with the fireworks on 2026-09-14.)
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
// real object. These are all wood now: the Woodshed pass retired
// cardstock, felt and bone from the table, and what separates the
// survivors is the SHAPE of the object rather than its substance —
// a plank, a box with air in it, a solid rod, a small closed
// block, a big thin-walled crate. (`boneLow` and the `crack()`
// exciter that hit it went with the firework pop on 2026-09-14.)
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
  wood:      [{f: 420,q:11,g:.6,d:.20},{f: 980,q:14,g:.4,d:.14},{f:1720,q:10,g:.22,d:.09}],
  woodHi:    [{f: 610,q:11,g:.6,d:.17},{f:1340,q:14,g:.4,d:.12},{f:2280,q:10,g:.2,d:.08}],
  // `boneLow` lived here until 2026-09-14, for the firework pop alone;
  // it went with the fireworks. There is no bone left in the kit.
  // Added 2026-09-13 with the Woodshed picks. All four are wooden
  // objects of a different SHAPE rather than a different substance:
  // a box with air in it, a solid rod, a small closed block, and a
  // big thin-walled crate. Shape is most of what you actually hear.
  hollow:    [{f: 300,q:18,g:.62,d:.28},{f: 742,q:20,g:.30,d:.17},{f:1180,q:14,g:.15,d:.10}],
  dowel:     [{f:1180,q:13,g:.60,d:.07},{f:2350,q:15,g:.34,d:.05},{f:3900,q:11,g:.15,d:.03}],
  block:     [{f: 800,q:16,g:.62,d:.15},{f:2010,q:18,g:.30,d:.09},{f:3350,q:12,g:.13,d:.05}],
  crate:     [{f: 170,q: 9,g:.70,d:.34},{f: 395,q:12,g:.36,d:.21},{f: 820,q: 9,g:.16,d:.12}],
};
const scaleMat = (m, k) => m.map(x => ({ ...x, f: x.f * k }));

function tap(c, out, t, mat, { gain = 1, exc = 0.006, curve = 4, seed = 1 } = {}) {
  src(c, noiseBuf(c, exc, curve, 0.0006, seed), t, gain).connect(body(c, out, mat, t));
}

// Air moving past something: seeded noise through a bandpass that
// travels from `f0` to `f1`, swelling to `peakAt` of the way through
// and dying. Rising reads as approaching. Added 2026-09-16 for The
// Throw — the thrown Ace and the ATTACK press's draw — and it is still
// no note: the band sweeps, nothing is pitched.
function swish(c, out, t, { dur = 0.3, f0 = 600, f1 = 2800, q = 0.9, gain = 0.2, seed = 31, peakAt = 0.72 } = {}) {
  const n = Math.ceil(c.sampleRate * dur);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  let x = (seed * 0x9E3779B9) >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    d[i] = (x / 0x100000000) * 2 - 1;
  }
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * peakAt);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t); s.stop(t + dur);
}



// ─────────────────────────────────────────────────────────────
// Tuned bars — added 2026-09-13 with the Woodshed picks.
//
// This is the one place an oscillator sounds a pitch, and it is
// still a struck piece of wood. The undercut arch on a real
// xylophone bar tunes partial 2 to three times the fundamental
// and partial 3 to about six; a marimba is cut deeper, to four
// and about ten. Those ratios are the whole difference between a
// xylophone and a clanging metal bar, and synthesising the real
// ones is why this reads as an instrument rather than a patch.
//
// The offsets (3.01 rather than 3.00) are deliberate: a real bar
// is never perfect, and the slow beat that tiny mistuning creates
// is most of what makes it sound like wood rather than like a
// sine bank.
// ─────────────────────────────────────────────────────────────
const BARS = {
  xylo:    { p:[1,3.01,6.03,9.62], g:[1,.30,.115,.045], d:[.34,.155,.085,.05],
             res:.42, resD:.28, mal:{ f:3400, q:1.1, dur:.0016, g:.50 } },
  marimba: { p:[1,3.99,9.18,15.1], g:[1,.21,.075,.028], d:[.88,.30,.14,.07],
             res:.95, resD:.85, mal:{ f:1450, q:1.0, dur:.0034, g:.30 } },
};

function bar(c, out, t, f0, kind = 'xylo', { gain = 1, len = 1, mallet = 1, seed = 1 } = {}) {
  const B = BARS[kind];
  const ks = Math.pow(f0 / 440, -0.38);   // high bars die faster, as real ones do
  // The mallet head striking, before the bar has answered.
  const mg = src(c, noiseBuf(c, B.mal.dur, 5, 0.0002, seed), t, B.mal.g * mallet * gain);
  const mf = bp(c, B.mal.f, B.mal.q);
  mg.connect(mf); mf.connect(out);
  B.p.forEach((r, i) => {
    const d = Math.max(0.012, B.d[i] * ks * len);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f0 * r;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(B.g[i] * 0.34 * gain, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + d + 0.02);
  });
  // The resonator tube hanging under the bar: late in, slow out.
  const rd = Math.max(0.02, B.resD * ks * len);
  const ro = c.createOscillator();
  ro.type = 'sine';
  ro.frequency.value = f0;
  const rg = c.createGain();
  rg.gain.setValueAtTime(0, t);
  rg.gain.linearRampToValueAtTime(B.res * 0.30 * gain, t + 0.008);
  rg.gain.exponentialRampToValueAtTime(0.0001, t + rd);
  ro.connect(rg); rg.connect(out);
  ro.start(t); ro.stop(t + rd + 0.02);
}

// G major pentatonic. Not an arbitrary key: `playSquareUp` at the
// bottom of this file has played six taps on this exact set since
// the splash was built, and it was the only tonal thing in the
// game. The table is now in the title screen's key rather than
// unrelated to it. Pentatonic also means any two of these can
// overlap — a hand result landing on a round result — without
// either cue needing to know about the other.
const NOTE = {
  G3:  196.00, D4:  293.66,
  G4:  392.00, A4:  440.00, C5:  523.25, D5:  587.33, E5:  659.25,
  G5:  783.99, A5:  880.00, C6: 1046.50, D6: 1174.66, E6: 1318.51,
  G6: 1567.98,
};
const RUN = [NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.E5,
             NOTE.G5, NOTE.A5, NOTE.C6, NOTE.D6, NOTE.E6, NOTE.G6];

// ─────────────────────────────────────────────────────────────
// The mix
//
// TRIM is not a taste knob — it is what makes the hierarchy real.
// Raw peaks across this kit span 25:1, which without correction
// would put the draw cue 28 dB under the game-loss bars. Each cue
// is normalised to a declared target instead, so the cue you hear
// thirty times a game can never end up louder than the one you
// may never hear at all:
//
//   select .12 · draw .22 · slap .26 · invalid/handWon/handLost .34
//   scrap .30 · roundSign .265 · roundLost .46 · roundWon .50
//   aceStrike .56 · gameLost .66 · gameWon .72 · aceCounter .80
//   cleanSweep .94 · revealBuild .297
//   the attack's own: lock .12 · whoosh .18 · whooshHer .18 · chips .26
//   · armDraw .30 · clash .56
//
// `whooshHer` is NEW on 2026-09-17: her Ace thrown when she counters,
// the same air as `whoosh` with its band raised and a little shorter,
// played 100ms after yours (Stan: "a similar but higher pitched sound
// for her throw than the player's, slightly after"). Same target as
// `whoosh`, because it is the same kind of thing.
//
// The five attack cues are NEW on 2026-09-16 (The Throw). Their
// targets are the ones The Chopping Block bench auditioned them at:
// `lock` sits with `select`, which it answers; `whoosh` under
// everything, because it is air; `armDraw` with the scrap; `clash`
// level with `aceStrike`, the hit it replaces when she counters, with
// `aceCounter` still playing over it. Measured the same way as the
// rest, at 48 kHz.
//
// `roundSign` came down from .40 to .265 on 2026-09-17, when its low
// landing went (Stan: the thud "reads negative"). That landing was the
// cue's peak, so keeping .40 would have played the six notes that are
// left 51% louder than he has been hearing them; .265 is exactly where
// they already sat, and the trim barely moves.
//
// `slap` and `roundSign` are NEW on 2026-09-14 (the interstitials
// pass) and their targets are a first placement, not a pick from a
// bench: a slap sits between the draw it resembles and the scrap it
// answers, and the ROUND N sign sits with the messaging cues. Both
// were measured the same way as the rest, below.
//
// The targets are Stan's. None changed on 2026-09-13 — only the
// voices under them did — and exactly one changed on 2026-09-14:
// `select` went .16 -> .12, his "25% too loud". Taking it off the
// TARGET rather than off the trim is the whole point of the
// system: the trim is a derived number, and scaling it would have
// left the file claiming a target it no longer hits. `revealBuild` is the odd one out at
// .297: it has never been in the declared list above, that is
// simply the target its long-standing trim of 9.0647 implies, and
// since its voice is unchanged the number is left exactly alone.
//
// EVERY NUMBER BELOW WAS RE-MEASURED on 2026-09-13, in headless
// Chrome, against THIS file — not against the Woodshed bench that
// the voices came from. That distinction has bitten this project
// once already: the 2026-08-26 port carried the first bench's
// numbers over and nine of thirteen cues landed off target, one
// by 49%. Method: render `renderCue()` into an OfflineAudioContext
// at gain 1, take the peak, divide the target by it. `select` and
// `draw` have three and four variants, and ALL of them were
// measured with the trim set by the loudest, so no variant can
// exceed target. Retuning any cue invalidates its trim and
// nothing will warn you.
//
// A KNOWN LIMIT OF THIS SYSTEM, surfaced by the tuned bars and
// worth writing down before it surprises someone. These targets
// are PEAK, and peak says nothing about how long a sound holds
// energy. Measured post-trim, a wood cue's RMS sits around 10% of
// its peak (select .096, invalid .106) while a bar cue's sits
// around 18% (handWon .180, roundWon .194) — a struck bar rings
// and a knock does not, so at equal peak a bar delivers roughly
// TWICE the energy. `handWon` and `invalid` are both declared at
// .34 and will not sound equally loud.
//
// This is deliberately NOT corrected here. Stan chose these
// options in a bench that peak-normalised exactly this way, so
// these are the levels he actually approved, and switching to an
// RMS or loudness-weighted target now would silently change what
// he picked. If handWon turns out to be hot in play — it fires
// twice a round, more than any other outcome cue — the fix is to
// lower its TARGET and re-measure, not to scale the trim.
// ─────────────────────────────────────────────────────────────
const TRIM = {
  select:      0.5249,   // re-measured 2026-09-14 for A5 at target .12
  scrap:       1.2545,
  draw:        8.0773,
  aceStrike:   1.2125,
  aceCounter:  1.7237,
  invalid:     1.8789,
  handWon:     0.9400,
  handLost:    1.0613,
  roundWon:    1.3594,
  roundLost:   1.4561,
  gameWon:     1.5468,
  gameLost:    0.9718,
  cleanSweep:  1.8332,
  revealBuild: 9.0647,   // voice unchanged, so trim untouched
  // Both measured 2026-09-14 with tools/trim-measure.mjs at 48 kHz —
  // the rate this Mac's Chrome actually plays at (system_profiler:
  // Current SampleRate 48000). The seeded exciter is generated per
  // SAMPLE, so a cue's peak moves with the rate: the same kit at
  // 44.1 kHz puts `slap` 10% and `draw` 18% away from these numbers.
  // Whoever measures next should say which rate they used.
  slap:        0.5368,
  // Re-measured 2026-09-17 at 48 kHz after the landing went and the six
  // notes moved onto the sign's card flips (then again when the flips
  // started sooner and the number's note came 40% closer); the target
  // came down to .265.
  roundSign:   5.3008,
  // The Throw's cues, 2026-09-16, tools/trim-measure.mjs at 48 kHz.
  // armDraw, lock, whoosh and clash measured identical to their bench
  // trims, which is the check that the port is the voice Stan heard.
  // `chips` is not identical and should not be: the bench jittered its
  // taps from a seeded random stream, and here the jitter is a fixed
  // table, so its peak moved and it was measured fresh.
  armDraw:     3.7968,
  lock:        8.0234,
  whoosh:      1.5310,
  chips:       17.8972,
  clash:       1.9616,
  // Her whoosh, 2026-09-17, tools/trim-measure.mjs at 48 kHz.
  whooshHer:   1.1410,
};

// Every cue routes through here, so a cue is written at its
// natural level and the trim is applied in exactly one place.
// Two cues fire in RUNS rather than singly — a dozen selects
// before one trade, and up to five draws 120ms apart as a hand
// refills. Bit-identical repeats read as one sample retriggering
// instead of as several objects, so those two walk a short index
// and use it to shift seed and pitch. Every other cue stays
// exactly reproducible, which is what keeps TRIM measurable.
// The index is passed to the voice, so an offline render can
// reproduce any variant exactly — and BOTH variants are measured,
// with the trim set by the louder, so neither can exceed target.
const BURSTY = { select: 3, draw: 4 };
const burstN = { select: 0, draw: 0 };

// `delay` (seconds) schedules a cue on the audio clock rather than on a
// timer, for the few that must land a fixed hair after another: the
// wood chips 15ms under the Ace's hit, a target's lock after its select.
function cue(name, delay = 0) {
  // QA only: a harness that sets `window.__cueLog = []` can read which
  // cues played and when, on the page's clock, to check a sound against
  // the frame it belongs to. Nothing in the game sets it.
  if (typeof window !== 'undefined' && window.__cueLog) {
    window.__cueLog.push({ name, at: performance.now() + 20 + delay * 1000 });
  }
  const c = getAudioCtx();
  if (!c) return SILENT;
  const out = c.createGain();
  out.gain.value = TRIM[name] || 1;
  out.connect(bus);
  const i = BURSTY[name] ? (burstN[name]++ % BURSTY[name]) : 0;
  // A sound must never take the game down with it.
  try { renderCue(name, c, out, c.currentTime + 0.02 + delay, i); } catch (e) {}
  // Everything a cue schedules runs through `out`, so one ramp on it
  // silences whatever has not played yet (and cuts what is ringing)
  // without a handle on each note. Only the ROUND sign keeps this: its
  // voice runs 1.7s under an entrance a tap can skip (review,
  // 2026-09-17: skip at 0.5s and the notes played on over a still sign).
  return {
    stop() {
      try {
        const now = c.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + 0.05);
        setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, 120);
      } catch (e) { /* a sound never takes the game down */ }
      if (typeof window !== 'undefined' && window.__cueLog) {
        window.__cueLog.push({ name, stop: performance.now() });
      }
    },
  };
}
const SILENT = { stop() {} };

// ─────────────────────────────────────────────────────────────
// The ROUND N sign's beats, in ms (2026-09-17). Declared HERE because
// the voice below has to render offline for TRIM without React, and
// the sign's cards (interstitials.jsx, RoundSign) import the same
// numbers, so a note can never drift off the card it belongs to.
//   deal / dealDur   the six cards dealt face down, a card per `deal`
//   flipAt, stagger  ROUND turning face up, a card per `stagger`
//   wordFace         derived: how far into a ROUND card's flip its face
//                    comes round (rotateY passing 90deg)
//   numberFace       the same for the number, which turns in one stroke
//   pause            derived: the held breath before the number turns
//   numberAt         derived: the number's flip starts
//   settle           derived: the sign at rest, ready for a click
//   cycle...         the idle loop's layout; signCycleWord, signCycleNumber
//                    and signCyclePop in index.html are these numbers as
//                    keyframe percentages, and a test holds them to it
// ─────────────────────────────────────────────────────────────
// A flip's face comes round when rotateY passes 90deg. A ROUND card
// reaches 108deg at 60% of its run (ribbonFlip, index.html), and an
// animation's timing function applies to each keyframe segment on its
// own, so the answer is where that first segment's curve reaches 90/108:
// solve the bezier's y for it, then read its x. The number turns 0 to
// 180deg in ONE segment (signNumberFlip), so for it `at` is 1 and `deg`
// 180, which on a symmetric curve is exactly half way.
function faceTurn([x1, y1, x2, y2], at = 0.6, deg = 108) {
  const X = (u) => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  const Y = (u) => 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  let lo = 0, hi = 1;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (Y(m) < 90 / deg) lo = m; else hi = m; }
  return at * X((lo + hi) / 2);
}
// Both flips ease in and out, and the number's is ONE stroke. Stan saw
// the "1" glitch twice on 2026-09-18 ("seems to glitch a little while
// flipping", then "still glitches"), and both times the cause was the
// frame in the middle of the flip: a timing function runs per keyframe
// SEGMENT, so a curve that arrives at rest arrives at rest on every
// frame. On the old snappy curve the number stopped at its 60% frame
// (108deg) and lurched on; on ease-in-out it stopped there and eased on,
// and measured live it sat on a thin sliver of its face for seven
// near-identical frames at 60fps, about 100ms, with the pop's swell peaking
// at rest beside it. A ROUND letter pauses on the same frame for about
// half as long, inside the wave. The number now turns 0 to 180deg with
// no frame between (signNumberFlip), so the only place it stops is
// where it lands.
export const SIGN_EASE = { word: [0.42, 0, 0.58, 1], number: [0.42, 0, 0.58, 1] };
export const SIGN_BEATS = (() => {
  // Retimed 2026-09-17 (Stan): the first flip starts the moment the last
  // card starts dealing in (`flipAt` = five deals), and the gap he HEARS
  // between ROUND's last note and the number's came down 40%, 1050ms to
  // 630ms. Every note sits on the frame its card's face comes round, not
  // the flip's midpoint (review, 2026-09-17). So the pause is what is
  // left of the 630 once the rest of ROUND's last flip and the start of
  // the number's are taken out, which pins the number's face (and its
  // note) to ROUND's last face plus 630, whatever the number's flip is.
  // Retimed twice on 2026-09-18 around that: on ease-in-out the pause
  // went 191ms to 67ms, and turning in one stroke over a ROUND card's
  // own 520ms (it was 620), the number's face comes round at half way
  // and the pause is 74ms. The note did not move.
  const b = { deal: 70, dealDur: 380, stagger: 85, flipDur: 520, numberDur: 520, noteGap: 630 };
  b.flipAt = 5 * b.deal;
  b.wordFace = faceTurn(SIGN_EASE.word);
  b.numberFace = faceTurn(SIGN_EASE.number, 1, 180);
  b.pause = b.noteGap - (1 - b.wordFace) * b.flipDur - b.numberFace * b.numberDur;
  b.numberAt = b.flipAt + 4 * b.stagger + b.flipDur + b.pause;
  b.settle = b.numberAt + b.numberDur + 120;
  // The idle loop, every `cycle` ms once the sign is at rest: each card
  // turns face down from `cycleDown` (as a fraction of the loop) over
  // `cycleDownDur`, and ROUND turns back up from `cycleUp`, a card per
  // `stagger` again; then the same pause, and the number.
  b.cycle = 6200; b.cycleDown = 0.484; b.cycleDownDur = 360; b.cycleUp = 0.645;
  // The number's POP (Stan, 2026-09-18: "keep the pop"): on a layer of its
  // own around the flip, it swells to 1.22 at `popAt` of the flip, then
  // settles to its askew 1.12. signNumberPop and signCyclePop. At 60% the
  // face has just come round and the card is still turning near its
  // fastest, so the swell's peak (at rest, as a peak is) never lines up
  // with a pause in the turn.
  b.popAt = 0.6;
  return b;
})();

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

  /** Card toggled in your hand. The most frequent sound in
   *  the game by a wide margin — a dozen fire before one trade —
   *  so it is the quietest thing here and has no tail to stack.
   *
   *  Stan's pick, 2026-09-13: "Damped bar". A xylophone bar struck
   *  and stopped by the hand at once, at `len` 0.12, which cuts a
   *  340ms decay to about 30ms. It is a ghost of a pitch rather
   *  than a note — you cannot sing it, but a dozen of them are
   *  recognisably the same object. Replaces a cardstock tap,
   *  which was card foley and is exactly what he asked to lose.
   *
   *  RETUNED 2026-09-14: "a little too high pitched and 25% too
   *  loud." D6 (1174.66) down a fifth to A5 (880) — still in the
   *  kit's G major pentatonic, so it cannot clash with an outcome
   *  bar landing over it, and a fifth is a drop you hear rather
   *  than a step down the scale that you do not. The bar's own
   *  `ks` makes a lower bar ring slightly longer, which at len
   *  0.12 is 30ms becoming 34ms — inaudible, and not worth
   *  shortening `len` to chase.
   *
   *  The 25% came off the TARGET, not the trim: .16 -> .12. See
   *  the TRIM header for why that is the only correct lever, and
   *  note the trim below was RE-MEASURED across all three
   *  variants afterwards rather than scaled. */
  select: (c, o, t, i = 0) =>
    bar(c, o, t, NOTE.A5 * Math.pow(1.06, i % 2), 'xylo',
      { gain: 0.6, len: 0.12, mallet: 0.75, seed: 2 + i }),

  /** Scrap commits; cards fly hand → Scraps.
   *
   *  Stan's pick: "Lift and set". TWO EVENTS, NOT A SLIDE, and
   *  that is the whole point of the change. The cue this replaces
   *  was a friction sweep into a felt slap — a synthesised card
   *  sliding across cloth, the most literal card emulation in the
   *  kit. This is a light tick as the thing leaves and a hollow
   *  box thunk 220ms later as it lands, which still reads as
   *  directional (you hear it go, then arrive) with no slide in
   *  it at all. Covers the 620ms card flight. */
  scrap: (c, o, t) => {
    tap(c, o, t, scaleMat(MAT.dowel, 0.95), { gain: .5, exc: .003, curve: 6 });
    tap(c, o, t + 0.22, MAT.hollow, { gain: .95, exc: .008, curve: 4, seed: 7 });
    thud(c, o, t + 0.22, 104, 48, .15, .26);
  },

  /** Replacement card, deck → hand. Scheduled per card at 120ms
   *  spacing in GameScreen, so up to five land in 600ms.
   *
   *  Stan's pick: "Soft block" — a yarn mallet on a small closed
   *  block under a 1 kHz lowpass, so it is nearly all body and no
   *  attack. The old cue was a second friction sweep and five of
   *  them in a row was the "dealing" sound he objected to. This
   *  one is deliberately self-effacing; you stop noticing it. */
  draw: (c, o, t, i = 0) => {
    const f = lp(c, 1000, .8); f.connect(o);
    tap(c, f, t, scaleMat(MAT.block, 0.8 * Math.pow(1.02, i % 3)),
      { gain: 1, exc: .014, curve: 2.6, seed: 9 + i });
  },

  /** An Ace is spent to discard two cards off the opponent's
   *  Scraps. The signature moment.
   *
   *  Stan's pick: "Crate slam" — a big thin-walled crate struck
   *  at once, with a hard sub under it and one bright wood tap
   *  8ms in for edge. He has now chosen the least sharp option
   *  twice running for this cue: the 2026-08-26 pick was the box
   *  crush, the only option with no crack in it, and this is the
   *  least bright of the Woodshed four. Weight, not sharpness. */
  aceStrike: (c, o, t) => {
    tap(c, o, t, MAT.crate, { gain: 1.2, exc: .010, curve: 3.2 });
    tap(c, o, t + .008, scaleMat(MAT.wood, .7), { gain: .5, exc: .004, curve: 5, seed: 4 });
    thud(c, o, t, 78, 24, .30, .46);
  },

  /** The strike answered with an Ace of their own.
   *
   *  Stan's pick: "Crate answer" — the same crate a fourth lower
   *  and 170ms later, with a longer tail and a deeper sub. The
   *  mechanism is unchanged from the cue it replaces and it is
   *  the reason this cue works: the interval IS the message.
   *  Something came back, and it was bigger. */
  aceCounter: (c, o, t) => {
    tap(c, o, t, scaleMat(MAT.crate, 1.3), { gain: .85, exc: .008, curve: 3.6 });
    thud(c, o, t, 96, 32, .20, .32);
    tap(c, o, t + .17, MAT.crate, { gain: 1.25, exc: .012, curve: 3, seed: 9 });
    thud(c, o, t + .17, 70, 20, .44, .52);
  },

  /** Trade rejected — hand or Scraps would exceed seven.
   *
   *  Stan's pick: "Dead drop". Wood landing on cloth under a
   *  700 Hz lowpass, with no ring whatsoever. Deliberately not a
   *  buzzer and deliberately not tonal: nothing scolds, the move
   *  simply does not take. This is the ONE messaging cue where he
   *  kept wood, and it is the right one to keep — an illegal move
   *  is a physical non-event, not a score. */
  invalid: (c, o, t) => {
    const f = lp(c, 700, .9); f.connect(o);
    tap(c, f, t, MAT.wood, { gain: .9, exc: .014, curve: 2.4 });
    thud(c, o, t, 74, 40, .10, .18);
  },

  /** One of the two hands scores, 1 pt.
   *
   *  Stan's pick: "Bars, up a fifth" — xylophone G5 to D6. Fires
   *  twice a round, so it has to survive repetition better than
   *  any other outcome cue; a rising fifth on a bright bar with a
   *  short tail is about the most repeatable affirmative there
   *  is. Also plays once on the splash's PLAY button (App.jsx),
   *  at Stan's request, as the way into the storyboard. */
  handWon: (c, o, t) => {
    bar(c, o, t, NOTE.G5, 'xylo', { gain: .85, len: .70 });
    bar(c, o, t + .12, NOTE.D6, 'xylo', { gain: .95, len: .75, seed: 3 });
  },

  /** A hand lost. The exact inverse of handWon: the same
   *  two bars, D6 down to G5, slightly softer and left to ring a
   *  little longer. The kit's one real mechanism — rising means
   *  you won it, falling means you didn't — now runs on pitch
   *  proper rather than on scaled wood, which is the whole
   *  argument for the tonal cues existing. */
  handLost: (c, o, t) => {
    bar(c, o, t, NOTE.D6, 'xylo', { gain: .85, len: .70 });
    bar(c, o, t + .13, NOTE.G5, 'xylo', { gain: .80, len: .80, seed: 3 });
  },

  /** The Scraps hand resolves your way — the round, 2 pts.
   *  Three bars climbing the pentatonic, G A D, each one left
   *  ringing a little longer than the last. */
  roundWon: (c, o, t) => {
    [NOTE.G5, NOTE.A5, NOTE.D6].forEach((f, i) =>
      bar(c, o, t + i * .095, f, 'xylo',
        { gain: .78 + i * .08, len: .65 + i * .12, seed: i + 2 }));
  },

  /** The Scraps hand resolves against you. The winning run walked
   *  backwards — D A G — a touch slower and quieter each step. A
   *  loss cue that lingers is the fastest route to a muted tab,
   *  so the last bar is the only one allowed any tail. */
  roundLost: (c, o, t) => {
    [NOTE.D6, NOTE.A5, NOTE.G5].forEach((f, i) =>
      bar(c, o, t + i * .10, f, 'xylo',
        { gain: .85 - i * .05, len: .6 + i * .2, seed: i + 4 }));
  },

  /** First to 10, win by 2. Nine bars up two octaves of the
   *  pentatonic, accelerating, then the octave G left ringing.
   *  Stan took the option with no brass in it over one with a
   *  trumpet fanfare, which is consistent with every other pick
   *  he made: the kit stays one material. */
  gameWon: (c, o, t) => {
    let at = t, dt = .085;
    for (let i = 0; i < 9; i++) {
      bar(c, o, at, RUN[i], 'xylo', { gain: .62 + i * .045, len: .55, seed: i + 2 });
      at += dt; dt = Math.max(.045, dt * 0.90);
    }
    bar(c, o, at + .03, RUN[10], 'xylo', { gain: 1.1, len: 1.3, seed: 14 });
  },

  /** The opponent reaches the win condition. Two low marimba
   *  bars, D4 down to G3, 300ms apart, the second left to ring
   *  for nearly two seconds. The longest cue in the game after
   *  cleanSweep, and the quietest way to be told you lost: it
   *  reads as an ending rather than as a verdict. The pause
   *  between the two is doing as much work as either note. */
  gameLost: (c, o, t) => {
    bar(c, o, t, NOTE.D4, 'marimba', { gain: .85, len: .9 });
    bar(c, o, t + .30, NOTE.G3, 'marimba', { gain: .95, len: 1.5, seed: 4 });
  },

  /** Both hands AND the Scraps hand — 5 pts, the rarest
   *  event in the game. Ten bars up three octaves accelerating
   *  into the top G, held for 1.8 seconds. Most players will
   *  never hear it, which is what justifies the length. */
  cleanSweep: (c, o, t) => {
    let at = t, dt = .095;
    for (let i = 0; i < 10; i++) {
      bar(c, o, at, RUN[i], 'xylo', { gain: .55 + i * .045, len: .6, seed: i + 2 });
      at += dt; dt = Math.max(.040, dt * 0.88);
    }
    bar(c, o, at + .02, RUN[10], 'xylo', { gain: 1.15, len: 1.8, seed: 15 });
  },

  /** The REVEAL button's build-up.
   *
   *  UNCHANGED by the Woodshed pass — Stan auditioned five
   *  alternatives including two bar tremolos and picked this one,
   *  which is the cue already shipping, byte for byte. Fingers
   *  drumming faster and then stopping: taps accelerating into a
   *  gap, which the reveal lands in. It is the only cue in the
   *  game the 2026-09-13 pass left alone. */
  revealBuild: (c, o, t) => {
    let dt = .085, at = t;
    for (let i = 0; i < 11 && at - t < 0.5; i++) {
      tap(c, o, at, MAT.woodHi, { gain: .32 + i * .05, exc: .004, curve: 5.5, seed: i + 2 });
      at += dt; dt = Math.max(.026, dt * 0.86);
    }
  },

  /** A winning card slapped onto the table (interstitials.jsx,
   *  2026-09-14). One per card, up to seven in a Scraps reveal at
   *  230ms spacing. The kit's body-under-impact `thud` with a small
   *  closed block struck over it — a flat hand coming down on wood,
   *  with no ring to stack across seven of them. Untuned, because a
   *  landing is a physical event and not a score. */
  slap: (c, o, t) => {
    tap(c, o, t, MAT.block, { gain: .75, exc: .007, curve: 4, seed: 11 });
    thud(c, o, t, 150, 52, .13, .5);
  },

  /** ROUND N landing on the table (interstitials.jsx, 2026-09-14).
   *  RETIMED 2026-09-17 to the sign's letter cards (Stan's pick off The
   *  Turnover): the brush plays under the deal and each of the six notes
   *  lands on a card turning face up, the top one on the number. The
   *  history below is how the voice got here.
   *
   *  This is the splash wordmark's old square-up phrase — playSquareUp,
   *  which lost its caller when the tap gesture went on 2026-09-13 and
   *  was kept for exactly this — retimed to the sign's own letters: a
   *  brush of card edges as they come in, one soft triangle tap per
   *  letter on the sign's 55ms stagger. (It also had a low landing
   *  under the riffle at 0.80s until 2026-09-17, when Stan heard it as
   *  a thud that read negative.) The six taps are G major pentatonic, the set the
   *  outcome bars use; the voice was chosen by ear in the splash-identity
   *  session from sixteen options and is unchanged. Two things did
   *  change: the bed's exciter is seeded now, so the cue is measurable
   *  like every other, and it routes through the bus and TRIM rather
   *  than straight to the destination at its own level. */
  roundSign: (c, o, t) => {
    const bedDur = 0.32;
    const n = Math.ceil(c.sampleRate * bedDur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    let x = 0x9E3779B9;
    for (let i = 0; i < n; i++) {
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      d[i] = ((x / 0x100000000) * 2 - 1) * Math.sin(Math.PI * (i / n)) * 0.9;
    }
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(1100, t + bedDur);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.075, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + bedDur);
    s.connect(f); f.connect(bg); bg.connect(o);
    s.start(t); s.stop(t + bedDur);
    // One note per card as it turns face up (2026-09-17): the five of
    // ROUND on their flips, and the top note held back for the number,
    // after the sign's dramatic pause. The times are the sign's own
    // (SIGN_BEATS), taken at the moment each card's face comes round.
    const B = SIGN_BEATS;
    const noteAt = (i) => (i < 5 ? B.flipAt + i * B.stagger + B.flipDur * B.wordFace
      : B.numberAt + B.numberDur * B.numberFace) / 1000;
    [NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5].forEach((fq, i) => {
      const at = t + noteAt(i);
      const osc = c.createOscillator(); osc.type = 'triangle';
      osc.frequency.setValueAtTime(fq, at);
      const lpf = lp(c, 2400);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.05, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0008, at + 0.11);
      osc.connect(lpf); lpf.connect(g); g.connect(o);
      osc.start(at); osc.stop(at + 0.12);
    });
    // The low landing that closed this phrase at 0.80s, a triangle
    // falling 190 to 120 Hz, is gone (Stan, 2026-09-17: "the thud reads
    // negative"). The phrase now ends on its top note.
  },

  // ── The Throw, 2026-09-16 ──────────────────────────────────
  // Five cues for the Ace attack, from The Chopping Block bench. All
  // untuned: an attack is a physical event, and under the kit's rule
  // only a score outcome is a note.

  /** ATTACK pressed: a card snapped up out of the fan. A dowel click,
   *  a short rising draw of air, and a bright wood tick as the Ace
   *  settles into its hover. */
  armDraw: (c, o, t) => {
    tap(c, o, t, MAT.dowel, { gain: .8, exc: .003, curve: 6, seed: 12 });
    swish(c, o, t + .01, { dur: .2, f0: 900, f1: 3400, gain: .14, seed: 13 });
    tap(c, o, t + .18, MAT.woodHi, { gain: .55, exc: .004, curve: 5, seed: 14 });
  },

  /** A target picked for your Ace. One small, hard, high dowel tick,
   *  answering the select that picked the card. */
  lock: (c, o, t) => {
    tap(c, o, t, scaleMat(MAT.dowel, 1.2), { gain: .7, exc: .002, curve: 7, seed: 111 });
  },

  /** The Ace thrown: air, rising as it comes. */
  whoosh: (c, o, t) => swish(c, o, t, { dur: .36, f0: 420, f1: 2300, q: .8, gain: .22, seed: 51 }),

  /** Her Ace thrown back at yours when she counters: the same air, the
   *  band raised by about two thirds and a little shorter, because hers
   *  is the quicker throw. Still no note: the band sweeps. */
  whooshHer: (c, o, t) => swish(c, o, t, { dur: .3, f0: 700, f1: 3800, q: .8, gain: .22, seed: 53 }),

  /** Wood chips off the table under the hit: seven little dowel and
   *  block ticks thinning out. The jitter is a fixed table, not a
   *  random draw, so the cue stays bit-identical and measurable. */
  chips: (c, o, t) => {
    const J = [.004, .011, .002, .009, .006, .001, .008];
    const K = [1.04, .93, 1.19, .97, 1.12, .9, 1.07];
    for (let i = 0; i < 7; i++) {
      tap(c, o, t + i * .017 + J[i], scaleMat(i % 2 ? MAT.dowel : MAT.block, K[i]),
        { gain: .55 - i * .06, exc: .002, curve: 6, seed: 62 + i });
    }
  },

  /** Her counter: two Aces meeting in the air. Bright wood and a dowel
   *  struck together over a crate, with a short body under it.
   *  `aceCounter` plays 20ms behind it, so the answer still sounds
   *  bigger than the question. */
  clash: (c, o, t) => {
    tap(c, o, t, MAT.woodHi, { gain: 1.1, exc: .006, curve: 4, seed: 101 });
    tap(c, o, t, MAT.dowel, { gain: .8, exc: .003, curve: 6, seed: 102 });
    tap(c, o, t + .003, MAT.crate, { gain: .6, exc: .008, curve: 3.5, seed: 103 });
    thud(c, o, t, 110, 40, .18, .3);
  },
};

// How long each voice actually rings for, used only by the
// offline measurement below.
export const CUE_DUR = {
  select: .14, scrap: .58, draw: .22, aceStrike: .44, aceCounter: .72,
  invalid: .28, handWon: .40, handLost: .46, roundWon: .52, roundLost: .60,
  gameWon: 1.00, gameLost: 2.25, cleanSweep: 1.20, revealBuild: .70,
  slap: .30, roundSign: 1.75,
  armDraw: .36, lock: .08, whoosh: .36, whooshHer: .30, chips: .28, clash: .36,
};

/** Schedule a cue into any context — the live one or an offline
 *  one — and return the trim it is played at. The offline path is
 *  how the TRIM table gets checked. */
export function renderCue(name, c, out, t, i = 0) {
  const v = VOICES[name];
  if (!v) return 1;
  v(c, out, t, i);
  return TRIM[name] || 1;
}

/** How many distinct variants a cue has. 1 for everything except
 *  the two burst cues, whose trim must be measured across all of
 *  theirs. Exported so the measurement can be exhaustive rather
 *  than sampling the first one and hoping. */
export const CUE_VARIANTS = { select: 3, draw: 4 };

// ─────────────────────────────────────────────────────────────
// Cues
// ─────────────────────────────────────────────────────────────

export function playSelect()     { cue('select'); }
export function playScrap()      { cue('scrap'); }
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
export function playCleanSweep() { cue('cleanSweep'); }
export function playSlap()       { cue('slap'); }
// Returns the cue's handle: the sign stops it when a tap lands the entrance.
export function playRoundSign()  { return cue('roundSign'); }
// The Throw (2026-09-16).
export function playArmDraw()    { cue('armDraw'); }
export function playLock()       { cue('lock', 0.06); }
export function playWhoosh()     { cue('whoosh'); }
export function playHerWhoosh()  { cue('whooshHer'); }
export function playChips()      { cue('chips', 0.015); }
export function playClash()      { cue('clash'); cue('aceCounter', 0.02); }

/** The build-up, then `onDone`. Timed to the 580ms the previous
 *  sine crescendo took, so the reveal choreography is unchanged
 *  and the callback still owns the transition. */
export function playRevealBuild(onDone) {
  if (!getAudioCtx()) { setTimeout(onDone, 580); return; }
  cue('revealBuild');
  setTimeout(onDone, 580);
}

// ─────────────────────────────────────────────────────────────
// `playFireworkPop` and `playSquareUp` both ended here until
// 2026-09-14. The pop went with the canvas fireworks it scored (the
// win screen and the Clean Sweep lightbox are gone; everything plays
// on the table now). The square-up phrase did NOT go: it is the
// `roundSign` voice above, retimed to the ROUND N sign — the home
// its own comment said it was waiting for.
// ─────────────────────────────────────────────────────────────
