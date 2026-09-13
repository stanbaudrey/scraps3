# Card + Scraps pile redesign — build spec

**Status:** decided by Stan on 2026-09-13, not yet built. No code has been
changed. This file is the handoff; a session picking this up should be able to
build the whole thing from here without re-deriving anything.

**Scope:** the look of a card and the look of a Scraps pile. No rules change, no
scoring change, no AI change, no layout-mode change. `engine.js` is touched in
exactly one function and `reducer.js` in exactly two strings.

**This file does not outrank `CLAUDE.md` or `PROJECT-BRIEF.md`.** Where it is
silent, those stand. Delete this file once the work has shipped and been logged
in `PROJECT-BRIEF.md`, so it cannot rot into a second source of truth.

---

## 1. The decisions

Ten, all from Stan directly. Implementation notes are mine.

### 1.1 Rye is the card face

Google Fonts, SIL OFL, static, one weight (400), two subsets (latin,
latin-ext). Western wood type with spurred terminals.

It **replaces Baloo 2**, it does not join it. Verified: `F.card` has exactly two
consumers, both in `src/components/cards.jsx` (the rank span at line 259 and the
suit span at line 260). Suits are going, so once the rank is Rye, Baloo 2 has
zero consumers and must be removed from the build.

Family count stays at **five**, and `public/fonts` stays at **14 files**: Rye
serves two subsets exactly as Baloo 2 does.

Swap it in `tools/fetch-fonts.mjs`, in the `SPEC` array around line 50:

```js
{ family: 'Baloo 2', slug: 'baloo-2', css: 'Baloo+2:wght@600;700;800' },
// becomes
{ family: 'Rye',     slug: 'rye',     css: 'Rye' },
```

Then `npm run fonts`, which rewrites both `public/fonts/*.woff2` and the
`@font-face` block between the `FONT-FACE:BEGIN`/`END` sentinels in
`index.html`. **Never hand-edit either.** Confirm with `npm run fonts:check`
(needs network, takes a couple of seconds, not part of `npm test`).

Rename the token in `src/styles/theme.js` from `F.card` only if you also update
both call sites; keeping the key name `card` is fine and is less churn.

### 1.2 Big rank, and "10" must not shrink

Both card faces carry one large numeral and nothing else. No pip, no corner
index. This applies to the hand card as well as the Scraps card (see 1.9).

**The numeral is left-anchored, not centred.** This is not a style preference,
it is forced by the overlap on both surfaces; the arithmetic is in section 4.1
and it is the highest-risk part of this whole change. Anchor it the same way on
both card types so the two read as one system.

**The "10" problem is the specific thing Stan called out.** The rank-type bench
scaled two-character ranks to 62% of the font size, which makes the 10 visibly
smaller than every other card. That is wrong. Height must be constant across all
thirteen ranks; only the width may change.

Fix: keep `font-size` identical for every rank and condense "10" horizontally.

```js
// cap height identical for every rank; only the advance width differs
const two = card.rank === '10';
style.fontSize  = bigRankPx;                      // same for all ranks
style.transform = two ? 'scaleX(0.66)' : 'none';  // tune by eye, see 4.2
style.transformOrigin = 'center';
```

`scaleX` on a static face thins the vertical stems slightly. At Rye's weight
that is acceptable and is far less noticeable than a short 10. Tune the factor
against the acceptance test in section 5.

Do not substitute "T" for "10". That is a rules-legibility change, not a type
change, and it is not what was asked for.

### 1.3 No suits anywhere

"Anywhere" is literal. Full inventory is in section 3.

Verified against the source: **`engine.js` reads `.suit` in exactly one place,
`createDeck()`.** Every other mention in that file is a comment saying
evaluation ignores suits. Nothing scores, validates, compares, or decides on
suit. This is a pure presentation removal.

**`createDeck()` must still return 52 cards with exactly four of each rank.**
Session 2's balance work (quads at 2.8% on two decks vs 0.7% on one) depends on
it. Keep the four-fold loop, drop the `suit` field from the card object. Do not
add a replacement field: `id` already carries uniqueness and nothing else needs
to tell two fours apart.

