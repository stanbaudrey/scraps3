# SCRAPS — Revision, QA & Launch Brief

**Shorthand name: SCRAPS.** This is not a from-scratch kickoff — SCRAPS already
exists as a working proof of concept at `~/Projects/scraps3`, live at
[scraps3.vercel.app](https://scraps3.vercel.app). This brief runs the usual
kickoff interview against an existing build instead of a blank page, then
reconciles it against what's actually in the code (see [CLAUDE.md](CLAUDE.md)'s
Known Issues section, which this brief absorbs and prioritizes rather than
duplicates).

**Read this brief at the start of every session on this project**, alongside
CLAUDE.md. When a session finishes, mark it done in the table at the bottom.

There is no Notion mirror of this brief — the Notion connector isn't
authorized in this environment, so Part 6 of kickoff was skipped. If Stan
connects Notion later, this file is still the source of truth.

---

## 1. The brief

**One sentence:** SCRAPS is a fast, mean two-player card game against an AI —
three hands running at once (two private, one public), a shared pile you raid
to refresh your cards, and Aces that let you strip your opponent's board or
counter-strip right back.

**Feel:** scrappy, tense, tactile (Claude's read — not yet confirmed or
corrected by Stan).

**Who it's for:** someone who likes fast, mean card games — Egyptian
Ratscrew, Yaniv, Speed — and wants a five-minute round against a sharp AI in
a browser tab, no account, no download.

**Why it deserves to exist:** Stan and his wife invented this game
themselves — the mechanics are genuinely original, not a digital reskin of
an existing card game. That's confirmed by the prior art search below
(Section 3): nothing found combines SCRAPS' actual ingredients. This is the
real hook for launch copy — "we invented a card game" is a far stronger
story than "we built an app," and it's true.

**Scope for this pass:** originally scoped as a tight weekend of pure
polish. Stan then added four real workstreams on top — mobile QA, a
comprehensive sound identity pass, a formal color/design audit, and a
UX/UI best-practices pass — plus a fifth item that isn't polish at all: a
live concern about game balance (below). Being honest about it: that's more
than a weekend now. The plan below is still tightly scoped and still
sequenced to ship, but expect it to run a few focused sessions across more
than two days, not one sitting.

**No new mechanics, multiplayer, accounts, or backend** — that constraint
still holds, with one deliberate exception: if the balance discussion in
Section 4 concludes the deck or draw rules need to change, that's an edit to
existing engine logic, not new scope. Tuning what's there isn't the same as
building something new.

**Ranked priorities (from the original interview, still standing):**
1. Fix the viewport clipping bug — the game is unplayable below ~800px of
   viewport height, which is the single most likely thing to sink a first
   impression. Now folded into a full mobile/responsive pass, not just a
   one-off fix (see Section 6).
2. Accessibility — menu options are non-focusable `<div>`s; keyboard and
   screen-reader users can't get past the splash screen at all.
3. Visual/token consistency — the color palette is duplicated across three
   files (`theme.js`, `index.html`, `flight.jsx`), which makes every other
   visual fix slower and riskier.

**Explicitly out of scope:** multiplayer, accounts, a backend, a mobile app
wrapper (mobile *web* support is now in scope — a wrapped native app is
not). Also still out: the `GameScreen.jsx` three-way split CLAUDE.md flags
as a code-health issue — real, but a refactor risk with no user-visible
payoff.

**References:** none given. Claude's suggestions, matched to the existing
neon-on-dark palette (`voltage #C8FF00`, `ember #FF3D5A`, `dusk #1C1C28`,
`slate #8A8FA8`) — offered, not committed:
- **Balatro** — how a card game earns big, saturated feedback moments (juice)
  without needing any external assets, all shader/animation-driven.
- **Inscryption**'s UI — sparse, high-contrast, lets negative space and a
  couple of accent colors do the work instead of ornament.
- **Hades**' combat feedback — screen shake, hit-stop, and color flash used
  sparingly so the *rare* big moments (an Ace strip, a Full Scrap) read as
  rare.
- **Card Sharks / Klondike Solitaire redesigns on Dribbble** — good reference
  for card-fan spacing and hover states at small sizes, relevant to mobile
  layout.
- **The New York Times' Wordle/Connections result-share cards** — worth
  studying for the "one screenshot explains the whole win" instinct, relevant
  to making a shared screenshot self-explanatory for Reddit/HN.

**Stack:** already Vite + React 18, zero runtime dependencies, Vercel +
GitHub. Nothing about this pass changes that — confirmed, not re-decided.

---

## 2. Format — already settled, with one addition

SCRAPS is already a built, live browser web app. Kickoff's usual format
interrogation (should this even be a website?) doesn't apply to a working
proof of concept Stan is asking to finish, not re-architect.

