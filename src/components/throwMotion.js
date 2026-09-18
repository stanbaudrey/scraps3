// ============================================================
// SCRAPS — The Throw: motion math (2026-09-16)
//
// Stan picked "The Throw" off The Chopping Block, the ATTACK bench:
// the Ace jumps out of your fan when ATTACK is pressed, and on REMOVE
// it is drawn back, thrown spinning into the gap between your two
// targets, and knocks both off the table while it spins away itself.
// If she counters, her Ace comes up out of her hand and the two meet
// in the air instead.
//
// This file is the arithmetic of those paths and nothing else: no
// React, no DOM, so vitest can hold it to the promises the choreography
// depends on (throwMotion.test.js). A motion is `{ dur, at(t) }`, where
// `at` takes milliseconds since launch and returns a POSE:
//
//   x, y   the card's centre, in viewport pixels
//   rot    degrees
//   s      the ghost's scale, against its own natural card box
//   sx     an extra horizontal squash (her Ace flipping face up), default 1
//   o      opacity, default 1
//   trail  whether the motion trails should show at this moment
//
// flight.jsx plays a motion on a ghost; GameScreen builds them from
// measured rects and schedules the sounds, the impact and the commit
// against the same constants, so the three can never drift apart.
//
// Every distance and velocity takes `K`, the table's own scale on
// screen, so a phone table and a desktop one throw the same shape.
// The bench tuned these numbers at K = 1 on a 960x600 table.
// ============================================================

// The landed throw, in ms. `hold` is the hit-stop: the Ace sits in the
// gap and the table holds its breath for a few frames before anything
// reacts. It is the single cheapest thing that makes a hit feel heavy.
export const THROW = { draw: 130, fly: 380, hold: 85, rebound: 900 };
// Her counter, reworked 2026-09-17 (Stan: "make her counter look more
// like a win for her"). It read as a tie: both Aces flew at once, met
// and bounced apart evenly. Now yours is drawn back and thrown exactly
// as in the landed throw (`draw`); hers comes up out of her hand and
// turns face up meanwhile (`rise`), and is thrown `answer` ms AFTER
// yours, which is also when her higher whoosh plays. Hers is the quicker
// throw, so both still arrive together (`fly` is yours). After the
// hit-stop (`hold`) yours is smashed back down past your own hand, and
// hers follows through, turns upright, grows, glows and holds (`win`)
// before it leaves for the discard pile off the right edge (`away`).
export const CLASH = { draw: THROW.draw, rise: 170, answer: 100, fly: 300, hold: 90, win: 440, away: 520 };
// Motion trails: copies of the card a few frames behind it, fading.
export const TRAIL = { lag: 26, alpha: [1, 0.26, 0.18, 0.10] };
// Reduced motion: nothing travels, the cards that leave fade in place.
export const RM_FADE = 280;

export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
// Past the mark and back: her Ace standing up to its full size.
const backOut = (t) => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
// A throw leaves fast and keeps accelerating into the target.
export const throwEase = (t) => 0.35 * t + 0.65 * t * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, t) => a + (b - a) * t;
// The last quarter of a spin-away fades, so a card that has not quite
// left the screen when its flight ends never pops out of existence.
const tailFade = (f, from = 0.75) => (f < from ? 1 : Math.max(0, 1 - (f - from) / (1 - from)));

// A quadratic bow from a to b, pushed sideways off the straight line by
// `arc` times the distance travelled.
export function bowAt(a, b, arc, e) {
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
  const cx = (a.x + b.x) / 2 + (-dy / dist) * arc * dist;
  const cy = (a.y + b.y) / 2 + (dx / dist) * arc * dist;
  const u = 1 - e;
  return { x: u * u * a.x + 2 * u * e * cx + e * e * b.x,
           y: u * u * a.y + 2 * u * e * cy + e * e * b.y };
}

// Thrown free: a velocity, gravity, a spin, and a lift toward the
// camera over the first part of the arc (sPeak) that settles back.
export function ballisticAt({ x0, y0, vx, vy, g, spin, rot0 = 0, s0 = 1, sPeak = 1.14, dur }, tSec) {
  const f = clamp01(tSec / dur);
  const s = s0 * (1 + (sPeak - 1) * Math.sin(Math.min(1, f * 1.6) * Math.PI * 0.5) * (1 - f * 0.5));
  return { x: x0 + vx * tSec, y: y0 + vy * tSec + 0.5 * g * tSec * tSec, rot: rot0 + spin * tSec, s };
}

