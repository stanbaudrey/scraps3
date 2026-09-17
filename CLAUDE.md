# SCRAPS

A two-player card game against an AI opponent, played in the browser. Each
round runs two private "hands" (worth 1 point each) plus one public
"Scraps" hand (worth 2). You scrap cards from your hidden hand into your
face-up Scraps pile to draw fresh cards, and both piles cap at 7. Aces are a
weapon: attack with one to discard two cards from the opponent's Scraps pile,
and she can counter with an Ace of her own. First to 10. Winning
both hands *and* the Scraps hand is a CLEAN SWEEP, worth 5.

**The vocabulary was settled on 2026-09-13** and the words above are the
only ones the game uses. A private pile is a **hand**, never a "small
hand". Moving cards into Scraps is to **scrap** them, never "transfer" or
"trade in". Spending an Ace is to **attack** — the clickable tag over an
Ace says ATTACK and that is Stan's call, made against a spec that proposed
BURN; **the word "burn" appears nowhere in this project and should not be
reintroduced**. And `discard` names exactly one thing: cards leaving the
table for the discard pile. That covers the Ace's two victims, the over-7
trim and the pile itself — so never write "discard an Ace" to mean
spending one, because the Ace is attacked WITH and only reaches the pile
when it is countered. Winning all three hands is a **CLEAN SWEEP**, which
also collapsed a real split: the same event used to be FULL SCRAP when the
player did it and SWEEP when the AI did.

**Two identifier families were deliberately left on the old vocabulary.**
`hasLegalTrade`, `legalTradeFallback`, `pendingTrade`, `nextPhaseAfterTrade`,
`PLAYER_TRADE_TAKE`, `PLAYER_TRADE_OVERFLOW_START` and `SMALL_HAND_SCORED`
still say trade and small hand. The terminology spec named an explicit
rename list and these were not on it; renaming them reaches into the
engine's AI scoring and the phase machinery for no user-visible gain. They
are a known state, not an oversight — but nothing player-facing may use
those words.

**Cards have no suit.** They carry a rank and an id, and nothing else. That
was the house rule until 2026-09-13 — "flushes are never valid, a suited
straight scores as a plain straight" — and it stopped being a rule the day
the suits were removed, because a flush is now a hand that cannot be dealt
rather than one the engine declines to score. Nothing had to change in the
evaluator to make that true: it always read rank and value only.

## Stack

- Vite 5 + React 18. No router — `App.jsx` swaps between three screens with
  a `useState`.
- **Zero runtime dependencies beyond React.** No animation library, no UI kit,
  no state library. Animation is CSS keyframes plus hand-rolled timers.
- Vitest for tests. **57 tests** cover the engine and the reducer. (It was 37
  until the 2026-08-30 audit-fix pass took it to 53, and later passes to 56;
  the card redesign then removed EIGHT flush tests — the spec estimated six —
  and added five that guard the deck's shape instead, which is the invariant
  that matters now that createDeck() no longer loops over four suits, leaving
  53; the 2026-09-15 Scraps hand-off added the two that cover
  `HANDS_DISCARDED`, and the 2026-09-16 pass two that hold PLAY HAND 2's
  hidden refill to the cards REPLENISH actually deals.)
  `vite.config.js` excludes `.claude/**` from vitest: a git worktree parked
  there is a second full checkout and was getting collected twice, reporting
  111 tests for a project that has 55.
- Fonts are **self-hosted** from `public/fonts` since Session 6 — **four**
  families over **12 files**: **Rye** (the SCRAPS wordmark, the storyboard's
  one HOW TO PLAY title, every card rank — the match screen's letter cards
  included — and, since 2026-09-14, three moments on the table: the ROUND N
  sign, the CLEAN SWEEP beat and the match-winning score as it lands, plus
  the verdict on the share card `share.js` draws; the `F` comment in
  `theme.js` carries that list and it is the rule), Fjalla
  One (headings and subtitles, and the splash subtitle "Poker with both
  hands"), Work Sans (UI), IBM Plex Mono (mono). Rye replaced **Bungee
  Shade** on the wordmark on 2026-09-13 and **Baloo 2** on the card ranks
  later the same day; the `bungee-shade-*` and `baloo-2-*` woff2 files were
  deleted with them and nothing references either family any more. They used to load from
  `fonts.googleapis.com`; nothing in the app reaches off-origin now. The
  `@font-face` rules live between the `FONT-FACE:BEGIN`/`END` sentinels in
  `index.html` and are **generated — never hand-edit them or the files in
  `public/fonts`**. `npm run fonts` rewrites both from Google;
  `npm run fonts:check` exits non-zero if either has drifted. **It owns the
  three `<link rel="preload">` font lines too**, between
  `PRELOAD:BEGIN`/`END` sentinels, driven by `preload: true` in
  `fetch-fonts.mjs`'s SPEC. It did not until 2026-09-14, and the gap
  shipped to production: the preload still pointed at
  `bungee-shade-latin.woff2` after Rye replaced it, so every visitor
  fetched a 404 on the critical path while the font the splash is made of
  went unpreloaded. `fonts:check` was green throughout, because it only
  ever compared the `@font-face` block — and the preload block carried a
  comment saying "never edit by hand" beside three lines nothing
  regenerated. Caught by a real browser on the LIVE url, by no check. The
  authoritative family list is those rules plus the `F` object in
  `src/styles/theme.js`, which must agree; both were named wrongly in this
  file until Session 3 (see PROJECT-BRIEF.md's forest-reskin and specimen
  notes for the two changes that drifted from it).
- Audio is generated live in `src/audio.js` with the Web Audio API. There are
  no audio files in the project and none are needed. The direction is
  **Cardboard & Bone** (Session 4), **amended 2026-09-13** by Stan's picks in
  The Woodshed bench. Everything is still modal synthesis: a seeded noise
  exciter generated as raw sample data in JS, through parallel high-Q
  resonators acting as the body of an object.
  **The rule is now: a physical event is an untuned object, a score outcome
  is a tuned bar.** That is a real change from the old rule, which was the
  flat "no oscillator ever plays a note" — six of the **sixteen** cues are
  now xylophone or marimba bars in G major pentatonic, built by `bar()` from a
  real bar's partials (1 : 3.01 : 6.03 for a xylophone, 1 : 3.99 : 9.18 for a
  marimba — the ratios a genuine undercut arch produces). A xylophone bar is
  still a struck piece of wood, so the direction widened rather than broke.
  `thud` is still the one sine that is NOT a note, a body under an impact.
  Materials are `MAT.wood`, `.woodHi`, `.hollow`, `.dowel`, `.block` and
  `.crate`; `cardstock`, `felt`, `bone` and `friction()` were removed when
  the Woodshed picks left them with no callers, and `boneLow` went with the
  firework pop on 2026-09-14 — there is no bone left in the kit. The two
  cues added that day are `slap` (a winning card landing on the table, thud
  plus block, untuned) and `roundSign` (the ROUND N sign: the splash's old
  square-up phrase, retimed to the sign's letters and routed through TRIM at
  last). **There is no brass anywhere** — the bench offered four brass
  options on every messaging cue and Stan took none. See the file's own header
  and the Gotchas below.