Consequences that follow for free and are wins, not chores:

- `isRed()`, `cardInk()` and the whole two-red-ink system
  (`ember` on dark, `emberInk` on frost) collapse to one ink.
- `SUIT_NAMES` and the suit half of `cardLabel()` go. Labels become
  "king", "nine". Two cards in a pile may share a label; that is fine,
  they are interchangeable.
- **The no-flush house rule stops being a rule.** It becomes a thing that
  cannot arise. Remove the bullet from `public/llms.txt` rather than
  rewording it (see 3.6).

### 1.4 No box around the Scraps pile

Remove the container entirely from `HorizontalScrapsZone`: the `inkLight` fill,
the 2px ownership border, the 12px radius, the padding, and the header row.
Cards lie directly on the timber.

The ownership label and the best-hand badge survive as a quiet caption line
**below** the pile, in `IBM Plex Mono` as now but at reduced weight and opacity.
Ownership colour lives on that caption, not on a border.

`GlowPulse` stays and becomes the only zone-level cue. It cannot stay a
rectangle, though: see 1.10.

### 1.5 Heap appearance, wear at 100

The heap look: seeded per-card wear, no container, one pooled contact shadow
under the whole pile instead of a lit drop shadow on each card, torn edges.

**Drive every effect from one seeded `wear` scalar per card, not from ten
independent randoms.** This is the point. Independent randoms at equal strength
average out and the pile reads as uniformly scruffy; one varying dimension reads
as individual objects. Skew it so most cards sit mid-range and a minority are
wrecked:

```js
// pure function of card id: a card never changes between renders,
// which is what keeps FLIP correct
function cardWear(id){
  const r = rand((id * 7919) >>> 0);
  r();                              // discard: xorshift's first draw
                                    // correlates with the seed
  return Math.pow(r(), 0.68);       // 0..1, skewed low
}
```

Wear at **1.0** drives: tear amplitude per edge, the card's own stock tint, stain
count and size, foxing specks, inset edge grime, ink fade and a slight ink
rotation, a crease with a lit side and a shadowed side, and above a threshold one
corner torn clean off.

### 1.6 Rotation is decoupled from wear and dialled back

At full wear the bench rotated cards up to ±11.5°, which collides with a rank
glyph that now fills the card. **Rotation must not scale with wear.** Give it its
own constant:

```js
const ROT_MAX = 4;                       // degrees, was (3 + 8.5 * wear)
const rot = (r() * 2 - 1) * ROT_MAX;
```

Start at 4 and tune down if the acceptance test in 5 fails. With rotation this
low, the tear and the wear are what make cards read as distinct objects, which
is exactly why wear is at maximum.

### 1.7 Ascending rank order is kept

**This is the one place Stan's instructions and the "heap" bench disagreed, and
he resolved it in favour of sorting.** The bench's Heap cell rendered cards in
discard order specifically to stop the pile reading as a sorted array. Stan
wants the sorting kept.

So: heap *appearance*, sorted *order*. Concretely, `sortByValue` stays at all
three current call sites in `src/components/cards.jsx`:

| line | site | what it sorts |
|---|---|---|
| 70 | `sortByValue` definition | — |
| 316 | `FannedHand` | the small hands (face-up only) |
| 590 | `HorizontalScrapsZone` | the Scraps pile |

Nothing here changes. The pile still reads as a heap because the container, the
even spacing, the zero rotation and the uniform material are gone, not because
the order is scrambled.

### 1.8 The re-sort animation must be fluid and tidy

When a card lands and the pile re-sorts, cards glide to their new positions. Two
motions overlap and must be distinguishable:

- **The arriving card** drops in with a settle: a small overshoot in
  rotation and a few pixels of vertical bounce.
- **The displaced cards** slide sideways to their new slots, on a longer,
  gentler, non-springy curve, with no rotation change. They are being
  tidied, not thrown.

Suggested starting values, to be tuned by eye:

```
arriving card   .62s  cubic-bezier(.22,.9,.3,1)   drop + rotate settle
displaced cards .42s  cubic-bezier(.4,0,.2,1)     left only, 60ms stagger
```

