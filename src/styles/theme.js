// ============================================================
// SCRAPS — Design tokens
//
// All global CSS (reset, hover classes, keyframes) lives in
// index.html — the single source of truth, loaded before first
// paint. This module only exports the JS-side design tokens.
//
// Palette: "Forest Dusk" — a painterly, warm-toned national-park
// reskin. Deep pine field instead of black-arcade navy; every
// accent stays warm (ember, gold, fern) rather than switching to
// a cool night palette after dark. Key names are unchanged from
// the previous neon palette so every consuming component keeps
// working — only the values and their intent moved:
//   ink     — near-black warm ink (was navy) — dark fills, text on light
//   frost   — pale warm parchment "birch" (was near-white) — light fills, text on dark
//   ember   — warm ember orange (was hot pink) — opponent / red suits / danger
//   voltage — bright leaf "fern" green (was acid green) — yours / active / interactive
//   slate   — warm sage-grey — muted / secondary
//   gold, goldHover, canopy — new: gold marks a milestone ONLY
//   (Full Scrap, the win screen, playing your own Ace) — never a
//   general UI color. canopy is decorative pine green for
//   illustration (card back, backdrop), not UI chrome.
//
// Colors pushed brighter + past AA into AAA territory (2026-08-25
// pass), verified by a live in-DOM contrast check, not just computed
// by hand: voltage/gold both clear 10:1+ against dusk (AAA); ember
// is the one accent that clears AA comfortably (6.71:1) but falls
// short of AAA's 7:1 — a hue-brightness tradeoff, not an oversight.
// slate (muted/secondary) ranges 5.48:1 (against duskLight, the
// hardest pairing) to 7.55:1 (against dusk) — AA-clear everywhere,
// AAA on the two easier backgrounds only. ink-on-fern and ink-on-gold
// both exceed 9:1.
//
// Type, finalized 2026-08-25 after the specimen review: F.title is
// the SCRAPS wordmark ONLY (AnimatedTitle) — everything else that
// used to share F.display (RULES/READY/DIFFICULTY headings, BEGIN
// ROUND N, win/lose screens, score numbers, hand names) now reads
// F.display as "headers and subtitles."
// ============================================================

export const DS = {
  ink:        '#241C14',
  frost:      '#EDE3D0',
  ember:      '#EC8A51',
  voltage:    '#A3D85A',
  slate:      '#A7B0A1',
  dusk:       '#141F19',
  duskLight:  '#26392F',
  duskMid:    '#1E2C24',
  slateLight: '#C9C2AE',
  inkLight:   '#2E4235',
  voltageHover: '#B5E07B',
  emberHover:   '#F0A376',
  gold:       '#F4C771',
  goldHover:  '#F7D697',
  canopy:     '#3E5C46',
};
export const F = {
  title:   "'Bungee Shade', sans-serif",
  display: "'Fjalla One', sans-serif",
  card:    "'Baloo 2', sans-serif",
  ui:      "'Work Sans', sans-serif",
  mono:    "'IBM Plex Mono', monospace",
};
export const WIN_SCORE = 10;
