// ============================================================
// SCRAPS — The Throw: impact effects (2026-09-16)
//
// The three things the Ace attack does that nothing else in the game
// does, kept here so they stay rare. Stan's brief for the attack was
// "it needs to feel like an exciting and rare choice", and the bench
// note that went with his pick of The Throw said the same thing from
// the other side: spend a shake or a burst of chips on a Clean Sweep
// too and they stop meaning "attack".
//
//   useImpactFx     a canvas over the whole viewport for wood chips,
//                   paper flecks, sparks and the contact ring
//   AttackTagEcho   the ATTACK tag's press, played on a copy of the tag
//                   because the real one leaves the hand the moment it
//                   is pressed
//   shakeElement    the table jumping when the Ace lands
//
// Nothing here runs under reduced motion; GameScreen plays the still
// version instead (a ring on the Ace, the table dimmed, the cards
// fading where they sit), and every sound still plays.
// ============================================================
import { useEffect, useMemo, useRef } from "react";
import { DS } from "../styles/theme.js";
import { AceTag } from "./buttons.jsx";
import { prefersReducedMotion } from "./flight.jsx";
import { easeOut } from "./throwMotion.js";

// Debris colours, all tokens. Chips are the table's own wood; paper is
// the two Scraps stocks and a card face; sparks are ATTACK's green;
// embers are hers.
const COLORS = {
  chips:  [DS.timberLight, DS.timber, DS.timberSeam, DS.stockKraft],
  paper:  [DS.stockPale, DS.stockKraft, DS.frost],
  sparks: [DS.voltage, DS.voltageCharge, DS.frost],
  ember:  [DS.ember, DS.emberHover, DS.gold],
};
const TAU = Math.PI * 2;

// ─────────────────────────────────────────────────────────────
// useImpactFx — `layer` is the canvas element to render once, outside
// the table; `ring` and `burst` spawn into it, in viewport pixels;
// `stop` clears everything at once (a skip, or the screen unmounting).
//
// A ring can `wait` before it grows: that is the hit-stop, the ring
// frozen on its first frame for the few frames the table holds still.
// ─────────────────────────────────────────────────────────────
export function useImpactFx() {
  const canvasRef = useRef(null);
  const api = useMemo(() => {
    let pts = [], raf = 0, last = 0, dpr = 1;
    const ctx = () => {
      const c = canvasRef.current;
      return c ? c.getContext('2d') : null;
    };
    const fit = () => {
      const c = canvasRef.current;
      if (!c) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    };
    const tick = (now) => {
      const c = ctx();
      if (!c) { raf = 0; pts = []; return; }
      // rAF's timestamp can sit a hair before a `last` stamped in the
      // same frame; a negative step would run a particle backwards once.
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of pts) {
        if (p.wait > 0) { p.wait -= dt; }
        if (p.k === 'ring') {
          if (p.wait <= 0) p.t += dt;
          const f = Math.min(1, p.t / p.dur);
          p.life = 1 - f;
          c.globalAlpha = Math.max(0, 1 - f);
          c.strokeStyle = p.color;
          c.lineWidth = p.lw * (1 - f * 0.7);
          c.beginPath();
          c.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * easeOut(f), 0, TAU);
          c.stroke();
          if (f >= 1) p.life = 0;
          continue;
        }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; p.life -= p.decay * dt; p.vx *= Math.pow(0.35, dt);
        c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.c;
        if (p.k === 'paper') {
          c.beginPath();
          c.moveTo(-p.w / 2, -p.h / 2); c.lineTo(p.w / 2, -p.h * 0.3);
          c.lineTo(p.w * 0.35, p.h / 2); c.lineTo(-p.w * 0.4, p.h * 0.4);
          c.closePath(); c.fill();
        } else {
          c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        c.restore();
      }
      c.globalAlpha = 1;
      pts = pts.filter(p => p.life > 0);
      if (pts.length) raf = requestAnimationFrame(tick);
      else { raf = 0; release(); }
    };
    // Idle, the canvas gives its pixels back. A full-viewport backing
    // store is ~11MB on a Retina screen, and it would otherwise sit over
    // the table for the rest of the match after one attack. `fit` sizes
    // it again the next time anything spawns.
    const release = () => {
      const c = canvasRef.current;
      if (c) { c.width = 0; c.height = 0; }
    };
    const ensure = () => {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    return {
      ring(x, y, { r0 = 8, r1 = 100, dur = 0.34, color = DS.frost, lw = 5, wait = 0 } = {}) {
        if (prefersReducedMotion()) return;
        fit();
        pts.push({ k: 'ring', x, y, r0, r1, dur, color, lw, wait, t: 0, life: 1 });
        ensure();
      },
      // `K` shrinks the pieces and their speeds with the table.
      burst(x, y, { n = 16, kind = 'chips', ang = -Math.PI / 2, spread = Math.PI * 0.9,
        sp = [160, 520], g = 1100, life = [0.45, 0.85], K = 1 } = {}) {
        if (prefersReducedMotion()) return;
        fit();
        const cols = COLORS[kind] || COLORS.chips;
        for (let i = 0; i < n; i++) {
          const a = ang + (Math.random() - 0.5) * spread;
          const s = (sp[0] + Math.random() * (sp[1] - sp[0])) * K;
          const paper = kind === 'paper', spark = kind === 'sparks';
          pts.push({
            k: kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: g * K,
            rot: Math.random() * TAU, vr: (Math.random() * 2 - 1) * 16, life: 1, wait: 0,
            decay: 1 / (life[0] + Math.random() * (life[1] - life[0])),
            w: (paper ? 5 + Math.random() * 7 : spark ? 2 + Math.random() * 3 : 2.5 + Math.random() * 5) * K,
            h: (paper ? 4 + Math.random() * 5 : 1.5 + Math.random() * 2.5) * K,
            c: cols[Math.floor(Math.random() * cols.length)],
          });
        }
        ensure();
      },
      stop() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0; pts = [];
        release();
      },
    };
  }, []);
  useEffect(() => () => api.stop(), [api]);
  const layer = (
    <canvas ref={canvasRef} aria-hidden="true" style={{
      position:'fixed', left:0, top:0, width:'100%', height:'100%',
      pointerEvents:'none', zIndex:1001,
    }}/>
  );
  return { ring: api.ring, burst: api.burst, stop: api.stop, layer };
}

