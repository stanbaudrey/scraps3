---
target: SCRAPS Forest Dusk reskin
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-25T23-30-06Z
slug: scraps-forest-dusk-reskin
---
Method: dual-agent (A: a03f73319d9d7e960 · B: ad38a1ce4f0bdfe33)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Hint banner narrates every phase; live best-hand badges; round progress strip |
| 2 | Match System / Real World | 3 | Poker vocabulary reads clearly; domain terms (Signal, Scraps) taught up front |
| 3 | User Control and Freedom | 3 | Cancel exists in Ace mode and scraps-discard mode; trades are irreversible by design (genre-appropriate) |
| 4 | Consistency and Standards | 3 | Color system is disciplined everywhere except the splash wordmark's gold "A" |
| 5 | Error Prevention | 3 | Over-limit trade blocked in real time with a specific, visible message + sound |
| 6 | Recognition Rather Than Recall | 3 | Ownership/position never varies; the trade-value table isn't visible during the decision itself |
| 7 | Flexibility and Efficiency | 1 | No way to skip or speed up AI-turn timers (1.4-4s per turn, every turn, across an 11-point game) |
| 8 | Aesthetic and Minimalist Design | 4 | Restrained, single accent color reserved for peaks — genuinely well executed |
| 9 | Error Recovery | 3 | Over-limit and no-legal-trade states explain themselves clearly |
| 10 | Help and Documentation | 3 | Rules modal is one tap away and concise |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** Grounded, not generic. The gold-only-for-milestones rule, the ownership-by-position convention (opponent always top, you always bottom), and the deck-as-physical-origin animation choreography are all built around this game's actual mechanics (hidden hands, a raidable public pile, Aces as weapons) — none of it is a reskinned template.

**Deterministic scan:** The static CLI scan found one antipattern category across 18 sites: `bounce-easing` (overshoot `cubic-bezier` timing), spread across overlays.jsx (8), cards.jsx (3), hud.jsx (2), GameScreen.jsx (2), backdrop.jsx (1) — a pre-existing motion choice across the whole game, not introduced this session. Spot-checking two sites (the card-lift on selection, the score-flash pulse) found single-overshoot curves, not multi-oscillation "elastic" bounces — closer to a restrained pop than the cartoonish spring the rule is really aimed at. Real findings, low-confidence severity.

The live in-browser scan (script-injected into the actual DOM, not just source text) surfaced a category the static scan and the LLM review both missed: repeated zero-offset colored glow effects (`box-shadow`/`text-shadow` with no offset) on gold, fern, ember, and canopy — on the splash screen, the rules panel, and throughout the table. This is a direct carry-over from the original neon-arcade design language, applied to the new palette without re-examining whether a "painterly, atmospheric" brief still wants an electric-glow treatment. Not wrong on its face — it still reads as intentional emphasis — but it's an unexamined inheritance worth a deliberate yes/no rather than default continuation.

The live scan also caught two concrete, measured problems neither the static scan nor the LLM review's source-reading pass surfaced with numbers: a failing-contrast pairing and a clipped-overflow container (folded into Priority Issues below).

## Overall Impression

The color and motif discipline this session set out to build is actually there in the code, not just the brief — gold really is rare, the card back really is quiet, the physical-origin animation really does sell "real card table." The two real gaps are both about the edges of the viewport, not the palette: content clips with no recovery in more than one place, and the same clipping risk hits the highest-frequency payoff moment (the round reveal) specifically.

## What's Working

1. **Gold-as-milestone discipline** — verified in theme.js, buttons.jsx, and overlays.jsx: gold appears only at Full Scrap, the win screen, and the Ace button, exactly as the brief specified. That restraint is what makes the win screen land as a peak instead of more of the same.
2. **Physical-origin animation** — every traded or drawn card visibly travels from an actual deck/hand position (flight.jsx), tied directly to the trade-in mechanic rather than decoration for its own sake.
3. **CardBackSVG** — a quiet, bespoke ridgeline illustration that doesn't compete with gameplay, matching its own stated intent.

## Priority Issues

