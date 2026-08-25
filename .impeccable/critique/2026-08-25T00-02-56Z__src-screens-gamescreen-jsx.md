---
target: src/screens/GameScreen.jsx
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-25T00-02-56Z
slug: src-screens-gamescreen-jsx
---
Method: dual-agent (A: a93a433e9059e5445 · B: a25f7f019c4d6649e)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Phase-keyed hint text, round progress strip, deal wave, score flash narrate state continuously |
| 2 | Match System / Real World | 3 | Card metaphors land; "Scraps"/"Signal" jargon needs the rules panel — which isn't reachable from every mode (see P3) |
| 3 | User Control and Freedom | 2 | No undo after a Trade In or Signal commits; Reveal Hands has no cancel once clicked |
| 4 | Consistency and Standards | 3 | Ownership color logic (voltage=you, ember=opponent) is disciplined throughout, but the `warning` button variant renders as voltage, not a warning color |
| 5 | Error Prevention | 3 | Over-limit trade caught pre-commit with a clear message; no confirmation before Ace-targeting locks in |
| 6 | Recognition Rather Than Recall | 3 | Only legal actions ever render as buttons; but hint text is the only "why," and it's prose written for someone who already knows the vocabulary |
| 7 | Flexibility and Efficiency | 2 | No keyboard path anywhere in gameplay (not just menus — card selection itself is click-only); no skip on repeat-viewed animations |
| 8 | Aesthetic and Minimalist Design | 3 | Disciplined 2-accent-color system, but the action zone is visually undersized for how much it's responsible for on Ace turns |
| 9 | Error Recovery | 3 | SkipTurnModal/AceCounterModal explain forced moves in plain language; no undo if a misclick trades the wrong cards |
| 10 | Help and Documentation | 3 | RulesModal is thorough, but the `?` access button is gated to `mode==='jump'` only — unreachable mid-game in other modes |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** Genuinely authored for this game, not category-interchangeable. The deck/discard-as-physical-origin-point discipline (every card animation launches from `deckRef`'s actual screen position), the strict top=opponent/bottom=you convention, and the badge system that only fires on a genuine upgrade (never a lateral reshuffle) all read as a team that has iterated on this screen specifically, not a first pass at "a card game UI."

**Deterministic scan:** 19 findings, all `warning` severity, detector running in DEGRADED mode (missing HTML parser deps — no computed-contrast or selector checks ran, so this is a floor, not a ceiling). 17 are `bounce-easing` (cubic-bezier springy overshoot) spread across GameScreen.jsx, cards.jsx, overlays.jsx, and hud.jsx — confirming Assessment A's independent P1 finding rather than surfacing something new. The other 2 are `overused-font` (Space Grotesk — flag noted, see below) and `dark-glow` (a zero-offset voltage box-shadow in index.html), neither called out by Assessment A's holistic pass. No findings in buttons.jsx, icons.jsx, or flight.jsx. No clear false positives — all 19 are genuine pattern matches, not pre-existing exceptions being mistakenly flagged.

**Note on Space Grotesk:** per your standing instruction, flagging this explicitly — it's the project's current UI font and a commonly-seen AI-generated-UI default. Not fixed here; worth a second look whenever Session 5's audit gets to typography.

**Browser evidence:** confirms the menu-`<div>`s issue is inconsistent, not uniform — the Rules screen's own "Back"/"Play" buttons ARE real `<button>` elements (focusable), while the difficulty picker's "EASY"/"HARD"/"Back" are plain `generic` divs even though one of them shares a label with a real button elsewhere. And the accessibility gap extends past the menus: in an actual game, only "Trade In" and "?" expose as focusable — the fanned hand cards themselves have no `role`, `tabIndex`, or keyboard handler, so a keyboard/switch-device player cannot play a single hand once a game starts, not just navigate to one.

## Overall Impression

This is a screen with real craft underneath it — the physical-origin animation discipline and restrained badge system are the kind of details that don't happen by accident. The biggest gap isn't taste, it's that nothing is skippable or undoable: every trade, deal, and reveal runs the same 700–1500ms forced animation regardless of stakes, which is charming once and mechanical by round 6 of an 11-point game. The second gap is that "click-only" goes deeper than the already-tracked menu-div issue — it reaches into actual card selection during play, which is a full gameplay blocker for keyboard/switch users, not a navigation inconvenience.

## What's Working

1. **Deck-as-origin-point discipline** — every flying card launches from the deck's real screen position (`deckRef`), which makes the table feel physically coherent in a way most web card games (fade-in only) don't bother with.
2. **Noise-suppressed badges** — `ZoneBadge`/`HandUpgradeBadge` fire only on a genuine hand upgrade, never on a lateral reshuffle or downgrade. Restraint like that is easy to skip and easy to notice when it's missing.
3. **Disciplined color-as-ownership logic** — voltage=yours/act-now, ember=opponent/danger, applied consistently across cards, buttons, and Scraps zones with no inversions found.

## Priority Issues

**[P1] Nothing is skippable.** `dealWave`, `executeTrade`, and the AI-turn effect chain each run 3–5 sequential `setTimeout`s, several at 700–1500ms, with no shortcut. Over an 11-point game this is dozens of forced waits, and it's the reason the emotional pacing goes flat between peaks (round 1 and round 10 at 10-9 feel identical). **Fix:** a second tap on an in-progress zone snaps the animation to its end state (a standard "tap to skip"), or trim chained delays 30-40% globally. **Suggested command:** `/impeccable animate`.

**[P1] Bounce/elastic easing is the default everywhere, including on failure states.** Detector-confirmed 17 instances of `cubic-bezier(.34, 1.2–1.8, .64, 1)` across 4 files. The over-limit trade error (GameScreen.jsx:817) uses the *same* springy overshoot as a celebratory pop-in — an error and a win currently move identically. "Tense" wants a harder, less-bouncy signature reserved for danger/failure and for the Ace strike specifically (the game's one moment of real aggression), not uniform bounce on everything. **Fix:** sharper ease-out/linear on error and Ace-strip states; keep the bounce for genuine wins. **Suggested command:** `/impeccable animate`.

**[P1] Click-only interaction reaches into actual gameplay, not just menus.** Confirmed live: only "Trade In" and "?" expose as focusable during a game. `FannedHand` cards, `HorizontalScrapsZone` cards, and Ace-target cards have no `role`, `tabIndex`, or keyboard handler (cards.jsx ~186, ~393). A keyboard or switch-device player can reach the table but cannot play a single hand. **Fix:** this needs to be explicit scope for Session 5's accessibility pass, not folded silently under "fix the menu divs" — it's a bigger lift (keyboard selection model for a card fan, not just semantic buttons). **Suggested command:** `/impeccable adapt` or fold into the planned Session 5 accessibility work.

**[P2] The action zone is undersized for its responsibility.** A `maxWidth:760` translucent panel (GameScreen.jsx:804-811) holds hint text plus up to 3 buttons — the busiest UI on screen during an Ace turn — with no visual weight advantage (no heavier border/glow) over the neutral Scraps zone beside it. **Fix:** give it a stronger visual anchor proportional to its role as command center. **Suggested command:** `/impeccable layout`.

**[P2] `warning` button variant doesn't read as a warning.** It renders as a voltage outline (buttons.jsx:22,62) — same visual family as `primary`/`green`. A genuinely consequential action (discarding from Scraps) doesn't look more consequential than "Trade In." **Fix:** reserve an ember-adjacent visual language for discard/removal-flavored actions. **Suggested command:** `/impeccable colorize`.

**[P3] In-game rules access is gated to one mode.** The `?` button (GameScreen.jsx:973-978) only renders when `mode==='jump'`. A player in any other mode who forgets a rule mid-game has no way to check without abandoning the round. **Fix:** expose the same affordance in every mode. **Suggested command:** `/impeccable clarify`.

## Persona Red Flags

**Jordan (First-Timer):** The hint band is the only explanation of what's happening each phase, written for someone who already knows the vocabulary ("Signal locked," "Scraps overflow," "forced Ace"). Outside the scripted tutorial, there's no glossary one tap away — and per the P3 above, sometimes no rules access at all mid-game. The Ace-counter decision is presented as a binary choice with no "here's what happens either way" comparison.

**Sam (Accessibility-Dependent):** Beyond the already-tracked non-focusable menu divs — confirmed live that the menu-div pattern is *inconsistent* (Rules screen's Back/Play are real buttons; difficulty picker's Easy/Hard/Back are not) — actual card selection during play is also keyboard-inaccessible. This is the P1 above: a full gameplay blocker, not a navigation inconvenience.

## Minor Observations

- `DS.voltageHover`/`DS.emberHover` (added this session) are only consumed via inline `el.style.background=` mutations in buttons.jsx, not through the token system elsewhere — a small crack in the "just consolidated" palette.
- The bottom log bar's tap-to-expand affordance has only a small chevron icon as its cue — likely undiscovered by most players.
- `RevealOverlay`'s losing-hand cards dim via `brightness(0.35) saturate(0.3)` — nice touch, but may drop ember/red-suit contrast below comfortable legibility at that brightness.
- Confirmed live: at 375×812 (a normal mobile size, not just a short desktop window), the fanned hand and Scraps piles clip on **both axes** — cards cut off top/bottom and left/right, distinct from the height-driven clipping Session 1 fixed. This is real evidence for Session 3's existing scope, not a regression from this session's work — Session 1 was verified fixed at 1280×650/720 (a short-but-wide desktop case); the narrow-width case is a separate, already-planned fix.

## Questions to Consider

1. If every trade, deal, and reveal takes 1-2+ seconds of mandatory animation, has anyone timed how long a full match to 11 actually takes versus how long it feels like it should take?
2. Should the Ace mechanic — the game's one moment of real aggression — get a harder, faster, un-bouncy motion signature so it reads as a strike rather than another springy pop-in?
3. Is "scrappy" served by the interface being this uniformly polished and springy, or would occasional rougher motion (an imperfect landing, an overshoot-then-settle reserved for drama beats) sell the tone better than bounce-everywhere?
