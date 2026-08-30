---
target: the SCRAPS game table (src/screens/GameScreen.jsx)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-30T05-54-58Z
slug: src-screens-gamescreen-jsx
---
# Critique — the SCRAPS game table

Target: `src/screens/GameScreen.jsx` and everything it composes (`cards.jsx`,
`overlays.jsx`, `hud.jsx`, `buttons.jsx`, `flight.jsx`, `backdrop.jsx`,
`ui/viewport.jsx`, `styles/theme.js`, and the global CSS + keyframes in
`index.html`). Mode: Operate, with a strong Experience component.

Method: dual-agent, two isolated sub-agents (A design review, B detector +
browser evidence), synthesized in the parent. Not degraded.

**Cost adaptation, stated for the record.** A browser evidence pass had already
been run for this audit before the critique started. Assessment A read that
evidence file and the six-viewport screenshots on disk instead of walking the
app again. Assessment B ran the detector fresh and topped up only the
measurements the evidence file did not already answer (painted-colour census,
gradient/pattern/filter/mask inventory, shadow vocabulary, focus-ring pass,
synthetic-bold audit) against a real Chrome on the dev server via Playwright,
with transitions killed and a forced reflow before every geometry read. Neither
agent repeated the full six-viewport walk. The responsive harness, the
27-pairing contrast audit and the 1920 table geometry are carried forward from
that pass, not re-measured.

Occasion: the owner's question — *"I mapped a forest-y brand guide, but ended up
with a game that looks like boring cards on a felt table. Should I deepen the
forest or replace it?"* Read-only run; nothing was edited.

## Design health score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 4 | Narrator, round strip, live counters, two `aria-live` regions. Only gap: ~2.9s of opponent turn with no progress signal. |
| 2 | Match system / real world | 3 | Difficulty copy ("Rarely weaponizes Aces") is in-game jargon shown before the player has met an Ace. |
| 3 | User control and freedom | 2 | Within-turn control is good (deselect, cancel, counter-or-allow). Match-level control does not exist: no quit, no pause, no mute, no undo. |
| 4 | Consistency and standards | 2 | Scraps-pile card borders encode *suit colour* with the same two tokens the zone border uses for *ownership* (`cards.jsx:163`). |
| 5 | Error prevention | 4 | Best system in the project. Over-limit shown before the click, illegal signals struck through, ineligible cards dimmed, 720ms arm lock. |
| 6 | Recognition rather than recall | 3 | `Trade 2 -> Draw 3` on the button is right; the house rule lives only in a modal that truncates on a phone. |
| 7 | Flexibility and efficiency | 2 | Keyboard play now works end to end (9 tab stops, all with rings) — up from the last run. Still one pace, no skip, no mute, no speed control. |
| 8 | Aesthetic and minimalist design | 2 | Hierarchy inverted: the instruction paragraph is the largest bright object on the table, and the surface under it has one gradient and no other treatment. |
| 9 | Error recovery | 3 | `errRise` in ember without bounce is correct; it auto-clears at 2600ms whether read or not, and takes the narrator's slot with it. |
| 10 | Help and documentation | 3 | Rules modal is well written and always reachable; on a phone it cuts at rule 4 of 6 with no affordance. |
| **Total** | | **28/40** | **Good** (bottom edge) |

No heuristic scored `n/a` — the table exercises all ten. Assessment A arrived at
28/40 independently by a different route.

### Audit dimensions

| Dimension | Score | Basis |
|---|---|---|
| Accessibility | 3 | 9 tab stops, all matching `:focus-visible` with a 3px voltage ring; cards are `role="button"` + `aria-label` + `aria-pressed`; two live regions; 27 contrast pairings all AA-clear. Deductions: focus rings occluded by fan `zIndex` stacking, synthetic bold on every heading, rules modal truncation with no affordance. |
| Performance | 3 | Zero runtime deps, compositor-only animations, nothing pathological. 268KB JS uncompressed, 380KB of self-hosted woff2 across 14 files, 37KB HTML with all CSS inlined by design. |
| Responsive | 4 | Harness clean at all six viewports — no document scroll, no inner scrollers, nothing painted outside, no enabled control under 44px on its short axis. FitBox scale 0.9952 at 1920. Genuinely rare. |
| Theming | 2 | 12 of 13 painted colours are DS tokens. Against that: pure black leaking in as 9 unset SVG fills, four non-token confetti colours on the win screen (`overlays.jsx:252,345`), `duskLight` painted nowhere flat, voltage and ember carrying two meanings at once, and the `canopy` fence keeping the identity token off every player-facing surface. |
| Implementation integrity | 3 | Pure engine/reducer, FLIP motion, seeded audio with per-cue trims, generated fonts and share assets with drift checks, 37 tests. Deductions: `CLAUDE.md` now carries at least two stale claims, and this audit's own evidence file carried a third. |
| **Total** | **15/20** | **Good** |

