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
// ============================================================

export const DS = {
  ink:        '#241C14',
  frost:      '#EDE3D0',
  ember:      '#E2793B',
  voltage:    '#8FBF4D',
  slate:      '#98A290',
  dusk:       '#141F19',
  duskLight:  '#26392F',
  duskMid:    '#1E2C24',
  slateLight: '#C9C2AE',
  inkLight:   '#2E4235',
  voltageHover: '#A6D66B',
  emberHover:   '#F0904F',
  gold:       '#F0BB55',
  goldHover:  '#F7CC7A',
  canopy:     '#3E5C46',
};
export const F = {
  display: "'Spectral', serif",
  card:    "'Spectral', serif",
  ui:      "'Work Sans', sans-serif",
  mono:    "'IBM Plex Mono', monospace",
};
export const WIN_SCORE = 11;