**New constraint from this session: SCRAPS needs to actually work on
mobile.** This wasn't decided in the original interview — the app currently
reads as designed for mouse and a wide viewport (hover-dependent menu
states, click-based card interactions, `100vh`/`overflow:hidden` layout).
"Mobile-friendly" here means responsive layout and usable touch
interactions at phone width, not a separate mobile-only experience and not
a wrapped app.

**Constraints that still hold:**
- No new dependencies beyond one-time audit tooling (an accessibility
  checker, a Lighthouse pass) — nothing shipped.
- No backend, no accounts, no new persisted data beyond what `stats.js`
  already stores in `localStorage`.
- Every visual fix goes through `src/styles/theme.js` — consolidating the
  three-places color problem is what makes the design audit (Section 6)
  and the mobile pass both faster and safer.

---

## 3. Prior art

Searched for existing games with SCRAPS' specific shape: two simultaneous
private hands scored separately, one shared/raidable public pile, an Ace as
a strip/counter-strip weapon, race to 11 win-by-2 with a 5-point sweep bonus.

**Closest things found:**

| Game | How close | What it does better | What it does worse (vs. SCRAPS) |
|---|---|---|---|
| [Cuttle / Scuttle](https://www.cuttle.cards/img/cuttle_rules.pdf) | Medium — 2-player, race to a point threshold (21), standard deck | Very clean rules-as-cards-as-mechanics design; a real established combat card game | No hidden/public hand split, no strip-and-counter-strip duel, no round structure |
| [Trash / Garbage](https://gameforgedaily.com/how-to-play-trash-card-game/) | Low-medium — refresh your hand by discarding into a shared area | Simple, well-known "clear your slots" hook | Solitaire-style, no real opponent combat, no scoring ladder |
| [Thief card game](https://jasongarber.com/blog/2013/02/11/thief-card-game/) | Medium — pairs from hand or discard pile, steal the top set from an opponent | The steal-from-opponent's-pile mechanic is the closest analog to Aces stripping the Scraps pile | No hidden hands, no Ace-as-weapon identity, casual/family-weight design |
| [Yaniv](https://en.wikipedia.org/wiki/Yaniv_(card_game)) | Low-medium — playable 2-player, race to reduce hand value, has real digital versions (Board Game Arena) with bots | Proven online audience, established digital home | Pure hand-value race, no public pile, no combat mechanic at all |
| [Egyptian Ratscrew Online](https://news.ycombinator.com/item?id=26021065) | Low as a game, high as a **launch precedent** | A solo dev shipped a homebrew card-game-vs-bots build straight to Show HN and it landed | Different game entirely — cited for launch strategy, not mechanics |
| [Skrap](https://www.pagat.com/invented/skrap.html) (pagat.com invented games) | Low — another homebrew 2-5 player game, coincidentally similar name | Established homebrew-rules-documentation format (pagat.com is the reference site for this) | "Battle bots to collect heads," structurally unrelated to SCRAPS |
| Gwent's "Scraps" ability, Steam's "Scrap Collector," BGG board game "SCRAP," itch.io's "Scrap!" | Name-only collisions | — | None are 2-player browser card games; no real confusion risk, just noted for awareness if this ever needs a trademark search |

**Verdict: open ground, and now confirmed rather than just inferred.**
Nothing found combines SCRAPS' actual ingredients — simultaneous private +
public hands, a raidable shared pile, Ace-as-weapon with a counterable
strip, and the 11/win-by-2/5-for-a-sweep scoring ladder. Cuttle, Trash, and
Thief each supply one ingredient in isolation; none combine them. Stan
confirming this was independently invented, not adapted from something he'd
seen, matches what the search turned up — this is a genuine original
mechanic, and a real asset for launch positioning.

**What to stay away from:** nothing structural. The only overlap worth
naming is the word "Scraps" itself showing up as a keyword/ability inside
Gwent — not close enough to matter, but don't lean on Gwent-adjacent visual
language (that specific card-crafting UI style) since it's the one existing
thing that shares the name.

---

## 4. Game balance — the open question

**Stan's concern, in his words:** the current mechanics may let the Scraps
hand (the public, 2-point pile) get too strong — players are seeing
four-of-a-kind come up often enough that it feels less like a rare, earned
moment and more like a routine outcome. He wants to discuss ways to even
out the gameplay, not necessarily commit to a specific fix yet.

**This is explicitly a discussion item, not a prescribed fix.** The session
below (Section 9, Session 2) is scoped as diagnose-and-decide-together, not
"go rebalance the engine."

**A starting hypothesis, not yet verified against the actual draw logic in
`engine.js`/`reducer.js`:** CLAUDE.md's own gotchas section flags that
`createDeck()` deliberately builds two full 52-card decks (104 cards, 8
copies of every rank) instead of one — called out as intentional
infrastructure, tied to cards needing a unique `id` since rank+suit alone
isn't unique anymore. That choice is almost certainly *why* quads come up
more than expected: with 8 copies of each rank in play instead of the usual
4, and both players actively cycling cards through a hand plus a Scraps
pile capped at 7 each, the odds of clustering four of a kind are
structurally higher than in a standard single-deck game. The two-deck
design wasn't a bug — it was a deliberate choice for a different reason —
but its knock-on effect on hand quality is what's now in question.

**Options worth putting on the table for that discussion** (none decided,
all need Stan's read on which changes the feel of the game he actually
wants to keep):
- Go back to a single 52-card deck (biggest structural change — cuts
  duplicate density in half, but changes the `id`-uniqueness assumption
  CLAUDE.md says the engine currently relies on).
- Keep two decks but change what counts as a legal trade into the Scraps
  pile, so quads are harder to assemble on purpose rather than by chance.
- Leave the deck as-is and rebalance scoring instead — make a four-of-a-kind
  Scraps hand worth relatively less, or a plain/weak Scraps hand worth
  relatively more, so the outcome matters less even if it's common.
- Leave the odds alone and add a soft cap or cooldown on how fast a strong
  Scraps hand can be assembled via trading.

**Before that discussion:** the session should start by actually reading
the draw/trade logic in `engine.js` and running or writing a quick
probability check, so the conversation starts from real numbers instead of
a hunch — including Stan's own hunch above.

---

## 5. Creative direction — sound, and what's already built

Given the added scope, this section now carries the sound identity work in
full, plus a note on what's already solid.

**Checked and already built, no action needed:** the Full Scrap win already
has its own "elaborate celebration" treatment (`FullScrapLightbox` in
`overlays.jsx`) — the biggest scoring moment already gets its own payoff.

**Sound design — now a full pass, not a small twist.** `src/audio.js`
currently has ten hand-written Web Audio cues (click, whoosh, victory
fanfare, crescendo, error, win/lose, grand fanfare, firework pop, neutral
jingle), all synthesized live with oscillators and noise buffers — zero
audio files, which is already a strong, distinctive technical foundation.
What hasn't been checked yet, and is now the scope of Session 4:
- Whether the ten existing cues actually share a sonic identity — same
  waveform choices, a consistent pitch/scale relationship, consistent
  envelope shapes — or whether they were written ad hoc and just happen to
  coexist. A real audio identity means someone could hear three cues in a
  row with the game hidden and recognize them as the same game.
- The gap this brief already flagged: no distinct cue for an Ace strip or
  an Ace-vs-Ace counter-strip, the single most "SCRAPS" moment in the game,
  which currently reuses a generic action sound.
- Whether the mix is calibrated for a full playthrough — nothing should
  clip, and nothing should become actively annoying on the fifth repeat of
  a round (a real risk with synthesized tones specifically, since they lack
  the natural variation a sampled sound has).
- Whether there's a missing cue anywhere that matters — turn change, an
  invalid move, a card selected — and whether adding those cues would help
  or would just add noise.

No conceptual pivot on the game itself is offered — the mechanic is
already a genuine original invention (Section 3), and any pivot on *feel*
belongs in the sound and design sessions below, not as a separate idea.

---

## 6. Foundations pass

Reconciled against CLAUDE.md's existing Known Issues list, plus what this
session's audit added: mobile QA, a formal design audit (balance, negative
space, focus, motion), and a UX/UI heuristics pass.

**Accessibility — highest risk category for this project.**
- Menu options are `<div>`s, not `<button>`s (CLAUDE.md, confirmed): not
  keyboard-focusable, not announced by screen readers, invisible to browser
  automation. This blocks a whole category of players before the splash
  screen even resolves. Fix: semantic buttons/roles + visible focus states.
- The 100vh/`overflow: hidden` clipping bug (CLAUDE.md, confirmed): below
  ~800px viewport height the player's own hand is cut off with no scroll
  fallback. On a 1280×720 laptop, unplayable — and this is the same root
  issue the new mobile pass has to solve, just at a more extreme width.
- Also in scope: reduced-motion handling for the CSS keyframe animations in
  `index.html`, AA contrast on `slate #8A8FA8` text against `dusk #1C1C28`,
  and whether any game state (whose turn, score changes, an Ace strip) is
  conveyed by color alone.

**Mobile QA — new this session.**
- Responsive layout at phone, tablet, and desktop widths — not just "does
  it not clip," but does the card fan, the Scraps pile, and the HUD stay
  legible and usable at ~375px wide.
- Touch targets sized for a finger, not a cursor — the `.menu-opt`/
  `.diff-opt` hover classes and any small icon buttons need a real look;
  hover-only affordances need a touch equivalent since there's no hover
  state on a phone.
- Whatever the card-move interaction currently is (click-based, per the
  gotchas about drag/keyboard-hostile patterns) needs to actually work by
  touch, not just by mouse.
- Real-device testing, not just a resized browser window — at minimum, one
  actual phone before this is called done, plus the cold-cellular smoke
  test already planned for the launch session.

**Design audit — new this session: balance, negative space, focus, motion.**
- **Balance:** does the table's visual weight match what actually matters
  each turn — is the thing the player needs to look at (whose turn, what
  just happened) the thing that's visually loudest, or is it competing with
  decorative elements (the backdrop swirl, card back patterns)?
- **Negative space:** the game currently packs three hands, a deck, a
  discard pile, and a HUD into one `100vh` view — worth checking whether
  anything's fighting for room versus whether the density is intentional
  and works.
- **Focus:** in the visual-design sense (what draws the eye first) as
  distinct from the accessibility sense (keyboard focus, above) — does each
  screen have one clear focal point, or does everything compete equally?
- **Motion:** an inventory of every animation and keyframe currently in
  `index.html` and the timer-driven choreography in `GameScreen.jsx` — is
  each one purposeful (communicates a state change) or decorative, are
  timings and easing consistent across similar actions, and does anything
  feel like it's fighting the reduced-motion fix from the accessibility
  pass instead of complementing it?

**UX/UI best practices — new this session.**
- Standard heuristics pass: is it ever unclear what's clickable, is
  feedback immediate and legible after every action, is an invalid move
  (e.g. trying to overfill a capped pile) communicated clearly rather than
  just silently rejected, can a first-time player recover from a mistake
  without real cost.
- Specifically worth checking given CLAUDE.md's own gotchas: since menu
  options are currently non-standard `<div>`s, are there other places in
  the UI using a custom interactive pattern where a native element (a real
  `<button>`, a real `<select>`) would be both more accessible and less
  code to maintain.

**Security and data.**
- No backend, no API keys, no user accounts — the attack surface is small
  by design and this pass keeps it that way.
- `npm audit`: five vulnerabilities, all in the esbuild chain pulled in by
  Vite 5/Vitest, dev-server-only, doesn't ship to production (CLAUDE.md,
  confirmed). Leave as-is per CLAUDE.md's existing call — document *why* in
  the privacy/rights write-up so it doesn't look like an oversight.
- `localStorage` key `scraps-stats-v1` (win/loss record) is already
  try/caught for private-browsing (CLAUDE.md, confirmed) — no action needed.

**Privacy and data.**
- **Not previously flagged, found during this review:** `index.html` loads
  Google Fonts from `fonts.googleapis.com`/`fonts.gstatic.com` via
  `<link>`. Every visitor's IP address goes to Google before the fonts load
  — this is the exact pattern behind the German court rulings that made
  Google Fonts a live GDPR issue for EU visitors. The clean fix is
  self-hosting the four font files (Bebas Neue, Righteous, Space Grotesk,
  Space Mono) instead of linking Google's CDN — small, doesn't add a
  dependency, removes the issue outright rather than needing a disclosure.
- No accounts, no forms, no email capture currently exist in the app
  itself, so the only privacy surface is: font loading (above), `localStorage`
  stats (already local-only, never leaves the browser), and whatever Vercel
  Analytics or similar gets added during the launch session. GDPR
  realistically applies to any public site with EU reach regardless of
  size — worth a short privacy policy page for that reason alone, not
  because SCRAPS collects much.
- This isn't legal advice; if this project ever adds accounts, payments, or
  anything sensitive, get an actual lawyer's read. For a stats-only card
  game it's low-stakes, but "low-stakes" isn't "zero paperwork."

**Legality and rights.**
- Fonts: Google Fonts' four families are all OFL-licensed — fine to
  self-host, no attribution required but worth crediting in the rights
  inventory anyway.
- No images, audio files, or third-party datasets exist in the repo
  (CLAUDE.md, confirmed) — nothing to license-check there. `src/audio.js`
  being fully synthesized means there's no audio licensing surface at all.
- No other people's content appears in the app — no user-submitted
  material, no scraped content — no moderation/takedown surface needed.
- Worth a beat of awareness given Section 3's name collisions: none are
  browser 2-player card games, so no real confusion risk, but a formal
  trademark search would be the next step if this ever needs one.

**Common sense.**
- The clipping/mobile issue (above) is the single biggest "confuses/breaks
  in the first five seconds" risk — it's not a subtlety, it's the game not
  working on a normal laptop or phone.
- Behavior on a slow connection (font loading, though `display=swap` is
  already set) and behavior if Vercel itself is briefly down — low risk
  given no backend, but worth a cold look during the launch session's smoke
  test.

---

## 7. Work smarter

- **Self-host the fonts** instead of debating a privacy disclosure — this is
  the "boring fix beats a policy" move for the Google Fonts issue above.
  `@font-face` + the four `.woff2` files checked in is simpler than it
  sounds and removes a third-party request entirely.
- **Fix the color tokens once, centrally**, before touching the design
  audit or the mobile pass — every other task (contrast, the Ace-strip
  visual treatment, responsive layout work) gets faster and safer once
  `theme.js` is the actual single source instead of an aspirational one.
- **Use real tools for the audits, not just manual review** — axe DevTools
  or Lighthouse for accessibility, Chrome's device toolbar plus one real
  phone for the mobile pass, and the browser's own audio devtools for
  checking the sound mix doesn't clip. One-time tools, nothing shipped.
- **Repoint the git remote** (CLAUDE.md flags this: `origin` points at
  `stanbaudrey/scraps3` but the repo actually lives at
  `unclescrunch/scraps3`, kept alive only by GitHub's rename redirect) —
  five-minute fix, currently a silent single point of failure.
- **Don't refactor `GameScreen.jsx`** this pass. It's flagged as 1,012 lines
  mixing three concerns, which is real, but it's a code-health issue with no
  user-visible payoff and real risk of introducing bugs right before a
  launch. Worth its own session later.
- **Ground the balance discussion in real numbers before changing
  anything** — read the actual draw/trade logic and check the real
  probability of a quad before picking a fix, rather than guessing from the
  two-deck hunch alone.

---

## 8. Launch strategy

**The origin story is the lead, now that it's confirmed:** Stan and his
wife invented this game themselves. Every draft below leads with that
instead of a generic "I built an app" framing — it's a stronger hook and
it's true.

**Venues — Stan asked for Reddit/card-game communities plus friends, and
was open to more:**

| Venue | Fit | Note |
|---|---|---|
| Friends / word of mouth | High, low-risk | Recommended as the actual first move — see sequencing below |
| Hacker News (Show HN) | High | Strong precedent: Egyptian Ratscrew Online (a homebrew card game vs. bots) landed here. SCRAPS has two good hooks now: an invented-game origin story, and a "zero image files, zero audio files, hand-synthesized Web Audio, zero runtime deps" technical story. |
| r/webgames | Likely good fit | Couldn't verify current self-promotion rules by search — Reddit's live pages aren't fetchable from here. Check the sidebar rules directly before posting. |
| r/cardgames | Possible fit, unverified | Same caveat — check live rules before posting. This sub skews toward physical/tabletop card game discussion, and it's exactly the right audience for "we invented an original card game" — worth leading with the ruleset and the origin story here specifically. |
| r/InternetIsBeautiful | Possible, with a real catch | No sign-up requirement (good — SCRAPS qualifies). But it enforces a strict 90/10 rule: ~90% of recent Reddit activity has to be unrelated to your own site, or the post gets pulled. Check Stan's account history before counting on this one. |

**Draft copy per venue:**

*Show HN:*
> Show HN: SCRAPS – a card game my wife and I invented, built for the browser
>
> My wife and I invented a two-player card game a while back — three hands
> per round (two private, one public), a shared pile you raid to draw fresh
> cards, and Aces you can discard to strip your opponent's board (they can
> counter with an Ace of their own). I built it as a real browser game
> against an AI opponent. Every card back, icon, and the table backdrop is
> inline SVG — no `public/` directory, no image files anywhere in the repo.
> All sound is generated live with the Web Audio API, so there are no audio
> files either. React, zero runtime dependencies otherwise. [link]

*r/cardgames (leads with the invented-game angle, this audience cares most
about mechanics):*
> **My wife and I invented a 2-player card game called SCRAPS — full rules
> inside, plus a free browser version to actually try it**
>
> [Full rules: two private "small hands" worth 1 point each, one public
> Scraps hand worth 2. Move cards into your Scraps pile to draw fresh ones,
> both piles cap at 7. Aces are a weapon — discard one to strip two cards
> from the opponent's Scraps pile, they can counter with an Ace of their
> own. First to 11, win by 2. Sweep both small hands and the Scraps hand in
> one round for a Full Scrap, worth 5.] Built a browser version to actually
> playtest it against an AI. [link] — would love feedback on the rules
> themselves as much as the build.

*r/webgames (leads with "play now," less rules-forward):*
> **SCRAPS — a fast, mean 2-player card game vs. AI (browser, free, no
> download)**
>
> An original card game — invented it with my wife, then built this as a
> real playable version. Two private hands worth 1 point each, a public
> "Scraps" pile worth 2. Aces let you strip your opponent's pile, and they
> can counter-strip right back. First to 11, win by 2. [link] — feedback
> welcome, especially anything that breaks on your setup.

*Friends / word of mouth:* no drafted copy needed — direct message, not a
public post. Just the link and "built this, tell me if anything breaks."

**Sequencing:** friends first — catches obvious bugs and rough edges with
zero public downside. Then Show HN, since the technical story is strong and
HN traffic is a good stress test before wider Reddit exposure. Space the
subreddit posts a few days apart rather than same-day — posting to
r/webgames and r/cardgames on the same day reads as a coordinated push, not
organic sharing.

**KPI targets (honest, not vanity):** given this is a new, quiet launch —
50 real visitors and a handful of people who play a full round to a
finish is a good first-week outcome. A flop worth learning from looks like:
under 15 visitors, or a bounce before the first hand resolves (that would
point at a mobile/clipping problem or a metadata/share-card issue, not the
game itself).

**Avoid:** don't post to r/InternetIsBeautiful unless Stan's Reddit account
already has real unrelated activity. Don't post the same copy to r/webgames
and r/cardgames — the drafts above already differentiate them for this
reason.

*Stan: tell me which of these venues you want in and which to cut — this
list wasn't narrowed down yet.*

---

## 9. Build plan

Seven sessions, reflecting the real scope after this round's additions —
sequenced so the balance question gets settled before the polish work
builds on top of it, and mobile/design/sound work each get real room
instead of being squeezed into a single QA pass.

### Session 1 — Fix what's actually broken ✅ Done (2026-08-24)

**Notes:** the clipping bug turned out to be one level deeper than the root
`100vh` div — that already had `overflow: auto` from an earlier partial fix,
but the actual table-content wrapper two levels in was still
`overflow: hidden` with no scroll fallback, so the player's hand and bottom
Scraps pile were genuinely unreachable below ~750px of viewport height
(confirmed live: at 1280×650 the hand was cut off entirely). Fixed by making
that wrapper scroll instead of clip. This is a working fix, not a full
responsive redesign — even at 1280×720 the content is still ~86px taller
than the viewport, so there's a small scroll to reach the bottom row rather
than everything fitting flush. Actually resizing the table to fit different
heights is Session 3's job (mobile/responsive QA); this session's bar was
"nothing gets permanently lost," which it now clears.

Colors: consolidated further than the brief's four named files. A full grep
turned up stray hardcoded hex in `cards.jsx`, `icons.jsx`, and `overlays.jsx`
too, so those got fixed as well. `theme.js` is now the real single source
for every JS-side color. `index.html` can't import a JS module and still be
ready before first paint, so it keeps one `:root` CSS-variable block instead
— color-mix() derives every alpha variant from the three base vars, so
there's exactly one hex value per color across the whole file. Left the
fireworks confetti palette (`#ff99cc`, `#ccff66`, `#99ccff`, `#fff`) alone —
those are deliberate decorative extras for the Full Scrap celebration, not
brand tokens, so folding them into `DS` would misrepresent them.

Also created `.claude/launch.json` — CLAUDE.md documented a dev server
pinned to port 5193, but no config for that existed anywhere. It does now.

All 37 tests pass, production build succeeds, verified live at 1280×720 and
1280×650 in-browser (card selection, trade-in flight animation, and the
Begin Round interstitial all render with the consolidated colors correctly).
Previewed, then published to `main` — live at
[scraps3.vercel.app](https://scraps3.vercel.app).

An `/impeccable critique` ran on `GameScreen.jsx` before the merge (required
on every publish, not just the first): **29/40, Good**. Nothing it found
blocks this session's actual changes — the P1s (no skip/undo on chained
animations, bounce easing used even on error states, card selection has zero
keyboard path — a gap bigger than the already-tracked menu-`<div>` issue)
are all pre-existing and already fall inside Session 5's planned
design/UX/accessibility audit, so they're not new debt from this session.
Full report: `.impeccable/critique/2026-08-25T00-02-56Z__src-screens-gamescreen-jsx.md`.
Worth reading before Session 5 starts — it's more specific than this brief's
existing accessibility notes about how deep the keyboard gap actually goes.

**Goal:** the game works everywhere and the color system is real, not
aspirational.
**Bring:** this brief, CLAUDE.md.
**Opening prompt:**
> Read PROJECT-BRIEF.md and CLAUDE.md. Fix the viewport clipping bug — the
> game root is `height: 100vh` with `overflow: hidden` and no scroll
> fallback, so below ~800px viewport height the player's hand is cut off
> with no way to reach it. Then consolidate the color palette: `theme.js`
> has the `DS` tokens, `index.html` repeats the same hex values as CSS
> literals, and `flight.jsx` hardcodes all of them again with no import of
> `DS` at all; `buttons.jsx` introduces two more hover tints that aren't
> tokens anywhere. Make `theme.js` the actual single source and update the
> other three files to import from it instead of repeating literals. Test
> at 1280×720 and at a few narrower widths. Push to a preview when done.
**Done when:** the game is fully playable (hand visible, no clipping) at
1280×720 and smaller, and a color change only needs editing one file.

### Session 2 — Game balance discussion ✅ Done (2026-08-25)

**Notes:** simulated the actual draw/trade/Ace logic in `engine.js` (20,000
AI-vs-AI rounds on 'hard' difficulty, both sides playing full trade and
Ace strategy) rather than deriving odds by hand. Real numbers, two decks
(the code as it stood): Quads appeared in 1.4% of individual Scraps hands,
and at least one player ended a round with Quads 2.8% of the time (2 of
20,000 rounds had both players with Quads simultaneously). Full House ran
5.3%. Re-ran the identical simulation against a hypothetical single
52-card deck: Quads dropped to 0.4% of hands / 0.7% of rounds — roughly a
4x drop — with Full House also down to 3.5%. Confirms Stan's hunch and
the brief's own hypothesis: the two-deck design (8 copies of every rank
instead of 4) was structurally inflating quad frequency.

Also checked deck-exhaustion risk before recommending single-deck as safe:
simulated per-round card consumption (dealing plus every trade's draw) —
two decks averaged 24.9 cards consumed/round with 78 minimum remaining
seen across 20,000 rounds; one deck averaged 25.1 consumed with 26 minimum
remaining seen, and never ran dry in any trial. A single 52-card deck has
enough slack for a full round every time.

Stan picked **switch to a single 52-card deck** (of the four options in
Section 4) over trade-legality changes, scoring rebalance, or a cooldown.
Implemented in `createDeck()` (`engine.js`) — one loop instead of two.
`id` stays on each card for compatibility even though rank+suit is unique
again; nothing needed it removed.

Found and fixed one regression from the deck-size change while verifying:
the tutorial's rigged deal (`buildRoundDeal` in `reducer.js`) seeds the
AI's starting Scraps with two 5s to force a four-of-a-kind setup. It only
pooled 5s from `remainingDeck`/`aiScraps`, which was safe with 8 copies of
each rank in the shoe but wasn't reliable with only 4 — simulation showed
the guarantee drop from 100% (two decks) to 95.8% (one deck) before the
fix. Fixed by pooling every 5 currently in play (hand, scraps, and deck,
for both players) and backfilling any slot that loses one with a
substitute card — verified back to 100% across 5,000 simulated tutorial
deals. Separately noticed, but did **not** fix (pre-existing, unrelated to
deck size, unaffected by this fix): the AI's actual first tutorial trade
(`GameScreen.jsx`, the `ai-turn-1a` script override) only plays the seeded
5s if they land naturally in the AI's dealt hand, which simulation shows
happens ~4% of the time regardless of deck size — the rest of the time it
silently falls back to generic trade logic while still logging "Opponent
trades in two 5s." Worth a look in a future session; out of scope here.

Also updated the "game of twos" rules blurb in `MenuScreens.jsx` and
`overlays.jsx`, which explicitly said "Two decks" — changed to "Two
hands" so the in-app rules text doesn't contradict the new engine. Updated
CLAUDE.md's two-deck gotcha to describe the current single-deck reality
and this session's reasoning.

All 37 tests pass, production build succeeds.

**Goal:** decide together whether and how to even out the Scraps hand's
odds, grounded in the actual draw/trade logic, not just a hunch.
**Bring:** this brief (Section 4), CLAUDE.md's gotcha about the two-deck
design.
**Opening prompt:**
> Read PROJECT-BRIEF.md, especially Section 4. I'm concerned the public
> Scraps hand is too strong — I'm seeing four-of-a-kind come up often
> enough that it feels routine rather than rare. Before proposing a fix,
> read the actual draw and trade logic in `engine.js` and `reducer.js` and
> work out (or simulate) the real probability of ending up with a quad in
> the Scraps pile, given the two-deck, 104-card setup. Bring me the real
> numbers, then let's talk through the options in Section 4 — single deck,
> a trade-legality change, a scoring rebalance, or a cap/cooldown — and
> decide together before you implement anything.
**Done when:** we've seen real probability numbers, discussed the options,
and agreed on either a specific change or that the current balance is
actually fine.

### Session 3 — Mobile and responsive QA
**Goal:** SCRAPS is genuinely playable on a phone, not just non-broken.
**Bring:** this brief (Section 6), Session 1's preview.
**Opening prompt:**
> Read PROJECT-BRIEF.md, especially the Mobile QA part of Section 6. Make
> the layout responsive at phone and tablet widths, not just "not clipped"
> — the card fan, Scraps pile, and HUD all need to stay legible and usable
> around 375px wide. Size touch targets for a finger, not a cursor,
> including the `.menu-opt`/`.diff-opt` elements. Make sure whatever the
> card-move interaction currently is works by touch, since there's no hover
> state on a phone. Test in the resizable device toolbar first, then flag
> anything you want me to check on an actual phone before we call this
> done.
**Done when:** the full game is playable start to finish on a real phone,
touch targets are appropriately sized, and nothing depends on a hover state
that doesn't exist on touch.

### Session 4 — Sound identity
**Goal:** SCRAPS has one cohesive, recognizable sound, not ten disconnected
cues.
**Bring:** this brief (Section 5).
**Opening prompt:**
> Read PROJECT-BRIEF.md, especially Section 5. Audit the ten existing cues
> in `audio.js` for a shared sonic identity — consistent waveform choices,
> a consistent pitch/scale relationship, consistent envelope shapes —
> rather than treating them as ten independent one-offs. Add distinct cues
> for an Ace strip and an Ace-vs-Ace counter-strip, the game's signature
> moment, which currently reuses a generic action sound. Check the mix for
> anything that clips or gets fatiguing on repeat plays across a full
> round. Flag, but don't necessarily add, any other cue gaps you find (turn
> change, invalid move, card selected) — tell me what you'd add and why
> before writing it.
**Done when:** all cues share a recognizable identity, the Ace-strip moment
has its own sound, and a full playthrough doesn't produce anything jarring
or repetitive.

### Session 5 — Design and UX audit
**Goal:** the game reads clearly at a glance and follows real UI/UX
practice, not just "looks fine."
**Bring:** this brief (Section 6).
**Opening prompt:**
> Read PROJECT-BRIEF.md, especially the Design audit and UX/UI parts of
> Section 6. Do a formal pass on: balance (is the visually loudest thing on
> screen the thing that actually matters that turn), negative space (is
> anything fighting for room, or is the density intentional), focus (does
> each screen have one clear focal point), and motion (inventory every
> animation, check each is purposeful and consistently timed, and make sure
> nothing fights the reduced-motion handling). Then a standard UX heuristics
> pass: is everything clickable obviously clickable, is feedback immediate
> after every action, are invalid moves communicated clearly instead of
> silently rejected. Also finish the accessibility items from Section 6:
> convert the menu `<div>`s to real focusable buttons, fix contrast where
> needed, respect `prefers-reduced-motion`.
**Done when:** an accessibility checker shows no critical issues, keyboard
navigation works end to end, and you can walk me through what changed for
balance, negative space, focus, and motion with before/after specifics.

### Session 6 — Security, privacy, and rights
**Goal:** nothing leaks, nothing's unlicensed, the fine print is real.
**Bring:** this brief.
**Opening prompt:**
> Read PROJECT-BRIEF.md. Self-host the four Google Fonts (Bebas Neue,
> Righteous, Space Grotesk, Space Mono) instead of loading them from
> `fonts.googleapis.com`/`fonts.gstatic.com` — this removes the
> third-party-request privacy issue outright. Repoint the git remote from
> `stanbaudrey/scraps3` to `unclescrunch/scraps3` (currently only works via
> GitHub's rename redirect). Write a short privacy policy page, linked from
> wherever makes sense in the UI: what's collected (currently just the
> `scraps-stats-v1` localStorage stats, plus whatever analytics gets added
> in the launch session), why, where it lives, and that nothing leaves the
> browser except analytics. **Stop and show me the actual privacy policy
> text before treating this as done** — don't just fill in a template.
**Done when:** fonts are self-hosted, the git remote points at the real
repo, and Stan has explicitly signed off on the privacy policy text.

### Session 7 — Findability and launch
**Goal:** the game looks right when shared, gets found by search/AI
crawlers, and goes live on the agreed schedule.
**Bring:** this brief (Section 8 has the drafted copy and venue list).
**Opening prompt:**
> Read PROJECT-BRIEF.md. Keep or refine the existing title and meta
> description in `index.html` (SCRAPS — Two Hands. One Table. No Mercy.).
> Add: a favicon, Open Graph and Twitter card tags with a real 1200×630
> share image, a canonical tag, `sitemap.xml`, `robots.txt`, JSON-LD for the
> game, and an `llms.txt` for AI crawlers. **Stop and show me every literal
> field value — the actual title tag, the actual description, the actual OG
> image — before moving on.** Once approved: walk the game on preview once
> more, publish to production, smoke test the live URL cold on a phone on
> cellular data, confirm the share card and favicon render when the link is
> pasted somewhere real, confirm rollback works. Set up a monthly scheduled
> check for broken links, outdated dependencies, and uptime. Then work the
> launch plan in Section 8: friends first, then Show HN using the drafted
> copy, then the subreddits once their posting rules are double-checked
> live — space those a few days apart.
**Done when:** Stan has approved every metadata field, the live site passes
a cold mobile smoke test, the monthly check is running, and the friends +
Show HN posts are live using the drafted copy.

---

## Session tracker

| # | Session | Status |
|---|---|---|
| 1 | Fix what's actually broken (clipping, color tokens) | Done |
| 2 | Game balance discussion | Done |
| 3 | Mobile and responsive QA | Not started |
| 4 | Sound identity | Not started |
| 5 | Design and UX audit | Not started |
| 6 | Security, privacy, and rights | Not started |
| 7 | Findability and launch | Not started |
