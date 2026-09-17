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
//   ember   — warm ember orange (was hot pink) — opponent / danger
//   voltage — bright leaf "fern" green (was acid green) — yours / active / interactive
//   slate   — warm sage-grey — muted / secondary
//   gold, goldHover, canopy — new: gold marks a milestone ONLY
//   (Clean Sweep, the win screen) — never a general UI color, and
//   since 2026-09-14 never a BUTTON either: "playing your own Ace"
//   was on this list and the ATTACK tag was gold for it, until Stan
//   made every filled button voltage so that green alone means
//   "push this". Gold marks outcomes now, not actions.
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
// the SCRAPS wordmark (AnimatedTitle) — everything else that
// used to share F.display (RULES/READY/DIFFICULTY headings, BEGIN
// ROUND N, win/lose screens, score numbers, hand names) now reads
// F.display as "headers and subtitles."
//
// AMENDED 2026-09-14. Rye has exactly EIGHT consumers now, and the
// list is the rule: the wordmark; every card rank (F.card, the same
// string); the storyboard's one HOW TO PLAY title; three moments on
// the table that Stan put in Rye off the Win bench — ROUND N, the
// CLEAN SWEEP beat, and the MATCH-WINNING SCORE as it lands; the
// reveal's own title (Hand 1 / Hand 2 / Scraps, Stan's revision later
// the same day); and the verdict on the share card share.js draws,
// which is a torn Scraps card and so sets its one word the way a rank
// is set. Nothing else. The letter cards of the match screen count as
// ranks. A heading that wants Rye and is not on this list is wrong.
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
  // `emberInk` lived here until 2026-09-13: a darker red for the
  // hearts and diamonds printed on a pale card face, because plain
  // `ember` measured 1.98:1 on frost and failed AA by a factor of
  // two. It was deleted with the suits themselves. There is now
  // exactly one ink on a card face, `ink`, on every card of every
  // rank — which is the version of this problem that cannot come
  // back. Recoverable from git if a second printed red is ever
  // wanted for something else; it was '#A8341F', 5.20:1 on frost.
  voltageHover: '#B5E07B',
  // SHOW 'EM at full charge, the last frame before a reveal (2026-09-16).
  // The same fern two steps paler than the hover, so a button gaining
  // energy reads as heating up rather than as changing colour. It never
  // rests: it exists only at the end of that one 580ms pass. Ink on it
  // measures above 13:1.
  voltageCharge: '#D6F0AC',
  emberHover:   '#F0A376',
  gold:       '#F4C771',
  goldHover:  '#F7D697',
  canopy:     '#3E5C46',
  // The table. `timber` is the board base, `timberLight` the
  // lit grain and the lighter boards, `timberSeam` the gap
  // between two boards. Ground only — never state. See the canopy
  // rule above, which these live under.
  //
  // REDWOOD, 2026-09-13 (Stan's call): "warmer, think more Redwood
  // and less worn/aged. Redder, but not necessarily brighter."
  // The move is hue and saturation at CONSTANT RELATIVE LUMINANCE —
  // 30° → 14°, 23% → 36% saturation, with lightness re-solved so
  // each token lands within 0.0003 of the luminance it had before.
  // That is what keeps "not brighter" true in the only sense that
  // matters here: every contrast pairing measured against the table
  // is unchanged, frost-on-timber included (10.09:1 → 10.05:1).
  // Pick new values the same way, not by eye: a redder table read
  // as lighter would quietly cost the light-on-dark palette its
  // whole margin.
  timber:      '#482A22',
  timberLight: '#7F5444',
  timberSeam:  '#220F0B',
  // The dark the table falls into around an Ace attack (The Throw,
  // 2026-09-16): a warm near-black, laid over the whole table at up to
  // two-thirds strength with a pool of light left on her pile. Warm so
  // the redwood reads as the same wood in shadow rather than going
  // grey. Ground, never state — the dim says nothing on its own; the
  // glow and the sights on her pile say where to act.
  shade:       '#0E0704',
  // ── Scrap paper stock, 2026-09-13 ──────────────────────────
  // A card in your HAND is crisp `frost` cream. A card in a SCRAPS
  // pile is torn, weathered stock — and the two piles print on two
  // different papers, which is what carries ownership now that the
  // coloured box around each pile is gone. `stockPale` is a
  // bleached scrap (yours), `stockKraft` a browner one (hers).
  //
  // Both print the SAME near-black `ink`: 9.49:1 and 7.90:1, so
  // both clear AAA with room to spare. That single-ink fact is
  // why the suits could go — `emberInk` red measured 3.72:1 on a
  // weathered stock and failed AA outright, and a red pip was the
  // only thing that ever needed a second ink.
  //
  // The two differ in WARMTH, not lightness (38°/32% vs 28°/44%),
  // so the pair survives colourblindness and greyscale: it reads
  // as two papers, never as two colour codes.
  stockPale:   '#D1C1A5',
  stockKraft:  '#D1AB89',
};
// FOUR families, not five, since 2026-09-13. `card` was Baloo 2 — a
// soft rounded face chosen back when a rank was a 20px corner index.
// A rank is now a numeral filling the card, printed on torn stock, so
// it went to Rye: the same western wood type already on the wordmark.
// `title` and `card` are deliberately the SAME string rather than one
// aliasing the other, so a future change to either does not silently
// drag the other with it. Baloo 2 has no consumers and is no longer
// vendored — see tools/fetch-fonts.mjs.
export const F = {
  title:   "'Rye', serif",
  display: "'Fjalla One', sans-serif",
  card:    "'Rye', serif",
  ui:      "'Work Sans', sans-serif",
  mono:    "'IBM Plex Mono', monospace",
};
export const WIN_SCORE = 10;