A small stagger across the displaced cards (nearest first) is what makes it read
as tidy rather than as everything snapping at once.

**Reduced motion:** per the standing rule in `~/.claude/CLAUDE.md`, both motions
need a concrete non-motion fallback, not deletion. The card must still *arrive*.
Collapse both to a 0.28s opacity fade onto the identical resting frame, so the
state change is still signalled with no travel. Add the block alongside the
existing reduced-motion rules in `index.html`, and note that Stan has Reduce
Motion **off** on both devices, so he will never hit this branch by accident.
Test it deliberately.

### 1.9 The hand card changes too

Confirmed by Stan on 2026-09-13. The hand card becomes **a big numeral on cream
stock with crisp edges**: same `frost` ground and same solid border and radius it
has now, no tearing, no wear, no stains, no lean.

That makes the material the *only* thing separating the two card types, which is
the cleanest version of this idea available. A card in your hand is crisp cream
paper; the moment it hits the Scraps pile it is torn, weathered and leaning. The
inversion Stan objected to at the start, where the discarded card looked more
expensive than the one you were holding, is fully reversed by material alone
without either card needing extra decoration to say which it is.

Selection on a hand card is unchanged: the voltage border, the ring and the lift
all still work against crisp cream.

**`CardFaceRidge` is a call I made rather than an instruction.** See section 6.

### 1.10 GlowPulse stays, and has to stop being a rectangle

Stan reversed this on 2026-09-13 after the gap was flagged: **GlowPulse is kept
as the next-action indicator.** Keep the component at `cards.jsx:270`, keep the
`glowZone` prop on `HorizontalScrapsZone`, and keep both props passed from
`GameScreen.jsx` at lines 1054 and 1306. With the border gone it is now the only
thing saying which pile you are meant to act on, which is what makes the Ace
strike flow legible.

**But it currently draws a ring, and a ring around a boxless pile is the box
coming back.** Both halves of it are hard-edged today:

- `index.html:472`, `@keyframes zonePulse`, pulses
  `box-shadow: 0 0 0 3px ...` up to `0 0 0 5px ...`.
- `index.html:689`, `.live-cue-zone`, the reduced-motion static substitute,
  is `box-shadow: 0 0 0 5px ...`.

Wrapped around a container those traced a visible panel. Wrapped around an
invisible div they will trace a glowing rounded rectangle in empty space, which
reinstates exactly the frame section 1.4 removes. Both have to be reworked.

**Recommended: move the glow onto the cards.** The Scraps cards already carry
`filter: drop-shadow(...)` for their torn silhouettes, so an additional coloured
drop-shadow layer on each card in the active zone makes the glow trace the real
torn edges instead of a rectangle. It is the version the boxless design actually
wants, and it dodges a second problem: the dark pooled contact shadow from 1.5
sits in the same place as a wrapper bloom would and the two would mush together,
whereas a glow hugging the card outlines stays legible against it.

**Fallback if that is fiddly:** keep the glow on the wrapper but delete the
`0 0 0 Npx` ring layers entirely and keep only the blurred `0 0 Npx` bloom,
with a much larger blur and radius so it reads as light pooling on the table
rather than a panel. Check the corners; a tight blur still looks rectangular.

**Whichever you pick, `.live-cue-zone` needs the matching static treatment.**
That class is not optional styling: it is how the reduced-motion block hands the
cue a still substitute instead of deleting it, per the long comment at
`index.html:648`. A reduced-motion player must still be able to tell which pile
is live, and the substitute must read as unambiguously *on* rather than like the
animated version's resting frame.

---

## 2. Facts already verified, so nobody re-derives them

Checked against the source and the live tooling on 2026-09-12/13.

- **`engine.js` touches `.suit` once**, in `createDeck()`. Lines 7, 80, 128 and
  221 are comments about flushes being disabled.
- **`reducer.js` touches suit twice**, lines 384 and 444, both building a log
  string as `c.rank + c.suit`.
- **`engine.test.js` has six tests whose entire subject is that flushes do not
  count** (roughly lines 18 to 63). With no suits there is nothing to flush.