// How long a card knocked upward takes to fall past `floorY`. SOLVED,
// not guessed: on the bench a fixed duration landed a knocked-off card
// back on the table, over your hand, where it sat until its flight
// ended. Clamped so a card never hangs about for two seconds; the fade
// at the end of knockOffMotion covers the rare clamped case.
export function fallTime(y0, vy, g, floorY, min = 0.7, max = 1.9) {
  const D = Math.max(1, floorY - y0);
  const t = (-vy + Math.sqrt(vy * vy + 2 * g * D)) / g;
  return Math.min(max, Math.max(min, t));
}

// A pose that fades where it stands: the reduced-motion stand-in for
// every card that would otherwise have flown.
export function fadeMotion(pose, dur = RM_FADE) {
  return { dur, at: (t) => ({ ...pose, o: 1 - clamp01(t / dur), trail: false }) };
}

// Your Ace, from the pose it hovers at to the gap between the targets
// and away. `impactAt` is when it arrives, `commitAt` when the hit-stop
// ends and the targets leave.
export function throwMotion({ rest, impact, K = 1, s1, arc = 0.18 }) {
  const back = { x: rest.x, y: rest.y + 16 * K, rot: -42, s: rest.s * (1.05 / 1.12) };
  const hit = { x: impact.x, y: impact.y, rot: 858, s: s1 };
  const tDraw = THROW.draw, tFly = tDraw + THROW.fly, tHold = tFly + THROW.hold;
  const away = { x0: hit.x, y0: hit.y, vx: 820 * K, vy: -700 * K, g: 2000 * K, spin: 1100,
    rot0: hit.rot, s0: s1, sPeak: 1.08, dur: THROW.rebound / 1000 };
  return {
    dur: tHold + THROW.rebound, impactAt: tFly, commitAt: tHold,
    at(t) {
      if (t < tDraw) {
        const e = easeOut(clamp01(t / tDraw));
        return { x: lerp(rest.x, back.x, e), y: lerp(rest.y, back.y, e),
          rot: lerp(rest.rot, back.rot, e), s: lerp(rest.s, back.s, e), trail: false };
      }
      if (t < tFly) {
        const e = throwEase((t - tDraw) / THROW.fly);
        return { ...bowAt(back, hit, arc, e), rot: lerp(back.rot, hit.rot, e),
          s: lerp(back.s, hit.s, e), trail: true };
      }
      if (t < tHold) return { ...hit, trail: false };
      const tr = Math.min(t - tHold, THROW.rebound);
      return { ...ballisticAt(away, tr / 1000), o: tailFade(tr / THROW.rebound), trail: false };
    },
  };
}

// A target knocked off the table: up, over and down past the bottom
// edge. `from` is the card's measured pose, lean included.
export function knockOffMotion({ from, vx, vy, g, spin, floorY }) {
  const T = fallTime(from.y, vy, g, floorY);
  const b = { x0: from.x, y0: from.y, vx, vy, g, spin, rot0: from.rot, s0: from.s, sPeak: 1.22, dur: T };
  const dur = T * 1000;
  return {
    dur,
    at(t) {
      const tt = Math.min(t, dur);
      return { ...ballisticAt(b, tt / 1000), o: tailFade(tt / dur, 0.8), trail: false };
    },
  };
}

// The two knock-offs leave in opposite directions and at different
// speeds, so they read as two cards rather than one object. Left target
// first: `targets` is any two poses, sorted here.
export function knockOffPair(poses, K, floorY) {
  const [a, b] = [...poses].sort((p, q) => p.x - q.x);
  return [
    knockOffMotion({ from: a, vx: -360 * K, vy: -980 * K, g: 2700 * K, spin: -760, floorY }),
    knockOffMotion({ from: b, vx: 420 * K, vy: -1080 * K, g: 2700 * K, spin: 880, floorY }),
  ].map((m, i) => ({ motion: m, pose: i === 0 ? a : b }));
}