- Asset files in the repo, and there are only two kinds: the **14
  self-hosted `.woff2` fonts** in `public/fonts` (Session 6), and the
  **three share/favicon PNGs plus `favicon.svg`** in `public/`
  (Session 7). Nothing inside the *game* is a file — every graphic it
  draws (card backs, icons, the swirl backdrop) is still SVG written
  inline in JSX, and there is still no audio file anywhere, `audio.js`
  synthesises everything. The Session 7 images are share-surface
  artifacts, not game art, and **none of them is hand-drawn**:
  `tools/make-share-assets.mjs` renders them from the live tokens and
  the live `<title>`, and `npm run share:check` fails if a source moves
  without them being regenerated. Do not edit anything in `public/`
  that `public/share-manifest.json` lists.

## Running locally

```bash
npm install
npm run dev
```

The dev server is pinned to **port 5193** through the project's own launch
config at `.claude/launch.json` (entry `scraps3-dev`, using `--strictPort` so
it fails loudly instead of drifting to another port). Running `npm run dev`
by hand without those flags starts on 5173 instead. A second entry,
`scraps3-dev-alt`, runs the same server on **5194**, for when 5193 is held:
on 2026-09-16 it was a two-day-old Vite server started from a parked
worktree under `.claude/worktrees/`, serving that worktree's stale files.
Check what owns the port (`lsof -nP -iTCP:5193 -sTCP:LISTEN`) before
trusting anything on it, and do not kill it — it may be another session's.
Every harness below takes `PORT=5194`.

```bash
npm test          # vitest, 57 tests, runs in under a second
npm run build     # production bundle into dist/
npm run fonts     # re-vendor public/fonts + rewrite index.html's @font-face
npm run fonts:check   # exit 1 if either has drifted from upstream Google
npm run share         # regenerate og.png, favicons, robots/sitemap/llms.txt
npm run share:check   # exit 1 if any of them no longer match the live sources
```

`share:check` needs no network and no browser — it only re-derives values
and compares — so it is cheap and runs in CI. `npm run share` DOES need a
browser to rasterise with, and finds the copy of Chrome already on the
machine (or `CHROME_PATH`); nothing is added to `package.json` for it. The
generator reads the `<title>` from `index.html` and the tokens from
`theme.js`, and records what it baked into `public/share-manifest.json`, so
a rename or a repaint that forgets to regenerate fails the check by name
rather than shipping a share card for a game that no longer exists. The
card's strapline is read from `TAGLINE` in `src/share.js` — the same
string the splash subtitle and the SHARE sentence use — so the three
cannot drift. (The `<title>` still says "Poker with two hands at once."
rather than the tagline; that is a copy call left for Stan, see Known
issues.)

`tools/trim-measure.mjs` renders every cue in `src/audio.js` offline and
prints the trim each one needs to hit its declared target. It is the method
the audio file's header describes, as a tool rather than a scratch page.
Say which sample rate you ran it at (`RATE=`, default 48000): the exciter
is seeded per sample, so a cue's peak moves with the rate. Both QA tools
and this one take `PORT=` when the launch config's 5193 is busy, and all
three fall back to the Playwright copy in the npx cache when no bare
`playwright` resolves.

`fonts:check` re-downloads from Google and compares, so it needs network and
takes a couple of seconds; it is not part of `npm test`. Run it if you touch
`index.html`'s font block, and before a release.

`tools/responsive-qa.mjs` walks the real app in a headless browser at six
viewports and asserts the Session 3 rule — no document scroll, no inner
scrollers, nothing painted outside the viewport — plus touch-target sizes.
It is **not** part of `npm test`: Playwright is not a dependency of this
project and adding it would be the largest devDependency in the tree by an
order of magnitude. Run it by hand against a dev server, with Playwright
available (a global install is fine):

```bash
npm run dev -- --port 5193 --strictPort
node tools/responsive-qa.mjs after   # screenshots into tools/shots/after/
```

**It waits for the page to stop moving, never for a number of
milliseconds, and that is the whole reason it can be trusted.** Every
assertion it makes reads `getBoundingClientRect`, which returns the
TRANSFORMED box — so a probe that lands during an entrance animation
measures the animation. `popIn` opens at `scale(.5)`, which renders the
Ace explainer's 54px OKAY button as **27**, and at a later frame as 38.
Both are indistinguishable from a control that is genuinely too small,
and both were reported as one for weeks. The harness had a flat 450ms
wait, which covered `popIn`'s own 0.35s but not an overlay that MOUNTS
LATE — the Ace explainer waits for `animating` to clear, so on a long
deal it appears after the wait has elapsed and pops in under the probe.
That is why it only failed on runs where the opening hand held an Ace,
and on a different viewport each time. It now settles on
`document.getAnimations()` (infinite ones excluded, or `cardWiggle`
would hang it), records whether the page was actually still, and says
`(MEASURED WHILE ANIMATING — suspect)` on any failure taken while it
was not. **A check that fails for a reason unrelated to the thing it
watches is worse than no check.**