- **`F.card` has two consumers**, `cards.jsx` lines 259 and 260.
- **`sortByValue` has three call sites**, listed in 1.7.
- **`public/fonts` holds 14 `.woff2` files across 5 families.** Rye serves
  latin + latin-ext, one weight, so the count is unchanged after the swap.
- **`tools/fetch-fonts.mjs` `SPEC` array (around line 48) is the single place
  a family is declared.** `index.html`'s `@font-face` block is generated from it.
- **Contrast, measured, for a bleached/kraft scrap stock:** near-black ink on
  the tinted stock is 9.48:1 (your pile) and 8.92:1 (theirs). The current
  `emberInk` red drops to 3.72:1 on that stock and **fails AA**, which is one of
  the reasons suits are going. With one ink there is no longer a constraint here.
- **`glowZone` has three consumers**, all traced: `HorizontalScrapsZone`
  (which wraps in `GlowPulse`), and `GameScreen.jsx` lines 1054 and 1306. The
  prop declared on `FannedHand` at line 311 is never used.
- **Both zone cues are hard rings today:** `@keyframes zonePulse` at
  `index.html:472` and the `.live-cue-zone` reduced-motion substitute at
  `index.html:689`. Neither survives losing the box unchanged. See 1.10.
- **`FannedHand`'s step is**
  `max(W × MIN_EXPOSED.up, min(openStep, room))` with
  `openStep = min(84, max(44, 480/count)) × (W/104)` and
  `MIN_EXPOSED.up = 0.34`. So a face-up card shows between **81% and 34%** of
  its width depending on hand size and screen width. See 4.1.

---

## 3. File-by-file change list

### 3.1 `src/components/cards.jsx` — the bulk of the work
- `CARD_DIMS`: the `suit` field per size becomes dead. The `rank` field now
  means the big-rank size and needs re-picking per size, not reusing the old
  corner-index values.
- `isRed`, `cardInk`, `SUIT_NAMES`: delete. `cardLabel` keeps the rank half.
- `CardFaceRidge`: drop from the Scraps card, keep on the hand card. My call,
  see section 6.
- `PlayingCard`: **both** face branches change now, not just the scrap one.
  The `isScrap` branch becomes the torn paper card: per-card wear, torn
  `clip-path`, stain/foxing/crease layers, and `drop-shadow` instead of
  `box-shadow` (a box-shadow draws a rectangle and ignores the clip path). The
  normal branch keeps its `frost` ground, solid border and radius and just
  swaps its corner index for the left-anchored numeral. The corner notch goes
  with the suits.
- `GlowPulse`: **kept.** Rework what it paints so it is not a ring (1.10).
  The dead `glowZone` prop on `FannedHand` at line 311 is genuinely unused and
  can still go.
- `FannedHand`: the numeral must survive the fan's tightest step. This is the
  part most likely to need iteration; read 4.1 first.
- `HorizontalScrapsZone`: remove the container but **keep the `GlowPulse`
  wrapper**, move the label and badge to a caption below, keep `sortByValue`,
  add the pooled shadow, apply the new transitions from 1.8. Note the existing
  comment that the wrapper sits outside `GlowPulse` on purpose, so the glow
  rings the pile and not the caption; that still holds.
- `inkOverride`: its whole purpose was making a pile print in one owner colour
  rather than four suit colours. With no suits and one ink it is dead. Remove
  the prop and both call sites rather than leaving it inert.

### 3.2 `src/game/engine.js`
- `SUITS` const: delete.
- `createDeck()`: drop `suit` from the card object, keep 52 cards and four per
  rank.

### 3.3 `src/game/reducer.js`
- Lines 384 and 444: `c.rank + c.suit` becomes `c.rank`.

### 3.4 `src/screens/MenuScreens.jsx`
- Lines 28 to 31: delete the four-glyph row under the wordmark and **put nothing
  in its place** (Stan, 2026-09-13). The Bungee Shade wordmark carries the splash
  alone. Close the gap by adjusting the surrounding spacing, not by inserting a
  substitute mark.

### 3.5 `src/screens/Walkthrough.jsx`
- Sample hands at lines 35, 36, 39, 40, 46, 49, 50 and 268 to 272 all pass
  suits to `C()`. Update the factory signature and every call.

