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

Notion **is** connected (the note here previously said it wasn't — that
was stale from kickoff). A project mirror lives there under **SCRAPS** and
is updated at the end of each session. This file remains the source of
truth; Notion is a summary of it, not a second copy to reconcile.

> **Process note (2026-08-27) — this is a legacy-format project, on purpose.**
> Stan's setup adopted a split record format for new projects (a short brief
> plus an append-only `SESSION-LOG.md`, with a one-way Notion flow). This
> project predates it and stays on its established process: the full record
> lives in this file, sessions log here exactly as the entries below already
> do, the session tracker table at the bottom stays authoritative, and
> Notion is maintained the way this brief describes. Do not migrate
> mid-flight, do not create a `SESSION-LOG.md` here, and nothing in the
> remaining plan (Sessions 4, 5, 6, 7) moved because of the process change.
> Migration to the split format is optional later, at a natural boundary and
> on Stan's say-so. The new `minigame` skill distills lessons from this
> project (and knowtient); sessions here may load it as guidelines, but this
> brief's decisions outrank it.

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
- ~~Menu options are `<div>`s, not `<button>`s~~ — **closed 2026-08-26**
  by the unplanned splash-identity pass, which recorded it only in Notion
  and left this line, the Session 5 prompt and two Notion tables all
  still describing it as open. Verified end to end 2026-08-27: the picker
  is a real `<button>`, cards carry `role`/`tabIndex`/`aria-pressed` with
  spoken labels, and one global `:focus-visible` rule replaced the
  `outline:'none'` every primitive was setting.
- The 100vh/`overflow: hidden` clipping bug (CLAUDE.md, confirmed): below
  ~800px viewport height the player's own hand is cut off with no scroll
  fallback. On a 1280×720 laptop, unplayable — and this is the same root
  issue the new mobile pass has to solve, just at a more extreme width.
- Also in scope: reduced-motion handling for the CSS keyframe animations in
  `index.html`, ~~AA contrast on `slate #8A8FA8` text against
  `dusk #1C1C28`~~, and whether any game state (whose turn, score changes,
  an Ace strip) is conveyed by color alone. **All three done 2026-08-27 —
  see the Session 5 entry.** The contrast pairing named here was the
  pre-reskin neon palette and had not existed since 2026-08-25; the audit
  against the real Forest Dusk tokens found two AA failures this line
  could never have caught, the worse of them the rank on every red card
  in your hand at 1.98:1. Colour-alone: passes, nothing depends on hue.

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
  self-hosting the five families instead of linking Google's CDN — small,
  doesn't add a dependency, removes the issue outright rather than needing
  a disclosure. **The families are Bungee Shade, Fjalla One, Baloo 2,
  Work Sans and IBM Plex Mono** (corrected 2026-08-27 — this brief named
  the pre-reskin four, and then a Spectral set that was itself replaced;
  `index.html`'s `<link>` and `theme.js`'s `F` object are the only two
  places that have ever been right). Only some weights are loaded — Bungee
  Shade and Fjalla One at 400, Baloo 2 at 600/700/800, Work Sans at
  400/500/600/700, IBM Plex Mono at 400/500/700 — and self-hosting should
  ship exactly those, not the full families.
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
- Fonts: all five families are OFL-licensed on Google Fonts — fine to
  self-host, no attribution required but worth crediting in the rights
  inventory anyway. Re-confirm each licence at self-host time rather than
  taking this line's word for it; that is a two-minute check and the
  licence is what makes the whole plan legal.
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

### Unplanned session — Forest/national-park brand reskin ✅ Done (2026-08-25)

**Not one of the seven planned sessions above — a full visual identity
pivot Stan asked for directly, done between Session 1 and Session 2.** Two
brand directions were explored in chat first (a "gzhel" Russian-porcelain
direction, then this one); this session executed the forest direction only.
The gzhel exploration was never implemented in code — it's preserved as a
portable, project-agnostic style guide at
`~/Projects/.claude/styles/gzhel.md` for a future project, not part of this
repo.

**What changed:** every `DS` color token in `theme.js` was reassigned from
the neon-arcade palette (`voltage` acid green, `ember` hot pink, `dusk`
navy, `slate` cool grey) to a warm "Forest Dusk" palette — deep pine
backgrounds, a warm parchment `frost`, `ember` recolored to a warm orange
(opponent/red-suits/danger), `voltage` recolored to a bright leaf green
(yours/active), plus three new tokens: `gold` (reserved strictly for
milestones — Full Scrap, the win screen, and playing your own Ace, never
general UI), `goldHover`, and `canopy` (decorative pine green for
illustration only, not UI chrome). **Token names are unchanged** — every
consuming component picked up the new palette automatically — but every
specific hex value Session 1's notes reference above is now stale.

Fonts changed too: Bebas Neue/Righteous/Space Grotesk/Space Mono →
Spectral (display + card, semibold/bold, italic for the wordmark) / Work
Sans (UI) / IBM Plex Mono (mono), still loaded from Google Fonts.

> **Superseded (2026-08-27).** The Spectral set above did not survive the
> specimen review later the same day, which split it into Bungee Shade
> (wordmark only), Fjalla One (headings) and Baloo 2 (card faces) — see
> the type note in `theme.js`. So the stack is five families, not three or
> four. This paragraph's warning that Session 6's opening prompt named the
> wrong fonts was correct and went unactioned for two days; that prompt,
> Section 6 and CLAUDE.md are all corrected now, and the lesson is that a
> font list written in three places drifts exactly like a colour palette
> written in three places does.

Beyond the token swap: `CardBackSVG` in `cards.jsx` was redrawn from a
diamond-pattern back into a layered ridge-line/pine-canopy scene with a low
gold glow; `SwirlBg` in `backdrop.jsx` was redrawn from three neon radial
gradients into a soft warm dawn/dusk wash; a new `gold` button variant was
added to `Btn`/`BigBtn` and wired to the player's own "Play Ace"/"confirm
Ace" actions specifically (the opponent-plays-ace threat modals stay in the
ember/danger register — that split was a deliberate call, not an oversight,
since the two events have opposite narrative framing: playing your own Ace
is a milestone, an opponent's Ace against you is a threat). Full Scrap and
Win screen recolored from `voltage` to `gold` throughout, including their
fireworks palettes, which Session 1 explicitly left alone as "deliberate
decorative extras" — that call is superseded here, since keeping neon
pink/lime/sky-blue confetti against a warm palette would have looked wrong.
Several hardcoded `rgba()` literals matching the old navy (modal scrims,
canvas fade trails, one text-shadow) were also found and updated to match —
these had slipped through Session 1's consolidation because they were raw
RGB arithmetic, not `DS.token` references, so a token-only grep wouldn't
catch them.

**Confirmed working:** all 37 tests pass, production build succeeds.
Verified live in-browser: splash screen, rules panel, difficulty picker,
the main game table, the fanned hand (both face-up and the new card-back
scene face-down), card selection glow, and the hint banner. **Not verified
live** — reasoned through the code but not clicked through in a real
playthrough: the Full Scrap celebration, the Win/Lose screens, and the
three Ace modals. Worth a look before this goes to preview.

**Not touched this session:** balance (Session 2), mobile/responsive
(Session 3), sound (Session 4), the accessibility/UX audit (Session 5,
though the menu-`<div>` and contrast issues it flags still apply unchanged
under the new palette), and font self-hosting (Session 6, now pointed at
the wrong font names — see above).

**Addendum, same session — pushed to preview, ran an impeccable audit and
a dual-agent design critique, fixed what the critique found.** Pushed to
`dev`, which required a real merge with Session 2's balance-fix push
(clean on code, one doc conflict in this file, resolved keeping both
entries). Audit score 10/20 (Acceptable) — driven by the already-tracked
accessibility/responsive gaps, not new damage. Critique score 30/40
(Good); full report at
`.impeccable/critique/2026-08-25T23-30-06Z__scraps-forest-dusk-reskin.md`.
Four issues came out of it and got fixed, per Stan's call to take all four
in one pass rather than defer to Session 3/5:
- The Scraps zone's horizontal overflow was silently clipping a full pile
  at narrow widths with no way to see the cut-off card — changed
  `overflowX:'hidden'` to `'auto'` on the table's scroll container
  (GameScreen.jsx); confirmed live that a 6-card pile now actually
  overflows-and-scrolls instead of vanishing.
- `slate` was failing AA contrast against `duskMid`/`duskLight` (3.9:1 /
  3.3:1, confirmed two independent ways — manual calculation and the
  critique's live in-DOM detector), lightened to `#98A290` (5.5:1 / 4.6:1,
  both now pass).
- The scrollbar was nearly invisible (5px, 27% opacity) — bumped to 8px/
  55%, plus Firefox `scrollbar-color`, as the general fix for "clipped
  content gives no cue that scrolling exists."
- The splash wordmark's gold "A" broke the theme's own "gold means
  milestone, nothing else" rule — moved to fern per Stan's call.

Left alone per Stan's call: the zero-offset colored glow effects the
critique's live detector flagged as an unexamined carry-over from the old
neon palette — kept as-is, judged to still read as confident emphasis
rather than a mismatch with the new painterly direction.

**Still not done:** the RevealOverlay overflow and Full Scrap/Win/Ace
modals still haven't been clicked through live in a real playthrough.
Session 3 and Session 5 still own the full mobile/responsive and
accessibility passes — this addendum fixed what the critique specifically
measured, not everything in those sessions' scope.

**Session close-out (2026-08-26):** three more rounds landed after the
addendum above, then the session was closed out.

Font finalization: two rounds of specimen review (5 then 10 more per
role) landed on Baumans/Unbounded as an interim pick, which Stan then
overrode directly — final type is **Bungee Shade** (title/wordmark only),
**Fjalla One** (every other header and subtitle), **Baloo 2** (card
ranks/suits). This split `F.display` into two tokens: `F.title` for the
wordmark alone, `F.display` repurposed for "everything else that used to
share it."

A second, narrower critique ran as a gut check specifically on the
brightness/contrast/type follow-up (not the whole reskin) — scored 18/20
on the heuristics that applied. It caught one real bug: the card back's
new outline frame and ambient sun/river glow were built with `DS.voltage`
and `DS.gold` — this file's own reserved "yours only" / "milestone only"
tokens — rendering on a neutral surface that's identical on the
opponent's hidden hand, the deck, and the discard pile. Fixed same
session: outline → `slate` (matches `PlayingCard`'s own face-down border
instead of duplicating it in a second color), sun/river → `ember`. Also
caught and fixed two more spots using hardcoded font-family strings
instead of the shared `F` tokens (`overlays.jsx`'s `RoundInterstitial`,
`flight.jsx`), the same "same value repeated" pattern Session 1 already
fixed once for colors. Both critique runs are persisted under
`.impeccable/critique/`.

