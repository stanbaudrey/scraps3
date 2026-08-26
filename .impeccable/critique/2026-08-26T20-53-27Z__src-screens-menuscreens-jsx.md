---
timestamp: 2026-08-26T20-53-27Z
slug: src-screens-menuscreens-jsx
---
# Critique — SCRAPS splash + difficulty picker

Target: src/screens/MenuScreens.jsx (with src/components/backdrop.jsx and the
.scraps-*/.t3d/.shiny/.pick-box CSS in index.html)
Provenance: two isolated sub-agents (A design review, B detector + browser
evidence), synthesized in parent. Not degraded.
Occasion: pre-preview gate on the splash-identity session (subtitle, wordmark
motion, shine border). Commit dd9a22b on `dev`.

## Design specificity verdict

**Palette and type are specific; the motion is borrowed and the layout is a
template.** What only this product could justify: Bungee Shade as a layered,
dimensional wordmark face, the pine/parchment/fern palette, and the fern-green
**A** in SCRAPS, which lands because the Ace is the game's weapon. Everything
else transfers unchanged to a hiking app or a podcast: centered hero stack,
decorative glyph row, oversized wordmark, one-line tagline, one pill button,
animated gradient blobs.

The three effects added this session do not improve that. A letter-by-letter
breathe, a 3D barrel roll and a travelling border shine are general web-effect
vocabulary, and two are ports of Magic UI components by the code's own
comments. None of them says cards, dealing, hidden information or bluffing.
The open question carried forward: a riffle for the idle motion, a card flip
for the tap, a deal for the picker's arm would cost the same zero dependencies
and produce motion no other product could use.

## Heuristic scores (splash + picker as a pair)

| # | Heuristic | Score |
|---|---|---|
| 1 | Visibility of system status | 2 |
| 2 | Match with the real world | 2 |
| 3 | User control and freedom | 1 |
| 4 | Consistency and standards | 2 |
| 5 | Error prevention | 3 |
| 6 | Recognition over recall | 2 |
| 7 | Flexibility and efficiency | 1 |
| 8 | Aesthetic and minimalist design | 3 |
| 9 | Error recovery | n/a |
| 10 | Help and documentation | 1 |

Audit dimensions, run separately: A11y 2, Performance 3, Responsive 4,
Theming 4, Implementation integrity 3 = **16/20 Good**.

## Confirmed defects introduced this session

1. **P1 — PLAY clips below the fold in landscape.** Verified in the parent
   context on the deployed preview at 844x390: button bottom edge y=392 in a
   390px viewport, document height 416, page becomes scrollable. Cause is the
   new subtitle plus its `marginBottom:30` stacking on the wordmark's
   `clamp(26px,6vw,36px)`, neither of which knows viewport height. Fix: `vh`
   terms in both gaps.
2. **P1 — the shine border paints gold on general UI.** `index.html`'s
   `.shiny::before` gradient uses `var(--gold)`, and `theme.js:19-22` reserves
   gold for milestones only (Full Scrap, win screen, playing your own Ace),
   never general UI. The difficulty picker is the most general UI in the game.
   This is the same reserved-token class of bug the card back hit twice in the
   reskin session. Fix: `var(--frost)` or `var(--voltageHover)`.
3. **P2 — the wordmark selects and extracts as `SSCCRRAAPPSS`.** `aria-hidden`
   on the back faces correctly gives assistive tech "SCRAPS", but it does not
   remove text content, so copy-paste and `get_page_text` see every glyph
   twice. Fix: move the back face's glyph into a CSS pseudo-element and add
   `user-select: none`.
4. **P2 — the shine animates `background-position`, a paint property,
   forever.** Two masked border rings repaint every frame indefinitely;
   `will-change` cannot help because it only promotes compositable properties.
   `backdrop.jsx:11-16` documents this exact bug class causing real hover lag
   in an earlier version, reintroduced two files over. Fix: static masked ring
   with a rotating gradient inside it (`transform`, compositor-safe) — which
   also reads as a glint travelling the border rather than a wash pooling in
   the corners.
5. **P2 — `perspective: 900px` is fixed while flip depth is `0.5em`.** At the
   54px mobile wordmark the depth-to-perspective ratio is 3% versus 8% on
   desktop, so the barrel roll reads as a vertical squash on exactly the
   devices it was built for. The permanent `translateZ(0.5em)` on the front
   face also inflates the painted wordmark ~3% mobile / ~9% desktop, so the
   `clamp()` does not describe the rendered size. Fix: `perspective: 5em`.

## Pre-existing, carried forward (Session 5 scope)

- **Keyboard and AT access.** Splash and picker each expose zero focusable
  elements; `.pick-box` are divs with onClick; `buttons.jsx:12` sets
  `outline:'none'` with no `:focus-visible` replacement anywhere. Fix path:
  make `.pick-box` a `<button>` with `disabled={!armed}` instead of the
  `pointer-events:none` gate, plus one global `:focus-visible` rule.
- **No headings anywhere on either screen**, so the wordmark contributes
  nothing structural and the picker never names the choice.
- **`.pick-box.armed:hover`'s `transform: scale(1.015)` is dead code** —
  `panelUnfold` fills a `transform` and a filling animation outranks author
  declarations, so the lift renders only under reduced motion, where the
  animation is removed. Fix: drop the redundant `transform: scaleY(1)` from
  the keyframe's 100%. (Reported by Assessment A; not independently
  re-verified in the parent.)
- **The 720ms arm lock is invisible while it runs** — clicks are silently
  swallowed with no cue; `armFlash` announces arming only after the fact.
- **Picker copy is in-game jargon** ("weaponizes Aces", "sacrifice small hands
  to win Scraps") for anyone who tapped Skip.
- **HARD renders in fern (voltage = "yours")** when ember is the committed
  opponent/danger colour, on the screen where you choose an opponent.
- **Suits row is monochrome sage**; the palette assigns ember to red suits.
- **Splash timing runs backwards** — PLAY appears at 0.6s, subtitle at 0.7s,
  the wordmark's last letter at 1.05s. The CTA arrives before the thing it
  responds to.
- **On mobile the biggest tappable object is the wordmark**, and tapping it
  yields a flourish rather than the game.
- **Two one-shot `fadeUp` animations survive `prefers-reduced-motion`**;
  documented as Session 5's scope.
- **Reduced motion leaves the shine frozen** mid-gradient rather than clean.

## Strengths

- The `ARM_MS` lock: a real failure mode named, a threshold chosen with a
  stated reason, and the reasoning documented in the file.
- The wordmark's three-layer transform ownership. Stress-tested at letter
  boundaries and in the 4px gaps: no oscillation, flicker or dropout, because
  the padding push grows the box symmetrically so the cursor never leaves the
  box it just enlarged.
- Contrast throughout: picker labels 8.49:1, descriptions 8.0:1, subtitle
  9.53:1, PLAY label 10.01:1. AAA on a dark theme.
- No horizontal overflow at 1280 or 375, zero console errors, all touch
  targets past 44x44.
