// ============================================================
// SCRAPS — Persistent play stats (localStorage)
//
// Tracks a win-loss record and best winning margin per
// difficulty. "Margin" is the final-score gap in a won game
// (e.g. an 11-6 win records a margin of 5).
//
// The records are keyed by difficulty ID: `easy` (shown as NORMAL since
// 2026-09-18, the key kept so nobody's record vanished with the rename),
// `hard` and `unfair`.
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

// ── Unlocks ──────────────────────────────────────────────────
// UNFAIR opens the first time you beat HARD, and stays open in this
// browser for good (Stan, 2026-09-18). It is its OWN flag rather than
// "has a HARD win on record", on purpose: HARD became a different and
// much stronger player on the day the mode was added, and only a win
// against that one counts. Records from before it do not unlock anything.
//
// `unfairSeen` is the picker's one-time entrance: the panel arrives with
// some ceremony the first time it is shown, and is simply there after.
//
// Storage can be blocked (private browsing). The module-level copy keeps
// the unlock true for as long as the tab is open, which is the most that
// can be promised there. The privacy notice names this item
// (tools/make-share-assets.mjs, PRIVACY).
const UNLOCK_KEY = 'scraps-unlocks-v1';
let memory = null;

export function loadUnlocks() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    memory = { unfair: false, unfairSeen: false, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    memory = { unfair: false, unfairSeen: false };
  }
  return memory;
}
function saveUnlocks(next) {
  memory = next;
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(next)); } catch { /* storage blocked: holds for this tab only */ }
}
// Returns true when THIS call is the one that opened it.
export function unlockUnfair() {
  const u = loadUnlocks();
  if (u.unfair) return false;
  saveUnlocks({ ...u, unfair: true });
  return true;
}
export function markUnfairSeen() {
  const u = loadUnlocks();
  if (!u.unfairSeen) saveUnlocks({ ...u, unfairSeen: true });
}
