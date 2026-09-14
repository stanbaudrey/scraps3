---
target: the on-table interstitials (interstitials.jsx, splash subtitle, share card)
total_score: 26
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 1
timestamp: 2026-09-14T19-51-24Z
slug: src-components-interstitials-jsx
---
Method: dual-agent (A: design-review sub-agent · B: detector/browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | The opaque stage hides round progress, FIRST TO 10 and the match-point banner; "Hand 1" of which round is not on screen |
| 2 | Match System / Real World | 4 | Slap, sweep, sawdust, letter cards all read as a table; "OPP" by the score vs "OPPONENT" above the cards |
| 3 | User Control and Freedom | 2 | A tap during the round sweep is ignored; a tap at rest on a match-ending reveal is swallowed for the 1s jump hold |
| 4 | Consistency and Standards | 3 | Score geometry flips from OPP-left/YOU-right to winner-first and unlabelled on FINAL SCORE; the share card sets its verdict in Rye |
| 5 | Error Prevention | 3 | Nothing destructive under the whole-viewport tap; the swallowed sweep tap teaches "taps don't work" a beat before the sign |
| 6 | Recognition Rather Than Recall | 3 | A hand's value (1 vs 2) is never stated, only implied by the roll; FINAL SCORE has no labels |
| 7 | Flexibility and Efficiency | 2 | Un-skippable 1.7s sweep + 1.35s sign is a per-round tax; a Clean Sweep needs three taps |
| 8 | Aesthetic and Minimalist Design | 3 | One layer, no scrims, one quiet button; the loss screen states one fact three times |
| 9 | Error Recovery | 3 | Share failure is announced to screen readers only; the visible button stays SHARE |
| 10 | Help and Documentation | n/a | An interstitial between hands is not a documentation surface |
| **Total** | | **26/36** | **Good (72%)** |

## Design Specificity Verdict

LLM assessment: authored for this product down to the cards, with a seam below them. The upper two thirds of every scene are unmistakably SCRAPS (the live table's own boards, the game's pale and kraft stock, a 2px board shiver and sawdust per slap, the discard's own rightward toss as the exit, Rye wood type, a verdict spelled in letter cards, period card included). Below the cards it turns generic: a Fjalla-caps verdict with a coloured glow text-shadow is any mobile card game's toast, the score row is the HUD dropped onto the stage, the match screen's lower half (mono FINAL SCORE, a trophy pill, two rounded buttons) is a web-app stats panel, and the share card is a flat cream rectangle rather than one of the game's cards.

Deterministic scan: 3 findings in the three new files, all `bounce-easing`, all in interstitials.jsx. Two are the project's documented house curve gated to good news (the OVER constant on the player's roll and verdict; the ROUND sign mirroring the wordmark's own entrance) and are false positives. One is real: the CLEAN SWEEP title at line 819 uses the celebratory 1.6 overshoot whoever swept, so the opponent's Clean Sweep gets the same letter drop as yours, only in ember. Runtime overlay (headless, three bench cases): 22 further bounce hits, every one from the card selection transition in cards.jsx:523, pre-existing and out of scope; the table's lantern radial glow and the ember/gold text-shadows on the verdict and final score, all the game's own tokens.

Visual overlays: run headless only; no human-visible overlay was produced.

## Overall Impression

The material system holds across five scenes and the sweep-into-sign hand-off is the best move in the game. The single biggest opportunity is the bottom third of every screen: the score is the one place a point lands and it is the quietest thing on the stage, and the loss ending is longer and louder than the win.

## What's Working

- The sweep is the discard toss: same rightward spin, band shadow first, delays set by real screen position, handing off to ROUND N on the same boards with no cut. A lost round is cleared rather than dismissed.
- The loser arrives without ceremony and the winner slaps; hierarchy is carried by order and physics (shiver, sawdust, cue at landing), not by type size.
- Dimmed non-scoring cards on the Scraps reveal teach hand evaluation for free, the strongest rules-legibility move in the game.

## Priority Issues

- [P1] Keyboard focus falls through the opaque stage. The game root under TableStage is never made inert; when the match screen replaces the reveal the quiet button unmounts, focus drops to body, the dialog's Tab trap no longer sees keydown, and the next Tab lands on the HUD's ?/♪/⏏ under the wood. Nothing focuses NEW GAME when it appears. Why: a keyboard or screen-reader player cannot reliably reach NEW GAME/SHARE at the end and can fire invisible controls. Fix: `inert` on the game root while `stage` is set; focus the New Game button in the `final` effect; `tabIndex={-1}` on the quiet button while hidden. Command: /impeccable harden.
- [P2] The round sweep cannot be skipped and the tap that tries is swallowed; a tap at rest on a match-ending reveal is swallowed for the jump hold. Why: taps read as unreliable one beat before the sign where they work, and the tax is 15 to 20 seconds a match; state is already committed so nothing is at risk. Fix: a tap during `sweep` clears timers and calls `onSwept()` at once; a tap during the jump hold goes straight to the sweep. Command: /impeccable animate.
- [P2] The score is the quietest thing on the screen and loses its labels at the end. OPP/YOU are 15px slate labels outside 44px numerals; a hand's value is never stated; FINAL SCORE drops labels and flips to winner-first. Fix: a "+1"/"+2" ghost rising off the winning numeral on tick; keep the reveal's OPP-left/YOU-right geometry (or labels) on FINAL SCORE. Command: /impeccable clarify.
- [P2] Celebratory weight lands on bad news. OPPONENT / WINS. takes ~3.35s to deal and flip against ~2.1s for YOU WIN, then "Opponent wins." repeats the cards verbatim and a frost 10–4 follows: three statements, the longest ceremony in the game, no re-frame. The opponent's CLEAN SWEEP title uses the 1.6 overshoot letter drop. Fix: deal and flip both rows in parallel with a 120ms row offset; give the line a job the cards cannot do ("Opponent wins. By 6."); SETTLE-eased letters when `aiSweep`. Command: /impeccable animate.
- [P2] The Clean Sweep is never taught and the beat names its price, not the feat. The storyboard lists 1/1/2 points and never a sweep; the line under CLEAN SWEEP reads "+1 BONUS POINT". Fix: the line reads "ALL THREE HANDS · +1". Command: /impeccable clarify.

## Persona Red Flags

- Jordan (first-timer): CLEAN SWEEP with no prior teaching; FINAL SCORE 10–6 unlabelled and side-flipped from the row he just read; TAP TO CONTINUE is a 13px caption with no ring in pointer play; "Hand 1" with no round number; OPP by the score, OPPONENT above the cards.
- Sam (screen reader, keyboard, low vision): the focus fall-through above; the live status names the winner and hand but never the score change; the sign's dealer line is in no live region and auto-advances at 1.35s; the control's name is an instruction ("Tap to continue"); SKIP at opacity .55 on timber estimates near 4.3:1, under AA for 13px (measure it).
- Casey (one-handed phone): whole-viewport tap is right; the swallowed sweep tap and jump hold hit reflex tappers hardest; at rest nothing nudges her back; NEW GAME/SHARE land mid-screen at 390 wide, reachable.
- Alex (power user): un-skippable sweep, three taps through a Clean Sweep with the sweep still running, no escalation at match point, SKIP redundant with tap-anywhere on a 1.35s screen.

## Minor Observations

- The share card's verdict is Rye text, which is not on theme.js's six-consumer list; the card is not a SCRAPS card (no ridge, ink border or torn edge); the sentence names her "Scraps" while the card says OPPONENT.
- The NEW BEST MARGIN pill and mono FINAL SCORE are web-app idiom on a picnic table.
- The verdict's 0 0 24px glow text-shadow is the last neon trace; the sign's hard 0 3px 0 drop sits on wood better.
- The dim on non-scoring Scraps cards turns both stocks into neutral grey slabs; dim toward the wood so a dead card is still paper in shadow.
- Share failure has no visible state.
- The splash subtitle's 0.14em tracking on a sentence-case line reads as a caption (compare 0.06em).
- The tie is the one scene with no authored move: a silent, motionless TIE in slate.
- The bonus roll can carry a score to 11 or 12 past a first-to-10 finish; a taste call worth making deliberately.

## Questions to Consider

- What if the score were the verdict? The winning numeral slapping down as a card on the wood would let the glowing headline go.
- What if the loss were deliberately shorter than the win, with NEW GAME under the thumb first?
- What if match point lived on the stage? A face-down card beside the score at 9, or ROUND 6 · MATCH POINT on the sign.
