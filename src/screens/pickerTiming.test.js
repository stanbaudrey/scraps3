import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PANEL_DEAL_MS, HARD_DEALT_MS, UNLOCK_BEAT_MS, UNLOCK_GAP_MS } from './pickerTiming.js';

describe("the picker's clock", () => {
  it('agrees with the stylesheet that actually deals the panels', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    const m = css.match(/\.pick-box\s*\{[^}]*animation:\s*panelDeal\s+(\d+)ms/);
    expect(m, 'index.html no longer sets panelDeal on .pick-box').toBeTruthy();
    expect(Number(m[1])).toBe(PANEL_DEAL_MS);
  });

  it("starts UNFAIR's first appearance within 50ms of HARD finishing", () => {
    expect(UNLOCK_BEAT_MS - HARD_DEALT_MS).toBe(UNLOCK_GAP_MS);
    expect(UNLOCK_GAP_MS).toBeGreaterThanOrEqual(0);
    expect(UNLOCK_GAP_MS).toBeLessThanOrEqual(50);
  });
});