The same lesson landed a second time, and worse, on 2026-09-15: the walk
had been sitting on the ROUND 1 sign at every viewport since the sign
stopped advancing itself the day before. `dismiss()` looked for
`/^continue/i`, the sign's button says "Tap to continue", and it sits
under the layer's own tap surface so an ordinary click is refused as
intercepted. So `4-table` and `5-after-trade` were both a photograph of
the sign, the trade step found no cards to click, and the run died
thirty seconds later on the rules button the sign was covering — and
`Trade \d`, the button name the trade step looked for, had not existed
since the vocabulary was settled either. It was green on nothing, for a
month. Both are fixed; the walk reaches a real dealt table again and
comes back ALL CLEAR on 54 measured rows across the six viewports.

**And a third time, found 2026-09-16: it still never took a turn.** The
trade step's card selector was `[data-card-id][role="button"]`, which asks
for both attributes on ONE element — but `data-card-id` is on the card and
`role="button"` on the fan slot wrapping it, so it matched nothing, and
`5-after-trade` was the same photograph as `4-table` at every viewport.
It is `[role="button"][aria-pressed]:has([data-card-id])` now, and it
WAITS for the SCRAP button rather than counting it, because the band's
buttons only arrive once the deal has landed. Checked by looking: the
laptop walk now scraps a card, watches her turn, and comes back to "Your
turn. Scrap cards." **Before trusting this harness, open `4-table` and
`5-after-trade` side by side. If they match, it measured nothing.**

`tools/overlay-targets.mjs` is the companion, and it exists because the
harness above walks a REAL game: it only reaches a modal the random deal
happens to open. The Ace explainer had therefore never been measured
deliberately, and the reveal, Clean Sweep, win and lose screens never at
all. This one mounts each overlay in the real `Shell` via
`tools/bench/overlay-targets.html` and measures every button at rest at
all six viewports, on demand. Nothing under `tools/` reaches production —
Vite's only entry is `index.html`.

```bash
node tools/overlay-targets.mjs   # needs the same dev server on 5193
```

Its seven cases since 2026-09-14 are `reveal`, `scraps`, `matchWin`,
`matchLoss` and `sign` (the real `TableStage`, mounted with `instant` so
each scene sits on its resting frame; add `&live=1` to run the
choreography instead) plus `aceDrawn` and `aceCounter`. The bench page
itself carries more cases than the harness measures — `sweepWin`,
`sweepLoss`, `tie`, `aceCounter2`, `aiCounterNotice`, `oppAceReveal(2)`,
and since 2026-09-16 `signMP` (her on 9), `mp9` and `mp8` for the MATCH
POINT rule — and it records which way out a scene took in
`window.__calls` (`continue`, `swept`, `signDone`, `newGame`), which is
the only way to check from a script that a tap on the wood does NOT
continue past Hand 1. **The bench page
borrows `index.html`'s whole `<style>` block at load**, because every
keyframe, the fonts and `.sr-only` live there and a second HTML page
gets none of them — the first frames off this bench showed fallback
serifs, no motion and screen-reader text painted on screen, and any new
page under `tools/` wants the same fetch.

Measured 2026-09-14 after the interstitials pass and its critique fixes:
**no button renders under 44px on any portrait or desktop viewport.** Two
fall short on landscape phone only, inside the accepted landscape trade —
the reveals' quiet Tap to continue at 30 and 33px (its natural 44 under
FitBox scales of 0.674 and 0.756; the whole screen is the tap target, the
button exists for keyboards and screen readers). The match screen's NEW
GAME and SHARE sit outside the scaled column, pinned to the bottom of the
viewport, and render their full 54 everywhere.

**No environment variables are needed** — not for local dev, not for the
build, not at runtime. Nothing in `src/` reads `import.meta.env` or
`process.env`. The `.env.local` file that appeared during setup holds only a
Vercel CLI OIDC token used for deploys; the app never reads it. If a feature
looks broken locally, it is not a missing-secret problem.

## Where things live

- **`src/game/engine.js`** (~750 lines) — pure game rules. Deck (a single
  52-card deck — see Session 2's balance fix in PROJECT-BRIEF.md), shuffling,
  hand evaluation, signal validation, trade legality, and the AI's
  decision-making. No React, no side effects.
- **`src/game/reducer.js`** (~615 lines) — the state machine. One pure reducer
  owns all game state: cards, scores, signals, and the phase. Turn order is
  dealer-aware and the dealer alternates each round; the non-dealer acts
  first. This file's header comment explains the phase vocabulary — read it
  before touching turn flow.
- **`src/screens/GameScreen.jsx`** (~1950 lines) — the table. Holds only
  UI-local state (selections, animation flags, the interstitial `stage`),
  schedules the timers that dispatch actions, and renders. See Known Issues.
- **`src/components/interstitials.jsx`** (2026-09-14) — everything that
  happens ON the table between two hands: `TableStage`, one opaque layer of
  the same redwood, aligned to the live table's boards, holding the ROUND N
  sign, the three reveals, the CLEAN SWEEP beat, the sweep out of a round
  and the whole match screen. Tap anywhere: mid-choreography skips to the
  resting frame, at rest continues; one quiet real button carries Enter and
  screen readers. Built from Stan's picks off the Win bench; read its header
  before touching any beat.
- **`src/share.js`** — the SHARE button's three tiers (share sheet with a
  PNG result card drawn on a canvas, share sheet without files, clipboard
  with a COPIED state), the share sentence, and `TAGLINE`.
- **`src/screens/MenuScreens.jsx`** — the splash (wordmark, the subtitle
  "Play poker with both hands." in Fjalla — back since 2026-09-14 after a
  day away, reworded by Stan later the same day, and the splash alone
  adds the full stop to `TAGLINE` — and one button) and the difficulty
  picker.
  The picker's two panels — and its **BACK** button, added the same day —
  are inert for `ARM_MS` (720ms) after mount so a click-streak carried
  over from the walkthrough can't pick a difficulty by accident. BACK
  returns to the storyboard's LAST beat, which `App.jsx` arranges with
  the `startAt` prop and `LAST_BEAT`.
