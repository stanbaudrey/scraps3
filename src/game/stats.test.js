// ============================================================
// SCRAPS — the unlock, and the preview link that can set it
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';

// stats.js keeps a module-level copy of the unlocks, so every case gets a
// fresh module and a fresh fake browser store.
async function fresh(initial = {}) {
  vi.resetModules();
  const store = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  });
  const mod = await import('./stats.js');
  return { ...mod, store };
}
beforeEach(() => vi.unstubAllGlobals());

describe('the UNFAIR unlock', () => {
  it('opens once, stays open, and says which call opened it', async () => {
    const s = await fresh();
    expect(s.loadUnlocks().unfair).toBe(false);
    expect(s.unlockUnfair()).toBe(true);
    expect(s.unlockUnfair()).toBe(false);
    expect(JSON.parse(s.store['scraps-unlocks-v1']).unfair).toBe(true);
    // a later visit, same browser
    const again = await fresh(s.store);
    expect(again.loadUnlocks().unfair).toBe(true);
  });

  it('is not opened by an old HARD win on record', async () => {
    const s = await fresh({ 'scraps-stats-v1': JSON.stringify({ hard: { w: 4, l: 1, bestMargin: 9 } }) });
    expect(s.loadUnlocks().unfair).toBe(false);
  });

  it('holds for the tab when storage is blocked', async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
    const s = await import('./stats.js');
    expect(s.unlockUnfair()).toBe(true);
    expect(s.loadUnlocks().unfair).toBe(true);
  });
});

describe('a preview link can open already unlocked', () => {
  const at = (hostname, search) => ({ hostname, search });

  it('sets the state the link asks for, off the live site', async () => {
    const s = await fresh();
    expect(s.applyPreviewUnlock(at('scraps3-git-dev-x.vercel.app', '?unfair=unlocked'))).toBe(true);
    expect(s.loadUnlocks()).toMatchObject({ unfair: true, unfairSeen: false });
    expect(s.applyPreviewUnlock(at('localhost', '?unfair=open'))).toBe(true);
    expect(s.loadUnlocks()).toMatchObject({ unfair: true, unfairSeen: true });
    expect(s.applyPreviewUnlock(at('localhost', '?unfair=locked'))).toBe(true);
    expect(s.loadUnlocks()).toMatchObject({ unfair: false, unfairSeen: false });
  });

  it('is ignored on scraps.games, with or without www', async () => {
    const s = await fresh();
    expect(s.applyPreviewUnlock(at('scraps.games', '?unfair=unlocked'))).toBe(false);
    expect(s.applyPreviewUnlock(at('www.scraps.games', '?unfair=unlocked'))).toBe(false);
    expect(s.loadUnlocks().unfair).toBe(false);
    expect(s.store['scraps-unlocks-v1']).toBeUndefined();
  });

  it('does nothing without the parameter, or with a value it does not know', async () => {
    const s = await fresh();
    expect(s.applyPreviewUnlock(at('localhost', ''))).toBe(false);
    expect(s.applyPreviewUnlock(at('localhost', '?unfair=yes'))).toBe(false);
    expect(s.loadUnlocks().unfair).toBe(false);
  });
});