### 3.6 `tools/make-share-assets.mjs` and `public/`
- Lines 94 and 95: `HAND` and `HAND_STRAIGHT` carry suits; the og card renders
  them.
- `public/llms.txt` lines 18 to 19 state the no-flush house rule. **Remove the
  bullet, do not reword it.**
- Both are generated. Run `npm run share` (needs a local Chrome, or
  `CHROME_PATH`) and then `npm run share:check`, which will otherwise fail by
  name. Do not hand-edit anything listed in `public/share-manifest.json`.

### 3.7 `src/game/engine.test.js`
- Delete the six flush tests. **Replace them, do not just subtract.** The
  invariant that now matters is the deck shape: 52 cards, exactly four of each
  rank, all ids unique. Add that. Record the new total in `CLAUDE.md`, which
  currently claims 55.

### 3.8 `src/styles/theme.js` and `index.html`
- `@keyframes zonePulse` (line 472) and `.live-cue-zone` (line 689) both draw
  hard rings and must be reworked per 1.10. Do not simply delete either; the
  second one is a reduced-motion accessibility substitute.
- Any new paper-stock value is a **named token**, declared in `theme.js` and
  repeated as a CSS literal in `index.html`. That two-source duplication is
  documented and deliberate (plain CSS cannot import a JS module and still load
  before first paint). Keep both in sync; do not introduce a third source.

---

## 4. Two numbers to get right

### 4.1 The overlap, which is the hard part of this change

Cards overlap on both surfaces, so a numeral that fills the card gets eaten by
its neighbour. Card *i*'s exposed band is `0 → step`. A **centred** glyph of
width *g* needs `g ≤ 2·step − W` to survive, which gives:

| surface | step | centred glyph must be |
|---|---|---|
| Scraps pile | `0.74W` | `≤ 0.48W` |
| hand, roomy (5 cards) | `0.81W` | `≤ 0.62W` |
| hand, 7 cards | `0.66W` | `≤ 0.32W` |
| hand, squeezed to the floor | `0.34W` | **impossible** |

The last row is why centring is off the table. `MIN_EXPOSED.up = 0.34` exists
because, as the comment above it says, below that "the top-left corner starts
disappearing under the next card and the fan stops being readable at all". The
fan's entire design assumes the rank lives in the top-left corner.

**So left-anchor the numeral on both surfaces**, its left edge at the card's
padding, and it stays readable under every step above.

The counter-intuitive part, worth understanding before anyone tries to fix it:
**going big makes the squeezed fan more robust, not less.** The old worry was a
small corner index being swallowed whole. A left-anchored numeral at full card
height is still identifiable when only its left third shows, because you get the
full height and the most distinctive part of the glyph. Do not "solve" the
squeeze by shrinking the numeral back down; that recreates the problem.

Two things not to do unless the acceptance test forces it. Do not scale the
numeral with hand size, which makes the rank jump every time a card is drawn.
Do not raise `MIN_EXPOSED.up`, which widens the fan and runs straight into
Session 3's no-scrolling-anywhere rule on a 375px phone; if you try it anyway,
`tools/responsive-qa.mjs` is the gate.

### 4.2 Tuning the "10"

Set `scaleX` so the 10's *apparent* size matches its neighbours. Judge it
against a K and a 4 side by side at both card sizes, not in isolation. 0.66 is a
starting point, not a measurement.

---

## 5. Acceptance criteria

Testable, in the real app, not in a bench.

1. `npm test` passes, with the deck-shape test added and the flush tests gone.
2. `npm run build` passes. `npm run fonts:check` and `npm run share:check` both
   exit 0.
3. No `♠ ♥ ♦ ♣` anywhere in `src/`, `tools/`, `index.html` or `public/`.
   `grep -rn "♠\|♥\|♦\|♣"` returns nothing.
4. At a 7-card Scraps pile, every rank is legible with no glyph clipped by a
   neighbouring card, at both `small` and `tiny` card sizes.
5. **The squeezed fan.** Seven face-up cards in one hand at 375px portrait,
   which is where `MIN_EXPOSED.up` binds: every rank still identifiable. This is
   the criterion most likely to fail and the reason 4.1 exists.