## Design specificity verdict

### The element sort

**(a) Could only belong to SCRAPS — three objects, all small.** The Scraps zone
(bordered pile, `2/7` counter, live `HIGH CARD` badge inside the border — the
7-cap and the public pile are this game's rules made visible). The Play Ace tag,
which rides on the card it spends and leans with the fan. The round strip
`HAND 1 1PT · HAND 2 1PT · SCRAPS 2PTS`.

**(b) Transfers unchanged to any card game — roughly twenty objects.** The card
face (cream rectangle, radius 12, 6px ink border, one top-left index, Unicode
`♠♥♦♣` straight out of `engine.js:11`). The fan. Deck and discard with mono
`DECK · 38` labels. The narrator panel. `OPP`/`YOU` corner scores. The `EASY`
pill. `FIRST TO 10 · WIN BY 2`. The log bar. The `?` disc. Every motion in the
game. And the entire audio material set, which includes a material literally
named `felt` (`audio.js:154`), played on transfer, round loss and game loss.

**(c) Transfers unchanged to a hiking or wellness app — every atmospheric
decision.** The palette, all of it: deep pine, warm ember, parchment, gold,
sage-grey is a national-park poster palette. Fjalla One is park-signage
condensed. `CardBackSVG` is a literal outdoors illustration. The table ground is
a two-stop green wash any wellness app would use as a hero background.

Three (a), about twenty (b), and every atmospheric decision (c).

### The measurement that settles it

Assessment B counted what is actually painted on the table at 1920, in a real
browser with transitions killed:

- **One gradient**, total: `radial-gradient(at 50% 40%, #26392F, #141F19)` at `GameScreen.jsx:1146`.
- **Zero** non-gradient background images, **zero** filters, **zero**
  backdrop-filters, **zero** masks, **zero** blend modes, **zero** text-shadows,
  **zero** SVG gradients, patterns, filters or clip-paths. Every SVG on the
  table is flat-filled with one token colour.
- **Five live `box-shadow` values, and three of them are the same shadow** —
  identical `0 4px` offset, blur 14 to 18, alpha 0.45 to 0.55, zero spread
  throughout, 17 elements between them. There is one elevation step, not a scale.
- 13 distinct colours painted, 12 of them DS tokens. `duskLight` appears nowhere
  as a flat colour. The 13th is pure black, arriving as 9 SVG fills where `fill`
  is simply unset.

**Both assessments independently corrected the evidence file on the same point,
and I verified it by grep: `SwirlBg` is not rendered on the table.** Its four
call sites are `MenuScreens.jsx:32` and `:89`, `Walkthrough.jsx:337`, and
`overlays.jsx:464` — the LoseScreen. The splash, the picker, the walkthrough and
the *losing* screen all get moving colour. The table, where the player spends
essentially all their time, gets a static two-stop gradient. The table is
flatter than the audit's own evidence claimed.

### The splash conclusion does not hold here

The previous critique of the splash concluded *"palette and type are specific;
the motion is borrowed and the layout is a template."* On the table only the
last clause survives.

- **Palette flips from strength to liability.** Same tokens, opposite result. On
  the splash the palette had a wordmark and empty space to be a poster with. On
  the table it has 52 playing cards laid on it, and "card table" wins the
  reading. The palette is specific to a genre — outdoors — never to SCRAPS.
- **Type is nearly absent.** Bungee Shade, the most ownable asset in the
  project, appears on zero pixels of the table. The only branded face here is
  Fjalla One on two score numerals and the hand-name badges — and those two
  numerals are rendering in synthetic bold (see P1 below).
- **Motion is not borrowed here, it is missing.** The splash at least had three
  animating gradient layers. The table has an inert one.
- **Layout is a template** — still true, now a card-game template rather than a
  landing-page one.

### Deterministic scan

`detect.mjs` over `GameScreen.jsx`, `src/components`, `src/ui` and `index.html`:
**exit 2, 14 findings across 2 rules.** All 14 fall inside the two classes
triaged in an earlier pass as the game's committed identity: 13 `bounce-easing`
and 1 `dark-glow` (the zero-offset voltage shadow, `index.html:443,454,472,499`).
The prior pass recorded 16; the current set is 14.

One honest scope note rather than a re-litigation: **4 of the 13 bounce hits are
not winning moments.** `cards.jsx:187` (select-lift), `:344` (fan position),
`:629` (pile lift) and `GameScreen.jsx:976` (narrator `popIn`) are routine
every-interaction motion. If the earlier triage was scoped to "winning moments,"
those four sit outside it. The codebase clearly does distinguish — `overlays.jsx:108`
defines `SETTLE = cubic-bezier(.22,1,.36,1)` with no overshoot and `:204` selects
between the two curves by outcome — so this is a scope question, not a defect.

No detector finding fired for file length, table composition, touch targets or
deck composition.

### Visual overlays

No user-visible overlay was produced. Browser work went through the Playwright
MCP server rather than the harness's own injection flow, because the in-app pane
suspends `setTimeout` and cannot get past the difficulty picker's 720ms arm lock
to reach the table at all. The fallback signal is the CLI scan above plus the
measured browser evidence; the six-viewport screenshots on disk stand in for the
visual pass.

## Overall impression

The mechanics of this table are better than the surface it is played on. Error
prevention, ownership mapping and the Play Ace tag are genuinely good design,
and the responsive behaviour is the best-executed system in the project. But the
play surface has no treatment of any kind. One gradient, one elevation step, no
texture, no pattern, no atmosphere layer, no branded typeface. Green is doing a
hundred percent of the identity work, and green underneath playing cards resolves
to "felt table" every single time.

That is the whole answer to why it looks like boring cards on felt. It is not
that the forest was the wrong direction. It is that the forest was applied as a
palette swap and never as a world, and the two objects that could contradict the
felt reading are both fenced off from the player: the ridgeline illustration
only appears on card *backs*, and `theme.js:19-22` rules that `canopy` — the
token actually carrying the identity — is "not UI chrome." The theme cannot land
while that rule stands.

The single biggest opportunity is the play surface itself, and it costs zero
layout height, zero dependencies and zero new files.

## What's working

**Error prevention is best-in-class and it teaches rather than blocks.**
`TradeInBtn` shows `Hand would be 6/7` in ember *before* the click and stays
clickable on purpose, so pressing it explains the rule instead of merely
refusing. `SignalLegalityStrip` strikes through the shapes your hand cannot
make, turning a disabled control into an explanation. Ineligible Scraps cards
render dimmed from the same flag that drives the handler. In a game with a house
rule nobody has seen before, converting dead ends into lessons is exactly right.

**Ownership mapping is absolute and survives every layout.** Top is theirs,
bottom is yours, in the wide table and the stacked one, at every viewport. Each
Scraps zone carries its own label, counter and hand badge inside or directly
under its own border. On a table with two hands, two piles, two scores and two
badges, that one rule is why nothing is ambiguous — and it is why the phone
layout reads as well as the desktop one.

**The Play Ace tag is interaction design no other card game has.** Moving it out
of the central button row onto the card it spends does three jobs at once: an
optional strike stops reading as the expected next move, the specific card being
consumed is named, and the tag leans with the fan so it reads as attached rather
than floating. `AceDrawnLightbox` even renders the same object as a static
illustration (`live={false}`) to teach its shape before you meet it live. This
is the kind of object the rest of the table needs more of.

## Priority issues

### [P0] The play surface has no treatment at all

**What.** `GameScreen.jsx:1146` paints the entire table with a two-stop radial
gradient and nothing else. `SwirlBg`, the project's only atmospheric device, is
on the splash, the picker, the walkthrough and the LoseScreen — never here. The
measured inventory is one gradient, one elevation step repeated 17 times, and
zero patterns, filters, masks, blend modes, text-shadows or SVG paint servers.
The screen the player spends nearly all their time on is the least designed
surface in the project.

**Why it matters.** This is the direct cause of the felt reading, and it is why
"change the colour" would not help. A flat dark field with cream cards on it
*is* a card table; that is what the arrangement means regardless of hue. Nothing
on the table contradicts it, because the two things that could — the ridgeline
and `canopy` — are hidden on card backs and fenced out of UI by token rule.

**Fix.** Three static, zero-layout-cost changes in one commit: a full-bleed
inline-SVG ridge layer at `zIndex:0` inside `FitBox` (three receding ridges in
`CardBackSVG`'s own path language, `canopy` at 8-12% alpha, horizon sitting
behind the narrator, `position:absolute; inset:0; pointerEvents:none`); an SVG
`<pattern>` stipple of canopy at 4-6% for grain, because felt is smooth and moss
and bark are not; and move the gradient's warm point from `50% 40%` to `50% 88%`
so it reads as firelight at the player's end of a clearing rather than a lamp
over a card table. All three are static, so `prefers-reduced-motion` needs
nothing. Amend the `theme.js:19-22` canopy rule in the same commit, from "never
UI chrome" to "may carry ground, may never carry state."

**Suggested command:** `/impeccable bolder`, then `/impeccable colorize`.

### [P1] Voltage and ember mean two different things at once inside the Scraps piles

**What.** `cards.jsx:163` gives every unselected Scraps card a `4px solid ember`
border if its suit is red and `4px solid voltage` if black. The zone border two
pixels away uses those exact two tokens for ownership. Visible in the 1280
screenshot: `OPP SCRAPS` is an ember box containing a voltage-bordered J♠;
`YOUR SCRAPS` is a voltage box containing an ember-bordered 5♥.

**Why it matters.** The entire table is built on ember = theirs, voltage =
yours, and it is the reason nothing else is ambiguous. `theme.js` documents
ember doing double duty for red suits but never grants voltage the same licence.
A first-timer reading colour as ownership sees enemy cards sitting in their own
pile.

**Fix.** Drop the token borders from Scraps card faces entirely and let the ink
fill plus the printed `emberInk` rank carry suit colour, exactly as the cream
hand cards already do. If the pile needs edge definition, use `slate` at low
alpha — a neutral, which is precisely what the face-down back already does, for
the reason its own comment states.

**Suggested command:** `/impeccable colorize`.

### [P1] Every heading in the game renders in synthetic bold

**What.** Fjalla One declares **400 only** — verified in the generated
`@font-face` block, and it is a single-weight family upstream. **19 of the 28
`F.display` sites in `src/` request weight 600 or 700.** On the table that is
the OPP and YOU score numerals (`hud.jsx:100`, 44px at desktop) — the largest
numerals on screen. Everywhere else it is every round interstitial, every
win/lose heading, FULL SCRAP, and every modal title. Separately, the `?` help
button (`GameScreen.jsx:1289`) requests Work Sans 900 against a family declaring
up to 700; that one has been open since Session 6.

**Why it matters.** Synthetic bold is the browser smearing a 400 face sideways.
Stems thicken unevenly, counters fill in, and the result is subtly mushy at every
size and obviously so at 44px. This is the branded typeface, on the game's
loudest moments, rendering as a fake. It also undercuts every other identity
move: sharpening the type makes everything else look more deliberate for free.

**Fix.** Drop the weight requests on `F.display` to 400 and let the condensed
face do the work — Fjalla One has no heavier cut to vendor. If those headings
then read too light, that is a size and letter-spacing decision, not a weight
one. Same for the `?` button: 700, not 900. This is a find-and-replace, and it
should land before any of the atmosphere work, because it changes how every
subsequent screenshot reads.

**Suggested command:** `/impeccable typeset`.

### [P1] There is no way to leave, pause, or mute a match

**What.** `onExit` is passed into `GameScreen` at `:61` and called only from the
win and lose screens (`:872-876`). Verified by grep: no quit, no restart, no
back-to-menu, no pause, and no volume or mute control anywhere in `src/`. The
`?` opens rules and privacy only.

**Why it matters.** Tapping HARD by accident commits you to a full match to 10,
win by 2. There is also no way to silence a game that synthesises audio on every
card tap and a five-second fanfare on a win — a real problem for a game people
will open on a phone in public. Reloading is the only exit and it destroys the
round.

**Fix.** A ghost disc in the bottom bar beside `?`, opening a two-item sheet:
*Quit to menu* behind a confirm (the round genuinely is unrecoverable), and
*Sound on/off* as a module-level gain flag in `audio.js` persisted next to
`scraps-stats-v1`. Both fit the existing 44px floor and the bottom-bar pattern
already there.

**Suggested command:** `/impeccable harden`.

### [P2] The narrator outranks the cards, permanently

**What.** `GameScreen.jsx:947-971` renders a 760px panel at 25px Work Sans 700,
running three lines at 1920, restating the same instruction every player turn for
the whole match. In the desktop screenshot it is unambiguously the largest and
brightest object on the table.

**Why it matters.** The hierarchy is inverted — the thing you read once outranks
the thing you act on every turn, and the table reads as "instructions with some
cards around them." It also occupies the exact centre of the composition, which
is where the P0 atmosphere wants room to breathe. The score numerals were
already cut from 60 to 44 for this same reason; the narrator never got the same
treatment.

**Fix.** Two tiers. Full text on the first player turn of a match and whenever
the phase genuinely changes; after that collapse to the short form — `Select
cards to trade` — at 17px, with the full text available on tap. Drop the resting
size from 25 to 19 and let the *button* be the brightest thing in that band.
This also frees roughly 40px of height, which the stacked layout will spend on
scale.

**Suggested command:** `/impeccable layout`, then `/impeccable clarify`.

## Persona red flags

**Jordan (confused first-timer)** fails three times in sequence. The difficulty
copy — "Rarely weaponizes Aces", "Will sacrifice small hands to win Scraps" —
uses four game terms Jordan has not met, and anyone who tapped SKIP on the
walkthrough gets it cold. On the table, the two colours that mean "yours" and
"theirs" appear reversed inside the Scraps piles. And the rules modal, opened on
a phone, ends mid-sentence before "Flushes are never allowed" — so Jordan can
lose the Scraps hand to a house rule they were never shown, on a reveal screen
that gives no context about the round still being live.

**Alex (impatient power user)** loses roughly 25 seconds per round to opponent
turns at one fixed speed. Each is about 2.9s — 120ms flight settle, an 800ms
wave, an 800ms pause, a 700ms lift, then a 2100ms advance
(`GameScreen.jsx:567-640`). The skip handler at `:806` only binds while
`animating` is true, so it drops in-flight ghosts and touches none of those
scheduled pauses, and nothing on screen ever mentions it exists. There is no way
to quit and start a faster match. `RoundInterstitial` adds a two-second
full-screen flash nobody can dismiss.

**Sam (screen reader, keyboard-only, low vision)** is better served than most of
this list — two polite live regions, real `disabled` attributes, `aria-pressed`
on cards, and a measured 9-for-9 pass on visible focus rings at 3px voltage.
Three residual failures. Fan wrappers carry `zIndex:i` (`cards.jsx:335`), so card
*n*'s focus ring is painted over by card *n+1*, which overlaps it by roughly 46px
at desktop size. The `?` help control renders in synthetic bold, a legibility hit
precisely on the help affordance. And on Stan's own Mac two settings are in play
worth naming unprompted: Reduce Transparency kills the narrator panel's
`rgba(20,31,25,0.7)` fill, so the object holding the composition together loses
its separation from the ground; and his "Larger Text" resolution puts him in the
stacked layout on a 16-inch desktop, where the table is FitBox-scaled and every
44px control renders smaller than 44.

## Minor observations

- **[P2] The rules modal truncates on a phone, hiding the two rules that define
  the game.** `overlays.jsx:695` sets `maxHeight:'min(88vh,88dvh)'` with
  `overflowY:auto` — a documented, correct exception to the never-scroll rule.
  But the iPhone 14 shot cuts mid-sentence at rule 4 of 6 with no fade, no
  visible scrollbar and no chevron. Rule 5 is "Flushes are never allowed", the
  house rule the whole engine is built around; rule 6 is FULL SCRAP, the 5-point
  event. Fix: reorder so those two land in the first three items, and add a
  bottom fade plus a `1-4 of 6` count. The existing `::-webkit-scrollbar` rule
  styles an 8px thumb, but iOS overlay scrollbars are invisible at rest, so the
  fade is doing the real work. This was a close call for the priority list.
- `RevealOverlay`'s `Continue →` is a voltage button (`overlays.jsx:232`) — the
  "yours / act now" token — on the screen that just announced "OPPONENT WINS."
  Colour and message contradict each other at the most loaded moment on the table.
- Losing the Scraps hand is the game's weakest moment. Nothing on that overlay
  says the round is not over, that the two small hands were worth 2 of the
  round's 4 points, or where the match now stands. A 2-point hand reads as
  terminal when it is not.
- Four non-token colours ship on the win screen: `overlays.jsx:252,345` hardcode
  `#fff`, `#F2A68C`, `#D9CB6B` and `#B8874A` in the firework palettes. Small, but
  it is the game's peak moment and the only place raw hex survives in `src/`.
- `tradeError` auto-clears at 2600ms and shares the narrator's slot, so a slow
  reader loses both the error and the instruction it replaced.
- `MAT.felt` (`audio.js:154`) plays on transfer, round loss and game loss. The
  game literally sounds like a felt table. Worth asking whether the sound
  direction ever received the forest brief.
- **`CLAUDE.md` has drifted in at least two places.** It says menu options are
  `<div>`s that browser automation cannot find by role — measured, they are
  `<button class="pick-box">`, focusable and correctly announced, replaced on
  2026-08-27 per `index.html:397-400`. It also says the palette lives in three
  places with `flight.jsx` hardcoding every hex — `flight.jsx` now imports and
  renders real `PlayingCard`s and contains no hex at all. Both notes will send a
  future session chasing fixed problems.

## Questions to consider

1. `theme.js:19-22` fences `canopy` out of all UI chrome. That rule was written
   to protect the palette. Is it now the single line of code preventing the
   forest from existing?
2. If a stranger saw one screenshot of this table with the wordmark cropped out,
   what would they name the game? If the honest answer is "some poker thing,"
   which change flips that fastest — and is it the suits?
3. `CardBackSVG` is the best-drawn object in the project, and the player never
   holds one. What is the argument for keeping the game's only illustration on
   the surfaces you look at least?
4. The opponent's turn is roughly a third of elapsed play and the emptiest the
   screen ever gets. Is that a pacing problem, or the stage the atmosphere has
   been waiting for?
5. Bungee Shade is the most ownable asset in the project and appears on zero
   pixels of the table. What would it cost to let it carry `BEGIN ROUND N` and
   `FULL SCRAP!` — two full-screen, transient moments where a display face
   cannot compete with card legibility?

## Deepen or replace

**Deepen. Replacing the palette would change nothing, because the palette is not
the problem — the thinness is.**

The argument is a measurement, not a taste call. The table has one gradient, one
elevation step, and zero of every other surface treatment a browser can paint.
Applied at that depth, *any* world produces the same result: a blue table with
one gradient and one shadow reads as blue felt. Swapping hue re-buys the
identical problem and throws away the two things that are working — a palette
with 27 pairings clear of AA, and a genuinely good illustration in `CardBackSVG`.

Ranked by leverage, all zero-dependency, all inline SVG or CSS, none costing
layout height:

1. **Fix the synthetic bold first** (P1 above). It is a find-and-replace, and it
   changes how every subsequent screenshot reads. Do it before judging anything
   else.
2. **Give the table a horizon.** A full-bleed static SVG ridge layer behind the
   play area. A horizon is the one thing felt structurally cannot have. Static,
   so reduced motion needs no counterpart.
3. **Move the ridgeline onto the card faces.** A ghosted ridge silhouette at 5-7%
   canopy across the bottom third of the cream face, inside `PlayingCard`'s
   existing `overflow:hidden`. Two lines. Now every card in your hand carries the
   world, instead of the world living only on cards you never hold.
4. **Amend the canopy fence** from "never UI chrome" to "may carry ground, never
   state." Without this the other moves are illegal under the project's own
   token law.
5. **Make the suits forest.** `SUITS = ['♠','♥','♦','♣']` at `engine.js:11` is a
   display glyph that happens also to be the model. Keep the model; swap the
   rendered mark for four inline SVGs — spade to pine, club to trefoil leaf,
   heart to river stone, diamond to ember. Keep the red/black split so poker
   reading survives. This is the single change that would make a screenshot of
   this game unmistakable, and it carries the only real risk on this list:
   first-run legibility. Keep the silhouettes close to the originals, and show
   the standard glyph in the reveal overlay.
6. **Put Bungee Shade on the table.** `BEGIN ROUND N` and `FULL SCRAP!` are
   full-screen and transient — the two places a display face can carry weight
   without competing with card legibility. The project's most ownable asset
   currently appears on zero pixels of the game.
7. **Get `felt` out of the sound.** Replace `MAT.felt` with a `loam` profile
   (same modal shape, lower Q, faster damping) and add `stone` for the Ace
   strike. Then re-measure every changed cue's `TRIM` — the file's own gotcha
   says nothing will warn you, and the first port of this kit landed nine of
   thirteen cues off target.
8. **Give the opponent's turn the atmosphere.** It is a third of elapsed play and
   the emptiest the screen ever gets. Let the ridge parallax a few pixels and the
   low warm glow breathe, on the opponent's turn only. Reduced-motion
   counterpart: the ridge holds still; the card wave and "Opponent is thinking..."
   already carry the state, so nothing is lost.

What **not** to do: no table rail, no vignette tied to the play area, no felt
texture. Those all push toward the thing you are trying to escape.
