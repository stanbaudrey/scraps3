---
target: SCRAPS Forest Dusk reskin
total_score: 18
max_score: 20
na_heuristics: 3,5,7,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-26T03-19-30Z
slug: scraps-forest-dusk-reskin
---
Method: dual-agent (A: a3f44930dd72cffa9 · B: a32e80fb3738c949c)

## Gut Check Verdict

Yes — the brighter/higher-contrast pass fixed "bland" without tipping back into neon. Every accent stayed inside the warm pine/ember/gold family rather than reaching for saturated primaries. One real bug surfaced: the new card-back outline frame and ambient sun/river glow used `DS.voltage` and `DS.gold` — tokens this file's own header reserves as "yours only" and "milestone only" — on a neutral, owner-agnostic surface (opponent's hand, deck, discard). Fixed same session: outline → `slate`, sun/river → `ember`.

## Heuristic Scores (heuristics touched by this pass only; rest n/a — not in scope for a gut check)

| # | Heuristic | Score | Key Finding |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Score numbers, deck/discard counts, round-progress strip all read cleanly at a glance |
| 2 | Match System / Real World | 3 | Ridgeline/sun card-back metaphor stays coherent |
| 4 | Consistency and Standards | 2→4 (after fix) | Card-back frame reused the "yours only" token on the opponent's hand — fixed same session |
| 6 | Recognition Rather Than Recall | 4 | Higher-contrast badges/borders make hand strength and ownership easier to scan |
| 8 | Aesthetic and Minimalist Design | 3 | Three fonts + three swirl layers + thicker borders is more texture, but reads as one hero font + two workhorses, not clutter |
| **Total** | | **18/20** (5 applicable) | **Good** |

## Design Specificity

**Design review:** backdrop discipline confirmed — `SwirlBg` only renders on splash/difficulty/lose screens, never behind actual gameplay (verified: `GameScreen.jsx` never imports it), so the "distracting behind gameplay" risk doesn't apply. Gold discipline holds for interactive chrome (both `variant="gold"` buttons are the Play Ace actions) — the violation was isolated to the decorative card-back SVG, now fixed.

**Deterministic scan:** CLI detector unchanged from the prior baseline — 18 `bounce-easing` findings, same files, same lines, nothing new. The live in-DOM scan caught two categories the static scan can't see: `radial-spotlight-glow` (the three new animated backdrop layers, working as designed) and `dark-glow` (zero-offset glows on the brightened voltage/ember, a known and accepted stylistic choice from the prior critique pass, more visible now that the colors are brighter).

**Contrast verification (live-measured, not just calculated):** slate ranges 5.48:1 (against duskLight, hardest pairing) to 7.55:1 (against dusk) — AA-clear everywhere, AAA only on the two easier backgrounds. voltage and gold both clear 10:1+ (AAA). Ember lands at 6.71:1 — comfortably past AA, just short of AAA's 7:1 floor, a hue-brightness tradeoff rather than an oversight. The theme.js comment claiming a flat "6.5-7.6:1" range for slate was corrected to reflect the real 5.48-7.55:1 spread.

**Backdrop performance:** confirmed by direct read of the actual CSS keyframes (not assumption) — `swirlFlowA/B/C` animate only `opacity` and `transform`, nothing that forces a repaint. No dropped-frame or repaint warnings surfaced in the console while it ran.

## What's Working

1. Backdrop only appears where it can't compete with gameplay — a design decision that held up under direct verification, not just intent.
2. Score numbers and hand-ownership badges are now unambiguous at a glance, a direct result of the contrast pass.
3. The gold-for-milestones rule held for every interactive element; the one place it slipped was a decorative illustration, not the UI itself, and it's fixed.

## Priority Issues

**[P1 — FIXED] Card-back color-semantics violation.** `cards.jsx`'s `CardBackSVG` used `DS.voltage` for its outline frame and `DS.gold` for the sun/river glow, rendering on every face-down card including the opponent's hand, the deck, and the discard pile — directly contradicting the file's own documented rule that voltage means "yours only" and gold means "milestone only." Fixed: outline → `slate` (also removes a redundant second border color, since `PlayingCard`'s own div border already uses slate), sun/river → `ember`.

**[P3] Font tokens bypassed in `RoundInterstitial` and `flight.jsx`.** Both hardcoded font-family strings instead of importing `F.display`/`F.card`/`F.ui` from theme.js — the same "same value, three places" pattern already fixed for colors in Session 1, now recurring for fonts. Fixed same session: both now import and use the tokens.

**[P3] Ambient sun/river glow was gold, general UI, everywhere.** Same root cause as the P1 above but lower-severity — folded into the same fix (moved to ember).

## Minor Observations

- The wordmark's gold-then-fern "A" letter accent has no in-fiction tie to the Ace mechanic — harmless, previously flagged, not re-litigated here.
- `DiscardPile` and `DeckPile` share `CardBackSVG`, so the P1 fix applies to all three call sites automatically, not just the fanned hand.

## Questions to Consider

1. Now that the backdrop never appears during actual play, is the three-layer animated version worth its complexity for that limited a footprint, or would a simpler single-layer version read the same on the two screens it's actually seen on?