- **`src/screens/Walkthrough.jsx`** — the four-beat first-run storyboard
  shown between PLAY and the difficulty picker, once per browser session
  (`sessionStorage` key `scraps-walkthrough-seen-v1`, gated in
  `App.jsx`). Static beats; the only motion is the `.wt-wiggle` lean on
  the cards each beat is talking about. **Beat order, set 2026-09-13:**
  the two hands, scrapping to draw, how a round scores, then the Ace —
  mechanics, flow, surprise rule, with the Ace last because it is the
  thing the game turns on. Beat 1 is the only one with a title, and the
  only place other than the wordmark that Rye appears. There is no scripted tutorial
  mode any more — `src/game/tutorial.js` and every `mode === 'tutorial'`
  branch were removed with it, so `buildRoundDeal()` now takes no
  arguments and always deals a straight round.
- **`src/components/`** — `cards.jsx` (fanned hand, Scraps zone; the
  `DeckPile` and `DiscardPile` components were **deleted** 2026-09-13
  when the two piles came off the table), `overlays.jsx` (the modals that
  ask a question, the rules panel, and the `Shell` and `useDialogFocus` they
  share — the round card, the reveal, the Clean Sweep lightbox and the
  win/lose screens with their canvas fireworks were **deleted** 2026-09-14
  in favour of `interstitials.jsx`), `hud.jsx` (scores, round progress,
  game log — `SignalLegalityStrip` was deleted on 2026-09-13; the score
  bars stopped flashing on 2026-09-14 because the reveal now rolls the
  score up itself, and the MATCH POINT banner went the same day: the stage
  covers the HUD exactly when the stakes peak, so the warning lives on the
  ROUND sign and under the reveal's score row now),
  `buttons.jsx`, `icons.jsx` (inline 24×24 SVG set that replaced all emoji),
  `flight.jsx` (card motion), `backdrop.jsx`.
- **`src/ui/viewport.jsx`** — the responsive layer, added in Session 3.
  `FitBox` measures the **content box**, not `clientHeight`: a caller
  that passes padding through `style` (the storyboard does) would
  otherwise be scaled to a box taller than its children actually get,
  and the overflow clipped. Fixed 2026-09-13 after it sliced a line off
  a storyboard beat.
  `useViewport()` is one shared window-size subscription;
  `layoutMode()` picks between the `wide` table (hand centred, Scraps
  beside it) and the `stack`ed one (hand above its own Scraps, full
  width); `<FitBox>` measures what the chosen layout wants and scales
  it to fit. **Nothing in the game scrolls, on any screen** — read the
  file's header before changing any of it.
- **Card motion is FLIP** (`flight.jsx`). Nothing predicts where a card
  is or will be: the state change is committed atomically first, then
  each card's real `getBoundingClientRect` at both ends drives a ghost
  that flies between them while the real card is hidden (`visibility`,
  never `display` — the layout has to survive). Cards register their DOM
  node by id from a **layout** effect, because the motion hook measures
  destinations in its own layout effect and a card moving piles remounts
  under a different parent. Because state is already final, a click or
  Enter can drop every ghost at any moment and the board is correct.
- **`src/game/stats.js`** — win/loss record and best margin per difficulty,
  in `localStorage` under the key `scraps-stats-v1`. All access is
  try/caught, so private-browsing degrades to zeroed stats rather than
  crashing.
- **`src/styles/theme.js`** — the JS design tokens (`DS` colors, `F` fonts,
  `WIN_SCORE`).
- **`index.html`** — more than a mount point. It holds the CSS reset, the
  `.menu-opt` / `.diff-opt` hover classes, and every `@keyframes` animation
  in the game, deliberately inlined in `<head>` so they exist before first
  paint. Its comment calls itself the single source of truth for global CSS.

## Gotchas

- **A card is a rank and an id.** `createDeck()` builds 52 cards as four
  copies of thirteen ranks — the four-fold loop is the SAME loop that used
  to iterate suits, and it is load-bearing for balance (see the next
  entry), so keep it four whatever it counts. There is no `suit` field and
  nothing needs one: evaluation, signals, trades and the AI all read rank
  and value. Two fours are genuinely interchangeable and only `id` tells
  them apart. Card LABELS are one word now ("king", "nine"), and two cards
  in a pile can share one, which is correct.
- **There is ONE ink on a card face.** The two-red-ink system is gone —
  `emberInk` on the pale hand card and `ember` on the dark Scraps card,
  picked by `isRed(suit)`. All four of `isRed`, `cardInk`, `SUIT_NAMES`
  and `inkOverride` were deleted with it. The reason it could go is the
  reason it existed: a red pip was the only thing that ever needed a
  second ink, and `emberInk` measured 3.72:1 on a weathered stock, which
  fails AA. `ink` on either paper stock measures 9.50:1 and 7.91:1.
- **Two paper stocks carry pile ownership, not a border.** `stockPale`
  (bleached, yours) and `stockKraft` (browner, hers). They differ in
  WARMTH rather than lightness, so the pair survives greyscale and
  colourblindness — it reads as two papers, never as two colour codes.
  `PlayingCard` takes a `kraft` boolean; there is no colour prop any more.
- **Card sizes are DERIVED from Rye's metrics, not chosen.** `CARD_DIMS`
  carries `rank` (the numeral's font size), `gx` and `gy` (its origin from
  the card's outer edges), and every one of them falls out of measurements
  taken in a real browser: Q inks to 0.824em right of its origin and
  overhangs its own advance, A inks 0.034em LEFT of its origin, 7 is
  0.041em taller than every other rank, and caps start 0.108em below a
  `line-height:1` box. Guess any of these and it looks perfect on a King
  and clips on the one Queen in the pile. `small` is the one size that does
  NOT take the width-derived maximum — see its comment; the reason is the
  fan, not the card.
- **The "10" is condensed, never shrunk.** `TEN_SQUEEZE = 0.70`, scaled
  from the LEFT so all thirteen ranks share a starting line. Setting a
  two-character rank at a smaller font size makes it read as a different,
  smaller kind of card; this is the specific thing Stan called out.
- **Scraps wear is a pure function of card id, and that is load-bearing
  for MOTION.** `scrapLook(id, aspect)` derives one seeded `wear` scalar
  and drives the tear, stains, foxing, crease, grime, ink fade and lean
  from it, memoised in a module-level Map. Card flight is FLIP — the state
  commits first, then a ghost is measured from the real card at both ends —
  so a card that re-rolled its own shape between renders would shimmer at
  rest and change shape mid-flight. Rotation is DECOUPLED from wear and
  capped at `ROT_MAX = 4`, because a lean that scales with wear collides
  with a numeral that fills the card.
- **`box-shadow` ignores `clip-path`, so a torn card uses `drop-shadow`.**
  An outer box-shadow on a clipped card draws the rectangle the card has
  stopped being. An INSET one is fine and is how the edge grime works,
  because it is painted inside the box and then clipped with everything
  else. The per-card contact shadow is offset LEFT, which is physical
  rather than stylistic: cards lie left to right and each covers the right
  of the one before it, so a leftward shadow draws the seam between them.
- **The zone cue is a filter, not a ring, and `GlowPulse`'s children must
  be cards and only cards.** It applies `drop-shadow` to a wrapper, so the
  glow traces the rendered alpha of whatever is inside — which is how it
  hugs the real torn outlines instead of drawing a rectangle. Putting
  anything else in there (the pooled pile shadow, a background, a caption)
  would be traced too and the cue would go back to being a fuzzy box. The
  pooled shadow is deliberately a SIBLING for exactly this reason.
  `.live-cue-zone` is the reduced-motion static substitute and is
  deliberately heavier than the animation's brightest frame, so it reads
  as unambiguously on rather than as a stopped pulse.
- **The Scraps pile is one size smaller than the hand, for legibility.**
  A 7-card pile divides its width seven ways: at `small` in 340px that
  exposes 40px of an 80px card and a full pile measured as "2 5 7 1 J Q K",
  with the 10 showing as a 1. At `tiny` the same 340px exposes 72% and all
  seven ranks read. Change pile sizes in `SIZES` in `GameScreen.jsx`, never
  inside the zone — `flight.jsx` derives a ghost's landing scale from
  `CARD_DIMS[toSize]`, so a zone rendering a size other than the one it was
  passed would land every flight wrong.
- **One deck now, not two.** `createDeck()` used to build two full 52-card
  decks (104 cards, 8 copies of every rank) — deliberate at the time, but it
  turned out to be why four-of-a-kind Scraps hands came up far more than a
  normal deck would produce (confirmed by simulation in Session 2: quads in
  2.8% of rounds at two decks vs. 0.7% at one). Session 2 switched it back to
  a single 52-card deck to fix that. Cards still carry a unique `id` — no
  longer load-bearing for uniqueness now that rank+suit is unique again, but
  nothing assumes otherwise, so it was left in place rather than ripped out.
- **The audio exciter is seeded, and that is load-bearing.** `noiseBuf` uses
  a deterministic xorshift, not `Math.random()`. A 6ms noise burst exciting a
  Q-26 resonator is a lottery: measured across twenty renders the peak of one
  cue spanned **3.41x**, so the same sound arrived up to three times louder
  than last time. Seeding makes every cue bit-identical, which is also what
  makes `TRIM` measurable. Variety is added deliberately instead — a `seed`
  option gives repeated taps inside one cue their own character. (The
  firework pop, which randomised out loud, went with the fireworks.)
- **`TRIM` is the mix, and it goes stale silently.** Each cue is normalised to
  a declared target peak (`select` .16 up to `cleanSweep` .94) so the cue you
  hear thirty times a game can never be louder than the one you may never
  hear. Raw peaks span 25:1 without it. **If you retune a cue's parameters,
  its trim is wrong until re-measured** — render `renderCue(name, offlineCtx,
  gainAt1, variantIndex)` and divide the target by the peak. Nothing will warn
  you; the first port of this kit carried the design tool's numbers over and
  nine of thirteen cues landed off target, one by 49%. The 2026-09-13 port
  re-measured in headless Chrome instead and all 14 landed within 0.04% —
  **at whatever sample rate that render used, which nobody wrote down.**
  Found 2026-09-14 with `tools/trim-measure.mjs`: the exciter is seeded per
  SAMPLE, so a cue's peak moves with the rate, and the same trims land
  `draw` 18% low at 48 kHz and 4% high at 44.1 kHz. A live `AudioContext`
  runs at the device's rate (this Mac: 48000), so the mix is only ever
  exact on one kind of device. The two new cues were measured at 48 kHz
  and say so; the older trims were left as Stan approved them.
  Two things to know before touching it. `select` and `draw` have 3 and 4
  variants each (see `CUE_VARIANTS`), because they fire in runs and
  bit-identical repeats read as one sample retriggering; measure ALL variants
  and trim by the loudest. And **the targets are PEAK, which under-states how
  loud a ringing bar is**: post-trim, a wood cue's RMS is ~10% of its peak and
  a bar cue's is ~18%, so `handWon` and `invalid` are both declared .34 and do
  not sound equally loud. That is deliberate and documented in the file — if a
  bar cue is hot, lower its TARGET and re-measure, never scale the trim.

- **The reducer is pure on purpose.** Its header notes it replaced an older
  pattern of `setState` nested inside other `setState` updaters, which
  double-fired under React StrictMode and duplicated AI draws and log lines.
  Keep new game logic in the reducer, not in component callbacks, or that
  bug class comes back.
- **The table has no deck and no discard pile** (2026-09-13). Cards deal
  in from OFF the viewport, on the dealer's side — odd rounds the
  opponent deals and they come over the top edge, even rounds you deal
  and they come up past the bottom — and discarded cards spin off the
  RIGHT edge (it was the LEFT until 2026-09-14; the toss rotation
  carries the sign, so the two must move together or a card spins
  against its own travel). The opening deal is all FOURTEEN cards of
  the round, the two that start in each Scraps pile included — measured
  as 14 simultaneous ghosts — dealt SEAT BY SEAT since 2026-09-14
  (Stan): the non-dealer's five hand cards, then that player's two
  Scraps cards, then the dealer's seven the same way. Both anchors are computed rects (`deckAnchor` /
  `discardAnchor` in `GameScreen.jsx`), not measured elements, so there
  is no longer a "no deck to fly from" fallback to worry about. The
  spin is not a new animation: a flight already rotates a card from
  where it sat to its destination's `rot`, so `discardAnchor` just hands
  back a big angle. The live deck COUNT is no longer shown anywhere.
- **The opponent never moves over your cards.** The phase advances the
  instant your trade commits, so `GameScreen` derives `settling`
  (`animating && it-is-now-an-AI-phase`) and holds the table on your
  turn until your cards land. Two separate effects run the AI: a gate
  that waits for `animating` to clear and sets `aiGo`, and a runner that
  depends only on `aiGo`. They are split deliberately — the AI's own
  cards set `animating`, so one combined effect would re-run mid-turn
  and cancel the opponent's move halfway through.
- **Never render a `useCallback` component as `<Foo/>`.** `flight.jsx`
  used to return its overlay that way; the function identity changed
  every render, so React remounted every card in flight and restarted
  its animation. It returns an element now.
- **Timers read state through a ref** (`stateRef` in `GameScreen.jsx`) so a
  timeout scheduled seconds earlier never acts on a stale snapshot. Follow
  that pattern for any new delayed action. Card *sizes* ride the same
  pattern (`szRef`), because a rotation can land between a timer being
  scheduled and it firing.
- **Arrangement and size are two different questions.** `GameScreen`
  derives `stack` (which arrangement) and `tight` (which card sizes and
  how compact the chrome). They usually agree; a landscape phone is the
  case where they don't — it keeps the width-hungry, height-thrifty
  `wide` arrangement *and* the small cards, because 390px of height is
  390px however the bands are ordered.
- **A `<FitBox>` measures its content wrapper, not itself.** The inner
  box is `min-height:100%` so a table with room to spare still spreads
  out, which means its own box never changes size and a ResizeObserver
  on it never fires. Observe the thing that grows.
- **Nothing may depend on hover.** Touch browsers synthesise a
  `mouseenter` on tap and never send the matching `mouseleave`, so the
  last thing tapped keeps its hover look forever. Every JS hover in
  `buttons.jsx` goes through `pressStyles()`, and every CSS `:hover` in
  `index.html` is inside `@media (hover: hover)` with an `:active`
  partner. Use those, don't add a bare `onMouseEnter`.
- **Controls are `TOUCH_MIN` (44px) on their short axis**, or
  `TOUCH_MIN_COMPACT` (54px) in the stacked layout — deliberately
  larger, because that layout is often scaled and 44 × 0.73 is 32.
- **The interstitials are one opaque layer over the live table, and its
  wood is ALIGNED to the table's.** `TableStage` measures the live
  `TableSurface` (through `anchorRef`) and centres its own boards on the
  same point, tall enough to reach both viewport edges — `TableSurface`
  centres its boards in whatever box it gets, so this is what keeps the
  seams from jumping half a board the instant the layer covers the table.
  Verified by frame comparison, stage against table, on 2026-09-14.
  Everything the layer shows is its own copy of the cards; the live bands
  underneath are untouched and stay laid out, so a tap at any moment lands
  on a correct board.
- **Every interstitial entrance keyframe ends on the element's resting
  style, and skipping depends on it.** A tap mid-choreography re-issues
  the entrances at zero duration to land on the resting frame; an entrance
  that ended anywhere else would land it wrong. Skipping is per BEAT
  (`fast.build` / `.beat` / `.end` in `RevealScene`), because a single flag
  flattened the Clean Sweep beat whenever the player had skipped the
  slap-down before it.
- **The Scraps reveal starts the next round itself.** Its `onSwept`
  dispatches `SCRAPS_SCORED` and calls `startNewRound(true)` in one
  handler, so `START_ROUND` lands in the same render and the ROUND N sign
  replaces the swept reveal inside the still-mounted layer. The old
  `round-end` hand-off timer is gone; putting one back would show a frame
  of the OLD round's table between the sweep and the sign, which is the
  cut the redesign exists to remove. A match-ending result dispatches its
  score AT ONCE instead, so `gameOver` records the stats and freezes the
  phase machine while the reveal runs on into the match screen.
- **`playSquareUp` found its home.** The wordmark's old tap-gesture cue
  is now the `roundSign` voice, retimed to the ROUND N sign's letters and
  routed through the bus and TRIM like every other cue. Nothing plays
  straight to `ctx.destination` any more.
- **Never animate a `drop-shadow` between a `color-mix()` colour and a
  plain one.** Chrome interpolates that pair through near-black: the pile
  glow's computed filter read `rgba(7,8,3,.8)` on frames of every cycle,
  and the "act here" cue ringed the pile in dark brown on the way down.
  Measured 2026-09-14 in a standalone page; `rgb(from ...)` fails the same
  way, a hex-with-alpha literal does not. So `GlowPulse` sets the colour at
  each alpha the keyframes need as inline custom properties (`--glow-55`
  and so on) and `zoneGlow` / `zoneGlowStrong` read those. `armFlash`
  (transparent to color-mix) was checked and is fine; the static
  reduced-motion rule keeps its color-mix because nothing interpolates
  there.
- **Nothing on the stage advances itself** except a match-ending reveal
  running on into the match screen. The ROUND N sign and the Clean Sweep
  beat both used to; since 2026-09-14 both land, say "Tap to continue",
  and wait. Every reveal is pressed for too — `autoReveal`, which ran the
  reveal by itself when you signalled into her signal, is gone, and SHOW
  'EM is the whole narrator band in the reveal phase.
- **The Hand 1 reveal is the one stage screen with a named button**
  (2026-09-16, Stan): a green PLAY HAND 2 where the others say "Tap to
  continue". A tap on the wood still skips its build, but at REST only
  the button, or Enter/Space, moves on (`handCta` in `RevealScene`). The
  root's `onClick` calls `onTap()` with no argument on purpose: the key
  path passes `true`, and a click handed straight through would pass its
  event object, which is truthy, and read as a key.
- **PLAY HAND 2 deals the hand, and `replenish` is never rendered.**
  `dealSecondHand` dispatches `SMALL_HAND_SCORED` and `REPLENISH` in one
  handler, so the table comes back with the refill already in the hands,
  HIDDEN in its slots, and the held-over cards move once, straight to
  where they belong; the wave follows `HANDOFF.deal` later and fills the
  gaps left to right. It used to commit the score, show the held-over
  cards closing up into the middle of the fan, then push them back out
  220ms later for REPLENISH. Both sides call `planReplenish` (reducer.js)
  for the refill; the UI calls it on the snapshot minus the two played
  sets, which is exactly what `SMALL_HAND_SCORED` removes, and
  reducer.test.js checks the plan made before the score against the cards
  REPLENISH deals after it, in an odd and an even round (break-tested: it
  fails if the played cards are not taken out first). **If
  `SMALL_HAND_SCORED` ever changes what it removes from the hands, that
  test is what will say so.**
- **Nothing speaks until the cards are down** (`dealStage`, 2026-09-16).
  `'pending'` from the round being built (or PLAY HAND 2) until the wave
  launches, `'dealing'` while it flies, `null` once `animating` clears.
  While it is not null the narrator band is EMPTY (no panel, no buttons),
  the hand does not wiggle, ATTACK and the Ace explainer wait, the skip
  modal waits, and the AI gate holds her. Measured: the band stayed empty
  on every frame of a deal and entered one frame after the last ghost
  landed. It is state, not a ref, because a wave with nothing to fly never
  sets `animating` and the effect that ends the hold still has to re-run.
  The panel's entrance is keyed on `narratorEpoch`, so it plays once per
  deal and never on an ordinary turn.
- **Every reveal is a CENTRED column, so anything in it that changes
  height moves every card on the table.** `SlideBox` (interstitials.jsx)
  turns that into a 200ms eased slide and wraps the two places that grow:
  the verdict box (the CLEAN SWEEP title and line replacing the verdict,
  +68px, which used to jump the cards 34px each way in one frame) and the
  score row with MATCH POINT under it. The CLEAN SWEEP letters, sound and
  bonus roll wait out the slide (`CS_LEAD`). Anything new that appears
  mid-reveal belongs inside one, or has to reserve its height from the
  first frame. The hand rows' placeholders are the row's exact height for
  the same reason: they were 60px taller, a leftover from the removed side
  labels, and each row landing jumped the table 30px.
- **MATCH POINT is exactly 9** (`WIN_SCORE - 1`, `===`), on the ROUND sign
  and under the reveal's score, since 2026-09-16 (Stan). It was `>= 8`, on
  the reasoning that the Scraps hand pays 2; a player on 8 can still end
  the match on the Scraps hand with no warning, and that is the trade.
- **The Ace counter is no longer blind.** `AceCounterModal` takes
  `targets` and shows her two cards under "She plans to remove these cards
  from your Scraps:" (Stan's copy, 2026-09-16). It used to show the whole
  pile and keep the targets hidden until after the decision. Its buttons
  are `Btn grow` in a wrapping row: side by side when they fit, stacked
  full width when not (including desktop, where the pair is 1px wider than
  the card), and they never overflow the screen at any width tested.
- **`scraps-reveal` is a beat on the TABLE, not a phase passed through**
  (2026-09-15, Stan). It used to last 520ms: the hand 2 reveal closed, the
  narrator flashed "Scraps hands up." over a board still holding two dead
  hands, and the Scraps reveal opened on top. Now the table comes back,
  `sweepHandsAway` throws whatever is left in both hands off the right edge
  (`HANDS_DISCARDED` — the only reducer action that moves no phase), and
  PLAY SCRAPS HAND asks for the last hand of the round. Both fans render
  with `showEmpty={false}` for the length of it, so the wood is bare rather
  than carrying two dashed "empty" slots, and their boxes keep their height
  so nothing else moves.
- **The narrator band is a fixed SLOT with a floating PANEL, and the two are
  not the same box.** FitBox scales the table by its natural height, so every
  pixel the band gains or loses resizes the opponent's hand; on a phone the
  copy changing length was visibly resizing the whole table between turns.
  The slot is `NARRATOR_H` — derived in `GameScreen.jsx` from the band's own
  padding, its three-line narrator reservation, its gap and one button row,
  NOT measured and pasted — and the panel is centred inside it, so the chrome
  still shrinks to what is being said while the cards never hear about it.
  Put anything new in the panel, never in the slot.
- Audio only starts after a user gesture, per browser autoplay policy. Silence
  before the first click is the browser, not a bug.

## Deploy

Connected to the Vercel project **scraps3** (team
`samvaudrey-3466s-projects`), framework preset Vite, output `dist`. GitHub
integration is already active on **`stanbaudrey/scraps3`**, which is what
`origin` actually points at — pushes to `main` auto-deploy to production.

**Production is [scraps.games](https://scraps.games)** since 2026-09-12, a
real domain registered through Vercel and expiring 2027-09-08. The old
`scraps3.vercel.app` still resolves but returns a **308 redirect** to it, as
does `www.scraps.games`, so there is one canonical address. Every URL the
site advertises — canonical tag, Open Graph, `sitemap.xml`, `robots.txt`,
`llms.txt` — is generated from the single `SITE` constant in
`tools/make-share-assets.mjs` and cross-checked against `index.html` by
`npm run share:check`. To change the address, change `SITE` and run
`npm run share`; never hand-edit the generated files.

The `dev` branch exists and is pushed, so `/preview` has somewhere to deploy
before anything reaches `main`.

Note there are also older `scraps2` and `scraps-game` Vercel projects on the
same account. This repo is `scraps3` — the other two are abandoned earlier
versions and should not be deployed to.

## Known issues

- **The privacy notice is unreachable in the shipped game.** It lives in
  `RulesModal` (`overlays.jsx`), and `RulesModal` has had no importer
  since the storyboard took over as the in-game rules on 2026-08-30 —
  so the `?` button opens the storyboard, which has no privacy text.
  `public/llms.txt` still tells readers to "see the Privacy notice
  inside the game's rules panel". Found 2026-09-13, not fixed: the
  wording and the placement are Stan's call, and deleting the dead
  component would take the only copy of that text with it.
- **There is no README, and never was one.** Nothing in git history has ever
  added a `.md` file. So there are no stale README claims to correct.
  The "rules are written down nowhere" half of this gap closed in Session 7:
  `public/llms.txt` states the full ruleset and the win condition, and it is
  generated from `WIN_SCORE` so it cannot drift from the engine. (Its
  no-flushes bullet was removed on 2026-09-13 rather than reworded, along
  with the matching one in `index.html`'s `<noscript>` block: with no suits
  there is no rule left to state.) It is written for crawlers rather than for
  a human browsing the repo, so a README would still be worth having.
- **The git remote is fine, and the note that said otherwise was backwards.**
  This file and PROJECT-BRIEF.md both claimed `origin`
  (`https://github.com/stanbaudrey/scraps3.git`) only worked via a rename
  redirect from a canonical `unclescrunch/scraps3`. Checked against the
  GitHub API on 2026-08-27: `stanbaudrey/scraps3` **is** the canonical
  `full_name` (owner login `stanbaudrey`, id 285274906, homepage
  `scraps3.vercel.app`, `pushed_at` matching this repo's last push), and the
  API resolves renames to the canonical name rather than echoing the queried
  one. A `repo:unclescrunch/scraps3` lookup returns no such resource. The
  rename ran the other way — the account was `unclescrunch` and is now
  `stanbaudrey` — so `origin` already points at the live name and
  "repointing" it would aim at the stale one. Left alone deliberately.
- **`GameScreen.jsx` is ~1950 lines** and mixes three concerns: UI state, the
  animation timer choreography, and the rendering of the whole table. Unlike
  the engine and reducer, nothing in the file claims this is deliberate. The
  animation scheduling is the natural first thing to lift out. (Session 3
  split the table's markup into named pieces — `oppHandEl`, `actionEl`,
  `playerHandEl` and so on — composed two ways, which makes that lift
  easier than it was. The 2026-09-14 interstitials pass took the reveal
  and match-end choreography OUT of it, into `interstitials.jsx`, without
  making it shorter: the comments explaining what moved and why are what
  the removed code weighed.)
- **The page title and the share tagline disagree, on purpose for now.**
  The splash, the SHARE sentence and the OG card's strapline all say
  "Play poker with both hands" (Stan, 2026-09-14). The `<title>`, `og:title`
  and `twitter:title` still say "SCRAPS - Poker with two hands at once."
  Aligning them is a one-line edit to `index.html` plus `npm run share`,
  and it is Stan's copy call rather than a session's.
- **The share sheet with an image is untested on a real iPhone.** `share.js`
  attaches a canvas-drawn PNG through `navigator.canShare({files})`, which
  iOS 15+ Safari supports; the clipboard fallback was verified in headless
  Chrome and the sheet path was not, because no automated browser opens one.
  First thing to try on Stan's phone after the preview.
- **The color palette is declared in two places, deliberately.**
  `src/styles/theme.js` holds the `DS` tokens and `index.html` repeats the
  same hex values as CSS literals, because plain CSS cannot import a JS
  module and still load before first paint. Two declared sources is the
  documented ceiling without a build step, not an accident. (This entry used
  to name a third, `flight.jsx`, hardcoding every hex — that has not been
  true since it was rewritten to render real `PlayingCard`s, and it now
  contains no hex at all.)
- **Landscape on a phone is playable but small.** Session 3's rule is
  that everything fits with no scrolling, and on a 844×390 landscape
  phone there is ~300px of height for two hands, two piles and the
  control panel — so `FitBox` scales the table to about 0.57 and a 54px
  button renders at ~31. Nothing is clipped or unreachable, but portrait
  is the intended orientation and a 375×667 iPhone SE (scale ~0.73,
  buttons ~40px) is the smallest screen the layout is really sized for.
  Anything below 375 wide scales rather than reflowing again.
- **npm audit**: five vulnerabilities remain, all one chain — esbuild, pulled
  in by Vite 5 and Vitest. It's a dev-server-only issue where a malicious
  webpage could read responses from your local dev server while it's running;
  it never ships in the production build. Clearing it means upgrading to Vite
  8, a breaking major bump, so it's been left alone. A postcss vulnerability
  (high) and a `@babel/core` one were both patched during setup with a
  non-breaking `npm audit fix`.
- **Git history is not useful.** Most commits are `Add files via upload` from
  the GitHub web UI, with a few `Delete src/game/engine.js` immediately
  followed by a re-upload. There's no reliable way to bisect or read intent
  from history before this point. Production also has several `ERROR`
  deployments interleaved with the good ones from that same period; the
  current production deploy is healthy.
- **No linter is configured.** There's no ESLint setup and no `lint` script,
  so "run the linter before pushing" currently has nothing to run.
  `npm test`, `npm run build` and `npm run fonts:check` are the available
  checks. **Neither the tests nor the build catches an undefined
  identifier in JSX**, and one shipped: `AiCounterNotice` read a `cardSize`
  that did not exist, the render threw, React unmounted the tree, and Stan
  saw a black screen whenever the opponent countered his Ace (found
  2026-09-14). Before a preview, run ESLint's `no-undef` alone — a
  four-line flat config with `ecmaFeatures: { jsx: true }`, browser
  globals and `"no-undef": "error"`, via `npx -p eslint@9 eslint --config
  <it> "src/**/*.{js,jsx}"`. It names that bug on the old file and is
  clean on the current tree.
