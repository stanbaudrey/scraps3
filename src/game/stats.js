// ============================================================
// SCRAPS — Persistent play stats (localStorage)
//
// Tracks a win-loss record and best winning margin per
// difficulty. "Margin" is the final-score gap in a won game
// (e.g. an 11-6 win records a margin of 5).
//
// localStorage survives page reloads and new deploys on the
// same domain. All reads/writes are wrapped in try/catch so a
// blocked-storage browser (private mode, etc.) degrades to
// zeroed stats instead of crashing the game.
// ============================================================

const KEY = 'scraps-stats-v1';

const EMPTY = { w: 0, l: 0, bestMargin: 0 };

export function loadStats() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Returns the updated record for that difficulty, plus whether
// this win set a new best margin.
export function recordGame(difficulty, won, margin = 0) {
  const stats = loadStats();
  const d = { ...EMPTY, ...(stats[difficulty] || {}) };
  let isNewRecord = false;
  if (won) {
    d.w += 1;
    if (margin > d.bestMargin) { d.bestMargin = margin; isNewRecord = true; }
  } else {
    d.l += 1;
  }
  stats[difficulty] = d;
  try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* storage blocked — stats just won't persist */ }
  return { ...d, isNewRecord };
}