**[P1] Your own Scraps pile can clip off-screen with no way to see it.** Verified live at 5 cards and again at 7 (the cap): the rightmost card's rank is cut at the container edge, which sets `overflowX:'hidden'` with no scroll fallback. The live detector independently flagged a clipped-overflow container on this same table view. This hides information the player actually needs — their own best-hand tracking, and what the opponent can raid. **Fix:** wrap to a second row before the edge, or drop the horizontal overflow lock on `HorizontalScrapsZone`. **Suggested command:** `/impeccable adapt`

**[P1] Secondary text fails AA contrast, confirmed two ways.** `slate` (`#7C8873`) on `duskMid` (`#1E2C24`) measures 3.9:1 — both my own calculation and the live in-DOM detector landed on the same number independently — and the same slate against `duskLight` (`#26392F`) is worse, at 3.3:1. Both need 4.5:1 for normal text. This affects round-progress-strip labels and panel body text. It was already marginal on the old palette (~4.4:1) so it's not a new problem, but it's now clearly measured and clearly failing rather than borderline. **Fix:** lighten `slate` a step, or add a dedicated mid-tone token for text specifically (vs. borders, where the current value is fine). **Suggested command:** `/impeccable audit` (already scoped) → `/impeccable polish`

**[P2] The round-result reveal — the game's most frequent "did I win" moment — overflows at short viewport heights**, burying the Continue button below a blind scroll and letting background text ghost through the semi-opaque scrim. Same root cause as the documented full-page clipping issue, but this instance hits the payoff moment specifically, which raises the stakes of getting it right. **Fix:** cap `RevealOverlay`'s content height or make its own scroll region visible rather than silent. **Suggested command:** `/impeccable adapt`

**[P2] No affordance signals that scrolling is possible when content clips.** Confirmed live: at a short viewport, the player's own hand renders fully off-screen with zero visual cue (no scrollbar hint, no arrow) that scrolling reveals it — turning a layout bug into a discoverability failure on top of it. **Fix:** a persistent scroll-shadow or arrow cue on any clippable container. **Suggested command:** `/impeccable adapt`

**[P3] Unexamined glow-effect carry-over from the neon-arcade original.** Caught by the live detector, not the source read: zero-offset colored box/text-shadow glows on gold, fern, ember, and canopy persist unchanged across the splash, rules, and table screens. Worth a deliberate call — keep it because it still reads as confident emphasis, or soften it because "painterly and atmospheric" was the explicit brief and a hard electric glow is the opposite instinct. **Suggested command:** `/impeccable quieter` (if softening) or note as intentional (if keeping)

*Resolved during this same session, no longer open:* the splash-screen straight-selection ambiguity from duplicate ranks (a symptom of the old two-deck rule) — the single-deck balance fix from the separately-run Session 2 merged into this same branch moments before this critique, and removes duplicate ranks entirely.

## Persona Red Flags

**Alex (Power User):** every AI turn runs a fixed, un-skippable 1.4-4s timer sequence (wave animation → "Opponent is thinking…" → flight arcs), repeated dozens of times across an 11-point win-by-2 game, with no fast-forward.

**Jordan (First-Timer):** the trade-value table (Ace = 3 draws, 10-K = 2, others = 1) lives only in the Rules modal — nothing in the action zone recalls it at the actual moment of a trade decision.

**Sam (Accessibility-Dependent):** the splash and difficulty-picker options (`.menu-opt`/`.diff-opt`) are plain `<div>`s with no role, tabIndex, or keyboard handler, confirmed in MenuScreens.jsx — this blocks Sam on the very first screen, not partway through. (Pre-existing and already tracked for Session 5 — flagged here because it's the literal first thing a keyboard/screen-reader user hits.)

## Minor Observations

- The "?" rules button is ~28x28px, under the ~44px touch-target guideline.
- The splash wordmark's glowing gold "A" is a nice nod to the Ace mechanic, but technically breaks the theme's own "gold is milestone-only" rule — worth a deliberate carve-out note rather than an accidental exception.
- The log strip's progressive disclosure (latest line visible, tap for full history) works well and wasn't flagged anywhere.

## Questions to Consider

1. The splash wordmark's gold "A" is the one place gold appears outside an actual milestone — keep it as a documented exception, or move it to fern for total consistency?
2. Now that the two-deck ambiguity is gone (Session 2's single-deck fix), is there anything else in the visual language that was quietly compensating for double-density decks and could be simplified?
3. The glow effects are a direct holdover from the neon original — does "painterly and atmospheric" actually want that electric quality, or was it carried forward on autopilot?
