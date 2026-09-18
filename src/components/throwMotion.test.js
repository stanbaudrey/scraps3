import { describe, it, expect } from 'vitest';
import {
  THROW, CLASH, fallTime, ballisticAt, bowAt, throwMotion, knockOffMotion,
  knockOffPair, clashMotions, fadeMotion,
} from './throwMotion.js';

const yAt = (y0, vy, g, t) => y0 + vy * t + 0.5 * g * t * t;

describe('The Throw — motion math', () => {
  it('a knocked-off card is past the floor when its flight ends, wherever it started', () => {
    // The bench bug this guards: a fixed flight time landed a card back
    // on the table. Every start height a pile can have, every speed and
    // table scale the game uses, on screens from a landscape phone up.
    for (const floorY of [390 + 120, 667 + 120, 1117 + 170]) {
      for (let y0 = 20; y0 < floorY - 150; y0 += 40) {
        for (const K of [0.5, 0.73, 1, 1.2]) {
          for (const vy of [-980 * K, -1080 * K]) {
            const g = 2700 * K;
            const t = fallTime(y0, vy, g, floorY);
            if (t < 1.9) expect(yAt(y0, vy, g, t)).toBeGreaterThanOrEqual(floorY - 0.5);
          }
        }
      }
    }
  });

  it('a clamped fall ends invisible, so a slow card never pops off mid-screen', () => {
    const m = knockOffMotion({ from: { x: 0, y: 0, rot: 0, s: 1 }, vx: 0, vy: -50, g: 100, spin: 0, floorY: 5000 });
    expect(m.dur).toBe(1900);
    expect(m.at(m.dur).o).toBe(0);
    expect(m.at(m.dur * 0.5).o).toBe(1);
  });

  it('the two targets leave in opposite directions, left card to the left', () => {
    const [a, b] = knockOffPair([{ x: 300, y: 100, rot: 2, s: 1 }, { x: 200, y: 100, rot: -1, s: 1 }], 1, 900);
    expect(a.pose.x).toBe(200);
    expect(a.motion.at(400).x).toBeLessThan(200);
    expect(b.motion.at(400).x).toBeGreaterThan(300);
  });

  it('the throw starts on the hovering Ace, holds in the gap through the hit-stop, then leaves', () => {
    const rest = { x: 500, y: 700, rot: -8, s: 1.12 };
    const impact = { x: 800, y: 120 };
    const m = throwMotion({ rest, impact, K: 1, s1: 0.6 });
    expect(m.at(0)).toMatchObject({ x: 500, y: 700, rot: -8, s: 1.12 });
    expect(m.impactAt).toBe(THROW.draw + THROW.fly);
    expect(m.commitAt).toBe(m.impactAt + THROW.hold);
    for (const t of [m.impactAt, m.impactAt + 40, m.commitAt - 1]) {
      const p = m.at(t);
      expect(p.x).toBeCloseTo(800, 5);
      expect(p.y).toBeCloseTo(120, 5);
      expect(p.s).toBeCloseTo(0.6, 5);
    }
    // Two and a half turns on the way in.
    expect(m.at(m.impactAt).rot - m.at(THROW.draw).rot).toBeCloseTo(900, 5);
    // Trails only while it is actually flying at the target.
    expect(m.at(THROW.draw / 2).trail).toBe(false);
    expect(m.at(THROW.draw + THROW.fly / 2).trail).toBe(true);
    expect(m.at(m.commitAt + 10).trail).toBe(false);
    expect(m.at(m.dur).o).toBe(0);
    expect(m.at(m.dur).x).toBeGreaterThan(800);
  });

  it('the throw arrives continuously: no jump between the flight and the hold', () => {
    const m = throwMotion({ rest: { x: 0, y: 600, rot: 0, s: 1 }, impact: { x: 400, y: 100 }, K: 1, s1: 0.6 });
    const a = m.at(m.impactAt - 0.001), b = m.at(m.impactAt);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.1);
  });

  const counter = () => clashMotions({ mine: { x: 300, y: 650, rot: -8, s: 1.12 },
    hers: { x: 380, y: 40, rot: 3, s: 0.7 }, meet: { x: 400, y: 300 }, K: 1, s1: 0.66, floorY: 900 });

  it('in a counter both Aces reach the meeting point together', () => {
    const c = counter();
    expect(c.clashAt).toBe(CLASH.draw + CLASH.fly);
    const a = c.mine.at(c.clashAt), b = c.hers.at(c.clashAt);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
    // Hers starts as an invisible sliver on her own card, face-down size.
    expect(c.hers.at(0)).toMatchObject({ x: 380, y: 40, s: 0.7, o: 0 });
    expect(c.hers.at(0).sx).toBeCloseTo(0.2, 5);
    expect(c.mine.at(c.dur).o).toBe(0);
    expect(c.hers.at(c.dur).o).toBe(0);
  });

  it('her Ace is thrown after yours, which is what her later whoosh is timed to', () => {
    const c = counter();
    expect(c.myThrowAt).toBe(CLASH.draw);
    expect(c.herThrowAt).toBe(CLASH.draw + CLASH.answer);
    // Hers is still hovering where it came up just before her throw, and
    // has moved just after; yours is already in the air by then.
    const hover = c.hers.at(c.herThrowAt - 1);
    expect(c.hers.at(CLASH.rise + 1)).toMatchObject({ x: hover.x, y: hover.y });
    expect(Math.hypot(c.hers.at(c.herThrowAt + 40).y - hover.y, c.hers.at(c.herThrowAt + 40).x - hover.x)).toBeGreaterThan(1);
    expect(c.mine.at(c.herThrowAt).trail).toBe(true);
    // Hers arrives bigger than yours.
    expect(c.hers.at(c.clashAt).s).toBeGreaterThan(c.mine.at(c.clashAt).s);
  });

  it('she wins the collision: hers holds the table upright and lit, yours is knocked away', () => {
    const c = counter();
    const hit = c.hers.at(c.clashAt);
    const standing = c.hers.at(c.commitAt + CLASH.win - 1);
    // Hers stays close to where it struck, stands upright, grows, glows.
    expect(Math.hypot(standing.x - hit.x, standing.y - hit.y)).toBeLessThan(30);
    expect(((standing.rot % 360) + 360) % 360).toBeCloseTo(0, 5);
    expect(standing.s).toBeGreaterThan(hit.s);
    expect(standing.glow).toBe(1);
    // Yours is well away by the time hers is standing, and falling.
    const mineThen = c.mine.at(c.commitAt + 300);
    expect(Math.hypot(mineThen.x - c.mine.at(c.clashAt).x, mineThen.y - c.mine.at(c.clashAt).y)).toBeGreaterThan(150);
    expect(mineThen.y).toBeGreaterThan(c.mine.at(c.clashAt).y);
    // Hers then leaves to the right, the discard side, and fades.
    expect(c.hers.at(c.dur).x).toBeGreaterThan(standing.x + 200);
    expect(c.hers.at(c.dur - 1).glow).toBeLessThan(0.05);
  });

  it('small pieces: a bow ends where it should, a fade fades, the lift settles', () => {
    expect(bowAt({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.3, 0)).toEqual({ x: 0, y: 0 });
    const end = bowAt({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.3, 1);
    expect(end.x).toBeCloseTo(10, 9);
    expect(end.y).toBeCloseTo(20, 9);
    const f = fadeMotion({ x: 1, y: 2, rot: 0, s: 1 }, 280);
    expect(f.at(0).o).toBe(1);
    expect(f.at(280).o).toBe(0);
    const b = { x0: 0, y0: 0, vx: 0, vy: 0, g: 0, spin: 0, s0: 1, sPeak: 1.2, dur: 1 };
    expect(ballisticAt(b, 0).s).toBe(1);
    expect(ballisticAt(b, 0.3125).s).toBeGreaterThan(1.1);
  });
});
