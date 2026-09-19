// ============================================================
// SCRAPS — the difficulty picker's clock, in one place
//
// The panels deal in from CSS (`.pick-box` in index.html runs panelDeal
// for PANEL_DEAL_MS, each one PANEL_STAGGER_MS after the last) and
// UNFAIR's first appearance is timed from JS against the moment HARD has
// finished dealing. Two files describing one clock is how they drift, so
// the numbers live here, MenuScreens reads them, and pickerTiming.test.js
// reads index.html and fails if the stylesheet stops agreeing.
// ============================================================
export const PANEL_DEAL_MS = 620;      // index.html: .pick-box { animation: panelDeal 620ms ... }
export const PANEL_STAGGER_MS = 150;   // NORMAL at 0, HARD at 150

// HARD is the second panel, so it has finished dealing at 150 + 620.
export const HARD_DEALT_MS = PANEL_STAGGER_MS + PANEL_DEAL_MS;

// UNFAIR's first appearance starts within 50ms of that (Stan, 2026-09-18:
// "the animation is great, but it takes too long. start the animation
// within 50ms of the HARD option's animation finishing"). It waited a
// held beat of 1,500ms before; the beat was the part that was too long,
// the fall and the thud are as they were.
export const UNLOCK_GAP_MS = 40;
export const UNLOCK_BEAT_MS = HARD_DEALT_MS + UNLOCK_GAP_MS;
export const UNLOCK_FALL_MS = 420;     // the fall itself; the thud sits on its end

// When the mode is opened by the secret while the picker is already up,
// there is nothing to wait for: the other two dealt long ago.
export const UNLOCK_BEAT_NOW_MS = 60;
