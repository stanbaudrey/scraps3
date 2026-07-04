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
