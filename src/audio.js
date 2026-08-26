// ============================================================
// SCRAPS — Audio: Web Audio API, no external files needed
// ============================================================

const AudioCtx = typeof window !== 'undefined' ? { ctx: null } : null;

function getAudioCtx() {
  if(!AudioCtx) return null;
  if(!AudioCtx.ctx) {
    try { AudioCtx.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){}
  }
  return AudioCtx?.ctx;
}

export function playClick() {
  const ctx = getAudioCtx(); if(!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(800, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.04);
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06);
}

export function playWhoosh() {
  const ctx = getAudioCtx(); if(!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type='bandpass'; f.frequency.setValueAtTime(1200, ctx.currentTime);
  f.frequency.exponentialRampToValueAtTime(400, ctx.currentTime+0.35);
  f.Q.value=0.8;
  src.buffer=buf; src.connect(f); f.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.35);
  src.start(ctx.currentTime); src.stop(ctx.currentTime+0.35);
}

// Square-up: the wordmark's tap gesture on touch devices. Timed to the
// animation it accompanies (~0.82s) — a brush of card edges while the
// hand is loose, six taps on the same stagger the letters use, and a
// soft landing as the deck goes flush.
//
// The six taps are a G major pentatonic run. Any subset of a pentatonic
// scale is consonant with any other, so the run cannot land on a sour
// interval no matter how the taps overlap — which is the whole risk
// with six pitched hits inside 200ms.
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

export function playVictoryFanfare(big=false) {
  const ctx = getAudioCtx(); if(!ctx) return;
  // Ascending arpeggio of 3 or 5 notes
  const notes = big
    ? [261, 329, 392, 523, 659, 784, 1047]
    : [392, 494, 587, 784];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = i===notes.length-1 ? 'triangle' : 'sine';
    const t = ctx.currentTime + i * (big ? 0.1 : 0.12);
    o.frequency.setValueAtTime(freq, t);
    if(big && i===notes.length-1) {
      o.frequency.exponentialRampToValueAtTime(freq*2, t+0.3);
    }
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(big?0.22:0.16, t+0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t+(big?0.45:0.28));
    o.start(t); o.stop(t+(big?0.5:0.32));
  });
}

export function playCrescendo(onDone) {
  const ctx = getAudioCtx(); if(!ctx) { setTimeout(onDone,600); return; }
  // Rising tone sweep
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(200, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime+0.5);
  g.gain.setValueAtTime(0.001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.4);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.55);
  o.start(ctx.currentTime); o.stop(ctx.currentTime+0.6);
  setTimeout(onDone, 580);
}

export function playError() {
  const ctx = getAudioCtx(); if(!ctx) return;
  // Two-tone "denied" buzz — short, low, unmistakably negative
  [330, 220].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'square';
    const t = ctx.currentTime + i * 0.09;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.start(t); o.stop(t + 0.1);
  });
}

export function playWinSound() {
  const ctx = getAudioCtx(); if(!ctx) return;
  // Bright ascending major third + fifth — pleasant, quick
  [523, 659, 784].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    const t = ctx.currentTime + i * 0.09;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.start(t); o.stop(t + 0.3);
  });
}

export function playLoseSound() {
  const ctx = getAudioCtx(); if(!ctx) return;
  // Descending minor slide — clearly negative without being harsh
  [392, 311, 233].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'triangle';
    const t = ctx.currentTime + i * 0.11;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.2);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.start(t); o.stop(t + 0.28);
  });
}

// ─────────────────────────────────────────────────────────────
// playGrandFanfare — the game-winning fanfare. Roughly five
// seconds: a rising C-major arpeggio, a held chord swell, then
// a triumphant top-note flourish. Everything is scheduled on
// the audio clock up front, so nothing blocks the win screen.
// ─────────────────────────────────────────────────────────────
export function playGrandFanfare() {
  const ctx = getAudioCtx(); if(!ctx) return;
  const now = ctx.currentTime;

  const note = (freq, t, dur, vol, type='sine') => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, now + t);
    g.gain.setValueAtTime(0.001, now + t);
    g.gain.exponentialRampToValueAtTime(vol, now + t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
    o.start(now + t); o.stop(now + t + dur + 0.05);
  };

  // Phase 1 (0–1.2s): fast rising arpeggio, two octaves
  [261, 329, 392, 523, 659, 784, 1047].forEach((f, i) => {
    note(f, i * 0.14, 0.4, 0.16, i >= 5 ? 'triangle' : 'sine');
  });

  // Phase 2 (1.2–3.2s): sustained C-major chord swell
  [523, 659, 784].forEach(f => note(f, 1.2, 2.0, 0.11, 'sine'));
  note(261, 1.2, 2.0, 0.09, 'triangle'); // low root underneath

  // Phase 3 (3.2–5s): flourish — three quick top notes, then a
  // long held peak that slowly decays out
  [784, 1047, 1319].forEach((f, i) => note(f, 3.2 + i * 0.16, 0.35, 0.15, 'triangle'));
  note(1047, 3.8, 1.2, 0.13, 'triangle');
  note(523, 3.8, 1.2, 0.08, 'sine');
}

// ─────────────────────────────────────────────────────────────
// playFireworkPop — one short percussive pop per visual burst.
// Filtered noise with a fast decay plus a tiny pitch-drop thump.
// Kept quiet and randomized: the win screen fires one of these
// every ~400ms, so they must layer without becoming a wall.
// ─────────────────────────────────────────────────────────────
export function playFireworkPop() {
  const ctx = getAudioCtx(); if(!ctx) return;
  const now = ctx.currentTime;

  // Noise crack
  const dur = 0.12 + Math.random() * 0.06;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3);
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(1500 + Math.random() * 1500, now);
  f.Q.value = 0.7;
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.07 + Math.random() * 0.03, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.start(now); src.stop(now + dur);

  // Low thump underneath — gives the pop a body
  const o = ctx.createOscillator();
  const og = ctx.createGain();
  o.connect(og); og.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(160 + Math.random() * 60, now);
  o.frequency.exponentialRampToValueAtTime(60, now + 0.1);
  og.gain.setValueAtTime(0.06, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  o.start(now); o.stop(now + 0.14);
}

// ─────────────────────────────────────────────────────────────
// playNeutralJingle — plays once on the lose screen. Three soft
// even-spaced tones that neither rise (celebration) nor fall
// (sad trombone): a gentle "the round is over" chime, matching
// the lose screen's deliberately quiet tone.
// ─────────────────────────────────────────────────────────────
export function playNeutralJingle() {
  const ctx = getAudioCtx(); if(!ctx) return;
  const now = ctx.currentTime;
  // G4 → E4 → G4: a small dip that returns home, resolving flat
  [392, 329, 392].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    const t = now + i * 0.22;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.start(t); o.stop(t + 0.45);
  });
}
