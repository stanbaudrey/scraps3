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

  it('the number: the same pause after ROUND lands, over its own flip, easing like the rest', () => {
    const f = frames('signCycleNumber');
    // Card 4 of ROUND lands at up0 + its own delay + a flip; the number
    // starts `pause` after that, less its own delay of five staggers.
    const n0 = up0 + pct(4 * B.stagger + B.flipDur + B.pause - 5 * B.stagger);
    const want = [[n0, 'rotateY(0deg)'], [n0 + pct(0.6 * B.numberDur), 'rotateY(108deg)'],
      [n0 + pct(B.numberDur), 'rotateY(180deg) scale(1.12)']];
    for (const [at, has] of want) {
      const fr = near(f, at);
      expect(fr, `a signCycleNumber frame at ${at.toFixed(2)}%`).toBeTruthy();
      expect(fr.body).toContain(has);
    }
    // No frame carries a curve of its own: the loop's ease-in-out applies,
    // the same as the entrance's and every ROUND flip's. A snappier curve
    // on the number's frames is the jerk Stan saw as a glitch.
    expect(f.some(fr => fr.body.includes('animation-timing-function'))).toBe(false);
    expect(near(f, down0) && near(f, down1)).toBeTruthy();
  });

  it('the number turns on the same two-frame shape as a ROUND card', () => {
    const f = frames('signNumberIn');
    expect(f.map(fr => fr.at)).toEqual([0, 60, 100]);
    expect(near(f, 60).body).toContain('rotateY(108deg)');
    expect(near(f, 100).body).toContain('rotate(8deg) rotateY(180deg) scale(1.12)');
    expect(frames('ribbonFlip').map(fr => fr.at)).toEqual([0, 60, 100]);
  });

  it('the notes sit on the faces, and the gap Stan hears is the one he asked for', () => {
    const lastRound = B.flipAt + 4 * B.stagger + B.flipDur * B.wordFace;
    const number = B.numberAt + B.numberDur * B.numberFace;
    expect(number - lastRound).toBeCloseTo(B.noteGap, 6);
    expect(B.pause).toBeGreaterThan(0);
    // Both flips ease in and out, solved for 90 of 108deg.
    expect(B.wordFace).toBeCloseTo(0.43, 2);
    expect(B.numberFace).toBeCloseTo(0.43, 2);
  });
});