6. A 10 and a K read as the same size, in the hand and in the pile.
7. Hand card and Scraps card are told apart by material alone, at a glance,
   with no suit, no notch and no colour coding doing the work.
8. Deal a card into a full-ish pile: the arriving card and the displaced cards
   are visibly doing different things.
9. **Play an Ace strike end to end.** It is obvious which pile you are choosing
   from, and the cue reads as light falling on the table rather than as a
   reinstated box. Then force `prefers-reduced-motion: reduce` and confirm the
   static substitute still says which pile is live. See 1.10.
10. `tools/responsive-qa.mjs` passes at all six viewports: no document scroll,
    no inner scrollers, nothing painted outside the viewport, touch targets
    intact. Run it against a dev server with Playwright available.
11. With `prefers-reduced-motion: reduce` forced, a dealt card still visibly
    arrives.
12. Run `python3 ~/Projects/Lookbook/scan_tells.py .` and report what fired and
    what cleared. Rye is not on the banned list; the scan is for everything else.

---

## 6. One question came back open, and one call I made

Every question raised while the decisions were being made has been answered by
Stan: the hand card changes too (1.9), the splash glyphs go with no replacement
(3.4), and GlowPulse is kept as the next-action cue but has to stop drawing a
rectangle (1.10).

**One new question opened afterwards**, during the wrap, when his Notion notes
were read: whether Rye replaces Bungee Shade on the wordmark as well as Baloo 2
on the cards. See 6b. Everything else in this spec can be built while that one
is outstanding; it only affects the splash and the family count.

**The one thing I decided rather than asked:** `CardFaceRidge` stays on the hand
card and goes from the Scraps card.

The reasoning, so it can be reversed in one line if you disagree. The ridge was
put on the card face deliberately on 2026-08-30 because, as the comment in
`cards.jsx` says, the game's one piece of real identity art lived only on the
card *back*, which you see on the opponent's hidden hand, the deck and the
discard and never on a card you are holding. Now that the splash is losing its
four glyphs, stripping the ridge as well would take the last identity mark off
every player-facing surface in the same pass. It sits low on the card at 8.5 to
11.5% opacity and the numeral is left-anchored, so the two should not fight; on
the Scraps card the tear and the wear already carry all the character the card
needs, and a printed illustration under them would read as clutter.

Check it once it is on screen. If the ridge and the numeral do collide, drop it
from both and say so.

---

## 6b. Read Stan's Notion notes before you start

**Found during the wrap, after the decisions above were made.** The
`Project: SCRAPS` Notion page carries a long, largely unactioned block of
Stan's own notes, and three items in it bear directly on this build. It
was not consulted while the benches were being made, so treat it as an
input this spec has only partly absorbed.

**It already asks for Rye, and asks a question this spec answers
differently.** His note reads: *"change landing page title font to RYE.
Replace the Bungee font with Rye everywhere?"* This spec puts Rye on the
card ranks and says the family count stays at five because Rye replaces
Baloo 2 one-for-one. If Rye also replaces **Bungee Shade** on the SCRAPS
wordmark, the count drops to four and the splash identity changes in the
same pass that removes its four suit glyphs. **That is a real decision and
it is Stan's, not yours.** Ask before building, because it is the one
thing here that would be expensive to reverse.

Note the tension: another of his notes asks to *"incorporate the font
currently used for the SCRAPS wordmark ... for headlines"* in the
interstitials, which assumes Bungee Shade stays. Both notes cannot be
straightforwardly true at once.

**Two smaller items belong in this pass rather than a later one**, because
they touch exactly the components being rewritten:

- *"Remove the little right-facing arrow symbol next to the Scraps
  best-hand badge."* That is the `▸` in `ZoneBadge`, which section 1.4
  moves to a caption anyway. Drop it while you are there.
- *"There's too much shit onscreen. way too many cards. maybe the scraps
  are smaller?"* The heap treatment already compresses the pile. Check
  whether it goes far enough for him before adding a separate fix.

