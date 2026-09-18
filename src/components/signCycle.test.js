import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SIGN_BEATS as B } from '../audio.js';

// The ROUND sign's idle loop is two @keyframes in index.html, written as
// percentages of a 6.2s period, and the entrance and the voice are
// SIGN_BEATS. Nothing but this test ties the two together: the loop's
// frames used to be hand-derived from the beats, and a comment beside
// them promised they "move with" a beat change, which a keyframe cannot
// do. Recompute every frame from the beats and read the file.
const css = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
function frames(name) {
  const m = css.match(new RegExp(`@keyframes ${name}\\{(.*?\\})\\}`));
  if (!m) throw new Error(`no @keyframes ${name} in index.html`);
  const out = [];
  for (const [, sel, body] of m[1].matchAll(/([\d.%,]+)\{([^}]*)\}/g)) {
    for (const p of sel.split(',')) out.push({ at: parseFloat(p), body });
  }
  return out;
}
const pct = (ms) => (ms / B.cycle) * 100;
const near = (list, at) => list.find(f => Math.abs(f.at - at) < 0.06);

describe('the ROUND sign loop matches SIGN_BEATS', () => {
  const down0 = B.cycleDown * 100, down1 = down0 + pct(B.cycleDownDur);
  const up0 = B.cycleUp * 100;

  it('ROUND: down, back up over one flip, its 60% frame where the entrance has it', () => {
    const f = frames('signCycleWord');
    for (const at of [down0, down1, up0, up0 + pct(0.6 * B.flipDur), up0 + pct(B.flipDur)]) {
      expect(near(f, at), `a signCycleWord frame at ${at.toFixed(2)}%`).toBeTruthy();
    }
    expect(near(f, up0 + pct(0.6 * B.flipDur)).body).toContain('rotateY(108deg)');
  });

  it('the number: the same pause after ROUND lands, then ONE stroke with nothing between', () => {
    const f = frames('signCycleNumber');
    // Card 4 of ROUND lands at up0 + its own delay + a flip; the number
    // starts `pause` after that, less its own delay of five staggers.
    const n0 = up0 + pct(4 * B.stagger + B.flipDur + B.pause - 5 * B.stagger);
    const n1 = n0 + pct(B.numberDur);
    for (const [at, has] of [[n0, 'rotateY(0deg)'], [n1, 'rotateY(180deg)']]) {
      const fr = near(f, at);
      expect(fr, `a signCycleNumber frame at ${at.toFixed(2)}%`).toBeTruthy();
      expect(fr.body).toContain(has);
    }
    // No frame inside the turn: a curve that arrives at rest arrives at
    // rest on EVERY frame, so a frame in the middle is a place to stop
    // (ribbonFlip's 60% held the number ~100ms, 2026-09-18).
    expect(f.filter(fr => fr.at > n0 + 0.06 && fr.at < n1 - 0.06), 'a frame inside the turn').toEqual([]);
    // The flip carries no curve of its own and no pop: the loop's
    // ease-in-out applies, and the pop is signCyclePop's.
    expect(f.some(fr => fr.body.includes('animation-timing-function'))).toBe(false);
    expect(f.some(fr => fr.body.includes('scale(') || fr.body.includes('translate'))).toBe(false);
    expect(near(f, down0) && near(f, down1)).toBeTruthy();
  });

  it('the number pops on its own layer, in the loop and on entry, easing in and out', () => {
    const n0 = up0 + pct(4 * B.stagger + B.flipDur + B.pause - 5 * B.stagger);
    const loop = frames('signCyclePop');
    const peak = near(loop, n0 + pct(B.popAt * B.numberDur));
    expect(peak, 'the loop pop peaks at popAt of the flip').toBeTruthy();
    expect(peak.body).toContain('scale(1.22)');
    expect(near(loop, n0).body).toContain('rotate(0deg) scale(1)');
    expect(near(loop, n0 + pct(B.numberDur)).body).toContain('rotate(8deg) scale(1.12)');
    expect(near(loop, down1).body).toContain('scale(1)');
    // Every segment takes the animation's ease-in-out, so the swell leaves
    // and arrives at rest; its peak lands while the turn is at speed.
    expect(loop.some(fr => fr.body.includes('animation-timing-function'))).toBe(false);
    const entry = frames('signNumberPop');
    expect(entry.map(fr => fr.at)).toEqual([0, B.popAt * 100, 100]);
    expect(near(entry, B.popAt * 100).body).toContain('scale(1.22)');
    expect(near(entry, 100).body).toContain('rotate(8deg) scale(1.12)');
    expect(entry.some(fr => fr.body.includes('animation-timing-function'))).toBe(false);
    expect(B.popAt).toBe(0.6);
  });

  it('the number turns in one stroke on entry; ROUND keeps ribbonFlip', () => {
    expect(css).not.toMatch(/@keyframes signNumberIn\b/);
    const n = frames('signNumberFlip');
    expect(n.map(fr => fr.at)).toEqual([0, 100]);
    expect(n[0].body).toContain('rotateY(0deg)');
    expect(n[1].body).toContain('rotateY(180deg)');
    expect(frames('ribbonFlip').map(fr => fr.at)).toEqual([0, 60, 100]);
    expect(near(frames('ribbonFlip'), 60).body).toContain('rotateY(108deg)');
    // Over a ROUND letter's own time, so it turns at a letter's speed.
    expect(B.numberDur).toBe(B.flipDur);
  });

  it('the notes sit on the faces, and the gap Stan hears is the one he asked for', () => {
    const lastRound = B.flipAt + 4 * B.stagger + B.flipDur * B.wordFace;
    const number = B.numberAt + B.numberDur * B.numberFace;
    expect(number - lastRound).toBeCloseTo(B.noteGap, 6);
    expect(B.pause).toBeGreaterThan(0);
    // ROUND eases in and out to 108deg at 60%, solved for 90 of 108; the
    // number's one symmetric stroke passes 90deg at exactly half way.
    expect(B.wordFace).toBeCloseTo(0.43, 2);
    expect(B.numberFace).toBeCloseTo(0.5, 6);
    // The number's note has not moved since Stan approved it.
    expect(number).toBeCloseTo(1543.64, 1);
  });
});