// ─────────────────────────────────────────────────────────────
// AttackTagEcho — the press, on a copy.
//
// Pressing ATTACK takes the tag off the Ace at once (the hand stops
// offering it the moment the attack is armed), so the squash-and-snap
// plays on a copy standing exactly where the real tag was: squashed
// like a struck match, sprung past its size, then blown outward and
// gone while the Ace comes up out of the fan. `echo` is the real tag's
// screen pose (flight.jsx `screenPose`: centre, scale, lean — the tag is
// inside the hand's wiggle when it is pressed) and its natural width, so
// the copy stands exactly on the tag it replaces.
// ─────────────────────────────────────────────────────────────
export function AttackTagEcho({ echo }) {
  return (
    <div aria-hidden="true" style={{
      position:'fixed', left:echo.x, top:echo.y, width:0, height:0,
      zIndex:1002, pointerEvents:'none',
    }}>
      <div style={{position:'absolute', left:0, top:0, width:echo.natW,
        transformOrigin:'0 0',
        transform:`rotate(${echo.rot}deg) scale(${echo.scale}) translate(-50%,-50%)`}}>
        <div style={{transformOrigin:'center',
          animation:'attackTagPop 220ms ease-out, attackTagOut 180ms ease-out 220ms forwards'}}>
          <AceTag live={false} width={echo.natW}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// shakeElement — nine random jumps decaying to nothing. Returns the
// Animation so a skip can cancel it. Web Animations rather than a CSS
// class, because every shake is a fresh random path.
// ─────────────────────────────────────────────────────────────
export function shakeElement(el, amp, dur) {
  if (!el || !el.animate || prefersReducedMotion()) return null;
  const kf = [{ transform: 'translate(0px,0px)' }];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const f = amp * (1 - i / n);
    kf.push({ transform: `translate(${((Math.random() * 2 - 1) * f).toFixed(1)}px,${((Math.random() * 2 - 1) * f).toFixed(1)}px)` });
  }
  kf.push({ transform: 'translate(0px,0px)' });
  return el.animate(kf, { duration: dur, easing: 'linear' });
}