**And one note is the origin of this whole spec:** *"STYLE OF SCRAPS
CARDS UNDERCUTS CONCEPT OF THEM BEING THE MESSY DISCARD."* That is what
this work answers. His notes also say *"Paste Claude's card redesign into
next session"* under a heading reading **"BIG PICTURE: SOLVE THESE FIRST
BEFORE FINE-TUNING EVERYTHING ELSE"** — so this spec is the thing he was
expecting, and it is correctly at the top of the queue.

**The rest of the block is out of scope here but is the real backlog**:
the interstitials being off-brand, making the opponent female throughout,
"small hand" becoming "hand", dropping the win-by-2 rule, removing the
deck and discard piles in favour of cards dealing in from off-viewport,
and a set of Ace copy changes. Do not action those from this file. Read
them from Notion, where they are current.

---

## 7. Traps specific to this work

From `CLAUDE.md`'s Gotchas, filtered to what will actually bite here.

- **FLIP is measured, not predicted.** Cards register their DOM node by id from
  a **layout** effect, because a card moving hand → Scraps unmounts under one
  parent and remounts under another. Keep that. Ghosts are hidden with
  `visibility`, never `display`, because the layout has to survive.
- **Keep every jitter a pure function of card id.** A card that reshuffles its
  own tear or lean between renders will shimmer, and worse, will move mid-flight.
- **`box-shadow` ignores `clip-path`.** On a torn card it draws a rectangle.
  Use `filter: drop-shadow()`, which follows the clipped silhouette. An *inset*
  box-shadow is fine and is how the edge grime works, because it is painted
  inside the box and then clipped.
- **Never render a `useCallback` component as `<Foo/>`.** It remounts every card
  in flight and restarts the animation.
- **Timers read state through `stateRef`, and card sizes through `szRef`.**
  Follow that for any new delayed action.
- **Nothing may depend on hover.** Use `pressStyles()` in `buttons.jsx`, or a
  CSS `:hover` inside `@media (hover: hover)` with an `:active` partner.
- **Measuring in the in-app browser pane lies.** A hidden pane pauses
  transitions and `requestAnimationFrame`, so `getComputedStyle` hands back a
  frozen mid-transition value and screenshots come back part-drawn. Inject
  `* { transition: none !important; animation: none !important }` and force a
  reflow before reading any geometry. If a flow needs to be *driven* rather than
  measured, use the Playwright MCP server, which runs a real unhidden browser.
  Check whether another session holds its profile lock before killing anything.
- **Reading CSS is not measuring it.** A browser matches animations by position
  in the `animation-name` list, not by identity, so a rule that re-declares the
  `animation` shorthand does not restart a finished animation. If a motion bug
  is reported, measure positions across frames before diagnosing from the
  cascade, and say which you did.

---

## 8. Reference

Three live benches behind these decisions. All are read-only comparisons built
in the project's own tokens against the real procedural timber; none of their
code is meant to be lifted directly.

- **Pile Bench** — where "no box" and "heap" were chosen:
  https://claude.ai/code/artifact/c457cfac-2aed-49ad-94e9-d9ced3e5861f
- **Card Face Bench** — where "big rank" and "no suits" were chosen, with the
  live contrast readout showing why a weathered stock and red pips are
  incompatible:
  https://claude.ai/code/artifact/5b44533d-acf2-4ed1-8b5f-cf2062ade652
- **Rank Type Bench** — where Rye was chosen, and where the wear system and its
  slider live:
  https://claude.ai/code/artifact/1ef1d2e7-01a6-4e4b-a9ae-271350c23823

---

## 9. Before finishing

scraps3 is a **legacy-format** project: the full record is the single
`PROJECT-BRIEF.md`, with the two-way Notion mirror that file describes. Do not
start a `SESSION-LOG.md` here.

Log the session in `PROJECT-BRIEF.md` and update the Notion page in the same
step. Record what shipped, what is confirmed working and *how* it was confirmed,
and anything learned about Rye, the wear system or the re-sort motion that the
next person would otherwise rediscover. Correct `CLAUDE.md` where this work
makes it wrong: the test count, the font family list, the "no suits" reality,
and the Gotchas entry about the two-red-ink system.

Then delete this file.