// Her counter, and her win. `mine` is your hovering Ace's pose, `hers`
// her face-down card's, `meet` the point they collide at, `floorY` the
// line your Ace has fallen past when it is gone. `glow` (0 to 1) in her
// poses is the ember light around her Ace while it holds the table.
export function clashMotions({ mine, hers, meet, K = 1, s1, floorY = Infinity }) {
  const tDraw = CLASH.draw, tClash = tDraw + CLASH.fly;
  const tGo = tDraw + CLASH.answer, tHold = tClash + CLASH.hold, tWin = tHold + CLASH.win;
  const fly = (from, to, arc, t0, t) => {
    const e = throwEase(clamp01((t - t0) / (tClash - t0)));
    return { ...bowAt(from, to, arc, e), rot: lerp(from.rot, to.rot, e), s: lerp(from.s, to.s, e), trail: true };
  };
  // Yours, drawn back as in the landed throw and thrown two turns.
  const back = { x: mine.x, y: mine.y + 16 * K, rot: -42, s: mine.s * (1.05 / 1.12) };
  const myTo = { x: meet.x - 8 * K, y: meet.y + 10 * K, rot: back.rot + 720, s: s1 };
  // Hers: up out of her hand, then thrown one turn, arriving almost
  // upright, bigger than yours and on top of it. Never smaller than she
  // rose: on a desktop her hand's cards are bigger than the pile-sized
  // Aces meet at, and she read as shrinking into the fight (review,
  // 2026-09-17).
  const herUp = { x: hers.x, y: hers.y + 26 * K, rot: 0, s: hers.s * 1.08 };
  const herTo = { x: meet.x + 8 * K, y: meet.y - 10 * K, rot: -352, s: Math.max(s1 * 1.12, herUp.s * 1.02) };
  // Her line of travel is the way the hit goes.
  const hl = Math.hypot(herTo.x - herUp.x, herTo.y - herUp.y) || 1;
  const ux = (herTo.x - herUp.x) / hl, uy = (herTo.y - herUp.y) / hl;
  // She follows through a little and stands: upright, bigger again.
  const herWin = { x: herTo.x + ux * 16 * K, y: herTo.y + uy * 16 * K, rot: -360,
    s: Math.max(s1 * 1.26, herUp.s * 1.15) };
  // Yours goes back the way it came and along her line, shrinking as
  // it drops, spinning hard, until it has fallen off the screen.
  const bl = Math.hypot(back.x - myTo.x, back.y - myTo.y) || 1;
  const kvx = ((back.x - myTo.x) / bl) * 620 * K + ux * 320 * K;
  const kvy = ((back.y - myTo.y) / bl) * 620 * K + uy * 320 * K;
  const knockT = fallTime(myTo.y, kvy, 2600 * K, floorY, 0.45, 1.2);
  const knock = { x0: myTo.x, y0: myTo.y, vx: kvx, vy: kvy, g: 2600 * K, spin: -1500,
    rot0: myTo.rot, s0: s1, sPeak: 0.78, dur: knockT };
  // Hers, when it is done, spins off the right edge like any discard,
  // quickly: the notice waits for it, and a slow exit left the table
  // standing empty before the notice opened.
  const exit = { x0: herWin.x, y0: herWin.y, vx: 1500 * K, vy: -380 * K, g: 1700 * K, spin: 760,
    rot0: herWin.rot, s0: herWin.s, sPeak: 1.04, dur: CLASH.away / 1000 };
  const knockMs = knockT * 1000;
  const dur = Math.max(tHold + knockMs, tWin + CLASH.away);
  return {
    dur, myThrowAt: tDraw, herThrowAt: tGo, clashAt: tClash, commitAt: tHold,
    // The angle her hit travels at, for the debris.
    hitAng: Math.atan2(uy, ux),
    mine: { dur, at(t) {
      if (t < tDraw) {
        const e = easeOut(clamp01(t / tDraw));
        return { x: lerp(mine.x, back.x, e), y: lerp(mine.y, back.y, e),
          rot: lerp(mine.rot, back.rot, e), s: lerp(mine.s, back.s, e), trail: false };
      }
      if (t < tClash) return fly(back, myTo, 0.15, tDraw, t);
      if (t < tHold) return { ...myTo, trail: false };
      const tr = Math.min(t - tHold, knockMs);
      return { ...ballisticAt(knock, tr / 1000), o: tailFade(tr / knockMs), trail: false };
    } },
    hers: { dur, at(t) {
      if (t < CLASH.rise) {
        // Up out of her hand and face up: a sliver that widens, which
        // reads as the card flipping over as it comes.
        const e = easeOut(clamp01(t / CLASH.rise));
        return { x: hers.x, y: lerp(hers.y, herUp.y, e), rot: lerp(hers.rot, 0, e),
          s: lerp(hers.s, herUp.s, e), sx: lerp(0.2, 1, e), o: e, trail: false, glow: 0 };
      }
      if (t < tGo) return { ...herUp, trail: false, glow: 0 };
      if (t < tClash) return { ...fly(herUp, herTo, -0.15, tGo, t), glow: 0 };
      if (t < tHold) return { ...herTo, trail: false, glow: clamp01((t - tClash) / CLASH.hold) };
      if (t < tWin) {
        const e = clamp01((t - tHold) / 240);
        const m = easeOut(e);
        return { x: lerp(herTo.x, herWin.x, m), y: lerp(herTo.y, herWin.y, m),
          rot: lerp(herTo.rot, herWin.rot, m), s: lerp(herTo.s, herWin.s, backOut(e)),
          trail: false, glow: 1 };
      }
      const tr = Math.min(t - tWin, CLASH.away);
      return { ...ballisticAt(exit, tr / 1000), o: tailFade(tr / CLASH.away),
        trail: false, glow: 1 - clamp01(tr / (CLASH.away * 0.35)) };
    } },
  };
}
