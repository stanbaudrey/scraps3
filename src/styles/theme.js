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
//   general UI color.
//
// THE CANOPY RULE, amended 2026-08-30 (Stan's call, during the audit):
//   canopy MAY CARRY GROUND, NEVER STATE.
//   It was previously fenced to "decorative illustration only, not UI
//   chrome". The consequence was that this project's actual identity
//   green appeared on NO player-facing surface: it lived on the card
//   BACK, which you only ever see on the opponent's hidden hand, the
//   deck and the discard. The brand was invisible during play, and the
//   table read as a green felt card table rather than a forest.
//   GROUND means the table surface and the ridge motif printed faintly
//   on a card face — things that are always there and mean nothing on
//   their own. STATE stays off-limits: canopy must never indicate whose
//   turn it is, what is selected, what is legal, or who owns a zone.
//   Those remain voltage / ember / gold.
//
// TIMBER — the table itself, added 2026-08-30.
//   The table used to be one two-stop radial gradient and nothing else:
//   no material, no grain, no seams. These draw a weathered,
//   sun-silvered picnic table seen from directly overhead.
//   Deliberately NOT a pale bleached driftwood: this palette is
//   light-on-dark and 27 contrast pairings are tuned against dark
//   grounds, so a light tabletop would have inverted the whole game.
//   The sun-bleaching reads in the SILVERED GRAIN over weathered
//   boards, which is what old outdoor timber actually looks like.
//   frost on timber measures ~10:1.
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
  // Red suits printed on the pale card face, and NOWHERE else. `ember`
  // is 1.98:1 against `frost` — the rank and suit on every heart and
  // diamond in your hand were failing AA by a factor of two, measured
  // 2026-08-27 in the Session 5 audit. It went unnoticed because the
  // brief's contrast target still named the pre-reskin `#8A8FA8`
  // on `#1C1C28`, a pairing that stopped existing in August.
  // This token is 5.20:1 on frost. Ember itself is untouched and keeps
  // its accent role: on the DARK Scraps card face it measures 6.65:1
  // and needs no help, so only the light face uses this.
  emberInk:   '#A8341F',
  voltageHover: '#B5E07B',
  emberHover:   '#F0A376',
  gold:       '#F4C771',
  goldHover:  '#F7D697',
  canopy:     '#3E5C46',
  // The table. `timber` is the board base, `timberLight` the
  // sun-silvered grain and the lighter boards, `timberSeam` the gap
  // between two boards. Ground only — never state. See the canopy
  // rule above, which these live under.
  timber:      '#3B3025',
  timberLight: '#6B5C48',
  timberSeam:  '#191309',
};
export const F = {
  title:   "'Bungee Shade', sans-serif",
  display: "'Fjalla One', sans-serif",
  card:    "'Baloo 2', sans-serif",
  ui:      "'Work Sans', sans-serif",
  mono:    "'IBM Plex Mono', monospace",
};
export const WIN_SCORE = 10;