**Notion synced (2026-08-26).** The kickoff-era brief said the Notion
connector wasn't authorized — that's now stale; it's connected, and a
real project mirror already existed at "Project: SCRAPS" (5 sub-pages:
Concepting through Refining). Updated the "5. Developing" session tracker
(added the unplanned reskin row, marked Session 2 done, tightened Session
3's bar, added Session 8) and the top-level "Where things stand" /
"Decisions I made" tables on "Project: SCRAPS" to match this file. This
file (`PROJECT-BRIEF.md`) remains the source of truth if the two ever
drift — Notion is the mirror, not the record.

**Final state at close:** every change is committed and pushed to `dev`
(not merged to `main` — production is still Session 1's state). All 37
tests pass and the production build succeeds as of the last commit. No
local dev server or background process was left running. **Not verified
live this session, still open:** the RevealOverlay overflow and the Full
Scrap/Win/Ace modals in their current (brighter, re-fonted) state — worth
a look before this goes to preview for real review, alongside everything
already listed as pending under Sessions 3, 5, and 8.

**Published to production (2026-08-26), separate session.** A third
pre-merge critique ran (final gate, per the publish process — not a new
audit, just confirming the last fix landed clean): go/no-go was go, no
regressions, 37/37 tests and build both green. `dev` fast-forward merged
into `main` and pushed — production is now this reskin's finished state,
live at [scraps3.vercel.app](https://scraps3.vercel.app). The
RevealOverlay/Full Scrap/Win/Ace verification gap above is still open;
publishing didn't close it, it just means that gap is now live rather
than on preview.

**Retro note, not written up as a rule change (Stan's call — kept as a
mental note only):** the card back's reserved-token bug (voltage/gold
used on a neutral surface) happened twice in one session, on the same
component, because nothing automated checks a reserved-token rule once
it's documented — it only surfaced because a critique happened to look
for it both times. And the original reskin went straight from a written
direction doc to a full build with no `/impeccable shape` pass first,
which is likely why the first version read "bland" and needed a whole
follow-up round. Worth remembering next time a visual identity swing this
large comes up — not acted on now.

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

### Session 3 — Mobile and responsive QA ✅ Done (2026-08-26)
**Goal:** SCRAPS is genuinely playable on a phone, not just non-broken.
**Bring:** this brief (Section 6), Session 1's preview.
**Updated bar (2026-08-25):** Stan tightened this from "responsive" to
strict — everything must fit inside the viewport on desktop and mobile
alike, with no scrolling ever. That's a harder constraint than Session 1's
interim fix (which still allows a small scroll at short viewport heights)
and than the horizontal-scroll fallback added on the Scraps pile during
the forest-reskin critique pass — both of those were deliberately
temporary safety nets, not the final answer, and this session should
replace them with a real reactive layout that never needs to scroll.
**Opening prompt:**
> Read PROJECT-BRIEF.md, especially the Mobile QA part of Section 6 and
> the note above it. Build a genuinely reactive layout — the whole game
> must fit inside the viewport on both desktop and mobile with no
> scrolling, ever, replacing the interim scroll fallbacks from Sessions 1
> and the forest-reskin pass. The card fan, Scraps pile, and HUD all need
> to stay legible and usable down to ~375px wide. Size touch targets for a
> finger, not a cursor, including the `.menu-opt`/`.diff-opt` elements.
> Make sure whatever the card-move interaction currently is works by
> touch, since there's no hover state on a phone. Test in the resizable
> device toolbar first, then flag anything you want me to check on an
> actual phone before we call this done.
**Done when:** the full game is playable start to finish on a real phone
and on desktop with zero scrolling anywhere, touch targets are
appropriately sized, and nothing depends on a hover state that doesn't
exist on touch.

**Notes:** the layout is two mechanisms now, in this order, and the order
is the point. The new module is `src/ui/viewport.jsx`.

**1. Reflow.** `layoutMode()` picks between the `wide` table (hand centred,
that side's Scraps beside it) and a `stack`ed one (hand above its own
Scraps, both full width). The choice is not "is this a phone" — it is
"which axis is scarce here". Side-by-side is width-hungry and
height-thrifty; stacked is the reverse. So a landscape phone, 844×390,
gets the *wide* layout despite being unambiguously a phone, and that alone
buys it a fifth more room. Card size is a second, separate question:
`stack` decides the arrangement, `tight` decides the sizes and how compact
the bar chrome is. They agree on a phone and disagree at both ends — a
landscape phone wants the wide bands *and* the small cards, and a portrait
iPad wants the stacked bands *and* the full-size ones, because 768×1024
has the room and looked half-empty without them.

**2. Fit.** `<FitBox>` lays the chosen layout out at a definite width,
measures what came back, and scales it if it still doesn't fit. This is
what makes "never scrolls" a guarantee rather than a hope: hand size, hint
length and button wrapping all vary at runtime, so no hand-tuned CSS can
promise a fit for every board state. Both interim scroll fallbacks are
gone — `overflow:auto` on the game root (Session 1) and `overflowX:auto`
on the Scraps band (the forest-reskin critique pass) — and nothing
replaces them. `html, body { overflow: hidden }` now says so out loud,
which also kills the iOS rubber-band bounce that makes a fitted screen
feel broken.

Two things about FitBox are worth knowing before touching it. Its inner
box is `min-height:100%`, so a table with room to spare still fills the
space and spreads out (which is what the desktop table has always done) —
and that means its own box never changes size, so the first version's
`ResizeObserver` on it never fired again after the first frame. The scale
froze at whatever the empty table measured, the bands got squeezed by
flexbox instead, and the player's hand was clipped off the bottom of an
iPhone anyway. It observes the content *wrapper* now, which is
`flex:1 0 auto` — it fills the box when content is short and grows past it
when content is tall, which is both the honest number and an observable
change. Second: it lays out at `max(available, mode minimum)` rather than
at 100%, because the scale depends on the content's height, the height
depends on the width it wraps at, and a width that followed the scale
never settles.

**Measured, on the real app driven headless through a full turn** (natural
content height → available height → scale):

| Viewport | Layout | Scale | Was |
|---|---|---|---|
| 1920×1080 | wide | 1.00, table fills the height | clipped |
| 1280×720 | wide | 0.89 | clipped 79px |
| 768×1024 iPad | stack, roomy cards | 0.91 | 238px of horizontal scroll |
| 390×844 iPhone | stack | 0.96 | 200×376 off-screen |
| 375×667 iPhone SE | stack | 0.73 | 200×376 off-screen |
| 844×390 landscape | wide, small cards | 0.57 | 200×376 off-screen |

Zero document scroll, zero inner scrollers and zero clipped elements on
every one of those, across splash, all four storyboard beats, the
difficulty picker, the table before and after a trade, and the rules
panel. The harness that checks it is `tools/responsive-qa.mjs`, committed
so the claim stays reproducible: it drives the real app through that whole
path and asserts all three, plus touch-target sizes. It is deliberately
not part of `npm test` — Playwright would be the largest devDependency in
the tree by an order of magnitude — so it runs by hand against a dev
server with Playwright available.

**Card motion survived intact, and got a bug fixed on the way.** Ghosts
derive their start and end scale from each end's *measured* box against
the natural size of the card drawn there, rather than from the two boxes
against each other — the same reasoning FLIP already applied to position,
applied to size. The old `from.width / to.width` drew a `fromSize` card at
that ratio, so a hand→Scraps flight (104 → 80) launched a 104px card at
1.3×: 135px, a third larger than the card it was supposedly leaving. The
new form lands on the table's own scale at both ends automatically, which
is what makes flights correct under FitBox at all.

**Hover.** Every JS hover in `buttons.jsx` was `onMouseEnter`/
`onMouseLeave`. The failure on touch is worse than "no effect": touch
browsers synthesise a `mouseenter` on tap and never send the matching
`mouseleave`, so the last thing tapped stayed lit until something else
was. It is `pressStyles()` now — pointer events, with touch filtered out
of enter/leave and given a press pair (down/up/cancel) instead, so a
finger gets feedback that ends when it lifts. The three CSS hover classes
in `index.html` are inside `@media (hover: hover)` with `:active`
partners, and `touch-action: manipulation` removes the 300ms tap delay
and double-tap zoom on controls.

**Touch targets.** 44px on the short axis everywhere (`TOUCH_MIN`). The
rules "?" was a 28px circle — the disc still reads at 30, the button
around it is 44. The log line, the Play Ace tag, the walkthrough's Skip
and every overlay's dismiss button were all under. In the stacked layout
controls ask for 54 (`TOUCH_MIN_COMPACT`) rather than 44, deliberately:
that layout is often scaled, 44 × 0.73 is 32, and because a button row is
a small share of the table's height, asking for the extra buys back more
in rendered size than it costs in scale — measured, 44 → 34 real px on an
SE, 54 → 40.

**Everything else that had to move.** The card fan's container was
`count × step + W` wide, a full card-and-a-bit wider than the fan inside
it; the outermost card sits at `(count-1)/2` steps from centre, not
`count/2`. That dead margin on both sides was most of why the table needed
a horizontal scrollbar below 900px, and it is 70px back at full size. A
face-down fan may close up much tighter than a face-up one (13% exposed
vs 34%) because it has no rank to protect — all it says is how many cards
there are, and that is what lets a seven-card opponent hand share a row
with the deck and discard on a 375px rail. The selection lift scales with
the card instead of being a flat 28px, which is a fifth of a full card and
a third of a tiny one. Stacked, a Scraps zone owns the whole rail whatever
it holds, so a pile growing from 2 cards to 7 no longer resizes the column
under it every turn, and its label and best-hand badge share one row —
which is only safe *because* it has the full rail; side by side, at 260px,
those two collide, which is why the badge sits under the cards there. The
storyboard's bottom rail is in the flow instead of pinned over 130px of
guessed padding, so a beat is laid out against the space actually left.
Six near-identical modal shells became one `Shell`, which is where the
no-scroll rule reaches them: centring alone is fine until a card is taller
than the screen, and then half of it is above the top edge where it cannot
be reached — true of the Ace lightbox and the rules panel on a 375×667
phone. The rules panel is the one overlay that keeps a scrollbar, because
scaling a wall of reference text to fit a phone defeats the only thing the
panel is for.

**What Stan should check on a real phone, before this is signed off:**
- **Portrait first.** The layout is sized for portrait. Landscape works
  and clips nothing, but 390px of height minus two bars leaves ~300 for
  two hands, two piles and the control panel, so it scales to 0.57 and a
  54px button renders at ~31. If landscape matters, it needs its own
  arrangement, not a tighter version of this one — say so and it becomes
  its own session.
- **The iPhone SE end.** 0.73 scale is the floor of comfortable. Cards are
  60×85 and buttons ~40px. Everything is reachable and legible in the
  simulator; a thumb is the test.
- **`dvh` and the URL bar.** `.app-vh` is `100dvh` with a `100vh`
  fallback, which is the fix for the bottom of the table living under a
  URL bar that has already scrolled away. Worth a scroll-up/scroll-down
  on Safari specifically.
- **Tap-and-hold.** Press feedback now ends on `pointerup`. Confirm a
  card or a button doesn't stay lit after a tap, which was the old bug.

**Found, and then fixed on Stan's say-so:** the font list was wrong in
every prose copy of it. CLAUDE.md named the pre-reskin four (Bebas Neue /
Righteous / Space Grotesk / Space Mono); the forest-reskin entry recorded a
Spectral set that the specimen review replaced hours later; Section 6 and
Session 6's opening prompt both still asked for the pre-reskin four to be
self-hosted. The truth, from `index.html`'s `<link>` and `theme.js`'s `F`
object, is five families — Bungee Shade (wordmark only), Fjalla One
(headings), Baloo 2 (card faces), Work Sans (UI), IBM Plex Mono (mono) —
and all four places now say so, with the weights Session 6 will actually
need to ship. Worth noting the shape of the failure: this is the colour
palette's problem in a different medium. A fact restated in prose in four
places drifts, and the fix each time is to point at the one file that
executes rather than to restate it.

**Session close (2026-08-27).** Shipped to `main`, which is the production
deploy — GitHub integration on `unclescrunch/scraps3` publishes every push
to `main` to [scraps3.vercel.app](https://scraps3.vercel.app). Merged as a
fast-forward from `claude/build-next-o9oue6`; `npm test` (37 passing) and
`npm run build` both green immediately before the push, and
`tools/responsive-qa.mjs` clean on all six viewports. Verified live
afterwards: the production deployment reports READY and
scraps3.vercel.app serves the same bundle hash the local build produced,
with the new global CSS (`.app-vh`, the gated hover queries,
`touch-action: manipulation`) present in the shipped `index.html`.

Left open, deliberately:
- **Landscape phone.** Playable, clips nothing, scales to 0.57 — a 54px
  button renders at ~31. Portrait is what the table is composed for. If
  landscape turns out to matter it wants its own arrangement, not a
  tighter version of this one, and that is a session of its own.
- **The real-device pass.** Everything above is measured in a headless
  Chromium at real viewport sizes, which is not the same as a thumb on
  glass. Session 3's own "done when" asks for one actual phone; the four
  things worth checking are listed above, and the launch session's
  cold-cellular smoke test is the second half of it.
- **Reduced motion** stays Session 5's, as `index.html` has said since the
  splash pass. This session added no perpetual motion, and `FitBox`'s
  scaling is a layout property rather than an animation, so nothing here
  widens that gap.

Nothing in this session touched `engine.js` or `reducer.js`. The rules are
exactly where they were; only the table they are played on changed shape.

### Session 4 — Sound identity ✅ Done (2026-08-26)
**Explored** in the **Foley Bench** artifact —
https://claude.ai/code/artifact/2b99d5e2-f9b1-400e-9609-ee2b3dd210b8 — which
holds two fully-built directions (Cardboard & Bone, 27 options; The Dealer,
25) across 12 cues. **Chosen and shipped:** Cardboard & Bone. Notes below.
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

**Notes.** `src/audio.js` is rewritten. Ten unrelated oscillator melodies —
a square-wave "denied" buzz, a victory arpeggio, a sine crescendo — are
gone from the table entirely; **no oscillator plays a note any more.** The
one sine left (`thud`) is a body under an impact and never lasts long
enough to read as pitched. Everything else is modal synthesis: a noise
exciter generated as raw sample data in JS, through parallel high-Q
bandpass banks acting as the body of a material (`cardstock`, `wood`,
`woodHi`, `bone`, `boneLow`, `felt`).

**Stan's picks deviated from the bench defaults in three places worth
remembering:** the transfer slide was lengthened to 360ms against a 200ms
default and dropped to level 0.35, so it covers the 620ms card flight
without repeating per card; the Ace strike is **Box crush**, the option
with no crack in it at all (a lowpass collapsing 6 kHz → 200 in an eighth
of a second) rather than the bone crack; and the game loss is **Two flat
drops** rather than the swelling box-close.

**Three cues had no call site in the game at all** and were added: `draw`
(scheduled per card against each one's flight delay, and cancelled on skip
so a skipped animation isn't followed by peels for cards already landed),
`aceStrike`, and `aceCounter` — the last two being exactly the "signature
moment reusing a generic sound" this session was written to fix. Two more
cues had no bench selection because the bench has no cue for them:
`handLost` (round-lost's falling wood at the *hand* target, so the kit's
one real mechanism — rising means you won it, falling means you didn't —
holds at both scales) and `revealBuild` (accelerating taps into a gap,
replacing a 200→900 Hz sine sweep, timed to the same 580ms).

**One sound was deliberately silenced.** The score counter ticking up was
firing a second celebration for an outcome the reveal had already
announced a couple of seconds earlier, so every hand had two. The score
flash carries that beat now. Easy to reverse if it reads as missing.

**Two real defects were found by measuring the port rather than trusting
it, and both would have shipped:**

1. **Nine of thirteen cues landed off their target level**, `select` by
   49% and `roundLost` by 30%. Cause: the bench computed each trim from a
   *single* render, and the exciter was `Math.random()`.
2. Which is the deeper bug — **the cues varied in loudness between plays.**
   Measured across twenty renders, `roundLost`'s peak spanned **3.41x**:
   the same sound arriving up to three times louder than last time. A 6ms
   burst exciting a Q-26 resonator is a lottery over whether a big sample
   lands early.

The exciter is a seeded xorshift now and the buffer is normalised, so
every cue is bit-identical every play (verified: peak spread exactly
1.0000 across renders) and the trims are exact rather than estimated.
Variety is added deliberately instead — a `seed` option gives repeated
taps inside one cue their own character, and `playFireworkPop` randomises
pitch and level out loud. **If you retune a cue, its trim is wrong until
re-measured**; `renderCue()` is exported so it can be rendered into an
`OfflineAudioContext` at gain 1 and re-derived.

**Verified** by rendering the shipped `src/audio.js` offline, not the
bench: all 14 cues land on target to within 0.0002; every export runs
without throwing, including 20 rapid firework pops; a full trade plays
through with no console errors; and the win screen's worst case (the drum
roll under 25 stacked events, deliberately pessimistic) peaks at 0.47 with
zero samples over full scale, so the bus compressor is doing its job.

**Left alone on purpose:** `playSquareUp`, the splash wordmark, byte for
byte including its direct connection to `ctx.destination` rather than the
trimmed bus. Two of its three layers are already this vocabulary — card
edges brushing, the deck landing flush — and only its six triangle taps on
a G major pentatonic are tonal. It plays on the splash, before a table
exists, and it was chosen by ear in a previous session, so whether those
six taps should become cardstock is Stan's call and not a side effect of
this port. **Also not added:** a sound on the round-start deal (5+5 cards
would be ten peels) — flagged, not decided.

**One change after the preview.** Stan found the transfer slide a little
loud: 360ms → 260ms and the target level .38 → .30, which is −2.1 dB, and
the audible tail is now 0.26s against 0.40s. Worth knowing why the obvious
edit would have done nothing — **quieter had to be a TARGET change, not a
gain change.** The trim renormalises each voice's own gains away, so the
`gain` values inside a voice only set the balance between its parts (here,
the slide against the slap); the level you actually hear is TRIM's target.
Changing the duration also invalidated the trim, which was re-measured
(3.0348 → 2.2417) and all 14 cues re-verified on target.

**Published to production 2026-08-26.** Four commits fast-forwarded into
`main`, build green, and the live bundle at
[scraps3.vercel.app](https://scraps3.vercel.app) was checked to actually
contain the new engine rather than trusted: the re-measured transfer trim
`2.2417`, the seeded-exciter constant, and the bus compressor are all
present, and every old cue name (`playWhoosh`, `playGrandFanfare`,
`playNeutralJingle`) is gone.

**Publish-time detector: 13 findings, all `bounce-easing`, all pre-existing
and none in `audio.js`** — this game's committed identity, shipped as-is,
consistent with the previous publish. The fuller `/impeccable critique` was
deliberately not run: this push changes sound and motion, not a screen,
a component or a layout. **A caveat recorded here earlier was WRONG and is
withdrawn.** It claimed the detector's four parser modules did not resolve
and that contrast checks had silently not run. They do resolve, from
`~/.claude/node_modules`, which is where the end-of-brief section already
said they were installed. The bad check was `require.resolve(m, { paths:
[...] })`, which does not reproduce Node's real upward walk — `createRequire`
from `detect.mjs` itself resolves all four. The missing `DEGRADED` banner was
the detector being honest, not silent. **This session's detector results are
sound**, and the lesson is about the test, not the tool: verify a
module-resolution claim from the file that actually does the importing.

**Two process edits came out of this session's retro and were approved**
(committed to `~/.claude`, which is a local-only git repo with no remote,
so the commit is the whole of it):

- **`/preview` now fetches and checks the checkout before reading the
  diff.** `/build-next` already did, but most work never arrives through
  `/build-next` — it arrives as a direct request, and `/preview` is where
  that work first touches git, which makes it the real catch point. Three
  consecutive sessions on this project opened stale.
- **`/build-next` gained a verification note: when a session ports values
  out of a design tool, measure the shipped code rather than trusting the
  export.** Written from this session's nine-of-thirteen miss.

That commit also carried an *unrelated* uncommitted change that was already
sitting in the working tree — a section 4b in `/build-next` from an earlier
EGOT session ("effectively done is not a status"). Git commits whole files,
so it could not be separated; it is called out in the commit message. Four
more files in `~/.claude` (`kickoff`, `publish`, `wrap`, and an EGOT memory
file) are still uncommitted and were left alone.

**Never heard by Claude.** Every claim above is numerical.

### Session 5 — Design and UX audit

**Prompt re-validated 2026-08-27 (written 2026-08-24). Two of its nouns had
rotted; both are corrected below and struck through in the prompt itself.**

1. **"Convert the menu `<div>`s to real focusable buttons" is already done** —
   by the unplanned splash-identity session on 2026-08-26, which recorded it
   only in Notion. The difficulty picker is a real `<button>` with the 720ms
   arm lock expressed as `disabled`; cards in the fan and the Scraps zone
   carry `role`/`tabIndex`/`aria-pressed`, Enter and Space, and spoken labels;
   Play Ace stopped being a div; and one global `:focus-visible` rule replaced
   the `outline:'none'` every button primitive was setting. Section 6 above,
   this prompt, Notion's "Best Practice Considerations" table and Notion's
   accessibility checklist were **all four** still calling this the project's
   highest-risk open item. What remains is verification end to end, not
   conversion.
2. **The contrast target named in Section 6 — `slate #8A8FA8` on
   `dusk #1C1C28` — is the pre-reskin neon palette and no longer exists.**
   The Forest Dusk reskin replaced every value on 2026-08-25. Contrast still
   needs auditing; it needs auditing against `theme.js`'s current tokens, in
   the states the app actually renders.

Unchanged and still accurate: the reduced-motion pass (index.html's own
comment names this session as its owner — 5 of ~28 keyframes are handled),
and the detector triage below.

**Correction (2026-08-26, later the same day): the detector is NOT
degraded, and an earlier note in this session claiming it was has been
withdrawn.** All four parser modules — `htmlparser2`, `css-select`,
`css-tree`, `domutils` — resolve correctly from the detector's own file, at
`~/.claude/node_modules`, exactly where the "Fixed 2026-08-26" section at
the end of this brief says they were installed. The bad check was a
`require.resolve(m, { paths: [...] })` call, which does not reproduce Node's
real upward walk; `createRequire` from `detect.mjs` itself resolves all four.
The absence of a `DEGRADED` banner in this session's runs was the detector
telling the truth. **So the publish-time detector results recorded in this
session are sound**, and no parser install is needed before Session 5.

**What IS still outstanding for this session, from that same end-of-brief
section:** the 20 full-strength findings have been *counted, not triaged*.
Nobody has decided which are real and which are false positives. That
triage belongs here, in the visual pass.

**Note (2026-08-26):** the unplanned onboarding session below already did a
first-time-player *rules-legibility* audit and implemented all ten of its
findings. This session's scope is unchanged and still worth running — but
it covers balance, negative space, focus, the motion inventory and
accessibility, and should not re-open the copy that pass settled.
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
> ~~convert the menu `<div>`s to real focusable buttons~~ (done
> 2026-08-26 — verify keyboard nav end to end instead), fix contrast where
> needed ~~on `slate #8A8FA8` against `dusk #1C1C28`~~ (that palette is gone —
> compute against the current Forest Dusk tokens), respect
> `prefers-reduced-motion`.
**Done when:** an accessibility checker shows no critical issues, keyboard
navigation works end to end, and you can walk me through what changed for
balance, negative space, focus, and motion with before/after specifics.

**Session 5 — part one shipped (2026-08-27). The accessibility, motion
and contrast half is built and committed to `dev` (`18f952d`); the
visual half is audited and reported, awaiting Stan's picks.** Split on
purpose at his direction: the accessibility work has right answers, the
balance/space/focus work has taste in it, and one shouldn't wait on the
other.

**Two of this prompt's own nouns had rotted** — see the re-validation
note at the top of this session. Converting the menu `<div>`s was
already done (by the splash-identity pass, recorded only in Notion), and
the contrast target named in Section 6 pointed at a palette deleted in
August. Four separate places — Section 6, this prompt, Notion's Best
Practice table and Notion's accessibility checklist — were all still
calling the menu `<div>`s the project's highest-risk open item.

**What was actually still broken, and none of it was in the prompt:**

- **Nothing in the game was ever announced.** There was no `aria-live`
  region anywhere. Whose turn it is, a score moving, an Ace taking two
  of your Scraps — every one of those was carried by colour and position
  alone. The splash-identity pass had made every control *reachable*,
  which made this the more visible gap rather than a smaller one: a
  player could now press every button and still not know what happened.
  `GameAnnouncer` (`hud.jsx`) adds two polite regions. Two, not one, and
  that is the point: the reducer's own log line answers "what just
  happened" and the narrator hint answers "what do I do now", and
  sharing one region would let each new event cancel the instruction
  mid-sentence. The log was already a complete, well-written narration —
  it needed a region, not new copy.
- **Buttons that looked disabled were not disabled.** `Btn`, `BigBtn`
  and `TradeInBtn` all expressed "unavailable" with three visual tricks
  — `opacity: 0.35`, `cursor: not-allowed`, and dropping the `onClick`
  — and never set the `disabled` attribute. So TRADE IN, the game's
  primary action and the control that spends most of its life in that
  state, was **the first tab stop on the table** and did nothing when
  pressed, with no explanation. Measured before: 8 tab stops, the dead
  button first. After: 7, starting on the cards. `AceTag` was the one
  control that had always set `disabled` properly.
- **Contrast had never once been computed against the Forest Dusk
  palette.** Two live AA failures, both on text: **red suits on a hand
  card at 1.98:1** — the rank and pip on every heart and diamond you
  hold, which is the most-read text in the game — and the best-hand
  badge at **4.27:1**. Fixed with `DS.emberInk` (`#A8341F`, 5.20:1),
  used *only* as ink on the pale card face, and by moving the badge one
  step up the ember ramp to `emberHover` (5.24:1). Ember itself is
  untouched and keeps its accent role; on the *dark* Scraps card face it
  already measured 6.65:1 and needed no help. **All 27 pairings now
  clear AA**, 18 of them AAA. `tools/contrast-audit.mjs` is committed so
  the claim stays reproducible — add a row when a new pairing ships.
- **The reduced-motion pass `index.html` had been promising itself.**
  Five of ~28 keyframes were handled. Now: a blanket 1ms rule, plus
  static substitutes for the three animations that are the *only*
  carrier of a state. **1ms rather than `animation: none` is
  load-bearing** — `none` discards the fill, so anything filling
  `forwards`/`both` (cardFadeIn, panelDeal, the delayed subtitle) would
  snap back to its unstyled start and stay invisible. And a blanket kill
  would have quietly *removed information*: a wiggling card means "this
  one is live", a pulsing zone means "act here", a shaking REVEAL button
  means "working". Each gets a ring instead, keyed on a `live-cue-*`
  class the component adds beside its animation. A ring, not an
  `outline`, so `outline` stays reserved for `:focus-visible` and a
  state cue can never be mistaken for a focus ring.
- **No headings, no dialog semantics.** There was no `h1` anywhere and
  therefore no heading list at all. The splash wordmark is the `h1` now
  (it *is* the title, so an invisible duplicate would have been worse);
  the picker, storyboard and table get `sr-only` ones. Every blocking
  overlay now carries `role="dialog"`, `aria-modal` and a label, and
  `useDialogFocus` does the three things a modal owes a keyboard: move
  focus in, keep Tab inside, put focus back on close. They had all
  trapped the *pointer* since forever — a fixed backdrop — and never
  trapped focus, so Tab from inside the Ace counter modal walked
  straight onto the cards it exists to block. `RoundInterstitial` is
  deliberately excluded: it is a two-second flash nobody can act on.
- Dead CSS removed: `.menu-opt` and `.diff-opt` had zero references left
  in `src/`.

**How it was verified: Playwright, not the in-app pane, and that choice
mattered.** The pane suspends `setTimeout`, and this flow cannot be
walked without it — the difficulty picker's 720ms arm lock would never
fire and the walk would stall on screen two, exactly as CLAUDE.md warns.
The Playwright MCP server has its own browser where timers run.
Measured there, not read off the code: **5 running animations → 0** with
the shipped media rule's own declarations applied (the harness cannot
flip the OS setting, so the rule *contents* were tested by injecting
them — the media query itself is trivially correct), and the substitute
ring computing to `rgb(163,216,90) 0 0 0 3px` while every card stayed
visible at opacity 1; focus entering the Ace dialog onto "Okay", Tab
holding it there, and returning to the table on close; both live regions
carrying real text ("Round 1 - Opponent dealt. You go first."); every
tab stop labelled and every target ≥44px on its short axis.

**Colour-alone check: passes.** Every state that uses colour also
carries a non-colour signal — the narrator says whose turn it is in
words, zones are labelled OPP/YOUR, selection is a lift plus
`aria-pressed`, ineligible cards are dimmed, and suits are distinct
glyphs. Nothing depends on hue alone.

**The 20 detector findings, now triaged rather than counted.** The
detector runs at full strength here (no DEGRADED banner, re-confirmed
this session). 19 `bounce-easing` + 1 `dark-glow`. Verdicts:
**16 false positives against a deliberate choice** — card motion,
score pops and the splash wordmark are a card game's physical
vocabulary, and the voltage glow is what `theme.js` documents as the
interaction language. **4 are real and worth a decision**: `popIn` with
overshoot fires on the *losing* overlays too (opponent's Ace reveal,
the counter notice, no-legal-trades) and `errBounce` bounces the
over-limit error. Celebratory easing on bad news is the detector's
point restated in game terms, and Session 1's critique had already
flagged it as a P1. Listed below as a visual finding, not changed.

**Part two shipped the same day (2026-08-27), Stan's picks from the seven
findings below.** He took six of seven: everything except the
right-heavy negative-space imbalance (6), which he did not call and which
stays open.

- **Deck over discard on one vertical axis**, discard rendered a size
  smaller — his framing was "the discard pile is unimportant", so it
  goes under rather than beside. This is what removes the collision:
  as a row the rail was two cards wide.
  **But the column is only used where there is height to spend on it**
  (`stack || tight` keeps the row). Getting that wrong is expensive and
  was measured: column everywhere took the fit from **0.73 to 0.66** at
  375×667 and **0.57 to 0.49** in landscape, because a landscape phone
  keeps the *wide* arrangement on 390px of height. `tight`, not `stack`,
  is the right test — it is already the project's "height is the scarce
  axis" flag.
- **The actual cause of the collision was one property**, found while
  fixing it: the pile column carried `minWidth: 0`, so it could shrink
  below its own contents and the centred rail overflowed both edges.
  It holds its content width now and the narrator panel gives way
  instead, which is the correct loser — it has 760px of slack and the
  rail has none. That also fixed a *pre-existing* 8px overlap in
  landscape that nobody had noticed.
- **Score digits 60 → 44** (34 → 26 compact), which also hands ~16px per
  bar back to the table.
- **The permanent ownership glow on both Scraps zones is gone.** The
  border still carries ownership; only `GlowPulse` glows now, so the
  real state cue stopped having to shout over a halo that was always on.
- **Disabled TRADE IN is legible**: slateLight on duskMid at 8.20:1,
  full opacity, slate rule — and still unmistakably not the live fern
  fill, which is a different object rather than a brighter one.
- **Bounce off the losing overlays.** The opponent's Ace reveal and the
  counter notice land on ease-out-quint; the reveal banner picks its
  curve from `winner`, so a win still bounces and a loss does not; and
  `errBounce` is retired for `errRise`, since overshooting 12px twice to
  announce an illegal move was the finding restated. **Detector 20 → 14
  — the four real findings are gone and the 16 deliberate ones remain**,
  which is the triage above holding up under its own test.
- **Both Scraps badges moved outside their zone borders** and the bottom
  band bottom-aligns, so they share one line with the hand's own badge.
  Measured 602.2 vs 601.6. Stacked keeps the badge in the header row —
  that layout is short of height, not width, and the header placement
  buys back a row per zone.

**Verified at 1024×662 after: 13px gap where there was 29px of overlap,
deck and discard centred on x=176, badges aligned to 0.6px, no document
scroll, nothing painted outside the viewport.** Session 3's never-scroll
rule re-checked at 375×667 (0.74, marginally better than its recorded
0.73, thanks to the smaller scores), 390×844 and 844×390 (0.55).

**The one cost, stated plainly: the roomy desktop table now scales
0.7994 → 0.7377** at 1024×662. A vertical rail is taller than a
horizontal one and something had to pay for it. Nothing is clipped or
unreachable and no touch target drops below the Session 3 floor, but the
table is about 8% smaller on a roomy desktop than it was this morning.
If that reads as too small on his screen, the lever is the deck: it is
still `small` while the discard is `tiny`, and matching them would buy
most of it back.

**Open — the visual findings, six of seven now taken:**

1. **DONE.** The narrator panel collides with the discard pile at his width.**
   Measured: at 1024×662 the panel's left edge is at x=208 and the
   discard column runs to x=238 — **29px of overlap, 36% of that
   column**, with full vertical overlap. At 1440×900 there is a 67px
   gap and no collision. Real, measured independently of his screen,
   and it is a width effect, so he sees it and most desktop users do
   not. Fix is a `min-width` or an explicit gap on the rail rather than
   letting a `max-width: 760` panel run into it.
2. **DONE.** Visual weight is spent on the two things that change least.** The
   loudest objects on the table are the two score digits, which move
   once every few minutes; the hand and the trade action, which matter
   every single turn, are mid-weight.
3. **DONE.** Both Scraps zones glow permanently, in ownership colours, so
   when `GlowPulse` genuinely activates for discard or ace mode the
   real state cue has to compete with decoration that is always on.
4. **DONE.** A disabled TRADE IN is nearly invisible at `opacity: 0.35`, so a
   first-timer does not learn the primary action exists until they
   happen to select a card. (WCAG exempts disabled controls from
   contrast, so this is discoverability, not a violation — the
   *semantic* half is fixed above.)
5. **DONE.** Bounce easing on losing overlays, per the triage above.
6. **STILL OPEN — the table reads right-heavy.** The left third below
   the deck is empty while the right column stacks round strip, opponent
   Scraps and your Scraps. Not called by Stan, not changed. Worth
   re-looking at now that the pile rail is a column, which changed the
   left column's shape.
7. **DONE** (by the badge move in 6 above). Two treatments for one kind of information: the hand's best-hand
   name sits *below* the fan in slate, the zones' sit *inside* their
   frames with a `▸`.

**Not re-opened, on purpose:** the rules copy the unplanned onboarding
session settled.

**Published to production 2026-08-27** — `main` fast-forwarded to
`cac9850`, deploy READY, and `dev` and `main` are level with each other.

**Verified against production, not the build log.** The strongest form of
this check that exists here: `curl`ed the live bundle and ran `cmp`
against the locally tested `dist/assets/index-CQzez2Y6.js` — **byte for
byte identical**, so everything measured locally is what shipped. Present
in the served JS: the new card-face red `#A8341F`, both `live-cue-*`
classes, `aria-live`, the game-table `h1` and the Ace dialog's label.
Absent: `errBounce`, gone entirely. In the served HTML: `.sr-only`, the
`h1.scraps-title` reset, the full `prefers-reduced-motion` block and
`errRise`, with `.menu-opt`/`.diff-opt` gone. The one `errBounce` string
left in the HTML is the comment recording its retirement.

**Nothing to check on the environment side, and that is a fact rather
than a skip:** `grep` for `import.meta.env` and `process.env` across
`src/` and `index.html` returns nothing, this push added no variable, and
the project has no scheduled job, cron, webhook or background worker to
confirm ran.

**Publish-time detector: 14 findings, full strength (no DEGRADED
banner).** Every one is in the set this session triaged as the game's
committed identity — card motion, score pops, the splash wordmark, the
win and Full Scrap celebrations, and the documented voltage glow. The
four the triage called real were fixed and are gone. **The fuller
`/impeccable critique` was deliberately not run**: this push does rework
UI, which normally calls for it, but the session had already done a
measured design and accessibility audit end to end in a real browser —
contrast computed for 27 pairings, the reduced-motion rule's own
declarations applied and animations counted 5 → 0, the focus trap
walked, geometry measured at four viewports. Critique spawns two
sub-agents and closes by asking a question, which is the wrong shape for
a session close-out and would mostly re-derive what was just measured.
Worth running at the Session 7 pre-launch pass instead, on a surface that
has not just been audited.

**Three process edits came out of the publish retro, approved by Stan and
made** (committed to `~/.claude`, `479365b` — a local-only repo with no
remote, so the commit is the whole of it):

- **`~/.claude/CLAUDE.md`**'s browser-measurement rule now names the
  **Playwright MCP server as the first fallback** when the in-app pane
  suspends `setTimeout`, ahead of the lift-the-logic-into-Node path that
  was there. The pane cannot walk a timer-driven flow at all; the MCP
  server drives a real browser that can. The rule also warns that this
  is easy to talk yourself out of, because a project note saying
  "Playwright is not installed globally any more" is about the *CLI* and
  reads as if it covers both — which is exactly the misreading this
  session nearly made, off this brief's own line (now corrected above).
- **`~/.claude/skills/build-next/SKILL.md`**'s close-out now requires
  that a session finishing work belonging to a **different** planned
  session update that session's row too. This project is the worked
  example: the splash-identity pass fixed the top-flagged accessibility
  risk as a side quest and logged it in one Notion cell, and a month
  later four documents still called it open.
- **`~/.claude/skills/publish/SKILL.md`**'s asset step now handles the
  case where the identity-derived asset **does not exist yet** — check
  the live URL rather than the repo, and write the generator requirement
  into the pending session's own prompt. That is what produced the
  Session 7 note below.

Four files in `~/.claude` remain uncommitted from earlier sessions and
were left alone; a lookbook-skill change already sitting in `CLAUDE.md`
rode along with the commit above, since git commits whole files, and is
called out in its message.

**Found during the publish checks, and it belongs to Session 7:
production serves no favicon, no OG image, no `robots.txt`, no
`sitemap.xml`, and the HTML carries no `og:` tags at all** — all 404s.
That is not a regression; those files have never existed and Session 7 is
scoped to create them. It is recorded here because of *how* they should
be created. The share image is the canonical case of an asset generated
once from values that later move, with nothing regenerating it and no
test reading it: EGOT's card advertised a product name that had been
renamed away, for six days, because the site looked perfect and the card
is the one surface nobody sees while working. **So Session 7 should ship
these with a generator script that reads the live sources and exits
non-zero on a mismatch — and that script should be broken on purpose
once, to watch it fail, before it is trusted.**

### Session 6 — Security, privacy, and rights ✅ Done (2026-08-28)
**Goal:** nothing leaks, nothing's unlicensed, the fine print is real.
**Bring:** this brief.
**Opening prompt:**
> Read PROJECT-BRIEF.md. Self-host the five Google Fonts — Bungee Shade,
> Fjalla One, Baloo 2, Work Sans and IBM Plex Mono — instead of loading
> them from `fonts.googleapis.com`/`fonts.gstatic.com`; this removes the
> third-party-request privacy issue outright. Ship only the weights
> `index.html` actually asks for, and check the live `<link>` and
> `theme.js`'s `F` object rather than trusting any list in this brief.
> ~~Repoint the git remote from `stanbaudrey/scraps3` to
> `unclescrunch/scraps3` (currently only works via GitHub's rename
> redirect).~~ (Checked 2026-08-28 and **this is backwards** — see the
> findings below. `stanbaudrey` is canonical; doing this would have
> pointed the remote at the dead name.) Write a short privacy policy page, linked from
> wherever makes sense in the UI: what's collected (currently just the
> `scraps-stats-v1` localStorage stats, plus whatever analytics gets added
> in the launch session), why, where it lives, and that nothing leaves the
> browser except analytics. **Stop and show me the actual privacy policy
> text before treating this as done** — don't just fill in a template.
**Done when:** all five fonts are self-hosted and nothing in the built
output requests `fonts.googleapis.com` or `fonts.gstatic.com`, the git
remote points at the real repo, and Stan has explicitly signed off on the
privacy policy text.

**What happened:**

**Two of the three items are done and verified. The third needs Stan to
approve the text.**

**1. The five fonts are self-hosted, and the third-party request is gone.**
`tools/fetch-fonts.mjs` vendors them into `public/fonts` and rewrites the
`@font-face` rules between `FONT-FACE:BEGIN`/`END` sentinels in
`index.html`, so the rules and the files cannot drift apart. `npm run
fonts` regenerates, `npm run fonts:check` re-downloads from Google and
exits non-zero on drift.

**The check was broken on purpose three ways before being trusted** — a
corrupted `.woff2`, a deleted `@font-face` rule, a stale leftover file —
and caught all three with exit 1, then passed again on restore. That is
the discipline Session 7's share-image generator is supposed to inherit;
it works, and the pattern is now in the repo to copy.

Two things found on the way in, neither of which the prompt anticipated:

- **Work Sans and Baloo 2 are variable fonts.** Google serves ONE file per
  subset for them and varies only the `font-weight` descriptor. A naive
  one-file-per-weight fetch wrote identical bytes four times over; the
  first run produced 24 files of which only 14 were distinct. Files are
  now named by weight only where the weights are genuinely different
  files. **24 faces over 14 files.**
- **Only `latin` and `latin-ext` are vendored.** Google's default also
  serves cyrillic, greek and vietnamese, which nothing here renders. The
  `unicode-range` descriptors are kept verbatim, so a browser still
  downloads only the subset it needs — `latin`, in practice, about 203 KB
  across the five families.

**A per-family weight audit, which the prompt asked for and which turned
up two mismatches worth Stan's call.** Neither is a regression — both
behave exactly as they did on Google — and neither was changed:

| Family | `<link>` asked for | Actually used in `src/` |
|---|---|---|
| Bungee Shade | 400 | 400 |
| Fjalla One | 400 | 600, 700 — *single-weight font, both synthesised* |
| Baloo 2 | 600, 700, 800 | **600 only** |
| Work Sans | 400, 500, 600, 700 | 400, 500, 600, 700, **900** |
| IBM Plex Mono | 400, 500, 700 | 400, 700 |

- **Work Sans 900** is asked for by the `?` help button
  (`GameScreen.jsx:1237`) and was never declared, so it renders as 700
  with synthetic bold. Measured: identical width to 700, confirming the
  browser clamps to the top declared weight. Because Work Sans is
  variable and its file is already on disk, **declaring a real 900 face
  would cost zero extra bytes.** Left as-is to preserve parity; Stan's
  call whether to take the free fix.
- **IBM Plex Mono 500 is the only genuinely wasted file** (14.5 KB in the
  repo, never downloaded by a browser since nothing references that
  weight). Baloo 2's unused 700 and 800 cost nothing at all, being the
  same variable file as 600.

**Verified in Chromium against the built output**, not the build log:
zero requests leave the origin on the splash *and* on the table, and all
nine declared faces render from local files rather than falling back. The
vendored `.woff2` files are byte-identical to what `fonts.gstatic.com`
serves right now, so rendering is unchanged by construction. The JS
bundle hash did not move (`index-CQzez2Y6.js`), confirming no JS was
touched.

**A direct pixel A/B against the Google-served build was attempted and is
not possible here, which is worth recording rather than quietly
skipping.** Production is unreachable from this container
(`ERR_TUNNEL_CONNECTION_FAILED`), and a locally built "before" using the
old `<link>` rendered every family at the fallback width — the sandbox
blocks the browser from reaching Google, so the comparison would have
measured monospace against monospace and proved nothing. Byte-identity to
gstatic is the stronger claim available and is the one being made.

**2. The git remote does NOT need repointing, and the prompt had it
backwards.** This was checked rather than done. The GitHub API returns
`stanbaudrey/scraps3` as the canonical `full_name` (owner login
`stanbaudrey`, id 285274906, homepage `scraps3.vercel.app`, `pushed_at`
matching this repo's last push), and the API resolves renames to the
canonical name rather than echoing the queried one. A
`repo:unclescrunch/scraps3` lookup returns no such resource. **The rename
ran the other way** — the account was `unclescrunch` and is now
`stanbaudrey` — so `origin` already points at the live name, and doing
what the prompt asked would have aimed it at the stale one and broken
pushes. CLAUDE.md's "git remote points at the wrong username" note has
been corrected to say this. Separately: a remote change lives in
`.git/config`, which is not committed, so it could not have persisted
beyond this container anyway.

**3. The privacy notice is written, built and SIGNED OFF.**
It lives as a second view inside `RulesModal` (Stan's call — one entry
point, nothing new on the table where every pixel is already contested),
reached by a `Privacy` button beside `Close`. No contact line, also Stan's
call: the game collects nothing, so there is no data for anyone to request
or have deleted.

The text was written against an audit of what the code does, not a
template. Confirmed absent: `fetch`, `XMLHttpRequest`, `sendBeacon`,
`WebSocket`, any analytics package, any cookie. Confirmed present: exactly
two storage keys — `scraps-stats-v1` (localStorage; wins, losses and best
margin per difficulty) and `scraps-walkthrough-seen-v1` (sessionStorage;
one flag). **It states plainly that Vercel receives the usual request data
in its logs**, because a notice claiming nothing leaves your browser would
be false the moment someone loads the page, and that is the sentence a
sceptical reader checks first.

Verified in a browser: the dialog's `aria-label` follows the view, the
toggle works both ways, the panel scrolls internally and the document
still does not.

**Stan rewrote the notice and approved his own version (2026-08-28), which
is what shipped.** He cut five paragraphs to three: merged the opening two,
dropped the how-to-clear-your-data paragraph outright, and cut the Vercel
paragraph back to the one fact a reader cares about — they get your IP and
log it — losing the user-agent and requested-file detail as noise. The
draft's structure survived; its length did not.

Worth recording, because it changed the UI and not just the words: **at
1024x662 the notice now fits with no scrolling at all** (`scrollHeight`
489 against a `clientHeight` of 489, where the first draft needed 718 in
the same 579px box). The rules panel is the one overlay in the game
allowed to scroll, and the privacy half of it no longer uses that
allowance. Shorter copy did what no layout change would have.

A `Last updated 28 August 2026` line was kept below the text — a date
stamp rather than copy, and the thing that tells a reader whether the
notice predates something they heard about.

**Done when:** met. Fonts self-hosted with nothing in the built output
requesting `fonts.googleapis.com` or `fonts.gstatic.com`; the remote item
closed as "not needed, the prompt was backwards"; Stan signed off on the
notice text.

**Not published.** The branch is pushed and green but nothing has gone to
production, deliberately — Session 7 is the launch session and adds the
metadata, favicon and share image that a visitor sees at the same time as
this. Publishing twice in two days buys nothing.

**Open, and carried into Session 7:** the `?` help button asks for Work
Sans 900 (`GameScreen.jsx:1237`), which was never declared and renders as
700 with synthetic bold. Work Sans is variable and its file is already on
disk, so declaring a real 900 face costs zero extra bytes. Left alone this
session to preserve parity with what production already renders; not yet
called either way.

### Session 7 — Findability and launch
**Goal:** the game looks right when shared, gets found by search/AI
crawlers, and goes live on the agreed schedule.
**Bring:** this brief (Section 8 has the drafted copy and venue list).
**Opening prompt:**
> Read PROJECT-BRIEF.md. Keep or refine the existing title and meta
> description in `index.html` (SCRAPS — Two Hands. One Table. No Mercy.).
> Add: a favicon, Open Graph and Twitter card tags with a real 1200×630
> share image, a canonical tag, `sitemap.xml`, `robots.txt`, JSON-LD for the
> game, and an `llms.txt` for AI crawlers. **Generate the share image and
> favicon from a committed script that reads the live sources (the title in
> `index.html`, the tokens in `theme.js`) and exits non-zero when they no
> longer match — then break it on purpose once and watch it fail before
> trusting it.** Confirmed 2026-08-27 that none of these files exist yet, so
> there is nothing to migrate; the requirement is about what happens after a
> future rename or repaint, which is how EGOT shipped six days of links
> advertising a product name that no longer existed. **Stop and show me every literal
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

### Unplanned session — Onboarding rebuild and rules clarity ✅ Done (2026-08-26)
Requested directly by Stan, between Session 2 and Session 8, and done in
the same sitting as Session 8.

**Notes:** cut both onboarding paths that existed. The six-panel RULES
wall asked a first-timer to read six dense sentences before they had ever
seen a table, and the scripted TUTORIAL HAND rigged a deal to force one
lesson (the Ace play) at the cost of ~140 lines of script plus
`mode === 'tutorial'` branches threaded through the game screen and the
dealer. `src/game/tutorial.js` is deleted; `buildRoundDeal()` now takes no
arguments and always deals a straight round.

In their place, a four-beat storyboard between PLAY and the difficulty
picker (`src/screens/Walkthrough.jsx`): the two hands that are always
running, what each rank is worth to trade in, the Ace strike as a still
frame of the two taps it takes, and how a round scores. Tapping anywhere
advances, SKIP is pinned to the viewport on every beat, and it plays once
per browser session (`sessionStorage`), so NEW GAME off the win/lose
screen goes straight to the picker. Deliberately unanimated at Stan's
direction: beats swap instantly and the only motion is a slow lean on the
cards each sentence names, so there is nothing to sit through and no way
to out-click the screen.

The difficulty picker is two boxes and nothing else. It is inert for
**720ms** after mount, not the 250ms Stan suggested: 250ms is shorter than
a double-click interval, so a speed-tapper's second click would still land
on a difficulty. The panels unfold from a hairline and the borders snap to
voltage and pulse once when input opens, so the lock reads as deliberate
rather than broken.

**Then a first-time-player clarity audit of the live game, and all ten
findings implemented.** The recurring theme was rules the engine enforced
but never stated:
- `isValidSignal` accepts exactly one shape per count (1 any card, 2 a
  pair, 3 trips, 4 two pair or quads, 5 a straight or better) and nothing
  on screen said so — an unmatched pair of cards got a disabled button and
  no reason. `engine.getValidSignals` already computed that set against
  the live hand and **had no UI caller at all**; it now drives a legality
  strip in the action zone with impossible shapes struck through.
- The trade button read `Trade In (2)` where 2 was cards *selected*, which
  collided head-on with the rule the walkthrough had just taught (a 10-K
  draws 2, an Ace draws 3) and was routinely read as "draw 2". Now
  `TRADE 2 → DRAW 4`, and `HAND WOULD BE 10/7` in ember *before* the click
  when the draw breaks the limit.
- `HorizontalScrapsZone` treated every card as clickable whenever the zone
  was selectable, while `GameScreen`'s handler silently dropped cards with
  `eligibleForDiscard` false. The two disagreed, so a locked card looked
  live and did nothing on click. The flag decides both now.
- Play Ace vanished when the opponent's Scraps held fewer than two cards,
  so holding an unusable Ace looked like a bug; the counter modal never
  said that countering spends your Ace either way; the no-legal-trades
  modal only restated itself; the round strip named the three hands
  without naming the stakes; the log was a truncated line behind a small
  chevron that most players would never discover.

Also corrected `WIN_SCORE`: CLAUDE.md still said "First to 11" after the
score changed to 10.

**Overlap note for Session 5:** this was a *rules-legibility* audit, not
Session 5's pass. Session 5 (balance, negative space, focus, motion
inventory, accessibility, menu `<div>`s → real buttons) is still untouched
and still worth running — but it should not re-litigate the copy above.

### Session 8 — Animation and interaction precision ✅ Done (2026-08-26)
Added 2026-08-25, from feedback on the forest-reskin pass. Three related
but distinct problems, all about motion and turn choreography rather than
color or layout — deliberately not rushed into the same pass that did the
color/type/contrast work, so each gets a real build-and-verify cycle
instead of a guess.

**Goal:** every card's motion is accurate and trackable, your turn and the
opponent's turn never visually overlap, and the Ace mechanic reads as an
optional weapon tied to a specific card rather than the obvious next move.

**Notes:** all three problems were real and two shared a single root
cause: nothing in the old system ever measured anything.

`flight.jsx` computed both ends of every flight by hand — "the hand is
centred, so card *i* must be at handCenter + i*200" — and the reducer
removed the real card from state *before* the ghost launched. Neither end
matched where the card actually was, so a card vanished from one place, a
lookalike flew a roughly-plausible path, and a card faded in somewhere
else. It is FLIP now: read each card's real `getBoundingClientRect`,
commit the whole state change at once, read the destination in a layout
effect, and hand that box to a ghost while the real card sits hidden
(`visibility`, never `display` — the fan's layout has to survive). Both
ends are measured, so no path can be wrong by construction.

One contributing bug **predated this session** and is worth remembering:
the flight overlay was a `useCallback` component rendered as
`<FlightsOverlay/>`. Its function identity changed on every render, so
React saw a new component type and unmounted/remounted every card in
flight, restarting its animation from zero whenever anything else moved.
That alone would make motion stutter and hang. It returns an element now.
A second ordering bug surfaced during the rebuild: cards registered their
DOM node in a passive effect, but a card moving hand → Scraps unmounts
under one parent and mounts under another, so it was not in the registry
when the destination was measured. Registration is a layout effect now,
and unregistering passes its node so a late cleanup from the old mount
cannot delete the new mount's entry.

Turn overlap is fixed by two deliberately separate effects: a gate that
waits for `animating` to clear and sets `aiGo`, and a runner that depends
only on `aiGo`. They cannot be combined — the AI's own cards set
`animating`, so a single effect would re-run mid-turn and cancel the
opponent's move halfway through. Measured live: the opponent's first card
moves 1520ms after the player's last one lands. Because state commits up
front, **skipping is safe at any instant** — a click anywhere, Enter or
Space drops the ghosts onto a board that is already correct. Stan asked
for skip; the phase also flips to the opponent the moment a trade commits,
so the table now derives `settling` and keeps reading as your turn until
your cards land, with that narrator line carrying the skip hint (it is
otherwise undiscoverable).

Play Ace moved out of the action row onto its own Ace: one card wide,
PLAY over ACE, sharing a wiggle wrapper with the card so the two lean as
one object. A hand can hold two Aces, so ace mode tracks *which* card is
spent, and each tag is only as wide as its card's share of the fan —
at full card width two adjacent Aces overlapped their tags.

**Three layout fixes Stan raised in the same pass:** toggled Scraps cards
lift straight up and keep their place in the stack (they used to jump to
the top of the z-order and cover their neighbours); the scores split by
ownership — opponent top-left, yours bottom-right, match conditions at the
right edge — so all of a player's information sits on their own side of
the table; and an animating score lifts above both bars, because the
round-end pop scales to 1.9x and was being painted over by the table in
front of it.

Verified in the browser rather than from the animation math: flight paths
traced frame by frame from real fan positions to the real Scraps pile,
skip by click and by Enter both dropping 4 ghosts to 0 with the board
correct, and a full game played to a win including a Scraps-overflow
discard and an Ace strike (two struck cards and the spent Ace all reaching
the discard pile). Net chrome height is 33px *smaller* than before, which
gives a little back on short screens. 37 tests pass.

**Left in deliberately:** `data-card-id` on every card and
`data-flight`/`data-face` on every ghost. They are what made frame-by-frame
verification possible and cost nothing.

**The three problems, in Stan's words:**
1. **Motion paths are wrong.** Cards depart from locations that don't
   match where they were actually selected or toggled. Cards moving from
   the deck fade out and then just *appear* in the hand instead of
   following one consistent, trackable path from deck to hand.
2. **Turns overlap.** The opponent's cards sometimes start moving while
   the player's own cards are still mid-animation — no turn's animation
   should start until the previous one has actually finished.
3. **Play Ace is too prominent.** It currently sits in the main action
   button row, which makes an optional, situational move read as the
   expected next action. Stan's own recommendation: move the button to
   float above the Ace's specific card in the hand, so it's visually tied
   to that one card, and have it wiggle in sync with the Ace's existing
   wiggle animation rather than sitting in the button row at all.

**Bring:** this brief, `src/components/flight.jsx` (the flight/motion
system), `src/screens/GameScreen.jsx` (turn choreography and the current
Play Ace button), `src/components/cards.jsx` (the existing wiggle
animation on cards).
**Opening prompt:**
> Read PROJECT-BRIEF.md, Session 8. Fix three related motion/interaction
> problems: (1) every card's flight path should start from its actual
> real position (where it was selected/toggled) and end at its actual
> real destination — no fade-out-then-appear, one consistent trackable
> path per card, including deck-to-hand draws. (2) Sequence turn
> animations strictly — the opponent's turn must not begin animating
> until the player's turn has fully finished, and vice versa. (3) Move the
> Play Ace button out of the main action row: have it float above the
> specific Ace card in the player's hand and wiggle in sync with that
> card's existing wiggle animation, so it reads as tied to that one card
> rather than a default next step. Verify all three live in the browser,
> not just in code — motion bugs are easy to miscall from reading the
> animation math alone.
**Done when:** every card's motion path is visibly accurate and
consistent card-to-card, no turn's animation ever overlaps the other
player's, and Play Ace only appears attached to an actual Ace in hand.

---

### Unplanned session — Splash identity: subtitle and animated wordmark ✅ Done (2026-08-26)

**Not a planned session.** Stan asked for a subtitle line on the intro
screen, a PLAY button, more character in the SCRAPS wordmark, the Magic UI
*text-3d-flip* effect on mobile and *kinetic-text* on desktop hover, and
*shine-border* on the difficulty options. Nothing was committed or
published — the work sits in the working tree.

**Read this first if you are picking up a session here: the local checkout
was four commits behind `origin/main`.** Session 8 and the onboarding
rebuild were both already pushed, but a local `main` sitting at `0789449`
made it look like neither had happened — the tracker in this file said
Session 8 "Not started" while Notion said Done, which is what surfaced it.
That drift was Notion being *right* and the local file being *stale*, the
opposite of the usual direction. This session's first real work was
stashing, fast-forwarding to `331dd5e`, and re-applying everything onto
the newer code. **Run `git fetch` and check `git log HEAD..origin/main`
before starting anything here, not after.** Two of the five requests
looked different once the newer code was in view: the title button was
already **PLAY** (the onboarding rebuild had cut the RULES wall and made
the splash one screen with one button), so that request was already
satisfied, and the difficulty picker's class is now `.pick-box`, not the
`.diff-opt` the older code used.

**What changed**

- **`src/components/backdrop.jsx` — `AnimatedTitle` rebuilt.** Each letter
  is three nested spans, because three behaviours all want `transform` and
  the last one declared would otherwise win: `.scraps-letter` (entrance +
  the perpetual breathe), `.scraps-kinetic` (desktop hover ripple,
  transition-driven), `.t3d` (the 3D flip, its own 3D context).
  `perspective` sits on `.scraps-kinetic` specifically — an ancestor with
  its own transform flattens perspective inherited from further up, so
  putting it on the row would silently do nothing.
- **The breathe** (`titleBreathe`) is a 3.4s rise-and-fall staggered 0.16s
  per letter. It deliberately has **no fill mode**: it shares the
  `animation` shorthand with the existing `letterAppear` entrance, and with
  no fill it stays inert until its delay elapses, letting the entrance own
  the transform first. Give it `both` and the entrance breaks.
- **Mobile 3D flip.** Hand-rolled in CSS — no `motion` dependency, so the
  repo is still zero-runtime-deps beyond React. Two faces per letter
  carrying the same glyph; the container animates `rotateX(0 → -90deg)`
  and the class is dropped afterwards, so the snap back to 0 is invisible.
  Depth is `0.5em`, half the letter box, which is uniform across letters
  even though their widths are not. Triggered by `(hover: none), (pointer:
  coarse)`, once 1.4s after mount and again on every tap; hover means
  nothing there, so without its own trigger nobody would ever see it.
- **Desktop kinetic hover.** *Deviation, flagged:* Magic UI's kinetic-text
  interpolates `font-weight`, and Bungee Shade (the wordmark face) ships a
  single weight, so weight animation is a literal no-op on this font. The
  behaviour that makes the effect read — one letter swells while its
  neighbours give way by a decreasing amount — is carried by scale plus an
  inline-padding push instead, three rings deep (1.2 / 1.1 / 1.04),
  measured live: hovering "R" gave 8.1px / 4.1px / 0px of padding pushed
  outward, symmetric on both sides. Getting the real weight-morph would
  mean re-picking the wordmark face for a variable font — an identity
  change, not done.
- **Shine border** on the two difficulty boxes, the Magic UI
  mask-composite trick reimplemented in plain CSS: a 300%-sized radial
  gradient ring, everything but a 2px frame masked out, gradient position
  animated 8s linear. Applied as a separate `.shiny` class and only while
  the box is `armed` — an inert panel should not be advertising itself,
  and the 720ms arming lock is load-bearing (see the picker's own note).
- **`index.html`** gained all of the above CSS plus a `--gold` custom
  property, and its reduced-motion block now also stops the shine and the
  wordmark animations.
- **Splash copy.** New `SUBTITLE` constant in `MenuScreens.jsx`, currently
  *"Your discard pile is next round's hand."* Swapping it is a one-line
  change; the 30 candidates are listed below.
- **Two pre-existing mobile bugs, found while testing this, not caused by
  it:** the wordmark's `clamp(80px, 17vw, 148px)` had a floor wider than a
  phone — at 375px the letters ran off both edges. Now `clamp(44px,
  14.5vw, 148px)`, measured at 327px wide inside a 375px viewport. And the
  `♠ ♥ ♦ ♣` row was a fixed 64px, which wrapped 3-and-1 on mobile; now
  clamped and `nowrap`. Both are on Session 3's turf and neither was in
  its notes.

**Verified in the browser** (dev server on 5193, desktop and 375px), not
from the code: six breathe animations running with staggered delays; the
hover ripple measured on the live DOM at 1.2 / 1.1 / 1.04 scale with the
padding push symmetric; the flip animation confirmed reaching
`rotateX(-90deg)`, and a frozen -45° frame screenshotted to confirm it
reads as a barrel roll rather than a glitch; both shine borders animating
(seeked to a mid-cycle frame to watch the highlight travel); no console
errors; 37/37 tests and `npm run build` green.

**Watch out next time:** the Browser pane reports itself hidden, which
throttles animations into bursts — `animationstart` never fired and
`currentTime` sat at 0 for 700ms before jumping to finished. Two separate
JS round-trips are also slower than a 1s animation, so sampling a class
before-and-after across two calls misses the whole thing and looks exactly
like a broken trigger. The fixes: sample inside one call with a
`setTimeout` chain, or freeze a frame and screenshot it.

**Still open:** nothing is merged to `main`. The subtitle is picked (see
the addendum below); the other 29 candidates are kept for reference.

**Previewed, critiqued, and fixed (same session).** Subtitle locked to *"Build
two hands at once."*, and the `settling` hint copy ("Your cards are on the
move. Click anywhere to skip.") was dropped at Stan's request — the branch
stays with an empty string on purpose, because deleting it outright would let
the next condition fill the hint line while cards are still mid-flight.

Pushed to `dev` as `dd9a22b`, previewed, then a full `/impeccable critique`
ran as two isolated sub-agents (design review; detector + browser evidence).
Snapshot at `.impeccable/critique/2026-08-26T20-53-27Z__src-screens-menuscreens-jsx.md`.
Heuristics scored **16/40**, the technical audit **16/20 (Good)** — the gap is
almost entirely pre-existing keyboard/help-access debt, not this session's
work. Fixes landed as `50fc941`.

**The verdict worth keeping:** the palette and type are specific to this game
and the fern-green **A** is the one detail only SCRAPS could justify (the Ace
is the weapon), but the composition is a default hero stack and all three new
effects are general web vocabulary, two of them Magic UI ports. Nothing in a
breathe, a barrel roll, or a border shine says cards, dealing, or hidden
information. A riffle for the idle motion, a card flip for the tap, and a deal
for the picker's arm would cost the same zero dependencies and produce motion
no other product could use. Not acted on — it is a creative direction call,
not a defect.

**Five defects, all introduced by this session, all fixed and re-verified on
the deployed preview:**

1. **The shine painted gold** — `theme.js` reserves gold for milestones only
   and the picker is the most general UI in the game. This is the *same*
   reserved-token mistake the card back made twice during the reskin, which
   makes three times a documented colour rule has been broken by code that had
   the rule sitting two files away. Now voltage into frost.
2. **The shine animated `background-position`, a paint property, forever** on
   two masked rings. `backdrop.jsx`'s own header records that exact bug class
   causing real hover lag here before, and it was reintroduced two files over.
   Rebuilt: static mask, conic gradient rotating behind it via `transform`,
   which is compositor-only and reads as a glint travelling the border rather
   than a wash pooling in the corners.
3. **PLAY clipped below the fold in landscape** — measured on the deployed
   preview at 844x390: button bottom at 392px in a 390px viewport, page
   scrollable. The subtitle's fixed 30px margin stacked on the wordmark's
   `clamp(26px,6vw,36px)`, neither aware of viewport height. Both gaps and
   both font sizes now carry `vh` terms (`min(14.5vw,26vh)` on the wordmark,
   `min(9vw,8vh)` on the suits). Re-measured after: 390px document in a 390px
   viewport, PLAY ending at 326, no scroll. Desktop and 375px are unchanged by
   construction — the `vh` term only wins on short viewports.
4. **The wordmark selected and extracted as `SSCCRRAAPPSS`** — `aria-hidden`
   removes a node from the accessibility tree but not from the text layer, so
   screen readers were fine while copy-paste and any text extraction saw every
   glyph twice. The back face's glyph moved into `::after` via `data-char`, and
   `user-select: none` on the letters.
5. **`perspective` was a fixed 900px against `0.5em` of depth** — a 3%
   depth-to-perspective ratio at the 54px mobile wordmark against 8% on
   desktop, so the barrel roll read as a vertical squash on exactly the devices
   it was built for. Now `5em`, relative to the letter (507px computed at the
   101px landscape size).

**Carried forward, pre-existing, and squarely Session 5's:** splash and picker
each expose **zero focusable elements** (`.pick-box` are divs with onClick, and
`buttons.jsx` sets `outline:'none'` with no `:focus-visible` replacement
anywhere in the project) — and this session added a decorative shine to those
same unreachable controls. No headings on either screen. `.pick-box.armed:hover`'s
`transform: scale(1.015)` is dead code, because `panelUnfold` fills a
`transform` and a filling animation outranks author declarations, so the lift
renders *only* under reduced motion where the animation is removed. HARD renders
in fern (voltage = "yours") on the one screen where you choose an opponent, when
ember is the committed opponent colour. The suits row is monochrome sage though
the palette assigns ember to red suits. Splash timing runs backwards: PLAY
appears at 0.6s, the subtitle at 0.7s, the wordmark's last letter at 1.05s.

**Preview URL:** https://scraps3-ob6p09u3c-samvaudrey-3466s-projects.vercel.app
— verified there, not just locally: no console errors, no landscape scroll,
clean text layer, both rings spinning with no gold. Not merged to `main`.

**Motion chosen, and keyboard access fixed (same session, after the
critique).** Stan asked to see the options rather than argue them, so the
sixteen candidates were built as a live comparison artifact — four
dynamics x four options, in the game's own palette and typefaces, with
scale and speed controls. Artifact:
https://claude.ai/code/artifact/84fed1d3-0b31-413e-ad98-8dad1e311d88

**His picks, all four now shipped to `dev` (`e06e3ae`):**

- **Idle = riffle**, at **2.08s** rather than the lab's 2.6s — he asked
  for a quarter more often, and 2.6 / 1.25 is exactly 2.08. A spring
  travels the row the way a bridged deck releases: most of the cycle is
  stillness. `perspective` moved to `.scraps-title` so the per-letter
  `rotateX` reads as depth instead of a flat vertical squash.
- **Tap = square-up**, with a **new sound**, `playSquareUp()` in
  `audio.js`, running to the animation's own 0.82s: a brush of card
  edges while the hand is loose, six taps on the letters' own 0.028s
  stagger, a soft landing under the last of them. The six taps are a **G
  major pentatonic** run — any subset of a pentatonic is consonant with
  any other, so six pitched hits inside 200ms cannot land on a sour
  interval, which was the whole risk given "not too harsh or dissonant."
  Verified by counting nodes on a real tap: 7 oscillators (6 taps + the
  landing), 1 noise bed, 7 filters. Scatter offsets are **fixed per
  letter, never random** — a gesture that differs run to run reads as a
  glitch rather than a flourish. Note the auto-fire 1.4s after load is
  silent by design: browsers refuse audio before a user gesture, so only
  the tap itself sounds.
- **Hover = fan the hand**, rotation off a pivot below the baseline,
  **pure transform** — the ripple it replaces animated inline padding, a
  layout property. Per his instruction the wordmark keeps
  **`cursor: default`**: it answers hover, and on touch it answers tap,
  but clicking does nothing on a pointer device and the cursor must not
  promise otherwise.
- **Difficulty panel = dealt in** from off the left. The shine border and
  its rotating conic ring are gone entirely.

The new panel animation fills **`backwards`, not `both`**, which also
kills the dead-code bug the critique found: `panelUnfold` filled a
transform forwards, and a filling animation outranks author rules, so
`.pick-box.armed:hover`'s lift had never rendered once. Verified: the box
now settles to `transform: none` and a hover scale actually computes.
Retiring the flip's second face also removes the doubled text layer for
good, rather than working around it.

**Keyboard access, fixed (`0d0f5d1`).** The splash and picker exposed
**zero focusable elements between them**, and all three button
primitives set `outline:'none'` with no replacement anywhere in the
project. A running game now has 11.

- One global `:focus-visible` rule, voltage at 3px with 3px offset.
  `:focus-visible` rather than `:focus` means a mouse click never paints
  a ring, which is why it can be this loud without being in the way.
- Difficulty options are real `<button>`s, and the 720ms arm lock is
  `disabled` rather than `pointer-events: none` — assistive tech is now
  told the control is not live yet instead of silently finding nothing.
- **Cards were the real gap**: the core interaction could not be reached
  at all. Selectable cards in the fan and the Scraps pile carry
  `role=button`, `tabindex`, `aria-pressed`, Enter/Space handling, and a
  spoken label built from a rank/suit map (`cardLabel()` in `cards.jsx`),
  because a screen reader cannot be relied on to say "♦" usefully.
  Face-down and ineligible cards stay out of the tab order. Verified:
  Enter on a focused card flips `aria-pressed` false to true and appends
  ", selected" to its label.
- Play Ace was a `<div>` — the most consequential move in the game.
- The walkthrough's "tap anywhere" surface answers Enter, Space and
  ArrowRight, Escape skips, and events already bound for a real button
  are ignored so Enter on SKIP does not also advance the beat behind it.
  Copy now reads "Tap anywhere, or press Enter". Escape closes the rules
  modal; the log toggle is a button with `aria-expanded`.

**HARD now wears ember** (`ff9646f`), closing one of the critique's
consistency findings: the picker asks you to choose an opponent and drew
both options in fern, this project's "yours / interactive" token. The
accent is a per-box `--accent` custom property fed from `theme.js` with
voltage as the fallback, so the picker CSS no longer hardcodes one colour
and the boxes differ by something other than their words. Label, border,
hover glow and arm flash all follow it. Measured live: ember label on the
panel fill is **8.31:1**, AAA against even the normal-text threshold, at
54px.

**Still open from the critique, deliberately not done here:** no headings
on either menu screen; picker copy is in-game jargon for anyone who
skipped the walkthrough; the suits row is monochrome sage though the
palette assigns ember to red suits; splash timing still runs backwards
(PLAY at 0.6s, subtitle 0.7s, last letter 1.05s).

**Preview:** https://scraps3-3en7b34rn-samvaudrey-3466s-projects.vercel.app
— verified on the deployment: six riffle animations running, cursor
default on the wordmark, clean text layer, no shine rings, no console
errors. Not merged to `main`.

**Final round of notes from Stan, then published to production
(2026-08-26).**

- **Riffle and fan no longer run together.** Hovering drops the riffle;
  it resumes when the fan is released. The rule needs `!important` and
  that is load-bearing rather than lazy: each letter's animation is
  declared **inline** in `backdrop.jsx` because the stagger is
  per-letter, and an inline declaration outranks a stylesheet rule. The
  first attempt at this fix silently did nothing for exactly that
  reason, and it only surfaced because the hover state was measured
  rather than eyeballed. A 260ms transform transition carries a letter
  out of a mid-riffle tilt instead of snapping, since the transitions
  spec counts a running animation as part of the before-change style.
  One consequence worth knowing: the riffle restarts with its inline
  delay, so there is roughly a 1.1s beat of stillness after the fan
  before riffling resumes. It reads as the hand settling.
- **The Scraps best-hand badge moved beneath the cards.** Stan reported
  it overlapping the zone border and asked whether it was his display.
  It was not: measured in a live 260px zone, the badge overflowed past
  the border by **17px on FULL HOUSE, 52px on FOUR OF A KIND and 61px on
  THREE OF A KIND**, with HIGH CARD already touching it on one zone. The
  header put the ownership label and the badge in one row, both
  `nowrap`. The badge now sits centred under the pile, which is also the
  relationship `HandUpgradeBadge` already had to the small hand, and
  every hand name now clears the border by 43px or more.
- **First log line** now reads `Round N - Opponent dealt. You go first.`
  Past tense, plain hyphen. The mirrored line for rounds where the
  player deals was changed to match rather than left in a different
  tense.

**Published to production.** `dev` fast-forwarded into `main`, nine
commits, build green in 4s, live at
[scraps3.vercel.app](https://scraps3.vercel.app) and verified there: six
riffle animations running, the hover rule present with its `!important`,
`cursor: default` on the wordmark, clean text layer, the `:focus-visible`
rule live, no console errors. **No environment variables exist in this
project and nothing runs on a schedule**, so there was nothing to confirm
in the production environment beyond the build itself.

The publish-time detector returned 19 findings, all two kinds: 18
bounce/overshoot easings and one zero-offset voltage glow. Both are this
game's committed identity — cards that spring when they land, and the
glow that `theme.js` documents as the interaction language — and all but
one (the square-up's own overshoot) predate this session. Shipped as-is.
The fuller `/impeccable critique` was deliberately **not** re-run at
publish: a full two-agent critique already ran earlier in this same
session against exactly this surface, all five of its findings were
fixed, and everything after that was Stan's own picks.

**Session closed (2026-08-26).** Two process edits were proposed in the
publish retro and approved by Stan, then made:

- **`~/.claude/skills/build-next/SKILL.md`** now opens with a checkout
  currency check: `git fetch`, then `git log --oneline HEAD..origin/main`
  and the same against `origin/dev`, before reading anything. It also
  gains a note in the reconcile step that a stale checkout is the first
  thing to rule out when Notion and the brief disagree, because Notion is
  edited in a browser and is always current while the brief is only as
  fresh as the last pull. That inverts the usual "the repo is the source
  of truth" instinct, which is exactly why it cost this session time.
- **`~/.claude/CLAUDE.md`**'s browser-measurement rule gained the two
  hidden-pane failures this session kept hitting: `requestAnimationFrame`
  and `animationstart`/`animationend` never fire, so anything that sizes
  itself in a rAF callback silently never runs and an animation looks
  dead when it is merely eventless; and two JS round-trips are slower
  than most animations, so sampling a class before-and-after across two
  tool calls misses the whole thing and reads as a broken trigger. Plus
  a note that `currentTime` advances in bursts, so pane timing is
  unreliable even once an animation is confirmed running.

**Worth knowing for the next session that touches layout:** CLAUDE.md now
documents Stan's display setup, and one line of it matters for this
project specifically. His Mac runs the "Larger Text" resolution preset,
roughly 1024x662 logical points, so a maximized browser on his screen is
about **tablet width** in CSS pixels. He lands on tablet breakpoints
while other desktop users land on desktop ones. The Scraps badge overflow
he reported was real and measured independently at a 1280 viewport, but
his narrower window would have made it worse, not imagined. The table's
known clipping issue (Session 3) deserves re-measuring at ~1024x662
rather than at 1280.

**Final state at close:** everything is committed and pushed, `main` and
`dev` both at `b4f0928` and even with each other. 37 tests pass, the
production build succeeds, and production is verified live. The dev
server and browser tabs opened during this session were stopped at close;
no background process was left running.

**The 30 subtitle candidates**

*Two hands:* Build two hands at once. · Poker at two speeds. · Two hands
in the dark, one in the light. · Two quick hands, one slow one. · Half
your hand is public knowledge. · Your best hand is the one they can see.

*The discard economy:* Your discard pile is next round's hand. · What you
throw away is what you play. · Feed the pile. The pile pays. · Nothing
gets wasted. That's the trap. · Every discard is a bet. · Trade what's
hidden for what's fresh. · Give up a card to get a card. Choose well. ·
The trash is the point.

*Aces:* Aces aren't cards. They're ammunition. · Spend an Ace, take two of
theirs. · Aces attack. Aces defend. Aces run out. · Someone always has one
Ace left.

*Tone:* Slow-build poker with a knife in it. · Build in the open. Get
robbed in the open. · Everyone sees it coming. Nobody can stop it. ·
Patience, then violence. · A long build and a short fuse. · Watch the pile
grow. Wonder what's under it.

*Rules flavour:* No flushes. Not ever. Don't ask. · Five cards, no
flushes, no mercy. · Win both small hands and the big one for a FULL
SCRAP. · Three hands a round. Only one is public.

*Shortest:* Poker, but you build it in public. · Discard with intent.

---

---

### Unplanned session — Ghost launch frame, and the Foley Bench ✅ Done (2026-08-26)

**Not a planned session.** Stan asked to continue the build plan and, in
the same breath, reported that toggled cards "abruptly change position in
the first frame" of the transfer animation. The sound-lab request arrived
mid-session and turned into the exploration half of Session 4.

**Read this first: `dev` was three commits behind `main`.** Session 3's
whole viewport rewrite (`src/ui/viewport.jsx`, `tools/responsive-qa.mjs`,
and a 574-line change to `GameScreen.jsx`) lived only on `main`. Working
on `dev` without fast-forwarding would have rebuilt against a layout that
no longer exists. Fast-forwarded before reading anything. This is the
*second* consecutive session to open on a stale checkout — the check is
worth doing before literally anything else.

**1. The ghost launch frame (`src/components/flight.jsx`)**

Session 8's FLIP rewrite was right that both ends must be measured, but
`getBoundingClientRect` measures the wrong thing for a card in the fan.
Three separate defects stacked into one visible jump, all confirmed by
measuring the live DOM rather than reading the animation math:

- **`transform-origin` was the ghost's own box centre.** The inner div
  centres the card on the element's origin, but scale and rotate pivot
  about the box centre by default — half a card away. Measured: frame one
  landed 3.4px left and 4.8px above the real card. The *landing* was off
  by the same mechanism whenever the destination scale wasn't 1, so
  Session 8's "no jump, ever" was not quite true at either end.
- **`from.width` was the rotated bounding box.** A fan card at -5.6° has
  a true width of 76.7px and an AABB of 86.8px, so `scale0` came out 13%
  too large and the ghost launched visibly bigger than the card.
- **The ghost drew upright.** Fan cards sit at up to ±8.4°; the ghost
  started at 0° and snapped.

`rectOf` now walks the ancestor transforms into a single `DOMMatrix`
(`screenMatrix`), which gives the true scale and the *signed* angle —
the 2×2 AABB solve would have given the magnitude but lost the sign. The
ghost pivots about `0 0` and leans from the source angle to the
destination one, with the existing arc flourish laid on top.

Measured after the fix: card at capture `(-129.24, 720.88)`, `-5.6°`,
`90.55px` — ghost frame one identical on all three. 37 tests pass, the
production build succeeds.

**Worth knowing:** the in-app browser pane reports `0×0` and
`visibilityState: hidden` for most of a session, which makes absolute
coordinates meaningless and screenshots come back half-blank. Relative
geometry inside a single JS call stays consistent, so measuring two
points in the same call is reliable; comparing across calls is not. The
old `tools/responsive-qa.mjs` Playwright path is no longer available —
Playwright is not installed globally on this machine any more.
**Corrected 2026-08-27: that is true of the Playwright CLI and false of
the Playwright MCP server**, which drives its own real browser where
timers fire and screenshots come back whole. The whole of Session 5's
audit ran through it — splash → storyboard → picker → a full turn, the
focus trap, the reduced-motion measurement — and none of it was walkable
in the in-app pane, whose suspended `setTimeout` stalls at the picker's
720ms arm lock. Reach for the MCP server before concluding a flow cannot
be driven. `responsive-qa.mjs` itself still needs the CLI and still
cannot run.

**2. The Foley Bench — Session 4's exploration half**

Stan asked for a sound lab with several options per cue, big swings, no
resemblance to his other games, non-Web-Audio options considered, and
"repurpose the existing audio labs from past projects."

**There were no audio labs to repurpose.** Three synthesis *engines*
exist — `EGOT/src/game/sound.js` (702 lines, the richest: `tone()` and a
`shortVerb()` convolution helper), `forgotmyd20/src/audio.js`
(`envelope()`), and `photonscroll/src/audio/stemEngine.js` (a sample stem
player). EGOT's primitives seeded the kernel; the bench itself is new.

Published as an artifact, deliberately not a file in this repo, because
Stan wants it to grow and serve future projects:
**https://claude.ai/code/artifact/2b99d5e2-f9b1-400e-9609-ee2b3dd210b8**

Two directions, chosen by Stan from a shortlist of four:

- **Cardboard & Bone** — 27 options across 12 cues. No oscillator plays a
  note; the only sine in the direction is a sub-bass *body* under impacts.
  Exciters are generated as raw sample data in JS (shaped noise,
  Karplus–Strong) and played through parallel high-Q bandpass banks that
  act as the modal body of a material — `cardstock`, `wood`, `bone`,
  `felt`. AudioWorklet was considered and rejected: worklets need a
  separate module URL, which is fragile under an artifact's CSP, and
  rendering the exciter offline gets the same physical models with none
  of that risk.
- **The Dealer** — 25 options, `SpeechSynthesis` as an instrument.

**A claim made early in the session and corrected:** the voice *cannot*
be routed into Web Audio. No browser exposes a `MediaStream` from
`SpeechSynthesis`, so it cannot be filtered, pitch-shifted after the
fact, or drawn as a waveform, and utterances queue serially rather than
overlapping. The instrument is exactly four things: the voice, `rate`,
`pitch`, and the syllables. The bed underneath is the only Web Audio in
that direction. The lab states this on screen rather than hiding it.

**The mix was the real finding.** Raw peaks across the Bone kit spanned
**75:1** — the wood-tap cues (`handWon` 0.020, `gameWon/drum` 0.024) sat
25 dB under the Ace cues (`crush` 0.507), so a drum roll would have been
inaudible next to an Ace strike. Every option is now measured in an
`OfflineAudioContext` and trimmed to a per-cue target defined in
`PROJ.loud` — a deliberate hierarchy from `select` at 0.16 to `fullScrap`
at 0.94. Verified: all 27 land on target within 0.01, spread now 5.9:1.
Choosing between two options never changes the volume.

The same offline render feeds the drawn waveform, so the picture and the
sound cannot drift. Waveforms normalise to fill their box (shape is what
a waveform is for); loudness gets its own explicit bar and dBFS readout.

**What is NOT done, and why Session 4 stays open:** nothing has been
chosen and `src/audio.js` is untouched — the game still has its original
ten cues. Session 4's bar is "all cues share a recognizable identity, the
Ace-strip moment has its own sound, and a full playthrough doesn't
produce anything jarring." That needs Stan to listen, pick a direction
and per-cue options, and then a build session to port the chosen kit into
`src/audio.js`. **Claude has never heard any of this** — every claim above
is numerical (renders, peaks, clipping, mix targets), not aural.

**State at close:** the flight fix is committed to `dev` (`7c08ca9`) and
not yet pushed or previewed. `main` is unchanged. No dev server or
background process left running.

## Session tracker

| # | Session | Status |
|---|---|---|
| 1 | Fix what's actually broken (clipping, color tokens) | Done |
| — | *Unplanned:* Forest/national-park brand reskin | Done |
| 2 | Game balance discussion | Done |
| 3 | Mobile and responsive QA | Done |
| 4 | Sound identity | Done |
| 5 | Design and UX audit | Done (2026-08-27) — accessibility, motion, contrast and six of seven visual findings; the right-heavy layout is the one left open |
| 6 | Security, privacy, and rights | Done (2026-08-28) — fonts self-hosted and verified, remote needed no change (the prompt was backwards), privacy notice signed off. Not published; held for Session 7 |
| 7 | Findability and launch | Not started |
| — | *Unplanned:* Onboarding rebuild and rules clarity | Done |
| 8 | Animation and interaction precision | Done |
| — | *Unplanned:* Splash identity (subtitle, animated wordmark) | Done |
| — | *Unplanned:* Ghost launch frame + Foley Bench sound lab | Done |


---

## ⚠️ Every publish-time detector result in this brief was recorded DEGRADED (found 2026-08-26)

**Read this before trusting any "detector returned N findings" line above.**

Impeccable's static detector (`scripts/detect.mjs`) needs four parser modules —
`htmlparser2`, `css-select`, `css-tree`, `domutils` — to build a real DOM and
CSS tree. They were **never installed on this machine**, so every static
detector run in this project's history fell back to regex matching and printed
`impeccable detect: DEGRADED` as its first line. In that state it does **not**
evaluate custom properties, selector matching, or computed contrast at all.

That matters most for a project whose colours live in CSS custom properties:
the detector was reading `var(--token)` with no way to resolve it, so contrast
was structurally unmeasurable rather than measured-and-passed. **A low or zero
count from those runs means the check could not see, not that the files were
clean.**

**Not affected:** any `/impeccable critique` run. Critique uses a *live in-DOM
detector* driving a real browser, which does its own parsing and never needed
these modules. Contrast ratios and measurements quoted from a critique report
are sound.

**Fixed 2026-08-26.** The four modules are installed at
`~/.claude/node_modules` (Node resolves them upward from the detector's own
file, so a per-project install does nothing). `/publish` now requires reporting
the degraded banner rather than quoting a degraded zero as a pass.

**Re-run at full strength on 2026-08-26, for comparison against what this brief
records:**

Brief records **19 findings** ("18 bounce/overshoot easings and one zero-offset
voltage glow"). Full strength returns **20** — 19 `bounce-easing` plus the same
1 `dark-glow`, so exactly one additional easing surfaced.

Both categories are the ones this brief already examined and shipped as-is on
purpose, as the game's committed identity — cards that spring when they land,
and the glow `theme.js` documents as the interaction language. So the earlier
conclusion still stands; the count was one short, and the reasoning behind it
was not affected.

**ACTION REQUIRED BEFORE LAUNCH:** re-review these findings with the modules
installed. They have been counted, not triaged — nobody has yet decided which
are real and which are false positives. Expect some of the latter: on EGOT the
two findings that only appeared at full strength were both false positives
against a documented, deliberate choice (a fallback font in a system stack, and
a type ratio that was already above the stated floor). Judge them, record the
verdicts, and only then treat the detector line in this brief as trustworthy.

**TRIAGED 2026-08-27 in Session 5 — this action is now closed.** All 20
were judged individually rather than accepted as a block. **16 are false
positives against a documented, deliberate choice:** card motion, score
pops and the splash wordmark are a card game's physical vocabulary, and
the single `dark-glow` is what `theme.js` records as the interaction
language. **4 are real** — `popIn`'s overshoot fires on the *losing*
overlays (the opponent's Ace reveal, the counter notice, no-legal-trades)
and `errBounce` bounces the over-limit error, so celebratory easing lands
on bad news. That is the same P1 Session 1's critique raised. Logged as an
open visual finding in the Session 5 entry above, for Stan to call.

The prediction in this section held: as on EGOT, the findings that only
appear at full strength were false positives against choices this project
had already made on purpose. What the full-strength run bought was the
confidence to say so.
