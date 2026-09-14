# SCRAPS — Revision, QA & Launch Brief

**Shorthand name: SCRAPS.** This is not a from-scratch kickoff — SCRAPS already
exists as a working proof of concept at `~/Projects/scraps3`, live at
[scraps.games](https://scraps.games) since 2026-09-12 (the older
`scraps3.vercel.app` still resolves but 308-redirects there; historical
entries below correctly name it as the address of their day). This brief runs the usual
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

**The origin story itself, written down here for the first time
(2026-08-30). NOT PUBLIC, and not to be published without Stan's say-so.**
Stan and his wife took a weekend vacation to Sisters, Oregon, a small town
that turned out to be far more rural than they had expected. They spent
most of three days at a table inventing this card game. In his words it is
a fond memory of one-on-one time in a campground.

Until this entry, that story existed **only inside a chat transcript** —
the `/audit` command arguments on 2026-08-30, in
`~/.claude/projects/-Users-stan-Projects-scraps3/ea751ac9-*.jsonl`. The
brief's post-launch backlog carried the phrase "the Sisters, OR origin
story" and nothing else, which is unreadable without the transcript; a
later session read "Sisters" as a proper noun rather than as a town in
Oregon. A story that only lives in a transcript is a story the project has
already lost.

**What is public today is only the bare invention fact.** `public/llms.txt`
says "Its creator and his wife invented it themselves" — no name, no place,
matching Stan's own launch drafts and the personal-data-OUT grep run at the
last publish. Sisters, the campground and the three days appear nowhere in
`dist/`.

**The audit's argument off the back of it, also worth keeping:** "forest"
is an abstract palette with no story, which is why it drifted into felt.
"A card table at a campground in Sisters, Oregon" is a *specific place*,
and it hands the project a surface, a light source and a reason for the
warmth already in the tokens. That reasoning is what `TableSurface` and its
lantern gradient are already built on, and it is the argument behind the
splash directions in the session below.

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
> inline SVG — the game ships no image files at all. All sound is generated
> live with the Web Audio API, so there are no audio files either. React,
> zero runtime dependencies. [link]

*r/cardgames (leads with the invented-game angle, this audience cares most
about mechanics):*
> **My wife and I invented a 2-player card game called SCRAPS — full rules
> inside, plus a free browser version to actually try it**
>
> [Full rules: two private "small hands" worth 1 point each, one public
> Scraps hand worth 2. Move cards into your Scraps pile to draw fresh ones,
> both piles cap at 7. Aces are a weapon — discard one to strip two cards
> from the opponent's Scraps pile, they can counter with an Ace of their
> own. First to 10. Sweep both small hands and the Scraps hand in
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
> can counter-strip right back. First to 10. [link] — feedback
> welcome, especially anything that breaks on your setup.

*Friends / word of mouth:* no drafted copy needed — direct message, not a
public post. Just the link and "built this, tell me if anything breaks."

> **Two notes on these drafts, 2026-09-13.** The win condition above was
> "First to 10, win by 2" until the rule was dropped; it is corrected here
> rather than left to go out wrong. The generic **"they"** in the Ace
> sentences is deliberate and was NOT swept when the AI opponent became
> female the same day: those lines state the rule as two humans would play
> it, where the opponent is anybody. "She" belongs to the character the game
> puts across the table, and it is used everywhere inside the product.

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
6. **DONE (2026-08-28), in the unplanned centre-axis session below.**
   The table read right-heavy: the left third below the deck was empty
   while the right column stacked round strip, opponent Scraps and your
   Scraps. The guess in this line was right — the pile rail becoming a
   column is exactly what let it be fixed, because a one-card rail no
   longer needs a content-sized gutter to keep clear of the narrator
   panel. Stan reported the same imbalance from the other side ("pushing
   to the left") once he saw it on a wide screen. Painted mass at 1920
   moved from 185px left of the centre axis to 47px right of it.
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

**Published to production 2026-08-28**, at Stan's call, rather than being
held for Session 7 as this entry first planned. `main` is at merge commit
`4de3205`; deploy `dpl_bf1CvZdbhenzLc6ZVQXDXW2ZjCN2`, target production,
state READY.

**Landed via pull request, not a direct push, and that is a change in how
this project publishes.** This session ran in a sandboxed remote container
whose policy refuses any `git push` to `main` or `dev`. The work went in as
[#1](https://github.com/stanbaudrey/scraps3/pull/1), merged through the
GitHub API. Nothing about the result differs — `main` carries the same four
commits — but a session running under that policy cannot fast-forward the
two branches by hand.

**Consequence, and the one loose end: `dev` is now BEHIND `main`.** Every
prior session left them level. `dev` still sits at `85f872f` and needs a
fast-forward to `4de3205` from a machine that can push it. Nothing is
broken by the gap; `/preview` just deploys yesterday's code until it is
closed.

**Verified against production itself, not the build log**, in the same
spirit as Session 5's `cmp` and with the same conclusion reached a
different way:

- The live HTML serves `/assets/index-EjHBJe5J.js` — **the exact filename
  the local build produced.** Vite derives that hash from content, so a
  matching name is a matching bundle.
- All 24 `@font-face` rules are present in the served HTML, pointing at
  `/fonts/*.woff2`, with the `FONT-FACE:BEGIN`/`END` sentinels intact and
  the three preloads above them. **No `googleapis`/`gstatic` link or
  preconnect survives** — the only occurrence of either string is the
  comment explaining why they are gone.
- A real font file returns `200`, `content-type: font/woff2`,
  `content-length: 13348` — byte-exact against the local file — and its
  body starts with the `wOF2` signature. A *missing* path under `/fonts/`
  returns a genuine `404` rather than an SPA fallback, which is what makes
  the `200` mean the file is really there.

**One check this session could not run, stated rather than skipped:**
direct HTTPS to `scraps3.vercel.app` is refused by this container's egress
policy (`403` on CONNECT, recorded in the proxy's own failure log). The
verification above went through Vercel's API instead. A cold mobile smoke
test on cellular data — Session 7's requirement — has therefore still not
happened from here.

**Open, and carried into Session 7:** the `?` help button asks for Work
Sans 900 (`GameScreen.jsx:1237`), which was never declared and renders as
700 with synthetic bold. Work Sans is variable and its file is already on
disk, so declaring a real 900 face costs zero extra bytes. Left alone this
session to preserve parity with what production already renders; not yet
called either way.

### Session 7 — Findability and launch — part one done + PUBLISHED (2026-08-28)
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

**What happened (2026-08-28).** Stan scoped this sitting to the pre-launch
notes plus the metadata and the monthly check, and explicitly held the
launch-post copy back. So the session is **part one of two**: everything
that makes the site findable is built and on `dev`; nothing is published
and no post has been written.

**Before anything else, the checkout was reconciled.** Session 6 landed on
`main` through a pull request, so `dev` sat 7 commits behind and `/preview`
would have deployed the pre-Session-6 game. Fast-forwarded and pushed.
Both branches were level at `51e7bef` before any work started.

**The prompt was re-validated and Section 8's launch copy had two factual
errors. Both are now FIXED** — Stan first held the copy back, then asked for
the win score reconciled, so both were corrected in the same pass:

- Two of the three drafts said **"First to 11, win by 2."** `WIN_SCORE` has
  been **10** since the 2026-08-25 reskin. The r/cardgames draft leads with
  the full ruleset to the audience most likely to notice. Now 10 in both.
- The Show HN draft claimed **"no `public/` directory, no image files
  anywhere in the repo."** Session 6 created `public/fonts` and this session
  added four more files. Reworded to "the game ships no image files at all",
  which is the true and still-interesting version of the claim.

**There is no "11" left anywhere in the repo.** `WIN_SCORE` is the only
declaration of it, `hud.jsx` and the storyboard both read that constant, and
the share card's own generator imports it — so this class of drift is now
caught by `npm run share:check` rather than found by reading.

**1. Two of Stan's four pre-launch notes were real. Two had already been
fixed and nobody had gone back to check.** All four were measured in a real
browser through the Playwright MCP server, not reasoned about — the
difficulty-card bug in particular fires on a 720ms timer, which the in-app
pane suspends and therefore cannot show.

- **The round's cards were readable before they were dealt. REAL, fixed.**
  `RoundInterstitial` is a **scrim, not a cover**: `rgba(20,31,25,0.6)` on
  the way in, 0.92 while it holds, and then it spends its last 600ms fading
  to *fully transparent* — while `dealWave` does not run until `onDone()` at
  2000ms. Sampled every animation frame: 14 of 14 cards visible and
  unhidden right up to t=2030ms, when the ghosts finally launched. So the
  player saw their real hand, face-up, for more than half a second, and
  then watched it vanish and deal itself in. A `pendingDealIds` set now
  hides the two hands from the moment the round is built and hands off to
  the motion hook's own `hiddenIds` before paint — measured after the fix at
  10 hidden from t=11ms, with `hid` never returning to 0 across the
  handoff. The 4 Scraps cards stay visible, correctly: they are never dealt
  by the wave.
- **The hand-name badge leaked the same information, in text.** Found in
  the after-fix screenshot, not in the report: `HandUpgradeBadge` read
  **"PAIR" under an empty fan** because it was built from `playerHand`
  directly. It now reads the cards actually on screen, which also means it
  settles as a trade's cards land instead of naming a hand still in the air.
- **The storyboard had no way back. REAL, fixed.** `ArrowLeft` and a BACK
  button beside SKIP. It is always rendered and merely `visibility:hidden`
  on beat one, so SKIP does not jump sideways when it appears, and it
  `stopPropagation`s — the backdrop advances on any click, so without that a
  click would step back and forward in one gesture.
- **The difficulty cards dealing in then glitching. DOES NOT REPRODUCE.**
  Measured at both 1280x720 and Stan's 1024x662, through the storyboard on
  a genuine first run and via SKIP: both boxes move monotonically to
  (202,211) and (202,341) and never move again, and `armed` landing at
  ~690ms changes no position. A plausible cause was read out of the CSS
  first — `.pick-box.armed` re-declares the whole `animation` shorthand,
  which looks like it should restart `panelDeal` — and **that reading was
  wrong**: the browser matches animations by position in the list, so a
  finished `panelDeal` stays finished. Session 5's `panelUnfold` →
  `panelDeal` rewrite almost certainly fixed the original.
- **Left-justified instruction copy. ALREADY FIXED.** The walkthrough copy
  computes `text-align: center`.

**Stan rewrote the metadata copy and the share card the same day, and
what he chose is what shipped.** The first pass kept the existing title
and put the game's rules on the card; he cut both.

| Field | Was | Is |
|---|---|---|
| Title | SCRAPS — Two Hands. One Table. No Mercy. | **SCRAPS - Poker with two hands at once.** |
| Description | A card game of hidden hands, public scraps, and calculated betrayal. | **This turn's discards are next turn's hand.** |
| Card line | FIRST TO 10 · WIN BY 2 · NO FLUSHES | **A 5-minute card game with a twist** |
| Card art | *(none)* | **a fanned royal flush of diamonds** |

His reasoning on the card line, worth keeping because it generalises:
*"boring rules"*. A share card has about a second to be interesting and
the win condition is not the interesting part. The rules still exist for
the audiences that want them — `llms.txt` states the full ruleset for
crawlers and the JSON-LD carries it for search — they are just not what
the picture spends its one second on.

**The hand on the card is a royal flush of diamonds, and it is a hand
this game does not recognise.** Flushes are never valid in SCRAPS; a
suited A-K-Q-J-10 scores as a plain straight. This was flagged before
building and Stan chose it anyway, which is the right call for the
reason it was offered: it is the most instantly legible "card game"
image there is, and almost nobody reads a share card as a rules claim.
The valid near-identical alternative was rendered beside it for the
comparison — the same five ranks in mixed suits, which is a straight
and genuinely the best hand here — and is kept in the generator as
`HAND_STRAIGHT`, one constant away, in case the r/cardgames audience
ever makes it worth switching.

**Two things this broke that were caught rather than shipped:**

- The new title uses a **hyphen**, not an em dash. `WORDMARK` was derived
  by splitting the title on `—`, so with a hyphen it silently took the
  ENTIRE title as the product name — which would have set
  "SCRAPS - Poker with two hands at once." in Bungee Shade across the
  card and written it into `robots.txt` and `llms.txt` as the game's
  name. It splits on either separator now.
- The first render put the strapline **through** the fan: the outer
  cards are rotated *and* pushed down, so the lowest painted corner sits
  well below where flex thinks the row ends. Fixed by sizing the gap
  against the real droop rather than the card box.

**2. The findability metadata, generated rather than drawn.**
`tools/make-share-assets.mjs` reads the `<title>` from `index.html`, the
`SUBTITLE` from `MenuScreens.jsx`, and `DS` and `WIN_SCORE` by *importing*
`theme.js` rather than regexing it. It renders a 1200x630 card and three
favicon sizes, and writes `robots.txt`, `sitemap.xml` and `llms.txt`.
`index.html` gains canonical, OG, Twitter-card, favicon links and JSON-LD.

**No new dependency.** Rasterising goes through the copy of Chrome already
on the machine (`--headless --screenshot`), the same way
`tools/responsive-qa.mjs` leans on a browser it does not vendor. `npm ls`
is unchanged. `--check` needs neither browser nor network — it only
re-derives and compares — which is what lets CI run it.

**The share card is the whole point of the discipline, so it was broken on
purpose seven times before being trusted.** Six deliberately, one by
accident:

| Break | Caught as |
|---|---|
| `WIN_SCORE` 10 → 11 | `winScore` baked-in/live diff, plus `llms.txt` |
| Product renamed in `<title>` | `title`, `wordmark`, `robots.txt`, `llms.txt`, `og:title`, JSON-LD `name` — six places |
| `voltage` repainted | `palette.voltage` diff |
| A byte appended to `og.png` | "has been modified since it was generated" |
| `robots.txt` deleted | "is missing" |
| `og:image` pointed at the abandoned **scraps2** project | `og:image` and `twitter:image`, both named |
| *(unplanned)* the live-site sweep ran from `dev` | all nine paths 404 on production, correctly |

All exited 1, all restored to exit 0. The rename case is the EGOT failure
this requirement came from, and it is caught in six places at once.

**One real bug in the generator, found and fixed before commit:** the
sitemap was written with `xmlns="http://www.w3.org/1999/sitemaps/0.9"`,
which is not the sitemap namespace and would have made the file invalid to
every crawler that read it. It is `http://www.sitemaps.org/schemas/sitemap/0.9`.

**3. The monthly check runs in GitHub Actions, not on this machine.** A
cron on a laptop cannot run when the laptop is closed, and Actions leaves a
run history as its own audit trail. `.github/workflows/monthly-check.yml`
runs `share:check`, `fonts:check`, `npm test`, `npm run build`, a live-URL
sweep and an advisory report on the 1st of each month, on every push, and
on demand — and **opens a GitHub issue when it fails**, because a scheduled
job whose only output is a red tick nobody looks at is the same as no job.

**It proved itself immediately, in the least convenient way.** The first
run failed: pushed from `dev`, the live sweep checked *production*, which
serves none of this yet, and reported nine 404s. True, but not actionable
from `dev`, and a check that is honestly red gets ignored — so the live
step is now gated to scheduled runs, manual runs, and pushes to `main`.
The next run was green. **What is proven: the workflow runs, passes, and
its live-site step really does detect missing metadata. What is NOT
proven: that the monthly cron itself fires** — that cannot be known until
2026-09-01, and no absence of evidence before then means anything.

**Confirmed working, and how:** 37/37 tests and `npm run build` green;
`share:check` and `fonts:check` both clean; all nine new paths served with
correct content types on the dev server; the workflow green on Actions run
`33139620027`. Both pre-launch fixes measured frame-by-frame in a real
browser before and after.

**Published to production 2026-08-28** at Stan's call, `main` at
`c961879`, deploy Ready. Merged as a clean fast-forward from a machine
that can push both branches, so the Session 6 PR detour did not repeat
and `dev` and `main` are level again.

**Verified against the live URL, not the build log:** all nine new paths
return 200 with correct content types, a *missing* path under the same
prefix still returns a genuine 404 (which is what makes the 200s mean
the files are really there rather than an SPA fallback), and the live
`og.png` is **byte-identical to the local file** — same sha256, same
330,628 bytes, same 1200x630 header. The live HTML carries the canonical
tag, all nine `og:`/`twitter:` tags and the JSON-LD. Production was
reachable from this machine, unlike Session 6's container, so this is a
direct check rather than one made through Vercel's API.

**The whole game was then walked on production at 390x844:** storyboard
opens, BACK appears at beat two and steps back, the picker arms, the
deal runs with the hands hidden throughout the scrim and no hand-name
leak, 14 cards visible when it settles, and zero document scroll on
either axis.

**Two things the publish-time checks caught that the build did not:**

- **`llms.txt` published Stan's full real name.** It was written to be
  ingested and repeated by crawlers, permanently, and he never asked for
  it — his own launch drafts say "my wife and I" without a name. The
  origin claim stays, the name is gone, and the reasoning now lives in
  the generator where whoever edits it will read it.
- **The share-asset check had a hole, found by breaking it rather than
  by reading it.** Deleting `sitemap.xml` passed with **exit 0**. It is
  written separately from the other text files because its `lastmod`
  legitimately changes every run, which quietly put it outside the loop
  that verifies the rest. It now asserts what does not move — presence,
  the `urlset` namespace, and the canonical `<loc>` — each confirmed by
  breaking it. **This is the second real defect that only the
  break-on-purpose step found**, after the wrong sitemap namespace
  earlier the same day. Neither would have been caught by any amount of
  reading, and both were in the code whose entire job is catching drift.

**The monthly check has now been observed doing both things.** It failed
correctly at 04:09 from `dev`, reporting nine 404s on production because
the metadata was not live; it passed at 07:36 from `main` with all nine
green. A check seen only passing is a reassuring message; this one has
been seen distinguishing the two states. **Still not proven: that the
cron itself fires** — unknowable until 2026-09-01.

**Open, carried to Session 7 part two:**
- **The cold mobile smoke test on CELLULAR has still not happened.** The
  390x844 walk above went over this machine's connection, which is a
  different test: it proves the layout and the game, not the load on a
  slow radio. Only Stan can run the real one, on his phone, off wifi.
- Stan has not yet signed off on the literal metadata field values.
- The cold mobile smoke test on cellular data still has not happened —
  now for the first time not because the environment blocked it, since
  production **is** reachable from this machine.
- ~~Section 8's two copy errors~~ — **fixed 2026-08-28**, both drafts now
  say "First to 10" and the Show HN claim about `public/` is reworded.
- Still open from Session 6: the `?` help button asks for Work Sans 900,
  which was never declared and renders as synthetic bold. Work Sans is
  variable and already on disk, so a real 900 face costs zero bytes.
  Not called either way.

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

### Unplanned session — The table's centre axis, and the Ace tag's touch target ✅ Done (2026-08-28)
Requested directly by Stan, after Session 7's publish. He sent a
screenshot of a wide window and said "the whole experience is weirdly
pushing to the left since your last wave of fixes", asked for a
diagnosis and a fix, and added "i like the text being centered".

**This closes Session 5's finding 6**, the one visual finding left open
there ("the table reads right-heavy"). That entry guessed correctly that
it was worth re-looking at once the pile rail became a column. The two
reports are the same imbalance seen from different rows: the audit saw
the hand bands leaning right, Stan saw the narrator panel shoved left.

**It was not the last wave of fixes.** It landed in Session 5's visual
pass. The table's three bands are each a three-column row — gutter,
centre column, gutter — and the two hand bands use `flex:'1 1 0'` on
both gutters, which is what keeps a hand dead centre at any width.
Session 5 changed the middle band's left gutter to `flex:'0 1 auto'` so
the two-card pile rail could not collide with the narrator panel at
1024x662. That sized the gutter to its contents and sent all of the
row's slack to the right, so the panel packed itself against the deck.

**The offset scales with the window, which is why it survived a session
and then appeared all at once.** Measured centre of the panel against
the axis the hands sit on: **12px left at 1024, 224px at 1440, 464px at
1920.** Stan's Mac runs the "Larger Text" resolution preset, so a
maximized window on the laptop screen is about 1024 CSS px wide, where
12px is invisible; his screenshot is a much wider viewport. **This is
the inverse of the usual asymmetry in his display setup — his screen was
hiding a defect other viewers see, rather than showing one they do not.**
Worth remembering as a class: a defect whose size is proportional to
viewport width is systematically under-reported by his laptop.

**The fix is one property**, plus an alignment change. Both gutters are
`flex:'1 1 0'` again, so all three bands share one centre axis. The
collision Session 5 was guarding against is held off by the *missing*
`minWidth:0` instead: a flex item's default `min-width:auto` stops the
column shrinking below the rail, so the panel — `flexShrink:1` with
760px of slack — is the one that gives way, and flex items cannot
overlap in any case. Rail-to-panel clearance measured at 1000, 1024,
1280, 1440, 1920 and 844x390 landscape: the rail never reaches it, and
in the one squeezed case (landscape) the clamp pushes the panel 31px
right rather than causing a collision. The piles moved to `flex-end`,
mirroring how each Scraps hugs its hand from the right.

**Whole-table balance, painted extents at 1920** (the axis is 960):
before, the three bands' masses sat at 1138 / **435** / 1099 and the
table painted 14 → 1536, a mass centre 185px LEFT of the axis strung out
as a diagonal. After: 1138 / **899** / 1099, painting 478 → 1536, mass
centre 1007, **47px right of the axis**. The hand bands still lean right
by 139-178px on their own, because each Scraps hangs in the right gutter
by design; that half was not changed and Stan has not asked for it.

**The Ace tag was the only control on the table under the 44px touch
minimum**, found by the responsive harness during this pass and fixed in
the same sitting at Stan's request. The cause is the same class of thing
as the centring bug: `TOUCH_MIN` and `TOUCH_MIN_COMPACT` read as
"desktop" and "phone", but what they are really tracking is FitBox's
scale, and **that is below 1 well before a layout is stacked** — 0.80 at
1280x720, 0.89 on a portrait iPad. The tag declared 44 (or 54 stacked)
and rendered 42 on a laptop and 43 on a 375x667 iPhone SE. That 2px miss
is the one `TOUCH_MIN_COMPACT`'s own comment recorded ("54 -> 42") and
left. It now has a floor of its own, `ACE_TAG_MIN = 62`, which is 44
divided by 0.72 with margin for the fact that a taller tag lowers the
scale slightly itself; `SLOT_ROOM` in `cards.jsx` derives from it so the
fan's headroom cannot drift from the tag again.

**Re-measured after the change, with seeded deals** (`Math.random`
stubbed with a xorshift so a hand containing an Ace is reproducible,
rather than waiting for a 34% deal), rendered short axis:

| viewport | scale | before | after |
|---|---|---|---|
| 375x667 iPhone SE | 0.72 | 43 | **49** |
| 390x844 iPhone 14 | 0.93 | 56 | 63 |
| 768x1024 iPad | 0.89 | 47 | 62 |
| 1280x720 laptop | 0.80 | 42 | **56** |
| 1920x1080 | 1.00 | 52 | 70 |
| 844x390 landscape | 0.55 | 33 | 37 |

**Landscape is the one exception and stays open on purpose.** At 0.55 a
control would have to declare 80px to render 44, and the tag is now
width-bound there anyway (39px wide, being one card wide by design), so
buying it would cost every card on the table height on the screen with
the least of it. That is the same trade CLAUDE.md's known-issues entry
already records for every control in landscape.

**Also confirmed, with a card selected so TRADE IN is enabled:** no
other in-table control falls below 44 at any of the six viewports. The
Ace tag really was the only one.

**Verified:** 37 tests, clean build, and `tools/responsive-qa.mjs` **ALL
CLEAR** at all six viewports — no document scroll, no inner scrollers,
nothing painted outside the viewport, no small targets. Note that the
harness's landscape pass is partly luck: the Ace tag only exists when
the player is dealt an Ace, so the 39x37 figure above comes from the
seeded measurement, not from the harness.

**Tooling note for the next session.** Both the Playwright MCP server
and the in-app Browser pane were unavailable: the MCP server's browser
profile was locked by another session ("Browser is already in use...
use --isolated"), and the pane reported `document.hidden` true with
`innerWidth`/`innerHeight` of **0**, which makes it useless for layout
work specifically (a 0-width viewport puts `layoutMode()` in `stack`).
The way through, and it is worth reaching for first next time: the
Playwright MCP server ships its own `playwright-core` at
`~/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core`, and driving
it against the Chrome already on this machine
(`executablePath: '/Applications/Google Chrome.app/...'`) gives a real,
unhidden browser where timers fire. `tools/responsive-qa.mjs` runs
unmodified through the same shim (rewrite its one `from 'playwright'`
import). **The project's "Playwright is not a dependency" note is about
`npm`, not about whether a real browser can be driven here.**

**Impeccable `audit` ran** over the three changed files (the `/preview`
step calls for it on a UI diff). The bundled detector returned four
`bounce-easing` warnings, all pre-existing and none on a touched line
(`GameScreen.jsx:976`, `cards.jsx:187/344/629`). Reading them as false
positives in context: a slight overshoot on a card being flicked onto a
table is card physics, not the dated easing the rule is aimed at, and
Session 5 already retired the one bounce that was doing decorative work
(`errBounce`). Nothing else in the diff touched colour, ARIA, or motion.

**Previewed, then PUBLISHED to production 2026-08-28** — `main`
fast-forwarded to `900838e`, deploy READY.

**The preview could not be verified by bundle hash, and production
could.** Vercel Authentication redirects both the preview branch alias
and the immutable URL to `/sso-api`, and the Vercel MCP's fetch tool got
the same 302, so at preview time the honest claim was only that the
deployed SHA equalled local `HEAD` with a clean tree — the served bytes
were never read. **This is the second project where deployment protection
has blocked preview verification; the fix is one setting** (Vercel
dashboard → Settings → Deployment Protection → Vercel Authentication).
Production has no such protection, which is why the check below was
possible there.

**Verified against production, not the build log.** The live bundle was
downloaded and `cmp`ed against the locally tested
`dist/assets/index-B5LnStID.js`: **byte for byte identical**, so
everything measured above is what shipped. Traced through the served
JS specifically: `ip=62` is `ACE_TAG_MIN`, used exactly once as a
`minHeight` (the tag) and once as `ip+5` (the fan's headroom), with
`At=44` and `lp=54` still present for the other buttons as intended.
`justifyContent:"flex-end"` appears once — the pile gutter — and the
defective `"0 1 auto"` is **gone, zero occurrences**. Nine production
paths sweep 200 (`/`, `og.png`, `favicon.svg`, `robots.txt`,
`sitemap.xml`, `llms.txt`, a real vendored font) while a nonexistent
sibling still 404s, which is what makes the 200s mean anything.

**Publish-time checks, all green and none of them degraded.** The
personal-data-out grep over `dist/` found nothing (no name, no login, no
email). `npm run share:check` reports every baked-in value still matching
its live source — its seven break-on-purpose classes were exercised in
Session 7 the day before and were not re-run here. `npm run fonts:check`
re-downloaded from Google: 24 faces over 14 files, 0 changed, 0 stale.
And the impeccable detector **ran at full strength for the first time
recorded in this brief** — no DEGRADED banner, and all four parser
modules resolve (they live in `~/.claude/node_modules`, which is why
looking for them under the skill directory reads as missing). Its four
`bounce-easing` findings on the changed files are all pre-existing, none
on a touched line, and are the same false positives Session 5 triaged:
card overshoot is this game's physical vocabulary. `/impeccable critique`
was deliberately NOT run — this push restores an intended composition
rather than reworking UI, and `audit` had already run at preview time.

### Unplanned session — Whole-experience audit ✅ Done (2026-08-30)

**Not one of the planned sessions. Read-only: no source file was changed.**
Stan ran `/audit` with four creative questions attached (title/naming, the
"boring cards on a felt table" complaint, a wordmark on the table, and the
origin story / About page). The audit answered all four and found something
none of them were about.

**THE HEADLINE: the Ace counter has never worked, and it is live in
production.** Two bugs twelve lines apart in `GameScreen.jsx`, both
confirmed twice — once by the code-review agent, then independently by
running the real modules under Node and by grepping the deployed bundle.

- **`GameScreen.jsx:434` calls `shouldCounterAce` with three wrong
  arguments.** The engine signature (`engine.js:449`) is `(aiScraps,
  opponentScraps, aiScore, opponentScore)`. It is called as
  `(difficulty, s.aiHand, s.aiCountersThisRound)` — a *string* where a
  card array belongs, the AI's *hand* where its *Scraps* belongs, and a
  field that exists nowhere in reducer state. `'hard'.length` is 4 so the
  `< 2` guard never trips, and `scrapsStrength` walks the characters of
  the string into a bogus hand. Measured, invariant to the board:
  **easy → `true`, medium → `false`, hard → `true`.**
- **`AI_COUNTER_ACE` has no case in the reducer.** Dispatched at
  `GameScreen.jsx:439`; the reducer has 24 cases and this is not one, so
  it hits `default: return state`. Nothing is discarded, no phase
  advances, and `AiCounterNotice`'s `onOk` only clears local state — no
  dispatch either.
- **Net effect: the Ace does nothing on both difficulties a player can
  select.** The picker offers only `easy` and `hard` (`MenuScreens.jsx:79,81`);
  `medium`, the one value that returns `false`, is unreachable. The player
  gets the counter sound and the notice, the board does not change, and
  the Ace is not even spent.
- **Verified in production, not the build log:** the live bundle contains
  `AI_COUNTER_ACE` once (the dispatch) with **zero** `case"AI_COUNTER_ACE"`,
  against exactly one for `PLAYER_COUNTER_ACE`. `aiCountersThisRound` ships too.

**Why eight sessions and several audits missed it:** the 37 tests cover the
engine and the reducer, and both are innocent — the engine function is
correct and the reducer correctly ignores an action it was never taught.
The defect lives in the *wiring between them*, which is the one layer of
this project with no test coverage at all. That is the durable lesson here,
above the fix itself.

**Three more P1s from the same review, all independently re-verified:**

- **The wheel straight outranks almost every other straight.**
  `engine.js:148` sets a straight's tiebreaker to `Math.max(...ranks)`, and
  the Ace is 14 — so A-2-3-4-5 scores 14. Measured: the wheel **beats**
  9-10-J-Q-K and **ties** Broadway. It also corrupts selection inside one
  pile: given A,2,3,4,5,6,K the evaluator picks the wheel over the better
  2-3-4-5-6, so `getActiveHandCards` highlights the wrong five in the
  reveal. `checkStraight` recognises the wheel correctly at line 170;
  nothing carries that into the rank.
- **An emptied Scraps pile dead-ends the round.** `scoreScrapsOutcome`
  returns `null` for an empty pile and `resolveScrap`
  (`GameScreen.jsx:725`) answers with a `LOG` and a bare `return`, leaving
  the phase at `scraps-reveal` whose only control is the button that just
  did nothing. Reachable because every Ace guard is `>= 2` and an Ace
  strips 2, and `aiDecide` will play one into a 2-card pile.
- **Fjalla One is a single-weight family and the game asks it for bold
  everywhere.** The generated `@font-face` block declares `font-weight:
  400` only; **at least 15 of 28 `fontFamily:F.display` sites request 600
  or 700** (12 at 700, 3 at 600) — both 44px score numerals, every round
  interstitial, every win/lose heading, FULL SCRAP, every modal title. All
  synthetic bold. This *subsumes* the long-open Work Sans 900 item on the
  `?` button, which is one instance of the same bug.

**Two tooling defects:** `tools/responsive-qa.mjs` never calls
`process.exit`, so it prints its failures and exits 0 — the one tool whose
whole job is to assert is the only one that cannot fail a CI chain (it does
genuinely pass today; it would have said the same thing if it didn't). And
`tools/fetch-fonts.mjs` detects a `STALE` font file and tells you to run
`npm run fonts`, but nothing ever unlinks it, so a renamed upstream font
would wedge `fonts:check` until someone deleted the file by hand.

**Lower severity, recorded not fixed:** AI Scraps can reach 8 cards when a
7-card pile has no eligible discards (`reducer.js:316`); corrupted
`localStorage` crashes the game-over screen (`stats.js:21` — the
quota-exceeded half *is* handled correctly, contrary to the file's header
promising both).

**`/impeccable critique` was run on the game table** (dual-agent, handed
the audit's evidence file rather than re-walking the site). **28/40 Good**,
audit dimensions **15/20**. Trend `29 → 28`, which reads as flat rather
than a regression: keyboard play now works end to end, while this pass
caught two pre-existing gaps the last run missed. Snapshot at
`.impeccable/critique/2026-08-30T05-54-58Z__src-screens-gamescreen-jsx.md`.
Its new findings: the Scraps card borders encode *suit colour* with the
same two tokens the zone borders use for *ownership* (`cards.jsx:163`), so
an ember "theirs" zone contains voltage "yours" cards; there is **no way
to quit, pause or mute a match** (`onExit` fires only from the win/lose
screens, and no mute exists anywhere in `src/`); and the rules modal
truncates on a phone at rule 4 of 6, cutting off the no-flushes house rule.

**The design answer, and it is not a reskin.** The felt reading is caused
by thinness, not hue. Measured at 1920 the table paints **one gradient**,
one elevation step across seventeen elements, and **zero** patterns,
filters, masks, blend modes or text-shadows. Two corrections came out of
this and both are worth recording because each was a confident claim read
off source rather than measured:

- **`SwirlBg` is NOT rendered on the table.** This audit's own evidence
  file said it was; the critique caught it and it was verified by grep —
  zero occurrences in `GameScreen.jsx`. Its call sites are the splash, the
  picker, the walkthrough and the *lose* screen. The table's entire ground
  is the one `radial-gradient(ellipse at 50% 40%, duskLight, dusk)` at
  `GameScreen.jsx:1146`. **The losing screen has more atmosphere than the
  game.**
- **The critique's claim that Stan's Reduce Transparency setting flattens
  the narrator panel is wrong**, and was not propagated. Browsers never
  override author colours; `prefers-reduced-transparency` is a query an
  author must answer, and this project answers it nowhere. The panel's
  `rgba(20,31,25,0.7)` composites identically for everyone. Measured at
  Stan's 1024×662: FitBox **0.7299**, the **wide** arrangement (not
  stacked, as the critique said), no document scroll. **The one genuinely
  his-screen-only factor is the 0.73 scale.**

`canopy` — the actual pine green — is fenced by `theme.js:19-22` to
decorative illustration only, which is why the identity token appears on
no player-facing surface at all. Amending that fence to "may carry ground,
never state" is a prerequisite for most of the fix, and is Stan's call.

**On the naming question, the answer is keep SCRAPS, with evidence.** Six
candidates were checked against live sources and all six are taken:
**CAIRN** (Matagot, a *two-player duel*), **KINDLING** (a *campfire-themed*
card game), **DEADFALL** (Cheapass, a bluffing card game), **WINDFALL** (a
Kickstarter card game and a Magic card), **SPOILS** (an out-of-print CCG),
**OFFCUTS** (no game, but "Offcut Games" is a publisher). SCRAPS' own
collisions — a Gwent ability, a BGG title, an itch.io game — are the
**mildest of the set**, so on the ownability test Stan set, the current
name scores better than every alternative. It also already satisfies his
stated structure: a single noun naming both the game and the pile.

**Re-verified rather than re-derived** (cheap checks against existing
harnesses): `tools/responsive-qa.mjs` **ALL CLEAR** at six viewports;
`tools/contrast-audit.mjs` **27 pairings, 0 below AA**; the storyboard's
draw tiers match `tradeInValue` exactly. The **no-flushes house rule is
provably airtight** — `evaluateHand` never reads `suit`, and 4,000 random
hands re-evaluated with every card forced to one suit produced zero
changed evaluations.

**Content/metadata:** the `<title>` and OG tags say "two hands at once"
while `llms.txt` says "three hands at once" and the page's own JSON-LD
enumerates three — a live contradiction on the crawler surface. The title
matches what the storyboard teaches, so `llms.txt` is the one to align. A
no-JS crawler still sees an **entirely empty body**; a `<noscript>` block
is the cheapest discoverability win available and matters given the launch
plan leans on Show HN.

**CLAUDE.md has drifted in two places** and both would send a future
session chasing fixed problems: it still says the menu options are
`<div>`s not findable by role (they have been real `<button
class="pick-box">` elements since 2026-08-27), and that `flight.jsx`
hardcodes every hex (it renders real `PlayingCard`s now and contains no
hex at all). The palette does still live in two declared places, which is
the documented deliberate ceiling.

**Deliverable:** the full audit, with live in-token mockups of the ground
options, is at
https://claude.ai/code/artifact/b1256a45-53e7-4fef-816e-60456c558e47

**Nothing was fixed. No file in `src/` was touched.** Everything above is a
recommendation awaiting Stan's direction, except that the Ace bug should
be treated as launch-blocking.


### Unplanned session — Audit fixes: the Ace, the wheel, and the table ✅ Done (2026-08-30)

**Stan's work order off the audit above, taken in one pass.** Everything
below is built, tested and verified in a real browser.

**The four P1s, all fixed:**

- **`shouldCounterAce` is called with the board now**, not the difficulty
  string: `(s.aiScraps, s.playerScraps, s.aiScore, s.playerScore)`.
- **`AI_COUNTER_ACE` has a reducer case.** Both Aces are discarded, nothing
  is stripped from either pile. **Turn handling per Stan's rule, and it is
  deliberately not the same as `PLAYER_ACE_APPLY`'s:** playing an Ace always
  ends your turn, but having one *countered* ends it only if you are out of
  Aces. Still holding one keeps the turn live so you may spend it, and the
  opponent may counter that one too if it still holds an Ace. A gate was
  added to the AI effect (`if (aiCounterNotice) return;`) so the opponent
  cannot start moving while the counter notice is still on screen.
- **The wheel straight scores 5, not 14.** `checkStraight` became
  `straightHigh`, returning the straight's high card — 5 for A-2-3-4-5,
  because the Ace plays low there. The wheel now loses to every other
  straight and no longer ties Broadway, and `evaluateBestHand` picks
  2-3-4-5-6 out of A,2,3,4,5,6,K instead of the wheel.
- **An empty Scraps pile scores instead of dead-ending.** `EMPTY_SCRAPS_HAND`
  (rank -1) is a real hand that loses to anything, so the other player takes
  the 2 points and the round resolves; two empty piles tie. `resolveScrap`'s
  bail-out is gone.

**Tests: 37 → 53.** The new ones are written as regression guards, not
coverage padding: one asserts `gameReducer(s, AI_COUNTER_ACE) !== s`, which
is exactly what the old `default: return state` fall-through would fail.
**Verified end to end at the logic level too** — a script replays
`confirmAce()`'s real sequence (decide with `shouldCounterAce`, dispatch
`AI_COUNTER_ACE`, assert the board changed) against the real modules: 10/10.
**Not** observed as a countered Ace in a live deal; that needs a specific
deal and a scripted UI driver that stalled on click handling. Stated rather
than implied.

**The felt-table problem — option C, built.** `TableSurface` in
`backdrop.jsx` draws a weathered picnic table from directly overhead:
**horizontal slats**, sized at **1.25 × the current card height** so the
furniture stays in proportion to the game at every viewport, grain running
along each board, small tight knots with the crack that usually runs out of
one, **nails in columns** (their x positions are shared by every board,
because nails follow the joist underneath — randomising them per board is
the tell that it is drawn), warm light from the top edge, a vignette at the
far edge. Built vertical first and corrected against a reference photo Stan
sent; board tints are a **blend** rather than a choice between two tokens,
because two discrete shades read as a striped UI element rather than as
timber. **Seeded xorshift, same as the audio exciter** —
wood that reshuffled itself on every render would shimmer. It is passed to
`FitBox` as a new `backdrop` prop, which paints behind the scaled content
and is NOT scaled with it, so the table always reaches the viewport edges.

**Deliberately not a pale "sun-bleached driftwood", and this is a real
departure from the brief wording.** This palette is light-on-dark with 27
contrast pairings tuned against dark grounds; a light tabletop would have
inverted the entire game. The sun-bleaching reads in **silvered grain and
per-board tint variance** over weathered boards instead, which is what old
outdoor timber actually looks like. `frost` on `timber` measures ~10:1.
If Stan wants it genuinely lighter, that is a palette-wide job, not a
token swap.

**The mountains are on the card FACES now** (`CardFaceRidge`), faint
(canopy at 0.085 / 0.115) across the bottom of every card you hold. The
ridge art existed only on the card BACK, which you see on the opponent's
hand, the deck and the discard — never on a card you hold — so the one
piece of real identity art was on the surfaces the player looks at least.

**`theme.js`'s canopy rule was amended, per Stan:** from "decorative
illustration only, never UI chrome" to **"may carry ground, never state."**
Ground is the table and the printed ridge; state stays voltage / ember /
gold. Without this amendment neither the table nor the card ridge is legal
under the project's own token law. New tokens: `timber`, `timberLight`,
`timberSeam`.

**Everything else in the order:**

- **The narrator collapses.** Full instruction on the first player turn of
  each round, then a short form at a smaller size. Keyed on `{round, turn}`
  and **not** on round alone — the first version retired the long text in
  the same tick it appeared, so it flashed and collapsed before anyone
  could read it. Caught in the browser, not in the code.
- **The rules modal is gone.** The `?` opens the four-beat storyboard as a
  reference (`<Walkthrough asReference/>`), so there is one explanation of
  the rules instead of two, and the phone truncation that cut off the
  no-flushes house rule at item 4 of 6 goes with it. **This introduced a
  real bug that the harness caught:** the storyboard had no `z-index`, so
  the table's fixed bottom bar painted through it and swallowed clicks on
  CLOSE. Fixed at `zIndex:100`.
- **Quit and mute exist.** Two discs beside the `?`, all three sharing one
  44px target. Quit is behind a confirm (`QuitConfirmModal`, same `Shell`
  so it inherits the focus trap); mute is one flag on the audio master bus
  rather than a guard at thirty call sites, because cues are scheduled
  ahead on the audio clock.
- **Fake bold is gone.** Fjalla One declares `font-weight: 400` and nothing
  else, and **15 sites were asking it for 600/700** — both score numerals,
  every interstitial, every win/lose heading, FULL SCRAP, every modal
  title, all rendering as browser-smeared synthetic bold. All stripped to
  the real 400. The `?` button's Work Sans 900 (open since Session 6) is
  fixed by the same pass and that brief entry is marked subsumed.
- **Scraps card borders are neutral.** They used to be
  `isRed(suit) ? ember : voltage` — the exact two tokens the zone borders
  use for *ownership* — so "yours" green appeared inside "theirs" orange.
  Suit is carried by the printed rank and pip, as on the cream cards.
- **`responsive-qa.mjs` exits non-zero when `bad > 0`,** and the dead
  `const s = ...filter(x => ...r.label)` line that ignored its own
  parameter is deleted. **Broken on purpose to watch it fail: exit 1.**
  Worth recording that the first check of this read `EXIT=0` because `$?`
  after a pipe reports `tail`, not `node` — the same blindness that let the
  original bug sit there.
- **Walkthrough's DRAW 3 CARDS is `frost`, not `gold`** — gold is reserved
  for milestones and trading an Ace in is not one. The tiers now climb in
  brightness: muted, fern, brightest.
- **Metadata contradiction resolved.** `llms.txt` said "three hands at
  once" while the `<title>` said "two"; the title matches what the
  storyboard teaches, so the generator was aligned down to the
  player-facing framing and `npm run share` re-ran. `share:check` clean.
- **A `<noscript>` block ships**, between `NOSCRIPT:BEGIN/END` sentinels in
  `index.html`: name, pitch, full ruleset including the house rule. A no-JS
  crawler saw an entirely empty body before this.
- **CLAUDE.md's two drifted notes are deleted** — the menu-`<div>`s claim
  (they have been real `<button>`s since 2026-08-27) and the
  three-places-palette claim (`flight.jsx` has held no hex since it was
  rewritten). The palette entry now states the deliberate two-source
  ceiling.

**Verified:** 53/53 tests, clean build, `contrast-audit` **27 pairings 0
below AA** (no regression from the new surface), `share:check` clean, and
`tools/responsive-qa.mjs` **ALL CLEAR at all six viewports** after the
change — including the storyboard-as-rules step it now walks.

**Deferred to post-launch, per Stan:** the About page, the origin story,
and the email capture (**he already has a Neon email list project ready to
go**, so the capture should point at that rather than anything new here),
plus the analytics-vs-privacy-notice decision. **The name stays SCRAPS.**

**Known asymmetry, flagged not fixed:** the second-Ace rule is the
player's only. If the player counters the AI's Ace, the AI's turn ends and
it does not get to play a second Ace, because that would mean changing
`aiDecide`'s flow and Stan specified the player's side. Worth a decision
later.


### Unplanned session — Ace flow, card colour and narrator pass ✅ Done (2026-08-30)

**Stan's second work order, same day.** All of it built and verified.

- **Scraps piles print in ONE colour per owner**, not per suit: yours in
  `voltage`, theirs in `ember`, via a new `inkOverride` on `PlayingCard`.
  Hand cards keep their suit colours. A pile now reads as a pile.
- **Cards are fully opaque.** `dimmed` (an ineligible card in discard mode)
  dropped to 0.28 alpha and let the table show through; it desaturates and
  darkens instead, so the signal survives with no transparency. The discard
  stack's 0.8/0.6 washes are gone too.
- **The narrator is one type size**, always. The collapse changes the words
  only; resizing made the panel jump between turns.
- **The narrator panel only renders when it has something in it.** A
  translucent empty box used to sit in the middle of the table through every
  AI turn. Measured after: 0 empty boxes across a 24-sample sweep, and the
  panel is genuinely absent while settling.
- **Full instruction only in ROUND 1.** Round 2 onward is the short form.
- **The Ace explainer waits for the deal to finish** (`if (animating) return`)
  and now freezes the table while it is up — the AI gate takes `aceDrawnCard`
  alongside `animating` and `aiCounterNotice`. New copy, Stan's words.
- **The counter has two outcomes and says which.** Out of Aces:
  "Opponent countered your Ace, ending your turn," button END TURN. Still
  holding one: "Opponent countered your Ace. Play another Ace or end your
  turn." A new `counterStand` state then makes the ONLY legal continuations
  another attack or END TURN — TRADE IN is withdrawn, and a new
  `PLAYER_END_TURN` action advances the phase.
- **`PLAY ACE` is `ATTACK`**, tag and aria-label, and in the walkthrough.
- **The AI can re-counter too**, mirroring the player's rule: counter its Ace
  while it still holds another and your Scraps is a legal target, and it
  comes straight back with it after a 900ms beat. That closes the asymmetry
  flagged in the previous session.

**Three defects found by the harness, all mine, all fixed:**

- **Modal buttons declared 44 and rendered less**, because `Shell` wraps every
  overlay in its own `FitBox`. New `MODAL_BTN_MIN` (54) with the same
  reasoning as `ACE_TAG_MIN`. The Ace explainer also drops its illustration
  below 560px of height rather than letting the whole box scale to ~0.48,
  which had crushed its button to 26px on a landscape phone.
- **The harness could not survive its own subject.** The Ace explainer now
  appears *later* (after the deal animation), so it opened after the
  post-trade `dismiss()` and blocked the next click. It dismisses late
  overlays now.
- **The harness was measuring mid-animation.** `popIn` scales a box up from
  ~0.7 over 0.35s, so a probe landing inside it reported a 57px button as 42
  and failed the touch floor at 1920x1080, on a screen with room to spare.
  `shot()` waits 450ms for entrances to settle before measuring. **This is
  the same class of error CLAUDE.md's own rule warns about, committed by the
  project's own QA tool.**

**And one honest exemption:** the harness now exits non-zero, which meant the
*documented, accepted* landscape-phone touch-target shortfall would fail CI
intermittently forever. Landscape small-target shortfalls are printed as
`note` rather than flagged, with the reasoning inline. A check that sits red
for a reason nobody intends to act on is a check that gets ignored.

**Verified:** 55 tests, `responsive-qa` clean across **seven consecutive
runs** (it is deal-dependent, so one green run proves little), contrast 27
pairings 0 below AA, `share:check` clean, clean build.


### Unplanned session — Polish rounds on the audit fixes ✅ Done + **PUBLISHED** (2026-08-30)

**Seven rounds of Stan's review notes on the audit work, then published.**
`main` at `19ae1dd`; production serves `index-BRr89cXc.js`, byte-identical
to the locally built bundle, which is transitive proof every change in the
ten-commit push shipped.

**Copy and layout:** the storyboard lost its two numbered mono step
captions and its "= win all three, +1PT" badge; beat 4 opens "Each round
is two small hands"; beat 1 names each hand in body type above it, with
the mono captions and both poker rankings gone, and its two columns
bottom-align so a wrapped caption no longer pushes one hand down a line.
"Scraps pile" is "Scraps" everywhere a player sees it, including
`llms.txt` via its generator. The narrator holds one type size, shows its
full instruction in round 1 only, renders nothing when it has nothing to
say, and reserves three lines' room so its height stops feeding FitBox.

**Sound:** the Ace strike opened at 6000 Hz with Q 1.4, a bright crack on
the loudest cue in the game. Now 3000 Hz, gentler Q, slower fall, and its
declared target went .80 → .56. **The trim was re-measured offline, not
scaled** — retuning invalidates it — and verified to render at exactly
0.56.

**Four bugs, all self-inflicted, each found by measuring rather than
reading. Worth recording because three of the four are the same mistake:**

- **The deck drifted to the middle of the table.** Returning `null` for a
  silent narrator collapsed the two flex gutters together, and the left
  gutter aligns `flex-end`, so the pile rail travelled to the centre line
  and sat under the text that arrived next. The panel keeps its slot now
  and only drops its chrome. Deck holds at one x across 22 samples.
- **THE BIG ONE — the ruffle was stripping each card's fan placement.**
  A running CSS animation's `transform` REPLACES the element's own for its
  whole duration. The ruffle ran on the element that carries
  `translateX(calc(-50% + tx))`, so for 340ms each card lost its offset and
  dropped to `left:50%` on top of its neighbours, left to right. The old
  `waveUp` had the identical flaw, so this long predated the ruffle.
  Animation now lives on an inner element with no placement of its own.
  **Measured: max horizontal drift 0.6px, against roughly 230px before.**
- **Two wrong fixes shipped before the right one**, because the symptom was
  read as "cards disappearing" and checked with a visibility/opacity count
  — which came back clean every time, since the cards were fully opaque and
  merely stacked somewhere else. **The property being measured was wrong,
  not the measurement.** See the process note below.
- **Modal buttons declared 44px and rendered less**, because `Shell` wraps
  every overlay in its own `FitBox`. New `MODAL_BTN_MIN` (54), same
  reasoning as `ACE_TAG_MIN`.

**Ace flow, per Stan's spec:** ATTACK waits for its card to land and for
the explainer to close, then rises in over 260ms. The explainer waits for
the deal, freezes the table while up, and turns on its side — illustration
left, copy right — on a short but wide screen rather than dropping the
illustration; it stacks again on a roomy one. The opponent's trade got its
gap back: transferred cards fly out, their slots stand empty, then the
deck fills them. Measured 7 → 6 → 7.

**Publish checks:** personal-data-OUT grep over `dist/` clean — the origin
story ships as "its creator and his wife", no name, matching Stan's own
launch drafts. Detector **full strength, no DEGRADED banner: 14 findings,
13 bounce-easing + 1 dark-glow**, all in the two categories Session 5
triaged as the committed identity, and none added by this push.
`share:check` **broken on purpose twice** and confirmed to fail by name: a
rename exits 1 naming `title` and `og:title`; a repaint exits 1 naming
`palette.dusk` and `favicon.svg`. 55 tests, `responsive-qa` ALL CLEAR
across repeated runs, contrast 27 pairings 0 below AA. No env vars, no
scheduled jobs — nothing to confirm on that side.

**`/impeccable critique` was deliberately NOT run at this publish.** The
push does rework UI, which normally calls for it, but a full critique ran
on this exact surface earlier the same day (28/40, snapshot under
`.impeccable/critique/`) and most of this push is Stan's picks off that
critique and his own review. Re-running it would mostly re-derive what it
just said. The mechanical detector did run, at full strength, above.

**Process note worth carrying: measure the property the symptom is
actually about.** Three consecutive fixes failed because "cards
disappearing" was checked as visibility and opacity, and the cards were
neither hidden nor transparent — they were displaced. A clean measurement
of the wrong property reads exactly like a passing test. The tell was in
Stan's own words the whole time: "from left to right" is a stagger, and
"only ONE card does NOT disappear" is a layout fact, not an opacity one.


### Unplanned session — Splash directions, and the origin story written down ✅ Done (2026-08-30)

**Not a planned session. Read-only on `src/`: no source file was changed.**
Stan asked to evaluate status and start the next session, and separately
where the origin story lives. The reconcile turned up an unactioned note;
this session answered it with a recommendation bench rather than a build,
because the note itself asks for recommendations.

**The origin story lived nowhere but a chat transcript.** Now written into
Section 1 above, marked not-public. See that entry for the story, for where
it had been hiding, and for exactly how much of it is already public
(only the bare invention fact, in `llms.txt`).

**Notion's newest block was three-quarters done and entirely unmarked.**
Four items. The mono step captions, the "Each round is two small hands"
rewrite and the "= win all three, +1PT" badge were all shipped by the
polish-rounds session and verified here by grep: no `Mark Two` / `Discard
your ace` strings anywhere, `Walkthrough.jsx:294` carries the new copy, and
`BeatScoring` renders three score slots with no bonus badge. The fourth,
**"Title screen is now boring... scan the lookbook and bring back some
recommendations,"** had never been touched. It is the only live unactioned
note on the project.

**A divergence worth a decision: Stan asked for STRIKE, the build shipped
ATTACK.** His note reads "Change the action button tethered to each ace
from 'PLAY ACE' to 'STRIKE'". The code, the `aria-label` and the
walkthrough all say ATTACK, and the entry above records it as "ATTACK
rename" with no note that a different word was requested. No decision was
written down either way. **Open: rename to STRIKE, or record ATTACK as a
deliberate call.**

**The splash diagnosis, and it is the same one the audit made about the
table.** `SwirlBg` is three blurred radial gradients on near-black green,
looping on 16s / 20s / 24s, and it is the entire background. It trips two
of the lookbook's named bans: *large coloured glows behind hero content*
("filler standing in for a composition") and *aurora / mesh gradient
fields*. The table was fixed for exactly this — thinness, not hue — and the
splash never got the same pass, so **the game's first screen is now its
least-drawn one.** `SwirlBg` also runs on the picker, the walkthrough and
the lose screen.

**`scan_tells.py` reported six banned hits and all six are false
positives**, which is the skill's own warning about a clean scan earning
its keep. "Inter" matched inside *r/InternetIsBeautiful* and
*RoundInterstitial*; "Space Grotesk" matched a brief entry recording that
the face was *removed*; "emoji as icons" matched the ✅ in this file's own
headings; "skeleton shimmer" matched the word "shimmer" in a woodgrain
comment; "multi-stop rainbow gradient" matched a four-stop vertical
vignette in two tokens. **Neither ban that actually fires on this screen is
machine-checkable**, so the scanner was silent on both.

**Nothing in the lookbook fits, and that is a finding rather than a gap.**
The Aesthetics drawer has 21 directions and none is a campground; Mystical
western is the nearest (Sisters is high desert) and its terracotta/indigo
palette and tarot motifs would fight Forest Dusk. The right move is not a
new aesthetic but extending the material vocabulary this project already
invented for the table.

**The answer was already in the repo.** `CardBackSVG` is a dusk campground
scene: an ember sun low on the horizon, a few stars, three receding
`canopy` ridges, an ember river. It is the game's only piece of real
identity art, and per `theme.js`'s own canopy-rule note you only ever see
it on the opponent's hidden hand, the deck and the discard. Scaling it to
the viewport costs no new art and puts the identity green on the screen
everyone sees first.

**Deliverable: a live comparison bench**, built in the real tokens at the
real 16:10 proportion, per the standing rule that a taste decision with
many candidates gets a comparison artifact rather than a prose menu:
https://claude.ai/code/artifact/decb8bb5-80d9-4933-9bfb-baa73bb7a91d

- **A (recommended) — the ridgeline, full-bleed.** `CardBackSVG` rescaled.
- **B — the table, before the deal.** `TableSurface` as the splash ground.
  Costs the reveal: the table stops being something the game cuts to.
- **C — type to the edges, no ground.** The riskiest, and the only one that
  would read as a typographic decision rather than a scene.
- **D — a table of backs.** Tiled and tilted; it demonstrates its own
  stated risk, which is that it competes with the wordmark's motion.
- Plus four suit-row treatments, since the row is four `slate` glyphs doing
  no work at all.

**Verified by rendering, not by reading.** The in-app pane went blank on
every screenshot while its measurements stayed sound (the documented
hidden-pane failure), and the Playwright MCP server refused with its
profile locked by another session — **both failure modes this brief already
records.** The third route worked: the server's bundled `playwright-core`
at `~/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core`, driven
against Chrome at 1280x900, deviceScaleFactor 2. That caught three real
defects a source read would not have: the scaled sun was a huge bloom
directly behind the wordmark (**it had re-created the exact ban the
direction exists to remove**), B's two cards were cropped by
`preserveAspectRatio="slice"` and read as dark rectangles, and every suit
glyph was mojibake. All three fixed and re-rendered.

**Left open:** which direction Stan picks; the STRIKE/ATTACK call; and the
`/impeccable craft` run, which belongs to the build session rather than to
this recommendation pass.

### Unplanned session — Splash pass 2: sunset foothills ✅ Done (2026-08-31)

**Stan sent the night version back.** Keep the reference's DAYTIME
sunset, omit the stars, make the mountains less pointy (rounded, less
extreme, "like foothills"), two distinct peaks with the left bigger,
more dimension, less low-poly-futuristic and more rustic and natural,
"the style comes from the coloring", and give the trees a collective
sway like a breeze crossing every few seconds. Everything else from
pass 1 stands: true suit colour, riffle, `SwirlBg` gone from all four
screens.

**Ridgelines are GENERATED now, and that is the headline.** Hand-placed
beziers were tried twice and produced a cone, then a narrow rounded
thumb. The reason is structural rather than clumsiness: with a curve you
choose TANGENTS and only infer the silhouette, so span and rise are
never actually under your hand. Each mass is now a sum of raised-cosine
bumps sampled into a dense polyline, where `w` is literally half-width
and `h` literally the rise. The left spans 124 and rises 50, the right
96 and 34, both near 2.5:1. **A foothill is a ratio, and once it was a
number it took one try.** Seeded low-frequency roughness on top keeps
them lopsided; real ground is not a cosine.

**The foreground roll was the missing piece.** Two peaks alone read as
two objects on a plain. Hill country is rounded land overlapping itself,
each layer darker and less hazy than the one behind, so a low mass
crossing in front of both is what turns two shapes into terrain.

**THE BUG THAT MADE "more dimension" IMPOSSIBLE, worth knowing before
anyone touches this file again: every hill gradient was in the default
`objectBoundingBox` units.** Each ridge path closes across the FULL
frame width to make its filled body, so every one of those bounding
boxes was the entire viewport, and a gradient meant to model one hill
was being stretched across all 160 units. Two separate attempts at
"light the masses better" changed stops that were never landing where
they were aimed. They are `gradientUnits="userSpaceOnUse"` now with real
viewBox coordinates per mass, and the modelling appeared immediately.
**Nothing about the symptom pointed at units.**

**Composition, and why the sky is arranged the way it is.** Foothills
are low, so the wordmark sits on SKY rather than on a mountain. A sunset
ramp that starts warm high up therefore puts near-white type on bright
gold. The blaze is kept as a narrow band low down with the deep half
tall — which is also how a sunset actually looks once the sun is under
the horizon. `frost` still belongs to the wordmark.

**The breeze.** Each treeline is four segments, each starting a beat
after the one to its left, pivoting about its own base via
`transform-box: fill-box`. Without fill-box the origin resolves against
the SVG viewport and the whole band slides sideways instead of bending.
Segments overlap by 16 units of solid fill, because out-of-phase skew
opens a visible notch at a shared edge otherwise.

**Verified by measuring:**
- **Sway, sampled every 320ms across 12 frames in one call** (two
  round-trips would miss the loop entirely, per this file's own rule):
  all 8 bands sweeping, widest 3.26°, and **2.15° of spread BETWEEN
  segments at a single instant** — that spread is the difference between
  a travelling gust and a board tipping, and it is the thing worth
  measuring rather than eyeballing.
- **Reduced motion:** 0 animations running, **0 bands left bent**, 0
  suits out of position. Both keyframes rest at 100%, which is where the
  global collapse lands them.
- **Wordmark contrast**, sampled from the pixels behind the hidden
  glyphs at four viewports: worst **5.91:1** (Stan's 1024x662), desktop
  6.50, phone 7.81, landscape 7.03. Better than the night version's
  4.68 and all clearing AAA for large text.
- 55 tests, clean build, `contrast-audit` 27 pairings 0 below AA,
  `responsive-qa` **ALL CLEAR** at six viewports, `share:check` clean.

**Left open:** STRIKE vs ATTACK, still Stan's call. Nothing is on a
preview URL yet.


### Unplanned session — The splash rebuild: RidgeBackdrop ✅ Superseded same-week (2026-08-30)

**Superseded on 2026-08-31 by the sunset pass above. Kept because its
reasoning still applies and because it is the record of why the night
direction was tried.** What survives from it: `SwirlBg` deleted from all
four screens, the true-suit-colour riffle, and the rule that `frost`
belongs to the wordmark. What did not: the faceted geometry, the night
sky, and the stars.

**Stan picked direction A off the bench and changed it in four ways:** the
card-back art was too bland to reuse as-is, so build an augmented version;
make the ridgeline more dramatic and defined; drop the setting sun; go
night with more, twinkling stars. He supplied a low-poly reference PNG to
trace. Plus true suit colour with a riffle, and `SwirlBg` deleted
everywhere. Opened with `/impeccable craft`.

**`RidgeBackdrop` replaces `SwirlBg` on all four screens** that used it:
splash, difficulty picker, walkthrough, lose screen. `SwirlBg` and its
three `swirlFlow` keyframes are gone rather than orphaned.

**The one art-direction rule, and it is load-bearing: `frost` belongs to
the wordmark.** The reference is a daylit sunset with near-white snow; the
wordmark is `frost`. A literal trace puts near-white snow directly behind
near-white type. So the range is lit one full step down, topping out at
`slateLight`/`slate`, with `frost` spent only on summit shards a few units
wide. The brightest thing on the screen has to be the word SCRAPS.

**Composition is constrained by the slice, not by taste.** The SVG is
`preserveAspectRatio="slice"`, so a 375-wide portrait phone sees only about
56 of the 160 viewBox units, cropped to the middle. The dominant summit
sits at x=68, inside that window on purpose, so the phone gets a whole
mountain rather than an anonymous slope. Anything placed outside roughly
x=52..108 does not exist on a phone.

**Other decisions worth keeping:**
- **Facets are painted generously and trimmed by a `clipPath`.** Fitting
  each plane to the silhouette by hand is how low-poly art picks up
  hairline seams between adjacent planes.
- **No curves anywhere.** One bezier in a faceted range reads instantly as
  a different drawing. The snowline is a polyline for that reason.
- **No sun, per Stan.** A disc low on the horizon is exactly the
  glow-behind-the-headline this component exists to remove. The sky's
  warmth is a broad low `ember` afterglow at single-digit alpha instead.
- **Both new animations rest at their 100% keyframe.** `index.html`'s
  reduced-motion block collapses every animation to 1ms and one iteration,
  which lands each element on its LAST keyframe. A twinkle written to fade
  *up* would leave the whole sky stuck bright. Written this way, reduced
  motion gets a still sky at its intended brightness for free.
- **Stars, and the conifer bands, are seeded** like `TableSurface` and the
  audio exciter. A sky that re-scatters on every render jumps visibly.
- The suit riffle shares the wordmark's **28ms stagger**, which is also the
  deal sound's tap stagger. One cadence across type, art and audio.

**Verified by measuring, not by reading:**
- **Contrast behind the wordmark**, which is the specific risk this change
  introduced and which `contrast-audit` does not cover. Hid the glyphs,
  screenshot what is behind them, sampled every pixel in the bounding box
  for the brightest. Worst case **4.68:1** (844x390 landscape); desktop
  7.40, Stan's 1024x662 5.06, phone 7.66. All four clear 4.5:1, which is
  AAA for large text. The first build measured 4.26 on landscape and the
  scrim was raised until it did not.
- **Reduced motion**: 74 stars and 4 suits animating normally; with
  `reducedMotion:'reduce'`, **0 animations running, 0 stars off resting
  opacity, 0 suits out of position.**
- 55 tests, clean build, `contrast-audit` 27 pairings 0 below AA,
  `responsive-qa` **ALL CLEAR** at six viewports, `share:check` clean.
- `scan_tells` on the changed files: **zero new hits.** The two it reports
  are the pre-existing `TableSurface` false positives (a four-stop vertical
  vignette read as a rainbow gradient, the word "shimmer" in a woodgrain
  comment). The impeccable detector returns the same two pre-existing
  findings Session 5 triaged as committed identity, neither on a touched
  line.
- **The two bans that were firing on this screen are gone**, and neither is
  machine-checkable, so this is an inspection claim rather than a scanner
  result: there is no blurred bloom behind the hero and no animated
  gradient field.

**A trap worth recording: `tools/responsive-qa.mjs` cannot run through the
bundled `playwright-core` with only the import rewritten.** It also calls
`chromium.launch()` with no arguments, which reaches for a headless shell
that is not installed. It needs `executablePath` pointing at Chrome as
well. The brief's existing note about rewriting "its one `from 'playwright'`
import" is necessary but not sufficient.

**Left open:** STRIKE vs ATTACK, still Stan's call. And the walkthrough's
own beats now sit on the new range; they were checked at six viewports by
`responsive-qa` but not art-directed against it.

### Unplanned session — Stan's scene, and the cut to two backgrounds ✅ Done + **PUBLISHED** (2026-09-01)

**Stan supplied his own vector illustration** (a sunset meadow with a
picnic table) and rejected the hand-built trace this session had started.
It now carries the title screen and the rules storyboard. Then, in a
second instruction, he cut the product to **exactly two backgrounds**: the
scene for those two screens, `TableSurface` for the difficulty pick, the
game and the lose screen.

**`RidgeBackdrop` is deleted, not orphaned.** The picker and the lose
screen were its last two call sites, so the two-background rule left
nothing pointing at it. 423 lines went: the cosine-generated foothills,
the seeded treeline, the hatching, the four hill layers. The `.sc-tree` /
`treeSway` rules came out of `index.html` with it. **This removes the only
tree-sway animation in the project.** Recoverable in full from `ef34063`.

**Two defects in the supplied SVG, both fixed before it could be a
background:**
- **No `viewBox` at all**, only `width`/`height`, so it could not cover a
  viewport it was not authored at.
- **54,042 numbers carrying 6+ decimal places.** Rounding to 2dp is
  lossless at any display size and took it from 1,053,936 to 719,002
  bytes raw, **419KB to 252KB gzipped**. The unrounded original is kept
  at `tools/art/scene-sunset.source.svg`.

It is also a genuine vector rather than an embedded raster: 1146 paths,
zero `<image>`, zero base64. Checked, because a 1MB "SVG" from an image
generator is usually a PNG in a costume and that would have made it
unusable for this entirely.

**THE SCRIM IS LOAD-BEARING.** Measured on the raw image at the real
splash layout, the brightest pixel under the type band is **1.11:1**
against `frost` — the near-white suits and parts of the wordmark were
simply not there. Three layers bring it to **5.37:1** on desktop, Stan's
1024x662 and a portrait phone, and **4.93:1** on a landscape phone.

- **It was tuned DOWN, not up.** A first pass measured 8.28:1, well past
  the bar, and had flattened the picture into a dark rectangle.
- **Landscape needed its own layer.** `object-fit: cover` on a 1.5:1
  image inside a 2.16:1 phone crops away the top and bottom and shows
  only the bright middle, so a band tuned by percentage on a tall screen
  lands on sky there. It measured **1.69:1** before a flat floor was
  added that applies whatever the crop does.

**ONE REAL REGRESSION, caught by measuring rather than looking.** Moving
the lose screen onto wood silently re-opened every contrast pairing on
it — its text sits straight on the boards with no panel behind it, unlike
the picker's. `FINAL SCORE` was `slate` at 15px, **4.33:1 against the
lightest board tint the table can produce**, which fails AA. It is
`slateLight` now, **5.46:1** on that same worst case. Worth carrying: a
screen that changes ground has to have its pairings re-checked, and
nothing about the change looks wrong.

**Verified:** 55 tests, clean build, `contrast-audit` 27 pairings 0 below
AA, `responsive-qa` **ALL CLEAR** at six viewports, `share:check` clean,
personal-data-OUT grep over `dist/` clean (`llms.txt` ships "its creator
and his wife", no name). The impeccable detector ran at **full strength,
no DEGRADED banner**, returning one pre-existing finding — the wordmark's
overshoot easing, which Session 5 triaged as committed identity.
**Correction to the commit message on `b4ff3e5`, which says "0 findings":
the accurate number is 1 pre-existing.**

**Known cost, flagged and accepted:** at 252KB gzipped the scene is by far
the largest asset in a project that shipped **zero image files** before
today, and it is on the first screen. The cellular smoke test is still
outstanding and this is exactly what it would catch.

### Unplanned session — The real domain: scraps.games ✅ Done + **PUBLISHED** (2026-09-12)

**The game has its own address.** `https://scraps.games`, registered
2026-09-08 through Vercel (registrar Name.com), $14.99 for the first
year, auto-renew on, expiry 2027-09-08. Stan bought it himself through
Vercel's checkout rather than passing registrant details through a
chat transcript, and assigned it to the `scraps3` project in the same
step.

**Why this name.** `scraps.com` is taken, and so is every short form of
the bare word — `.io`, `.net`, `.org`, `.cc`, `.gg`, `.app` — plus
`scrapsgame.com`, `playscraps.com`, `getscraps.com` and
`fullscrap.com`. Forty candidates were priced. `.games` was the only
cheap TLD that keeps the wordmark intact and alone: **$14.99 against
$349.99 for the singular `scraps.game`, $616 for `scraps.co` and $1375
for `scraps.fun`**, all three registry-premium rather than resale.
`scrapspoker.com` was available at $11.25 and deliberately passed over —
the game uses poker hands but is not poker, and the name would have set
the wrong expectation before anyone read a rule.

**What changed in the source: eleven hardcoded references, from two
places.** `SITE` in `tools/make-share-assets.mjs` drives `robots.txt`,
`sitemap.xml` and `llms.txt`; `index.html` carries the canonical tag,
`og:url`, `og:image`, `twitter:image` and the `VideoGame` ld+json block.
The generator already cross-checks index.html against `SITE`, so the two
cannot drift apart without `share:check` failing by name. `og.png` did
not change a single byte, which is the right answer — the card art never
depended on the URL.

**Verified, and how.** DNS resolves at 8.8.8.8, 1.1.1.1 and locally.
HTTPS returns 200 with `ssl_verify_result=0`, meaning curl validated
both the chain and the hostname against the system trust store. A real
Playwright browser loaded the page and rendered Stan's hillside scene,
so what is being served is the playable game and not a placeholder.
`www.scraps.games` and `scraps3.vercel.app` both return **308** to the
apex, so there is one address and one only and the old URL cannot
compete for ranking. Pre-release: 55 tests, clean build, `share:check`
clean, `fonts:check` reporting 24 faces over 14 files, 0 changed, 0
stale.

**FOUR TRAPS, all of which read as failure and none of which was one.**

- **`whois scraps.games` returns the IANA record for the `.games` TLD,
  not for the domain.** It printed `status: ACTIVE` and `created:
  2016-05-24` — the registry's own dates — which looks exactly like a
  domain that has been registered by someone else for a decade. Use
  **RDAP** (`https://rdap.org/domain/<name>`, parsed as JSON) for the
  real registration event, status, nameservers and registrar.
- **Vercel's project API does not list custom domains.** `get_project`
  returned only the three `.vercel.app` aliases long after
  `scraps.games` was correctly attached and serving. Its `domains` array
  is not a check for whether a domain is wired up; fetching the domain
  is.
- **macOS caches negative DNS answers, so `dig` and `curl` disagreed for
  about twenty minutes.** `dig` queries the configured nameserver
  directly and said the domain resolved; `curl` goes through the system
  resolver, which was still holding the earlier NXDOMAIN, and said
  "Could not resolve host". Neither is wrong. Work around it with
  `curl --resolve host:port:ip` rather than reaching for a cache flush.
- **TLS lags DNS by minutes, and plain HTTP works first.** For a few
  minutes the domain answered `200` on port 80 while every HTTPS
  connection died with `SSL_ERROR_SYSCALL`. That is Vercel waiting to
  see DNS before it requests the certificate, not a misconfiguration.
  The certificate landed **~3.5 minutes** after DNS started answering,
  which was ~3.5 minutes after registration.

**Publishing was deliberately held until the certificate existed.** A
canonical tag pointing at an `https://` address that refuses connections
is worse than one pointing at the old address that works, and a crawler
that visits during the gap is not un-visited by the certificate arriving
later.

**A FIFTH TRAP, and the only one that would have shipped broken: the
monthly CI check hardcoded the old URL.** `.github/workflows/monthly-check.yml`
carried `BASE=https://scraps3.vercel.app` and fetches nine paths expecting
`200`, with no `-L`. Simulated against the live redirect, **every single
assertion fails**: nine `308`s, the `og:image` grep returns 0 matches
because a redirect body has no tags, and `og.png` comes back as
`text/plain`. The job would have gone red on **1 October** reading exactly
like "the live site is down". It now points at `scraps.games` and carries a
new assertion that the old URL still 3xx-redirects here, since every link
shared before 2026-09-12 depends on that and a Vercel project can lose a
domain assignment with nothing else looking wrong. The assertion was
exercised against six values before being trusted: it passes a 301 or 308
to the apex, and fails a `200`, a `000`, a redirect elsewhere, and the
lookalike `scraps.games.evil.example`.

**The general lesson, worth more than the fix:** changing a site's address
silently invalidates every check written against the old one, and those
checks live outside the app where no build step and no test touches them.
`share:check` guards the URLs the *site* advertises; nothing guarded the URL
the *CI* fetches. Grep the whole repo, `.github/` included, not just `src/`.

**Two stale claims in `CLAUDE.md` corrected in the same pass**, both
found while working rather than looked for: it said the suite is 37
tests when it has been 55 since the 2026-08-30 audit fixes, and its
Deploy section still described `scraps3.vercel.app` as the production
address, which is now a 308 redirect.

### Unplanned session — The card and the Scraps pile: direction, decided (2026-09-12/13)

**Read-only on the product. Nothing in `src/` changed.** The whole pass
was direction-setting, and it ends with one new file,
`CARD-REDESIGN-SPEC.md` at the repo root, which is the build handoff.
`dev` and `main` are still level. Nothing is published.

**What started it.** Stan: the Scraps pile "does not currently help the
concept of it being the 'half-discarded' pile of scraps. It's neat and
orderly, almost futuristic in dark tones." Three things were causing that
and all three were subtractions, not additions. **The container:** each
pile is a rounded panel with a coloured 2px border, a dark `inkLight`
fill and a header row, which is a dashboard tile rather than a place
things land. **The order:** cards render `sortByValue`, evenly stepped,
zero rotation, identical top, and everything reflows when one arrives, so
the pile is visibly a sorted array. **The material:** a Scraps card is
near-black with a glowing corner notch while the card in your hand is
cream paper, so the thing you threw away looks more expensive than the
thing you are holding.

**Three of the lookbook's 52 vibe-code tells land exactly on that
component** — "everything wrapped in a card", "mono for labels and
badges", and "neon-on-dark with glowing borders", which the list names as
the v0 and Cursor house signature. Worth knowing that the ban list
located the problem independently of anyone's taste.

**Three benches were built and published, each in the project's own
tokens against the real procedural timber**, because a pile judged on
flat grey is a pile judged against nothing:

- Pile Bench, where *no box* and *heap* were chosen —
  https://claude.ai/code/artifact/c457cfac-2aed-49ad-94e9-d9ced3e5861f
- Card Face Bench, where *big rank* and *no suits* were chosen —
  https://claude.ai/code/artifact/5b44533d-acf2-4ed1-8b5f-cf2062ade652
- Rank Type Bench, where *Rye* was chosen and the wear system lives —
  https://claude.ai/code/artifact/1ef1d2e7-01a6-4e4b-a9ae-271350c23823

**What Stan decided.** Rye for the card face; no box around the Scraps
pile; no suits anywhere; one big left-anchored numeral on both card
types; heap appearance with wear at maximum but rotation dialled back;
ascending rank order kept, with a fluid re-sort animation; the hand card
becomes a big numeral on crisp cream stock; the splash's four suit glyphs
go with nothing replacing them; `GlowPulse` stays as the next-action
indicator.

**Suits do nothing, and this was verified rather than assumed.**
`engine.js` reads `.suit` in exactly one place, `createDeck()`; every
other mention in that file is a comment saying evaluation ignores suits.
`reducer.js` touches it twice, both to name a card in a log line. Six
tests in `engine.test.js` exist purely to prove flushes don't count.
**So the no-flush house rule stops being a rule and becomes a thing that
cannot arise** — the `llms.txt` bullet gets deleted rather than reworded,
and the one genuinely counter-intuitive thing about this game goes with
it.

**The finding that tied the two halves together: weathered stock and red
pips are incompatible.** Red-and-black is a two-ink printing convention
that needs a bright sheet. Measured: a faded brick red clears AA at
4.51:1 on bleached stock, is marginal on kraft, and on ash nothing that
still reads as *red* clears the bar at pip size, because by the time it
has enough contrast it is brown and looks like the black suits anyway.
The current `emberInk` drops from 5.20:1 on `frost` to **3.72:1** on a
bleached scrap and fails outright. Wanting the cards to look less fancy
and wanting to keep suits pull against each other; dropping suits
dissolves the constraint, since one ink prints on any stock.

**The hard part of the build, worked out here so nobody hits it cold.**
A numeral that fills the card gets eaten by the next card along.
`FannedHand`'s step is `max(W x MIN_EXPOSED.up, min(openStep, room))`
with `MIN_EXPOSED.up = 0.34`, so a face-up card shows between **81% and
34%** of its width. A *centred* glyph needs `g <= 2*step - W`, which at
the 0.34 floor is impossible. So the numeral is **left-anchored on both
surfaces**. The counter-intuitive part, recorded because someone will
try to undo it: going big makes the squeezed fan *more* robust, not
less. The old worry was a small corner index being swallowed whole; a
left-anchored numeral at full height is still identifiable from its left
third. Do not "fix" the squeeze by shrinking the numeral back down.

**Rye replaces Baloo 2 one-for-one.** `F.card` has exactly two consumers,
the rank and suit spans at `cards.jsx:259-260`, so once suits go Baloo 2
has no consumer at all. Rye serves two subsets and one weight exactly as
Baloo 2 does, so the family count stays at five and `public/fonts` stays
at 14 files.

**The wear insight, which is the actual fix for "make the scraps look
distinctive from one another".** The first bench gave every card the same
amount of every effect, and ten independent randoms at equal strength
average out, so the pile read as uniformly slightly-scruffy. Driving
everything from **one seeded `wear` scalar per card**, skewed so most sit
mid-range and a minority are wrecked, is what makes them read as
individual objects. Variation in degree, not variation in kind at a
constant degree. Every value stays a pure function of card id so FLIP
keeps working.

**One decision was made, reversed, and reinstated in the same pass, on
purpose.** `GlowPulse` was specced for removal on the grounds that the
border it ringed was gone; the removal was flagged as leaving the Ace
strike with no "act here" cue, and Stan reversed it. It stays. But
reading the code to write the reversal turned up the real problem:
**both zone cues are hard rings**, `@keyframes zonePulse` at
`index.html:472` and the `.live-cue-zone` reduced-motion substitute at
`index.html:689`, and a ring around a boxless pile redraws the box as a
glowing outline. The spec's recommendation is to move the glow onto the
cards as a coloured `drop-shadow`, so it traces the real torn
silhouettes, which also avoids colliding with the dark pooled contact
shadow that would sit in the same place as a wrapper bloom.

**Instrument traps hit, all three costing real time.** The Playwright MCP
profile was locked; `ps -axo pid,ppid,command` showed a **live**
`playwright-mcp` parent, so per the standing rule it was left alone
rather than killed. The in-app Browser pane reported itself hidden for
most of the session, which blocks `computer` scroll and hover outright,
and a local file outside the project folder renders as a static snapshot
that page tools cannot act on at all. And an artifact renders in a
sandboxed iframe, so `javascript_tool` executes against the claude.ai
host page and returns cheerful nonsense about the artifact's DOM —
`document.querySelectorAll('.cell')` came back empty for a page that was
visibly full of cells. When the pane will not cooperate, `node --check`
on the extracted script and `curl` against the font API proved more per
minute than fighting the browser.

**One silent-failure trap worth keeping.** Setting
`font-variation-settings: "WONK" 1, "SOFT" 20` on Fraunces does nothing
unless those axes are named in the Google Fonts URL; the API serves only
the axes you ask for. Caught by fetching the stylesheet and reading it,
not by looking at the page.

**What is open.** Everything. Nothing is built. The spec is the whole
deliverable and it is self-contained: ten decisions with implementation,
a file-by-file change list with verified line numbers, twelve acceptance
criteria, and the traps above filtered to the ones that will bite this
particular job. It records one call made rather than asked —
`CardFaceRidge` stays on the hand card and goes from the Scraps card —
with the reasoning, so it can be reversed in a line.

### Unplanned session — The Woodshed: the sound kit retuned ✅ Done + **PUBLISHED** (2026-09-13)

Requested directly by Stan, opening with "the sound effects for transferring +
dealing are bad. don't emulate card sounds. just stick with woody sounds. even
a xylophone-and-trumpet cue." He specified the bench himself: 3–4 woody options
per action cue, 2 woody plus 3–4 xylophone/trumpet cues per messaging cue,
organic and acoustic, and **"don't code anything until i make final
selections."** This closes **FIX SOUND EFFECTS**, an item sitting unactioned in
his own *BIG PICTURE* notes block on Notion.

**The diagnosis he was reacting to, in one line.** `transfer` and `draw` were
the only two cues in the kit built from `friction()` — a noise burst swept
through a moving bandpass, which is a synthesised *slide across cloth*. They
were the most literal card emulation in a kit whose whole premise was that it
was not imitating cards. He heard it correctly.

**The bench: The Woodshed**, published as an artifact rather than a repo file,
matching the Foley Bench precedent —
https://claude.ai/code/artifact/14df5fce-5d63-4932-8cb0-2ef264bd0213

74 options across all 14 cues (20 action, 54 messaging), each with the shipping
cue beside it for reference, a waveform drawn from its own offline render, a
per-cue drop slot for importing real sample files, burst previews on the cues
that fire in runs, and a "play a round" sequencer that fires the current picks
in game order. Every option was peak-normalised to its cue's declared target
before he heard it, so he was choosing character and never loudness. All 88
voices were exercised under a stubbed Web Audio API before publishing, checking
for non-finite values and for exponential ramps to zero, which throw in real
browsers and silently kill a cue.

**What he picked, and the shape it makes.** All 14, and the kit divides on a
line nobody proposed in advance:

> **A physical event is an untuned object. A score outcome is a tuned bar.**

Wood: `select` (a xylophone bar damped at 30ms — a ghost of pitch, not a note),
`transfer` (lift and set: a tick leaving, a hollow thunk landing 220ms later,
**no slide at all**), `draw` (a yarn mallet on a lowpassed block), `aceStrike`
(crate slam), `aceCounter` (the same crate a fourth down, 170ms later),
`invalid` (dead drop on cloth), `revealBuild` (unchanged). Bars: `handWon`
G5→D6, `handLost` D6→G5, `roundWon` G-A-D, `roundLost` D-A-G, `gameWon` a
nine-bar run, `gameLost` two low marimba bars, `fullScrap` a ten-bar cascade.

**He took NO brass.** Four brass options were offered on every one of the nine
messaging cues — trumpet, cornet, flugelhorn, harmon mute — and none were
chosen. The "xylophone-and-trumpet" idea resolved to xylophone only. That
closes the question rather than leaving it open, and it is recorded in
`audio.js` so nobody re-opens it speculatively.

**The standing rule changed, and this was flagged before he listened, not
after.** `audio.js` was built on "NO OSCILLATOR EVER PLAYS A NOTE." Six cues
now do. The amendment is defensible rather than a capitulation: `bar()`
synthesises a real bar's partials — 1 : 3.01 : 6.03 for a xylophone,
1 : 3.99 : 9.18 for a marimba, the ratios a genuine undercut arch produces —
and a xylophone bar *is* a struck piece of wood. The direction widened by one
object. The tiny offsets (3.01, not 3.00) are load-bearing: a real bar is never
perfect and that slow beat is most of what stops it sounding like a sine bank.

**An accident worth keeping.** The bars are in **G major pentatonic**, chosen
so any two cues can overlap without clashing. `playSquareUp` — the splash
wordmark, untouched since the splash-identity session — has always played six
taps on that exact set, and its comment carried an open question about whether
they should become cardstock. They should not. The table moved into the title
screen's key instead, and the question closed without a line of it changing.

**Also shipped, at his request:** the splash PLAY button, silent since the game
was built, now fires `handWon`. It plays on every press rather than only the
first-run one, because a button that sounds different depending on a hidden
session flag is worse than one that does not. It doubles as the gesture that
unlocks the audio context.

**Dead code removed** once the picks left it with no callers: `friction()`,
`MAT.cardstock`, `MAT.felt`, `MAT.bone`. `boneLow` survives for one caller,
`playFireworkPop`.

#### The two findings worth carrying forward

**1. TRIM was re-measured, and this time it was verified.** The file's own
warning is that retuning a cue invalidates its trim and nothing tells you. All
14 were re-rendered offline against *this file* — not against the bench the
voices came from, which is exactly the mistake the 2026-08-26 port made when it
carried the first bench's numbers over and landed nine of thirteen off target,
one by 49%. A verification pass then re-rendered every cue *with its new trim
applied*: **all 14 land on target to within 0.04%**, and every cue's tail
measured 0.0000 at the end of its declared `CUE_DUR`, so nothing is truncated.
`select` and `draw` have 3 and 4 variants (they fire in runs, and bit-identical
repeats read as one sample retriggering); all variants were measured and the
trim set by the loudest, so none can exceed target. `CUE_VARIANTS` is exported
for whoever measures next.

**2. Peak normalisation under-states a ringing bar, and the kit now contains
both kinds of sound.** Post-trim, a wood cue's RMS is ~10% of its peak
(`select` 9.6%, `invalid` 10.6%); a bar cue's is ~18–20% (`handWon` 18.0%,
`roundWon` 19.4%). At equal peak a bar delivers roughly **twice the energy**.
`handWon` and `invalid` are both declared .34 and will not sound equally loud.
This was deliberately **not** corrected: Stan chose these options in a bench
that peak-normalised the same way, so these are the levels he actually
approved, and switching to a loudness-weighted target would silently change his
picks. It is documented in `audio.js`. **If `handWon` is hot in play — it fires
twice a round, more than any other outcome cue — the fix is to lower its TARGET
and re-measure, never to scale the trim.**

#### Instrument traps, all three of which cost time

- **The in-app browser pane cannot run an `OfflineAudioContext` render.** The
  measurement page loaded, the module executed, and `startRendering()` never
  resolved. This is the same hidden-pane failure CLAUDE.md already documents
  for `rAF` and `setTimeout`, and it extends to offline audio rendering, which
  is worth knowing because that work is *not* timer-driven and looks like it
  should be immune.
- **The Playwright MCP profile was locked**, and per CLAUDE.md's own rule the
  holder was checked before anything was killed: five live `playwright-mcp`
  node processes belonging to other sessions. Nothing was killed. The rule
  earned its place again.
- **The fallback that worked is worth reusing verbatim:** a ~20-line Node
  static server that also accepts `POST /result` and exits on receipt, plus
  headless Chrome pointed at it. The page posts its JSON back and the numbers
  arrive as data. This beats CLAUDE.md's "screenshot the figures" advice for
  anything numeric — no OCR, no `--dump-dom` (which never returns), and no
  hang. Add a `window.onerror` / `unhandledrejection` reporter that posts to
  the same endpoint or a failing page is silent.

**Verified:** `npm run build` clean, 55/55 tests passing (audio has no tests and
did not need any — the offline render *is* the test), the app boots with no
console errors, and all 14 trims verified on target. **Not verified by ear:
Claude cannot hear any of this.** Every claim here is numerical.

**Stan listened on the preview and approved it, then it was published the same
day.** Production was confirmed three independent ways rather than one: the
merge commit's git tree is identical to the previewed `dev` tree
(`d7c06a51`), the served bundle filename matches the local build
(`index-BHUaarfC.js` — Vite content-hashes, so the same name is the same
bytes), and the downloaded live bundle diffs byte-identical to `dist/`. Read
back off the live file for good measure: the new note frequencies and all three
sampled new trims present, and every old trim plus `cardstock` absent.
Publish-time checks all green — design detector zero and **confirmed not
degraded** (all four parser modules resolve from `~/.claude/node_modules`, and
the same run on `index.html` correctly surfaced the known deliberate
`dark-glow`), `share:check` current, `fonts:check` 24 faces over 14 files with
0 changed and 0 stale, no personal identifiers in `dist/`, and no new data
collection in the diff.

**Not changed:** `revealBuild` is byte-for-byte the cue that was already
shipping — he auditioned five alternatives and picked the incumbent — so its
trim of 9.0647 was left alone rather than retargeted to the bench's level.
`playSquareUp` untouched. No audio files were imported, so the project's "no
audio files, no licensing surface" position still holds.

### Unplanned session — The big pass: rules, opponent, wordmark, table ✅ Done + **PUBLISHED** (2026-09-13/14)

Requested directly by Stan as one long list under the heading "Big session
here", covering mobile fixes, one rule change, a global pronoun change, the
splash typeface, a storyboard rewrite and a gameplay-layout rebuild. He fenced
off three things for later sessions in the same message: the card redesign (per
`CARD-REDESIGN-SPEC.md`), the terminology change (a separate `.md` he has
ready), and the interstitials.

**Three things in the list needed settling before any of it was built**, and he
answered all three: the reveal button is **SHOW 'EM** (he had asked for both
SHOW 'EM and REVEAL in the same message); the results-screen chain runs all
three hand-offs, each named for what comes next; and the near-win banner is
**repurposed as a match-point banner** rather than deleted.

#### The rule change: first to 10, flat

`checkWin` used to require `max >= WIN_SCORE` **and** a margin of 2. It now
returns the leader the moment any score touches 10.

**Confirmed it cannot deadlock, and the reason is structural rather than
lucky.** Every scoring event in this game pays exactly ONE side —
`SMALL_HAND_SCORED` credits a single winner, and `scoreScrapsOutcome` fills
either `pPts` or `aPts` but never both. So the two scores can never move
together and the trailing player cannot arrive at 10 in the same event as the
leader; a 10-10 board was already unreachable, and the margin test was only
ever guarding against it. That property is now its own test rather than an
argument in a comment. The AI reads raw scores for its aggression heuristics,
never the margin, so `engine.js` needed no change at all.

**What it does to pacing:** games get materially shorter. A full driven
play-through finished in **three rounds** — a round pays up to 5 with a Full
Scrap, so 10 is two to four rounds now rather than an open-ended race.

**Everywhere the rule was stated got updated**, which is more places than it
looks: the gameplay eyebrow (now `FIRST TO 10`), the storyboard's scoring beat,
the no-JS block in `index.html`, the `<meta name="description">`, the generated
`llms.txt`, and `RulesModal`'s copy. `NearWinBanner` became a **match-point**
banner at `WIN_SCORE - 2` — 2 is what the Scraps hand pays and the smallest
hand that can end a game from 8. Tests went 55 → 56.

#### The opponent is female

A copy sweep, not a mechanic: narrator hints, the Ace modals, the reducer's log
lines, the ATTACK tag's screen-reader labels and title, the storyboard, the
no-JS crawler copy and `llms.txt`. The opponent is still called OPPONENT on the
table — he asked for pronouns, not a name.

#### The splash

Rye replaces Bungee Shade on the wordmark, vendored through
`tools/fetch-fonts.mjs` the same way as the other four families, with the two
`bungee-shade-*.woff2` files deleted. **This answers the one question
`CARD-REDESIGN-SPEC.md` left open in its section 6b** — whether Rye replaces
Bungee Shade on the wordmark as well as Baloo 2 on the cards. It does, for the
wordmark, now; the card half is still that spec's to build. *His other Notion
note, asking to "incorporate the font currently used for the SCRAPS wordmark
for headlines" in the interstitials, now points at Rye rather than Bungee
Shade. Flagged for the interstitial session rather than acted on.*

The **tap gesture is gone** — the square-up where the letters went loose and
snapped flush on touch. The riffle and the desktop hover fan stay. `playSquareUp`
in `audio.js` was NOT deleted: it is a tuned six-tap phrase in the same G major
pentatonic the table's outcome bars now use, and the interstitial redesign is
its obvious home. It has no caller today and its header says so.

The **subtitle is gone**. That broke `npm run share`, which read
`const SUBTITLE` out of `MenuScreens.jsx` as a drift guard — untied, with a
note; the card never printed it (STRAPLINE did).

#### The storyboard

New order: the two hands, scrapping to draw, how a round scores, **then the
Ace**. Mechanics, flow, surprise rule, with the Ace last because it is the
thing the game turns on and it is what a reader should be holding when they
press LET'S PLAY. Beat 1 gained a Rye **HOW TO PLAY** title and dropped from
five cards a side to **one King of Hearts each** — same rank and suit both
sides, so the only difference left between the two panels is the card's face,
which is the whole point of the beat. Both arrows are gone (beat 2's
cards → label, and the Ace beat's button → pile), and every copy line is
Stan's. The difficulty picker gained a **BACK** that returns to the
storyboard's last beat, armed on the same 720ms lock as the panels.

#### The table

**The deck and the discard came off it.** They were the last furniture that was
not part of the game — two labelled piles a player never touches, costing the
wide layout a gutter column and the stacked layout a row, on the axis each is
shortest on. `DeckPile` and `DiscardPile` were deleted rather than left
unreferenced, so a later pass cannot put the furniture back by accident.

They are still anchors, with no pixels. `deckAnchor()` answers with a rect off
the **dealer's** edge — odd rounds the opponent deals and cards come over the
top, even rounds you deal and they come up past the bottom — and
`discardAnchor(i)` answers off the left, carrying a big `rot`. That last part
is why the toss needed no new code: a flight already turns a card from the
angle it sat at to its destination's `rot`, so a destination with a 105-160°
angle *is* the spin.

Also: point values off the round strip, the `▸` off the best-hand badge, the
PLAYABLE strip deleted, and the three hand-off buttons (DEAL SECOND HAND, PLAY
SCRAPS HAND, NEXT ROUND) moved **onto** the results screen that precedes each
of them. Those were two presses for one decision, three times a round. The
button on a results screen now names what happens next and the phase it leaves
behind carries itself — except when that result ends the match, where it reads
CONTINUE rather than promising a hand that will never be dealt.

SIGNAL became **SELECT HAND**, inert until the selection is legal and then
naming it: A THREE, AN ACE, PAIR, TWO PAIR, FULL HOUSE. The name comes from a
new pure `engine.signalHandLabel`, so the button and the engine cannot disagree
about what a selection is. REVEAL HANDS became **SHOW 'EM**. Both TRADE IN and
SELECT HAND now share one `TableActionBtn`, whose disabled form sits at
**opacity 0.8** — Stan's "dim it by 20%".

#### Three real bugs found and fixed along the way

**1. The opponent moved behind the Ace lightbox — his report, and the cause was
effect ordering.** The `aiGo` gate already checked `aceDrawnCard`, but it is
declared ABOVE the effect that opens the lightbox, so on the tick an Ace lands
the gate reads the flag as still false, clears the AI to act, and only learns
about the box on the next pass. Worse, its guard was a bare `return`, which
leaves a previously-set `aiGo` standing and the runner's timers alive. It is
`setAiGo(null)` now, which tears the runner down through its own cleanup, plus
a ref the runner itself checks before acting — a timer already handed to the
event loop cannot be recalled. Safe to restart because the runner is idempotent
from the top of a phase and its first action is 800ms in.

**Verified by sampling inside ONE evaluate**, per the round-trip rule: with the
box up in round 2 (the round the opponent goes first, i.e. exactly his case),
eleven samples at 300ms showed zero card ghosts, an unchanged log line, and the
only two running animations belonging to the lightbox itself.

**2. ATTACK did not fit its button on a phone — and it is not his display
settings.** He asked directly. `FannedHand` sizes a card's slot to its EXPOSED
share of the fan, so that two adjacent Aces do not overlap their tags, and that
share collapses as the hand fills: **measured 46px at seven cards on a 375px
screen, against 56.22px of "ATTACK" text wanting 64.22px inside the tag's
padding.** Every phone player holding a full hand hit it. iOS Dynamic Type does
not scale CSS-sized web text, so his Larger Text setting was not involved at
all. Fixed with `ACE_TAG_MIN_W = 66`, which clears the measured figure and
stays under the 80px card so the overlap it reintroduces between adjacent Aces
is 20px rather than 34. Caught live at five cards afterwards:
`clientWidth 66, scrollWidth 66`.

**3. `FitBox` measured the padded box, and clipped what it had just scaled.**
It read `outer.clientHeight`, which includes padding the caller passes through
`style` — and the storyboard passes `padding:'16px 10px 0'`. So a beat wanting
576px was scaled to fit 562 and then had its last 16px cut by the
`overflow:hidden` on the same element. Visible as "Both hands have a 7 card
limit" sliced in half. It measures the content box now. This is shared layout
code; the game table passes no padding, so only the storyboard was affected.

**One bug I introduced and caught in the same pass:** the narrator div is a
flex container, so a hint carrying a `<b>` arrived as three flex items and laid
the signal sentence out in three columns with "many" stranded in the middle.
Wrapped in a single span.

#### How it was verified

The Browser pane reported itself hidden and `computer.left_click` timed out, and
the Playwright MCP's profile was locked by another live session — so this ran on
**Playwright's Node API imported directly**, exactly the fallback order
CLAUDE.md prescribes. A scripted driver played complete games end to end at
375x667.

- **A full game, zero console errors**, with the button chain captured in
  order: `Deal Second Hand →`, `Play Scraps Hand →`, `Next Round →`, then
  `Continue →` on the result that ended the match, then NEW GAME.
- **The discard toss measured across 8 frames:** centre x ran 153 → 150 → 126 →
  71 → -42 → -96 → -116 → -162, off the left edge, while the rotation matrix
  swept 0.727 → -0.935, i.e. through more than a quarter turn. Three ghosts (two
  struck cards plus the spent Ace).
- **No scroll and nothing painted outside the viewport** at 375x667, 1024x662
  and 1440x900. The narrator sits dead centre at both desktop widths (512/512,
  720/720) — removing the left gutter's contents did not break the centre-axis
  rule the Session 5 work established.
- `npm test` 56 passing, `npm run build` clean, `fonts:check` 24 faces over 14
  files with 0 changed and 0 stale, `share:check` current after a regenerate.
- **Tells scan: exit 0.** Six "banned" hits, all already-known false positives —
  "Inter" matching inside *RoundInterstitial* and *r/InternetIsBeautiful*, "Space
  Grotesk" matching brief entries recording its REMOVAL, ✅ in this file read as
  "emoji as icons", "shimmer" in prose about woodgrain, the woodgrain vignette
  read as a rainbow gradient, and three one-shot entrance keyframes read as
  "fade-in-up on everything". **Rye is not on the banned-typeface list.**

#### Open, and worth knowing

- **The left gutter of the wide table is now empty**, so at desktop widths the
  table reads slightly right-heavy: the hands sit on the centre axis while each
  side's Scraps hangs in the right gutter, and the pile rail used to balance it.
  Not changed unilaterally — rebalancing means either moving the narrator off
  the axis or grouping hand+Scraps as one centred pair. Stan's call.
- **The live deck count is no longer shown anywhere.** The deck is rebuilt every
  round and a round cannot exhaust it, so it was reference nobody acted on, but
  it is a real deletion rather than a move.
- **The privacy notice is unreachable in the shipped game.** `RulesModal` holds
  the only copy of it and has had no importer since the storyboard took over as
  the in-game rules on 2026-08-30, while `llms.txt` still points readers at "the
  Privacy notice inside the game's rules panel". Found here, not fixed: wording
  and placement are Stan's.
- **Published 2026-09-14**, together with the six review notes below. See the publish postscript at the end of that entry.

### Unplanned session — Six notes off the preview ✅ Done + **PUBLISHED** (2026-09-14)

Stan's review of the big pass, six items, all built and verified in the same
sitting. Then published to preview.

**The select cue was retuned properly rather than scaled.** "A little too high
pitched and 25% too loud." Pitch dropped a fifth, D6 (1174.66) to A5 (880),
staying inside the kit's G major pentatonic so it still cannot clash with an
outcome bar landing over it. The 25% came off the **TARGET** (.16 → .12), never
off the trim, because the trim is a derived number — and this is exactly the
trap CLAUDE.md warns about: **the retune moved the raw peak from 0.2014 to
0.2286, so the old trim would have made the cue 14% LOUDER while the file still
claimed .16.** Re-measured in a real browser against this file, all three
variants, trimmed by the loudest: post-trim peak **0.120007** against a target
of .12, 0.006% off. The harness was validated first by reproducing the
shipping cue's own numbers before anything changed.

**Everything else, and what each was.**

- *"Opponent signals N."* replaces the old line that also told you to pick a
  hand — which is what the button under it already says.
- *"Both signals in."* loses "Show 'em?", which was asking a question that on
  half the paths has no button to answer it.
- *The opening deal now deals all fourteen cards*, the two that start in each
  Scraps included. They used to be simply THERE when the interstitial lifted,
  so a round looked like it began with four cards already played. Both sides'
  Scraps fly in together, two beats rather than four, because four sequential
  cards added 360ms to a deal that was already 810.
- *The discard moved to the right edge.* The toss rotation carried the sign
  with it, so the spin still turns the way the card is travelling.
- *SHOW 'EM is skipped when she signals first.* There is nothing left to decide
  at that point — both hands are committed — so the press existed only to be
  pressed. The 580ms build cue still runs; it is the drumroll, not the button.
- *"Opponent is thinking..." no longer flashes after she has moved.* Her turn
  has two halves and the narrator only had copy for the first: she decides, she
  acts (cards fly, `settling` silences the band), the cards land — and then the
  band came BACK with "thinking" over a move she had visibly already made,
  because the phase does not advance for another 2.1s.

**Two things adjacent to the list, found by measuring and fixed.** Clearing
`autoReveal` at the start of the build put the SHOW 'EM button back on screen
for 580ms in its shaking `▶▶▶` state — the manual path's look, on a screen
nobody had pressed anything on. The flag is held through the build now. And
"Signal locked. Waiting for her..." was showing for 700ms on the path where she
had *already* signalled; it says "Both signals in." there instead, so the band
holds one line from your commit through to the cards turning over.

#### How it was verified

The narrator is sampled **from inside the page** — a 60ms interval pushing
`{t, hint, log, showEm}` onto `window` — rather than polled from the driver,
which is the only way to catch a state that lives for a few hundred
milliseconds. A `data-narrator` attribute was added to the band as a permanent
hook, after a first attempt selecting on `min-height: 3.9em` found nothing
(computed styles resolve that to pixels).

- **Twelve AI turns across a full game, and "Opponent is thinking..." appears
  on none of the log lines that say she traded.** Before the fix it appeared on
  every one.
- **Both signal orders walked.** She-first: "Opponent signals 1." → "Both
  signals in." → reveal, with no button on screen at any sample. Me-first:
  unchanged, "Signal locked. Waiting for her..." then SHOW 'EM. (The button
  does re-render behind the open reveal overlay on both paths, as it always
  has; the overlay is a focus-trapped modal, so it is contained.)
- **The deal peaks at 14 simultaneous ghosts** — 5 + 5 hand, 2 + 2 Scraps —
  and settles at 2/7 in both zones with 5 in hand.
- **The toss runs rightward off a 375px viewport:** three ghosts measured at
  240 → 482, 284 → 476 and 311 → 460.
- 56 tests, clean build, `share:check` and `fonts:check` current, tells scan at
  its six known false positives, zero console errors across the driven game.

**Note for whoever runs the tests next:** `npx vitest run` at the repo root
picked up a SECOND copy of both test files and reported 111 passing. That was a
sibling git worktree under `.claude/worktrees/` from a spawned session, not
anything in this tree. `--exclude '**/.claude/**'` gives the real 56.

#### Published 2026-09-14 — and the one thing that got through

Both entries above went live together at
[scraps.games](https://scraps.games) as merge `594ed9b`. Production was
confirmed by **bundle hash**: Vite names its output after a hash of the file's
own contents, so the served `index-Bs5J94P_.js` matching the local build is
transitive proof that every byte in the push shipped. The merge tree was also
verified identical to the previewed commit's tree. `llms.txt`, the no-JS block
and the served `@font-face` rules were read back as supplements.

**A real defect shipped, and the live-browser check is what found it.** Minutes
after the merge, a real browser on the live URL reported one console error:
a **404 for `/fonts/bungee-shade-latin.woff2`** — the font deleted the day
before — fetched by every visitor on the critical path, while **Rye, the font
the splash is entirely made of, was not preloaded at all**.

The cause is worth keeping, because every individual check was green. The three
`<link rel="preload">` lines in `index.html` sat under a comment reading
*"Regenerate them with `npm run fonts` — never edit either by hand"* — and
`npm run fonts` **did not touch them**. It rewrites only the `@font-face` block,
between its own sentinels further down. So the preloads were hand-maintained
beside an instruction not to hand-maintain them, and the font swap moved one and
left the other. `fonts:check` stayed green because it compared only the block it
knew about. A publish-time grep for `Bungee` missed it too: the href is
lowercase.

Fixed the instance and the class in `04fdcb4`. The lines now live between
`PRELOAD:BEGIN`/`END` sentinels, are derived from the same face list the
`@font-face` rules come from, and are declared by `preload: true` in
`fetch-fonts.mjs`'s SPEC — so a family joining or leaving the first screen moves
both at once, and `--check` compares them.

**Guards were broken on purpose before being trusted**, three classes across two
scripts, each with the edit asserting the break actually landed first:

| Guard | Break | Result |
|---|---|---|
| `fonts:check` | preload repointed at the deleted file (*the exact bug*) | exit 1, named |
| `fonts:check` | a family's `preload: true` removed | exit 1, named |
| `share:check` | `<title>` changed to SCRAPPY | exit 1, named the JSON-LD mismatch |
| `share:check` | `voltage` token repainted | exit 1, named `favicon.svg` |
| `share:check` | (observed live earlier in the session) `const SUBTITLE` deleted | generator failed by name |

All restored to exit 0 afterwards. Post-fix, production reports **zero failed
requests and zero console errors**, with all three splash fonts at 200.

**Other publish-time checks.** The impeccable detector ran NOT degraded and
returned **14 findings on the changed files — identical to the 14 already on
`main`**, so this push added none; all are the deliberate `dark-glow` state
tokens. No personal identifiers in `dist/`. No new data collection, no new
environment variables. The monthly CI job was simulated against live and would
pass: nine paths at 200, `og:image` present, `og.png` as `image/png`, and the
old `scraps3.vercel.app` still 308-ing to the apex.

**One process note.** A `git stash -q -u` on a clean tree creates no entry, so
the matching `git stash pop` popped a pre-existing **`stash@{0}: On main:
splash-identity-wip`** from an earlier session and conflicted. Nothing was lost
— the session's work was committed, and the stash was kept — but that stash is
still sitting on this repo and nobody has said what it is. **Never stash-pop in
this repo without checking `git stash list` first.**

### Unplanned session — The card redesign: torn scraps, one big rank, no suits ✅ Done + **PUBLISHED** (2026-09-13)

Built from `CARD-REDESIGN-SPEC.md`, which was written by the 2026-09-12/13
direction session and is **deleted now that this shipped**, so it cannot rot
into a second source of truth. The spec's ten decisions were all built; three
of them had moved under it since it was written and Stan re-decided those up
front.

**What Stan decided at the top of the session.** The spec assumed Bungee Shade
still held the wordmark, so putting Rye on the card ranks read as adding a
distinct new face. Rye had already replaced Bungee Shade earlier the same day,
so the real question was whether the wordmark and the cards share one face.
He took **Rye everywhere** — four families now, not five, and Baloo 2 is gone
from the build. He also took **keep the spade favicon, redraw the og card**
(the favicon is the only mark that works at 16px, and nobody reads a favicon
as a rules claim), and **two paper stocks** for pile ownership rather than one.
Mid-session he added the table: **warmer, more Redwood, less worn/aged.**

**What shipped.**

- **Suits are gone from the data, not just the face.** `createDeck()` builds
  four copies of thirteen ranks; the four-fold loop that used to iterate
  `SUITS` is the same loop and is still load-bearing for Session 2's balance
  fix. `engine.js` read `.suit` in exactly one place and it was that line.
  The **no-flush house rule stopped being a rule** — a flush is now a hand
  that cannot be dealt — so its bullet came out of `llms.txt` and out of
  `index.html`'s `<noscript>` block rather than being reworded.
- **One big left-anchored Rye numeral on both faces, and nothing else.** No
  pip, no corner index, no notch. The two card types are told apart by
  **material alone**: crisp `frost` cream with a heavy ink edge in your hand,
  torn weathered stock in a Scraps pile. The storyboard's beat 1 now shows the
  same King twice, once each way, which is the cleanest statement of the idea
  the product has.
- **The Scraps pile lost its box.** No fill, no 2px ownership border, no
  radius, no header row. Cards lie on the timber with one pooled contact
  shadow under the heap. Ownership moved to a quiet caption below and to the
  paper itself.
- **Seeded wear.** One `wear` scalar per card, a pure function of its id,
  drives the tear, the torn-off corner, stains, foxing, the lit-and-shadowed
  crease, edge grime, ink fade and ink rotation. Rotation is decoupled and
  capped at 4°.
- **`GlowPulse` stopped being a ring.** It is a `drop-shadow` filter on a
  wrapper whose only children are cards, so it traces the real torn outlines.
  `.live-cue-zone`, the reduced-motion substitute, got the same treatment.
- **The re-sort is two distinguishable motions**, and the arriving card is
  keyed on becoming VISIBLE rather than on entering the array — a card flying
  in from the hand sits in the pile for the whole flight while a ghost stands
  in for it, so keyed on the array the settle would run and finish unseen.
- **The table went Redwood** at constant relative luminance: hue 30°→14°,
  saturation 23%→36%, with lightness re-solved so each token lands within
  0.0003 of the luminance it had. frost-on-timber moved 10.09:1 → 10.05:1.
  That is what makes "redder, not brighter" literally true rather than
  approximately true.

**Three things the spec got wrong, found by measuring.**

1. **"Six flush tests" was eight.** 53 tests now, not 56: eight out, five
   deck-shape tests in. `CLAUDE.md` said 56 and now says 53.
2. **The card sizes had to be DERIVED from Rye's metrics, not chosen.**
   Measured at 100px in a real browser: "Q" inks to 0.824em right of its
   origin and **overhangs its own advance by 0.055em**, so sizing against
   advance width (which the first attempt did) clipped the Queen's swash and
   nothing else. "A" inks 0.034em to the LEFT of its origin. "7" is 0.041em
   taller than every other rank. Caps start 0.108em below a `line-height:1`
   box — the first attempt guessed 0.175 and hung every numeral too high.
   `CARD_DIMS` now carries `rank`, `gx` and `gy` derived from those four
   numbers, with the derivation written out.
3. **"A left-anchored numeral is still identifiable from its left third" is
   not true of Rye.** This is the spec's §4.1 premise and it is the one thing
   in the whole document that did not survive contact. Measured at a 7-card
   pile in the side-by-side layout's 340px: `small` cards expose 40px of 80,
   and the pile read **"2 5 7 1 J Q K"** with the 10 showing as a 1 and the Q
   and K colliding. Two fixes, both measured rather than guessed:
   - **The pile dropped to `tiny` in both layout modes** (`SIZES` in
     `GameScreen.jsx`). The same 340px then exposes 72% and all seven ranks
     read. This also answers Stan's standing note that there is "too much
     shit onscreen ... maybe the scraps are smaller", and it puts the
     hierarchy the right way up.
   - **`small` is the one card size that does not take the width-derived
     maximum** (64, not 79). It is the hand card in the compact layout, whose
     floor is 7 face-up cards across a 340px rail — 54% exposure. At 79 only
     42% of each glyph fell in the exposed band; at 64 it is 65%, and the
     18px of clear paper left on the right is most of the gain, because a
     gutter is what separates two ranks. A **lit 1.5px frost leading edge** on
     the hand card does the rest: the seam used to be this card's black rank
     against the next card's black 6px border, two blacks with nothing
     between them.

**Confirmed working, and how.** Everything below was measured in a real
unhidden browser driven by Playwright's Node API imported straight from the
npx cache — the Playwright MCP profile was locked by another live session all
day, and the in-app Browser pane reported `document.hidden` true, which
suspends the timers this game's whole flow runs on.

- `npm test` 53 passing; `npm run build`, `npm run fonts:check`,
  `npm run share:check` all clean. `grep` for the four suit glyphs across
  `src/`, `tools/`, `index.html` and `public/` returns nothing.
- **Contrast**: 26 pairings, 0 below AA. The two new stocks measure
  **9.50:1** (`stockPale`, yours) and **7.91:1** (`stockKraft`, hers) against
  `ink` — both AAA. They differ in warmth, not lightness, so the pair
  survives greyscale.
- **The re-sort**, sampled inside ONE `evaluate` with a `setTimeout` chain
  because two round-trips would miss a 620ms animation: exactly one card
  carries `.scrap-settle` running `scrapSettle` for 620ms, while the
  displaced cards transition `left` over 420ms with delays
  `0.12 / 0.06 / 0 / 0.06 / 0.12 / 0.18s` radiating from the arrival slot.
- **Reduced motion**, forced at the context level: the arrival becomes
  `scrapArrive` for 280ms (it still visibly arrives) and the slides collapse
  to 1ms with no delay, landing on the identical resting frame.
  `.live-cue-zone` resolves to the three-layer static filter with
  `animation-name: none`.
- **The Ace strike's cue**: rendered both piles side by side mid-strike in the
  real components. One pile glows, tracing its torn outline; the other does
  not. Which pile you are choosing from is unmistakable with no box anywhere.
  **Not** verified by playing a strike end to end — 16 scripted deals failed
  to produce an enabled ATTACK tag before the driver stalled, and the
  side-by-side render tests the actual risk more directly than one lucky
  playthrough would.
- **`tools/responsive-qa.mjs`** passes at all six viewports for everything
  this change touches: no document scroll, no clipping, nothing painted
  outside the viewport.

**One pre-existing failure found and NOT fixed here.** The responsive gate
intermittently reports `small targets [{"label":"Okay","size":[72,27]}]` — the
OKAY button in the Ace modal, against a 44px floor. It reproduces identically
on `main` (verified against a worktree of main on port 5194), and it only
surfaces when a random deal puts an Ace in the opening hand, which is why it
lands on a different viewport each run. Spawned as its own task rather than
widened into this change.

**Two tooling fixes made in passing.** `vite.config.js` now excludes
`.claude/**` from vitest — a git worktree parked there is a second full
checkout and was being collected twice, reporting 111 tests for a project
that has 53, and a stale copy would have failed on assertions this change
deliberately removed. And `tools/responsive-qa.mjs` now falls back to the
machine's Google Chrome when Playwright's bundled Chromium is not downloaded,
which is the normal state of this machine; it was simply unrunnable before.
To run it, make Playwright importable first:
`ln -sfn $(ls -d ~/.npm/_npx/*/node_modules/playwright | head -1) node_modules/playwright`
and the same for `playwright-core`.

**Lookbook scan.** `scan_tells.py` reports 6 banned firing, 2 flagged. All six
banned are false positives and five were already triaged as such in this brief:
"Inter" matching *RoundInterstitial* and *r/InternetIsBeautiful*, "Space
Grotesk" matching entries recording its removal, "emoji as icons" matching the
✅ in these very session headings, "skeleton shimmer" matching prose about
woodgrain. The sixth, **multi-stop rainbow gradients**, newly matches this
session's crease hairline and stock-grubbiness gradients in `cards.jsx` —
both are two-tone brown-on-transparent, not rainbows. Of the two flagged,
**mono for labels** is true, deliberate and long-standing here, and this pass
did not add to it; **one rounded radius on everything** is if anything
improved, since a Scraps card now has no radius at all.

**Still open, and Stan's call.** The vertical composition of a card leaves the
bottom third empty by design (it is where the ridge sits on a hand card and
where the tear takes a corner on a scrap). Worth a look on the preview to
decide whether the numeral wants to sit lower.


**The publish.** Live at [scraps.games](https://scraps.games) as `75869e8`.
Verified by **bundle hash**, which is the strongest of the three available
claims: Vite names its output after a hash of its own contents, and
production serves `index-DI8nrcPS.js`, the same filename the local build
produced — so the bytes are provably the same bytes and every change in the
push shipped, without guessing which strings landed in which file. The merge
tree was also confirmed identical to the previewed tree.

A **real browser on the live URL** reported zero failed requests and zero
console errors, with exactly four font families loaded. That check is here
because it is what caught the last publish's only real bug — a 404 on a
deleted font, on the critical path, while every offline check was green.
This time the three preloads all point at fonts that exist, and
`/fonts/baloo-2-latin.woff2` correctly 404s with nothing requesting it.
All nine crawler paths return 200, `og.png` is `image/png`, and
`scraps3.vercel.app` still 308s to the apex.

**Guards broken on purpose before being trusted**, five of them, each
grep-asserted to have actually landed before the check ran. `share:check`
failed by name on a moved palette token (`✗ palette.voltage`), a changed
product name (`✗ title`) and a changed card hand (`✗ hand`). `fonts:check`
failed on a rewritten `@font-face` src and — the one that matters — on a
preload pointing at a deleted font, which is the exact bug that shipped
yesterday. All five passed again on restore.

**Design detector: 5 findings, all pre-existing `bounce-easing`** on the
card-physics curves, and the instrument was confirmed live first by scanning
a deliberately bad control file (it named the planted `Inter`). No DEGRADED
banner. Against `main` this push is **net one better**: it removed a
`dark-glow` finding (the pile's old permanent ownership halo, gone with the
box) and added one — a `transition: width` on the new pooled shadow, which
was fixed here rather than shipped. Transitioning `width` runs layout on
every frame of a 420ms curve, twice a table; it is a `scaleX` about a fixed
box now, which is compositor-only and lands in the same place.

**One stale string fixed in passing**: the monthly check's failure-issue body
still told the reader to look at "one of the five families".


### Unplanned session — The terminology and tone pass ✅ Done + **PUBLISHED** (2026-09-13)

Renamed the game's vocabulary and rewrote the copy that carried it. **No
mechanics, balance or layout changed.** The spec came in as
`NEXT-SESSION-terminology.md`, written by a previous session, and its
decisions were followed as settled — with one override from Stan, below.

**The vocabulary now, and it is the whole point of the pass:**

| What it names | Was | Is |
|---|---|---|
| Your private cards | small hand | **hand** |
| Moving cards into Scraps | transfer / Trade In | **scrap** (verb) |
| Spending an Ace | discard an Ace / ATTACK | **attack** |
| What happens to their two cards | strip / remove | **discard** |
| Winning all three hands | FULL SCRAP | **CLEAN SWEEP** |

The rule that holds it together: **`discard` means exactly one thing**,
cards leaving the table for the discard pile. That covers the Ace's two
victims, the over-7 trim and the pile itself. An Ace is attacked WITH; it
only reaches the pile when it is countered. So "discard an Ace" to mean
spending one is retired.

**Stan's override, and it is load-bearing for anyone reading the old spec.**
The spec proposed **BURN** as the verb for spending an Ace and `BURN` as
the tag over the card. He rejected both outright — "we're not using BURN" —
so the tag stays **ATTACK** and *attack* is the verb everywhere. The word
"burn" appears nowhere in the project. **The spec file on disk still says
BURN in four places and is wrong about all four**; it is kept untracked at
the repo root rather than committed, for exactly that reason.

**CLEAN SWEEP also closed a real split nobody had noticed.** The same
event was FULL SCRAP when the player did it and `· SWEEP` when the AI did —
`reducer.js` already had `aiSweep` and logged "Opponent sweeps the round!".
One name now covers both, and the opponent-side code needed no change.

**Three decisions Stan made when asked, rather than assumed:**
- **"strike" is gone too.** The narrator said "strike with your Ace" while
  the tag said ATTACK and the storyboard said "attack" — three surfaces,
  two words, one move. All prose is now *attack*. The internal `aceStrike`
  cue and `playAceStrike` keep their names; the spec left them alone.
- **The empty action button reads `SELECT CARDS`**, not `Scrap`. The spec
  gave the selected form (`Scrap 2 → Draw 3`) and never the disabled one.
  It names the thing you have to do first rather than the thing it becomes.
- **Every surviving "no flushes" claim was deleted.** Suits came off the
  cards on 2026-09-13, so the rule cannot arise — but it was still being
  stated in **three** places: the storyboard's beat 3 (Stan called this one
  mid-session), the JSON-LD `description` in `index.html` that crawlers
  read, and the retired `RulesModal`. A reducer test named "flushes never
  win the Scraps hand" was renamed to describe what it actually asserts now
  (five high cards lose to a pair); the assertion itself was already right.

**The four tone rewrites, verbatim from the spec:**
- First-turn narrator → the spec's *"Pick cards to scrap. They land
  face-up and you draw fresh ones. Seven max on each side."* was replaced
  mid-session by **Stan's own line**: *"Pick cards to move into your
  Scraps, then draw fresh ones. Seven card limits."* His version drops the
  verb *scrap* from the longest sentence on the table and describes the
  move instead — deliberate, and it outranks the spec.
- Between the hands → *"Fresh cards. Second hand."*
- Over-limit → *"That would put your Scraps at 8. Pick 1 to discard
  first."* (the "Dimmed cards" suffix kept)
- Opponent counters → *"They had an Ace too. Both gone. Turn over."* — and
  its two siblings moved with it, or the voice would have split mid-exchange.

**A third live string said BURN already, and the spec never mentioned
it.** The "You've drawn an Ace!" explainer in `overlays.jsx` read *"or
burn it to **attack** your opponent"* — pre-existing, not introduced
here, and the single place in the shipped game that already used the
word Stan rejected. It survived the first sweep because that sweep
looked for the terms in the spec's own table and "burn" was not one of
them; it was caught only by adding `\bburn\b` to the final check. It now
reads *"or use it to **attack** your opponent"*. **The lesson is that a
rename pass has to sweep for the words it is introducing as well as the
ones it is retiring** — an override like this one turns the new word
into a banned word, and nothing in the spec knows that.

**Two more live strings the spec missed**, found by sweeping rather than by
following the line numbers: the difficulty picker's HARD description
("sacrifice small hands to win Scraps") and the Ace counter modal's
explanatory paragraph, which said "nothing is removed" and "a strike of
your own". Both are player-facing and both are fixed. **The spec's line
numbers were stale throughout** — its `GameScreen.jsx:976` is the real
file's 1206 — so content search beat line lookup every time.

**One string was NOT a literal swap.** "Your turn. Transfer cards to your
Scraps" becomes "Your turn. Scrap cards." — the direct substitution
("Scrap cards to your Scraps") collides the verb with the pile name. Its
sibling already reads "Your turn. Scrap cards, or attack with your Ace."

**Identifiers renamed:** `tradeInValue`→`scrapValue`, `TradeInBtn`→`ScrapBtn`,
`doTradeIn`→`doScrap`, `playTransfer`→`playScrap`, cue `transfer`→`scrap`,
`PLAYER_TRADE_WITH_DISCARD`→`PLAYER_SCRAP_WITH_DISCARD`,
`fullScrap`→`cleanSweep`, `FullScrapLightbox`→`CleanSweepLightbox`,
`fullScrapPop`→`cleanSweepPop`.

**Identifiers deliberately NOT renamed, and this is a known state rather
than an oversight.** `hasLegalTrade`, `legalTradeFallback`, `pendingTrade`,
`nextPhaseAfterTrade`, `PLAYER_TRADE_TAKE`, `PLAYER_TRADE_OVERFLOW_START`
and `SMALL_HAND_SCORED` still carry the old words. The spec gave an
explicit rename list and these were not on it; extending it reaches into
the engine's AI scoring and the phase machinery for no user-visible gain.
Note this leaves `PLAYER_SCRAP_WITH_DISCARD` sitting next to
`PLAYER_TRADE_OVERFLOW_START` — two halves of one flow in two
vocabularies. That was the spec's line, not a judgment made here, and it is
the obvious thing for a later pass to finish. **Nothing player-facing uses
those words.**

**Renaming a cue does not invalidate its trim, and nothing was re-measured.**
`transfer`→`scrap` and `fullScrap`→`cleanSweep` changed keys in the cue
map, `TRIM` and `CUE_DUR` in parallel — the synthesis parameters are
untouched, so the measured numbers stay exact. CLAUDE.md's warning is about
*retuning* a cue, not renaming one.

**What was verified, and how.** `npm test` 53 pass (the spec said 55 and was
stale — CLAUDE.md already records the card redesign taking it 56→53),
`npm run build` clean, `npm run share:check` green after `npm run share`
regenerated `llms.txt` and the manifest. **The PNGs came back
byte-identical**, exactly as the spec predicted, because `index.html`'s
title and meta carry none of this vocabulary.

The app was then **walked in a real browser** (Playwright's own Node API
against the dev server on 5193, which another session already had up) at
375px: splash → all four storyboard beats → difficulty picker → table,
reading `innerText` at each step. Every screen confirmed by its rendered
text, not by reading the source. The Scrap button was driven through both
states — `SELECT CARDS` and `SCRAP 1 → DRAW 2`.

**The one risk the spec flagged was measured, not eyeballed.** CLEAN SWEEP
is 12 characters against FULL SCRAP's 11, inside a `nowrap` headline at
`clamp(40px,12vw,112px)` in a FitBox. Measured in Fjalla One at four
viewports: **at 375px it inks 255.7px against 343px available** — 87px of
headroom, no FitBox downscale. (FULL SCRAP was 224.5px.) It fits at 390,
768 and 1440 too. The lightbox itself was captured by flipping
`showCleanSweep`'s initial state true, screenshotting, and reverting in the
same step.

**PUBLISHED and verified live, three ways rather than one.** The bundle
hash `index-BZHg5qIX.js` served by `scraps.games` is byte-identical to
the tested local build; `main`'s tree hash equals `dev`'s exactly
(`166194f9`), so production built precisely what was previewed; and the
new copy was read back off the served HTML — CLEAN SWEEP, `cleanSweepPop`,
"Scrap cards from your hand", "attack with one to discard", and **zero**
occurrences of "Flushes are never valid". The live site was then walked
in a real browser to the table: Stan's narrator line renders and there
are no JS errors.

**Publish-time checks, and what each actually proved.** The personal-data
grep over `dist/` found the origin story shipping correctly as "its
creator and his wife" with no name — but also found **three "Stan"
mentions in CSS comments inside `index.html`'s `<style>` block**, which
ship verbatim because only JS comments are minified away. They are
pre-existing, already live before this push, and this push adds none;
first name only, attached to design-decision commentary, no surname or
contact details. Flagged to Stan rather than removed unilaterally. The
impeccable detector returned **7 findings, all `bounce-easing`**, all
pre-existing and in the category Session 5 triaged as the committed
identity — the single bounce line this push touched is the CLEAN SWEEP
headline, whose easing is byte-identical to the one it replaced, so the
push is net zero. The detector was **confirmed live against a planted
control** (`font-family: Inter` in a scratch file, named back as
`overused-font`), showed no DEGRADED banner, and wrote nothing to stderr
— all three claims, not just the zero.

**One detector run was void and thrown away, which is worth recording
because its output looked perfectly normal.** The first invocation built
its file list with `mapfile`, which does not exist in zsh, so the array
was empty and the detector ran with no path arguments — and still
returned a confident "13 findings" by scanning something other than what
was asked for. Empty stderr, no banner, plausible number. This is exactly
the third blind spot `/publish` warns about, arrived at by a different
route than the one it describes: not an unresolvable path, but a shell
builtin that silently produced nothing. **Print the file list before
trusting any scan of it.**

**`share:check` was broken on purpose twice, in two different classes, and
failed by name both times.** Changing the `<title>` produced `✗ index.html
og:title` quoting both the baked-in and live strings; changing the
`voltage` palette token produced `✗ palette.voltage` with both hex values
AND caught the downstream `favicon.svg` mismatch, exiting 1. Restored, the
control run exits 0. `fonts:check` is green at 18 faces over 12 files, 0
changed, 0 stale. The monthly CI job was read rather than assumed: it
asserts only on HTTP codes, `og:image` presence and its host, and the old
domain's redirect — none of which this push touches — and it already uses
the fetch-to-a-file pattern rather than the `curl | grep -q` race fixed
last session.

**One instrument note worth keeping.** `~/Downloads` is blocked to this
process by macOS TCC — `ls` on the specific file works (stat is permitted)
while `cat` returns `Operation not permitted`, and the in-app browser
cannot read a local file either. A handoff doc parked there has to be
copied into the project before it can be read. That cost the first four
tool calls of this session.


### Unplanned session — The Signpost: the interstitial bench ✅ Bench published, picks PENDING (2026-09-14)

Requested by Stan in his Notion notes, verbatim: "The interstitials are
off-brand and look like cliche vibecoding: BEGIN ROUND 1, BEGIN ROUND 2,
FULL SCRAP, and the win reveals, etc. Help the colors and vibe seem more in
keeping with the woody aesthetic and autumnal energy." His own idea came
with it: the table stays visible, the cards discard away, the copy appears
on the table with each headline letter an individual scrapped-up card,
skippable with any tap, and the letter cards discard before the next deal.
Rye for headlines; consult the lookbook. Same shape as the Woodshed: a bench
first, **no game code until he picks.** Nothing in `src/` changed.

**The bench: The Signpost**, published as an artifact —
https://claude.ai/code/artifact/c7e88024-66e3-4594-9cf8-7eeb817d54af

Seven treatments plus the shipping overlays reproduced as option 0, each
runnable at five moments (round start, hand result, Clean Sweep, match
won, match lost), on a mock of the real table: `TableSurface`, `PlayingCard`,
`scrapLook` and the audio kit are **ported line for line** — same seeded
exciters, same bars, same TRIM values — so he is judging against the real
timber and the real sounds. A separate celebration axis offers **leaf shower**
and **scrap confetti** beside the shipping fireworks, which answers his second
note ("Recommend alternatives to fireworks as the success visual, this can be
a bench") in the same place. Controls: CAPS/mixed case, Quick/Normal/Slow
pace, desktop/phone stage, who deals, sound, and a **simulated
reduced-motion** switch, because his devices never match the query. Every
option carries notes: where the idea came from, what it costs to build, the
still fallback, the sound, and the Avoid-list flags. A picks box at the
bottom.

**The seven.** 1 **Scrap letters** — his idea; each letter a torn card on
the game's stock with seeded wear and lean, dealt in from the dealer's edge,
tossed off the right like any discard; two settings, land in a row or land
as a fan and square up (which gives `playSquareUp` the home the Woodshed
entry said it was waiting for), and pale or mixed pale-and-kraft stock.
2 **Wordmark type** — Rye straight on the wood with the splash's own
letterAppear and one riffle pass; the restraint baseline the others must
beat. 3 **Branded** — burned into the boards letter by letter, ember cooling
to char with a lit lip, smoke lifting off. 4 **Carved** — routed and painted,
the trailhead-sign move, revealed under a left-to-right wipe with sawdust.
5 **Rubber stamp** — slammed on at −4°, cream ink with real skips from a
thresholded-noise SVG filter, the subline a second stamp. 6 **Ticket stub** —
a kraft county-fair ticket drops with a thud, WON/LOST stamped across it,
flicked off the edge. 7 **Torn banner** — a strip of pale stock across the
whole table, torn in two to leave.

**Lookbook, consumed and named.** The Avoid section was read first and the
scanner run on the bench. Categories read: TEXT, LOADER/PRELOADER,
MODAL/DIALOG, CARD/HOVER, VIBE/ATMOSPHERE, LAYOUT TRANSITION, and the
Aesthetics drawer (Mystical western is the filed direction that renders in
Rye, which confirms the face rather than suggests it). **Nothing filed is an
interstitial**, so no entry was installed. Two rebuild recipes were used: the
Horizontal text reveal wipe (Skiper, gated; the recipe is free) drives
Carved's router pass and the banner's unroll. Each option's notes name its
nearest filed entry (Card stack with GSAP rotate, Highlighter, Confetti) and
where it is original. The registries were not searched and the Drive idea
pack was not opened: every option here is a physical object that belongs on
this particular table, and a registry component would have to be rebuilt
into that anyway. Said plainly rather than skipped silently.

**Scanner: three bans fired, all accounted for, none shipped as a tell.**
"Multi-stop gradients" matched the ported `scrapLook` crease and the table's
lamp gradient — the game's own monochrome browns. "Large coloured glows
behind hero content" matched the smoke and sawdust puffs, transient and
physical. "Fade-in-up on every element" matched the sign entrances
themselves and the Shipping reproduction; the small subline slides it also
caught were **removed** in response, so sublines now fade in place. Flags:
mono on the measured durations and the option index (fixed advance doing
work), one small radius scale on the chrome.

**The copy is part of the pitch, and it is his to accept.** BEGIN ROUND 2
becomes **ROUND 2** with the dealer under it ("She dealt. You go first.").
Results say **YOU WIN / SHE WINS / TIE** with the hand that decided it
("Pair beats King high"); points are set in Fjalla One, never mono.
OPPONENT WINS is fourteen letters and is not shown — **SHE in a headline is a
call for Stan**, since the table still says OPPONENT. All caps is a choice
here (ranks are capitals, so letter cards are capitals) and the type options
carry a Mixed toggle so the two can be compared.

**One number worth knowing before he picks.** The full round handoff with
Scrap letters at Normal pace **measured 6.6s** in the bench (toss 1.3 · in
1.2 · hold 1.4 · out 0.8 · deal 2.0) against the shipping 2.0s sign plus
~1.7s deal. That is the cost of his idea done in full. Quick pace (0.9s hold,
faster flights) and tap-to-skip exist for exactly this; in the real build the
toss and the letter deal can overlap and claw back most of a second.

**Verified in a real browser, not the pane.** The in-app pane cannot see
inside an artifact's cross-origin frame and screenshots it part-painted, so
the page was wrapped the way the host wraps it and driven through Playwright's
own Node API in Chrome: 14 frames at 1280×800, at Stan's 1024×662, and at 390
wide, no console errors. Three things were caught and fixed before he saw it:
the stamp's ink-skip filter was too coarse and ate half of a phone-sized
headline (a finer second filter now serves the small stamps); the Shipping
hand-result reproduction overflowed the stage because the real one scales
itself with FitBox (a one-line fitShip does the same); and the ticket's WON
stamp finished at opacity 0 — **a Web Animations keyframe list whose LAST
frame omits a property ends at the element's underlying value**, so an
element that starts at `opacity:0` and animates in then vanishes. Saved as a
memory. Not eyeballed, though run without error in the same engine: the
fan-then-square landing, mixed stock, scrap confetti, and the simulated
reduced-motion pass.

**Also in his notes block, read and NOT actioned here — real bugs he has
reported:** (1) "ACE COUNTER: if I counter Opponent's first Ace and she plays
a second, I am asked whether I'd like to counter again BUT I only had the one
Ace" — a wrong prompt, worth a reducer test. (2) "sometimes, when I hit
DISCARD to attack my opponent's two cards, the screen goes black and I have
to reload" — a crash, top of the defects list. (3) "ANIMATE: when cards enter
Scraps they need to shrink to the pile size en route, and stay small
animating offscreen later." (4) "add a subtitle to splash" — reverses the
2026-09-13 removal. All four are carried into the next-session block.

---

### Unplanned session — The QA gate was measuring an animation ✅ Done + **PUBLISHED** (2026-09-14)

**No game code changed.** One stale comment corrected in two files, the
responsive harness fixed, and a new bench added. Nothing player-facing moved.

**The report.** `tools/responsive-qa.mjs` was failing intermittently with
`FAIL <viewport> 4-table: small targets [{"label":"Okay","size":[72,27]}]` —
the OKAY button in the "You've drawn an Ace!" lightbox, 27px against a 44px
floor, on a different viewport each run. It reproduced on `main`, so it was
not a card-redesign regression, and it only appeared when a random deal put
an Ace in the opening hand. The suggested fix was to make `MODAL_BTN_MIN`
account for the scale `Shell` applies, or to have `Shell` floor its scale.

**That premise was wrong, and the numbers say so outright.** `popIn` — the
entrance on every lightbox in `overlays.jsx` — is
`from{transform:scale(.5)} to{scale(1)}`. The button's real height is 54.
**54 x 0.5 = 27**, and **54 x 0.698 = 38**, which is the other number the gate
reported. Both failing readings are `popIn` frames, not sizes.

Measured directly in a real Chrome, driving the app until the Ace lightbox
came up and then waiting for `document.getAnimations()` to drain:

| viewport | mid-popIn | transform chain | AT REST | chain at rest |
|---|---|---|---|---|
| iphone-se | 111x42 | `scale(0.778)` | **143x54** | **empty** |
| iphone-14 | 100x38 | `scale(0.698)` | **143x54** | **empty** |
| ipad | 100x38 | `scale(0.698)` | **143x54** | **empty** |
| desktop-hd | 100x38 | `scale(0.698)` | **143x54** | **empty** |

The chain being EMPTY at rest is the finding under the finding: **`Shell`
applies no scale to this modal at any of these viewports.** So flooring
`Shell`'s scale would have fixed nothing, and raising `MODAL_BTN_MIN` to
clear a 27px reading would have meant declaring 88px — a modal button twice
the height it needs, to satisfy a number that was never a height.

**What was actually wrong, and where.** The harness had a flat
`waitForTimeout(450)` before probing, with a comment showing someone had
already been bitten by exactly this class of bug ("a 57px button 'failing' the
44px touch floor at 1920x1080"). 450ms covers `popIn`'s own 0.35s. It does not
cover an overlay that **mounts late** — and the Ace explainer is precisely
that: its effect waits for `animating` to clear, so on a deal that runs long
it appears *after* the wait has elapsed and pops in underneath the probe.
That is the whole explanation for "intermittent, different viewport each
time": the deal has to be long AND the opening hand has to hold an Ace.

**The fix, in `tools/responsive-qa.mjs`:**

- `shot()` now settles on `document.getAnimations()` instead of a timer —
  wait for every finite animation to end, 250ms grace for anything that
  mounts on the back of what just finished, then wait again. Infinite
  animations are excluded or `cardWiggle` would hang it forever.
- `dismiss()` settles first too. Without that it fires on a timer and can
  run *before* the overlay it exists to clear has mounted, leaving it up
  over the table and blocking the trade the walk takes next.
- Each result records `quiet` — whether the page was actually still when
  measured — and any failure taken while it was not now prints
  `(MEASURED WHILE ANIMATING — suspect)`. A check that fails for a reason
  unrelated to the thing it watches is worse than no check.
- Each result records `dialogs`, the aria-labels of whatever was on top. A
  screen labelled `4-table` is sometimes the table and sometimes the table
  under the Ace explainer, and nothing in the output used to say which.
- The run prints the viewport it is starting. A six-viewport run that threw
  part way used to report a bare Playwright timeout with no way to tell where.

**Verified by running the gate, not by reading it.** **Seven** runs came back
**ALL CLEAR**; in the five where the recorded dialogs were checked,
`results.json` confirms the Ace lightbox (`dialogs: ["You drew an Ace"]`) was
genuinely up and measured on a passing run — the exact state that used to
fail. `quiet` was `true` at every probe but one, and that one produced no
failure. 53 tests, `npm run build` and `share:check` clean.

**PUBLISHED 2026-09-14 at `6bd985b`, and the publish proves its own
harmlessness.** Every change under `src/` is a comment, and the minifier
strips JS comments, so the production bundle is **byte-identical** to what
was already live: the served filename was `index-BZHg5qIX.js` before the
push and the local build produced `index-BZHg5qIX.js`. A content-hashed
bundler names a file after its own bytes, so matching names are the same
bytes. That is the strongest available form of "there was nothing to
preview", and it is worth reaching for on any tooling- or comment-only
push. All three routes checked: asset hash identical, `main`'s tree equal to
`dev`'s (`2ad931b`), and `og:image` read back off the served HTML.

**Publish-time checks, and what they turned up.** The impeccable detector was
confirmed live against a planted control (`font-family: Inter` → named
`overused-font`), showed no DEGRADED banner and clean stderr, then reported
**six `bounce-easing` warnings in `overlays.jsx`** — all six **identical on
`main`**, same lines and snippets, so pre-existing and untouched by this
push. They are the documented deliberate split the `SETTLE` constant records:
overshoot for a win, ease-out-quint for a loss. The personal-data-OUT grep
over `dist/` was clean.

**One small finding about the share generator, worth knowing before trusting
step 5b of `/publish`.** That step uses "regenerate the asset and check
`git status`" as a drift detector. Here it cannot work: `npm run share`
stamps a fresh `generated` timestamp into `public/share-manifest.json` on
every run, so the file **always** shows as modified and real drift looks
exactly like no drift. Every other value was identical, so the timestamp was
reverted rather than committed. `npm run share:check` is the trustworthy
signal, because it compares sources and ignores the stamp.

**New: `tools/overlay-targets.mjs` + `tools/bench/overlay-targets.html`.**
The gate walks a real game, so it only reaches a modal the random deal happens
to open — which is why the Ace explainer had never been measured deliberately
and the reveal, Clean Sweep, win and lose screens never at all. The bench
mounts each overlay in the real `Shell` and measures every button at rest at
all six viewports on demand. Dev-server only; Vite's single entry is
`index.html`, so nothing under `tools/` can reach production.

**All 42 button/viewport pairs, measured: no modal button renders under 44px
on any portrait or desktop viewport.** Two do, both landscape phone, both
inside the accepted landscape trade this brief already records:
`RevealOverlay`'s Continue at **32px** (natural 46 x scale 0.69) and
`WinScreen`'s NEW GAME at **36px** (natural 53 x scale 0.673). Neither had
ever been measured before, because the gate never reaches either screen.

**One inconsistency found and deliberately NOT fixed — Stan's call.**
`RevealOverlay`, `CleanSweepLightbox`, `WinScreen` and `LoseScreen` declare a
bare `minHeight:44` rather than `MODAL_BTN_MIN`, so they carry less margin
than the constant that exists for this job intends. Raising them was measured
rather than assumed and it changes nothing: 54 x 0.69 is still 37, so the two
landscape shortfalls survive it, and at every other viewport the scale is 1
and all four already clear the floor. It would be 8px of added height on two
shipped screens for no measured gain, which is a visual change and therefore
his.

**The comment that caused the wrong diagnosis is corrected.**
`MODAL_BTN_MIN`'s note recorded "the Ace explainer at 375x667 scaled to ~0.93
and its 44px button rendered 41". That has not been true since the card
redesign — it is scale 1 there now — and it is the sentence that makes the
27px reading look like a layout defect instead of an instrument artifact.
Both it and the matching comment on the button in `overlays.jsx` now carry
the 2026-09-14 measurement and point at the bench.

**Two harness flakes seen and traced, neither a defect.** A SKIP click and an
EASY click each timed out once, both while a second Chrome-driving script was
running concurrently — CPU contention starving the picker's 720ms `ARM_MS`
timer and Playwright's actionability waits. Walking the splash → storyboard →
picker transition at all six viewports with nothing else running was clean
six for six, and so were all three sequential gate runs afterwards. **Do not
run two browser harnesses at once against this project**; the walk is paced by
real timers and it will lie to you.


## Session tracker

| # | Session | Status |
|---|---|---|
| 1 | Fix what's actually broken (clipping, color tokens) | Done |
| — | *Unplanned:* Forest/national-park brand reskin | Done |
| 2 | Game balance discussion | Done |
| 3 | Mobile and responsive QA | Done |
| 4 | Sound identity | Done |
| 5 | Design and UX audit | Done (2026-08-27) — accessibility, motion, contrast and six of seven visual findings. The seventh, the right-heavy layout, closed 2026-08-28 in the unplanned centre-axis session |
| 6 | Security, privacy, and rights | Done + published (2026-08-28) — fonts self-hosted, remote needed no change (the prompt was backwards), privacy notice signed off. Landed via PR #1; **`dev` is behind `main` and needs a fast-forward** |
| 7 | Findability and launch | **Part one done + PUBLISHED (2026-08-28)** — metadata, generated share card + self-checking generator, monthly GitHub Actions check, two of Stan's four pre-launch notes fixed, launch copy reconciled to `WIN_SCORE` 10. Live and verified byte-identical. Part two: the cellular smoke test (Stan's phone only), and the posts |
| — | *Unplanned:* Onboarding rebuild and rules clarity | Done |
| 8 | Animation and interaction precision | Done |
| — | *Unplanned:* Splash identity (subtitle, animated wordmark) | Done |
| — | *Unplanned:* Ghost launch frame + Foley Bench sound lab | Done |
| — | *Unplanned:* Table centre axis + Ace tag touch target | Done + **PUBLISHED** (2026-08-28) — closes Session 5's last open visual finding. Live bundle verified byte-identical to the tested build |
| — | *Unplanned:* Whole-experience audit (`/audit`) | Done (2026-08-30) — **read-only, nothing fixed.** Found the Ace counter has never worked and is live in production, plus three more P1s. Answered Stan's four creative questions. Critique 28/40 |
| — | *Unplanned:* Audit fixes (Ace, wheel, empty Scraps, wood table) | Done (2026-08-30) — all four P1s fixed with tests 37→53, the table rebuilt as a picnic-table surface, rules modal retired, quit/mute added |
| — | *Unplanned:* Ace flow, card colour, narrator | Done (2026-08-30) — counter/re-counter both directions, ATTACK rename, Scraps ink by owner, opaque cards, narrator only when it has copy |
| — | *Unplanned:* Polish rounds on the audit fixes | Done + **PUBLISHED** (2026-08-30) — seven review rounds; the ruffle's transform-override bug was the big one. Live bundle verified by hash |
| — | *Unplanned:* Splash directions + origin story recorded | Done (2026-08-30) — **read-only, no source changed.** Origin story written into Section 1 (not public). Four splash directions on a live bench; `SwirlBg` trips two lookbook bans. Open: Stan's pick, and STRIKE vs ATTACK |
| — | *Unplanned:* The splash rebuild — `RidgeBackdrop` (night) | **Superseded 2026-08-31.** Faceted night range; `SwirlBg` deleted from all four screens, true suit colour + riffle kept |
| — | *Unplanned:* Splash pass 2 — sunset foothills | **Superseded 2026-09-01.** Daytime sunset, generated cosine ridgelines, foreground roll, tree breeze. Found the `objectBoundingBox` gradient bug. Deleted when the product went to two backgrounds; recoverable at `ef34063` |
| — | *Unplanned:* Stan's scene + cut to two backgrounds | Done + **PUBLISHED** (2026-09-01) — his illustration on title and storyboard, table on picker/game/lose, `RidgeBackdrop` retired. Fixed a missing `viewBox` and 40% of the file size. Caught a real AA failure on the lose screen |
| — | *Unplanned:* The real domain — scraps.games | Done + **PUBLISHED** (2026-09-12) — registered 2026-09-08, all 11 hardcoded URLs repointed, www and the old vercel.app both 308 to the apex. Four instrument traps recorded: `whois` returns the TLD record, Vercel's project API omits custom domains, macOS negative-caches DNS, TLS lags DNS |
| — | *Unplanned:* Card + Scraps pile direction | **Decided, and now BUILT** (2026-09-13) — read-only. Ten decisions in `CARD-REDESIGN-SPEC.md`: Rye, no box, no suits, big left-anchored rank, heap with seeded wear. Three benches published. Verified suits are decorative (`.suit` read once, in `createDeck`) and that weathered stock cannot carry red pips |
| — | *Unplanned:* The Woodshed — sound kit retuned | Done + **PUBLISHED** (2026-09-13) — 74-option bench, all 14 cues repicked. Wood for physical events, tuned bars for score outcomes; **no brass taken**. Breaks the old "no oscillator plays a note" rule on purpose. Trims re-measured and **verified on target within 0.04%**. PLAY button now sounds. Found: peak targets under-state a ringing bar by ~2x. Live bundle verified byte-identical to the tested build |
| — | *Unplanned:* The big pass — rules, opponent, wordmark, table | Done + **PUBLISHED** (2026-09-14) — win-by-2 dropped (proved deadlock-free, tests 55→56), opponent female everywhere, Rye wordmark with the tap gesture removed, storyboard reordered and rewritten with a BACK from the picker, deck/discard piles off the table with off-viewport dealing and a spin-off discard, SELECT HAND naming the hand, SHOW 'EM, results screens chained. Three bugs fixed: the opponent moving behind the Ace lightbox, ATTACK overflowing its tag on a phone (**measured 46px slot vs 64.22px needed — not his display settings**), and FitBox measuring the padded box and clipping what it scaled |
| — | *Unplanned:* Six notes off the preview | Done + **PUBLISHED** (2026-09-14) — select cue down a fifth to A5 and target .16→.12 with the trim **re-measured** (the retune alone would have made it 14% louder), the opening deal now deals all 14 cards including the starting Scraps, discard moved to the right edge, SHOW 'EM skipped when she signals first, and the post-move "Opponent is thinking..." flash removed. Verified by sampling the narrator from INSIDE the page at 60ms: 12 AI turns, zero late "thinking" lines |
| — | *Unplanned:* The card redesign | Done + **PUBLISHED** (2026-09-13) — suits removed from the DATA (the no-flush house rule became a thing that cannot arise), one big left-anchored Rye numeral per face, Baloo 2 deleted (5 families → 4), the Scraps box replaced by torn stock on two papers with seeded per-card wear, `GlowPulse` reworked from a ring to a silhouette-tracing filter, and the table moved to Redwood at **constant relative luminance** so no contrast pairing shifted. Tests 56→53. Two spec premises failed on measurement: Rye's Q **overhangs its own advance by 0.055em** (so sizes are derived from inked extents, not advance widths), and a left-anchored numeral is NOT readable from its left third — a 7-card pile read "2 5 7 1 J Q K", fixed by dropping the pile a size. Five guards broken on purpose and each failed by name |
| — | *Unplanned:* Terminology and tone pass | Done + **PUBLISHED** (2026-09-13) — small hand→**hand**, transfer/Trade In→**scrap**, strip→**discard**, FULL SCRAP→**CLEAN SWEEP**. Stan overrode the spec's BURN: the Ace tag stays **ATTACK** and "burn" is used nowhere. "strike" retired as a third word for the same move. Four tone rewrites plus two live strings the spec missed. Every surviving "no flushes" claim deleted (storyboard, JSON-LD, dead RulesModal) — the rule died with the suits. CLEAN SWEEP **measured** at 255.7px against 343px available at 375px. 53 tests, build, share:check all green; PNGs byte-identical. Live bundle verified byte-identical to the tested build, and `main`'s tree hash equal to `dev`'s. Found one live "burn" the spec never mentioned, in the Ace explainer, and a void detector run that reported 13 findings on an empty file list |
| — | *Unplanned:* The Signpost — interstitial bench | **Bench published, picks pending** (2026-09-14) — seven treatments plus the shipping reference, five moments, leaf-shower and scrap-confetti alternatives to the fireworks, on a ported mock of the real table and sound kit. No game code changed. Scrap-letters handoff measured 6.6s vs 3.7s shipping. Verified in real Chrome at three viewports. Four bugs from Stan's notes block surfaced, not fixed |
| — | *Unplanned:* The QA gate was measuring an animation | Done + **PUBLISHED** (2026-09-14) at `6bd985b`, bundle byte-identical to what was already live — **no game code changed.** The intermittent `small targets [{"Okay",[72,27]}]` failure was `popIn` caught mid-flight, not a small button: 54 x scale(.5) = 27 and 54 x 0.698 = 38 are the two numbers it reported. Measured at rest the button is 143x54 at every viewport and `Shell` applies **no scale to that modal at all**, so both suggested fixes would have changed nothing. `responsive-qa.mjs` now settles on `document.getAnimations()` rather than a 450ms timer, records whether the page was still and what was moving, names the dialog on top, and prints the viewport it is walking. Five clean runs with the Ace lightbox confirmed up and measured. New `tools/overlay-targets.mjs` measures all six modals at rest on demand: **42 pairs, nothing under 44px outside landscape phone**, where reveal's Continue is 32 and win's NEW GAME is 36 — both newly measured, both inside the accepted trade |


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


---

## Where the next session should start

*Rewritten at the end of every pass. Priority order, defects above
preferences. Anything closed is deleted from here rather than left
sitting at the top with the work already done.*

**The interstitial bench is published and waiting on Stan's picks
(2026-09-14).** The Signpost —
https://claude.ai/code/artifact/c7e88024-66e3-4594-9cf8-7eeb817d54af —
holds seven treatments and two fireworks alternatives; the entry above the
tracker has the detail. **Do not build any interstitial until he has picked**
a treatment, a celebration, a case and a pace, and answered the SHE-vs-OPPONENT
headline question. When he does, the build is one new component per pick in
`overlays.jsx`, the round scrim and the reveal Shell go, and `playSquareUp`
either gets its caller or is deleted with its count.

**Four bugs from his own notes block outrank any of that**, and none has a
test yet: the black screen on a DISCARD attack (a crash, reproduce first),
the Ace-counter prompt offered without an Ace in hand, cards not shrinking to
pile size on their way into Scraps, and the splash subtitle he has asked to
have back.

**Nothing is in flight, and `dev` and `main` are level.** Both are at
`6bd985b` with identical trees, production is serving exactly that, and
the card redesign, the terminology pass and the 2026-09-14 QA-gate pass
are all LIVE. The QA-gate publish shipped a **byte-identical bundle**, so
the last player-visible change to the game is still the terminology pass
of 2026-09-13. Nothing is waiting on a preview and nothing is waiting to
be merged. The one thing genuinely in
flight is the bench itself, and it is waiting on Stan rather than on code.

**The responsive gate is trustworthy again, and it was not before
(2026-09-14).** It had been failing intermittently on a 54px button it was
measuring at `scale(.5)` mid-`popIn`, which is the failure mode that
teaches you to ignore the alert. It now settles on
`document.getAnimations()`, says whether the page was actually still, and
names what was moving if it was not. **Before trusting any touch-target
number from it, check the `quiet` field.** The companion
`tools/overlay-targets.mjs` measures all six modals at rest without
needing the deal to produce them; run it whenever a modal's layout is
touched, because the gate reaches a modal only by luck. And **do not run
two browser harnesses against this project at once** — the walk is paced
by real timers and CPU contention makes clicks time out in ways that look
like defects.

**The vocabulary is now settled and it binds.** The game says hand, scrap,
attack, discard and CLEAN SWEEP. Nothing player-facing says small hand,
transfer, trade in, strip, strike, FULL SCRAP — or **burn**, which Stan
rejected outright when the spec proposed it as the Ace verb and as the tag
over the card. The tag is **ATTACK**. The spec file that proposed BURN is
deleted from the repo and from `~/Downloads` it came from; if a copy ever
resurfaces it is wrong in four places and CLAUDE.md's vocabulary block
outranks it.

**Two things nobody has actually watched land, both copy, neither a
defect.** The **CLEAN SWEEP lightbox** is measured to fit at 375px
(255.7px of ink against 343px available) and was screenshotted by forcing
its state, but nobody has seen it arrive at the end of a real round. And
the **Ace exchange lines** ("They had an Ace too. Both gone. Turn over.")
only fire on a counter, so they need provoking rather than waiting for.

**The finishing job the terminology pass left, and it earns its own
slot.** `PLAYER_SCRAP_WITH_DISCARD` now sits beside
`PLAYER_TRADE_OVERFLOW_START`; `SMALL_HAND_SCORED`, `hasLegalTrade`,
`legalTradeFallback`, `nextPhaseAfterTrade` and `pendingTrade` still carry
the retired words. That was the spec's explicit line and following it was
deliberate. Finishing it is a contained internal rename reaching into the
engine's AI scoring and the phase machinery, with **no user-visible
payoff**, so it should not ride along on a visual or copy pass.

**Open from the card redesign, and these are taste calls only Stan can
make.** The **vertical composition of a card**: the numeral is anchored to
the top and the bottom third is deliberately empty, and whether it wants
to sit lower has never been decided. And whether the **Scraps piles now
read as too small**: they dropped a whole size to fix a real legibility
failure at seven cards, which also answers his "too much shit onscreen"
note, but it moved the table's balance more than the spec anticipated.

**Three "Stan" mentions ship in `index.html` and he has not decided about
them.** They are CSS comments inside the `<style>` block — design
commentary, first name only, no surname or contact details — and they ship
verbatim because only JS comments get minified away. Pre-existing and live
for weeks; surfaced at the 2026-09-13 publish. **Do not remove them
unilaterally**, and do not re-flag them as a new finding: they are his
call and he has been told.

**One thing to watch on the new kit, and it is the only open question from
that pass.** `handWon` fires twice a round, more than any other outcome
cue, and it is now a ringing bar rather than a knock. The declared targets
are PEAK, which under-states a bar by about 2x in RMS, so it may sit hotter
in play than its .34 suggests. If Stan raises it, lower the TARGET in
`audio.js` and RE-MEASURE — never scale the trim. Same for `revealBuild`
in the other direction: it plays at .297, which is what it always shipped
at, but the Woodshed bench played it at .42, so he heard it louder there
than the game plays it. He was told and did not ask for it changed.

**Before anything else, read the notes block on the Notion page.** The wrap
on 2026-09-13 found a long, largely unactioned set of Stan's own notes
there under a heading reading *"BIG PICTURE: SOLVE THESE FIRST BEFORE
FINE-TUNING EVERYTHING ELSE"*, and none of it is mirrored here by design.
**Three of its items are now closed:** the card redesign (**built**
2026-09-13, on `dev`), **FIX SOUND EFFECTS** (built 2026-09-13, awaiting
his listen), and the **`▸` on the best-hand badge** (removed 2026-09-13).
A fourth, *"maybe the scraps are smaller"*, is answered as a side effect of
the redesign's legibility fix rather than deliberately — worth confirming
with him that it went far enough. The rest
of the list still stands.
It contains the original complaint this redesign answers, in his words
("STYLE OF SCRAPS CARDS UNDERCUTS CONCEPT OF THEM BEING THE MESSY
DISCARD"), and it is the real backlog: off-brand interstitials, the
opponent becoming female throughout, ~~"small hand" becoming "hand"~~
(**done** 2026-09-13, with the rest of the vocabulary), dropping the
win-by-2 rule, removing the deck and discard piles in favour of cards
dealing in from off-viewport, and ~~a set of Ace copy changes~~ (**done**
2026-09-13 — the Ace is now attacked WITH and its victims are discarded).
**One item in it blocks part of the redesign:** he asks whether Rye should
replace Bungee Shade *everywhere*, not just Baloo 2 on the cards, which
would change the wordmark and the family count. Spec section 6b has the
detail.

**~~Then: build the card and Scraps redesign from
`CARD-REDESIGN-SPEC.md`.~~ SHIPPED 2026-09-13** — the paragraph below is
kept for the reasoning it records, not as an instruction. The spec file is
deleted.

**Then: build the card and Scraps redesign from
`CARD-REDESIGN-SPEC.md`.** Ten decisions, all Stan's, all confirmed, with
a file-by-file change list carrying verified line numbers and twelve
acceptance criteria. Nothing in it is open and nothing needs asking. Read
section 4.1 before touching `FannedHand`: the fan's `MIN_EXPOSED.up` of
0.34 makes a centred numeral geometrically impossible, and that is the
part most likely to eat a session. Delete the spec file once the work has
shipped and been logged, so it cannot rot into a second source of truth.

**This outranks the launch, and the ordering matters.** The redesign
changes every card in the game, the walkthrough's sample hands, and the
splash. It also forces `npm run share` to regenerate `og.png`, because
the share card renders a five-card hand with suits in it. So launching
first would advertise a look that is about to change and a share card
that is about to be replaced. **Redesign, then launch.**

**When it ships, `CLAUDE.md` needs four corrections** that this pass
already identified: the test count changes again (six flush tests go, a
deck-shape test replaces them), the font family list loses Baloo 2 and
gains Rye, the Gotchas entry describing the two-red-ink system stops
being true, and the Stack section's claim that suits exist at all needs
revisiting.

**Then: Session 7 part two, the launch itself.** Everything the launch
needs is built, published and verified. What is left is not code: the
**cold smoke test on CELLULAR, which only Stan can run**, on his phone,
off wifi — every walk so far went over a fast connection and proves the
layout and the game, not the load on a slow radio. Then the posts in
Section 8 go out — **pointing at `scraps.games`.** The drafts contain no
URL so there is nothing to correct in them. Do not re-verify the
metadata; `npm run share:check` re-derives it on demand and was
broken-on-purpose twice at the last publish to confirm it still fails by
name.

**Decide analytics before the posts, not after.** The privacy notice Stan
approved describes a site with no analytics, which is true today. Adding
any afterwards makes a shipped legal document wrong on the day it lands,
so this is a decision to make on purpose, including deciding on none.

**The game's address is `https://scraps.games`.** Registered 2026-09-08,
certificate valid, and `scraps3.vercel.app` 308-redirects to it. Every
canonical, Open Graph, sitemap and `llms.txt` reference is generated from
one `SITE` constant in `tools/make-share-assets.mjs` and cross-checked
against `index.html` by `npm run share:check`. Do not hand-edit any of
those; change `SITE` and regenerate.

**The product carries exactly TWO backgrounds, and that is a decision
rather than a state.** Stan's supplied scene holds the title screen and
the rules storyboard; `TableSurface` holds the difficulty pick, the game
and the lose screen. `RidgeBackdrop` was deleted when that rule left
nothing pointing at it — do not reintroduce a third without his say-so.

**Do not hand-place beziers or use `objectBoundingBox` gradients if the
foothills are ever restored** from `ef34063`; the 2026-08-31 entry
records why both cost a pass.

**Post-launch backlog, agreed 2026-08-30:**
- An **About page** carrying the origin story — the weekend in **Sisters,
  Oregon**, written out in full in Section 1 above. A fourth screen
  reached from the splash and the game-over screen, NOT a route (this
  project has no router by deliberate choice).
- **STRIKE vs ATTACK on the Ace button.** Stan's note asked for STRIKE and
  the build shipped ATTACK. One word, one line, needs his call. Worth
  folding into the redesign pass since that flow is being touched anyway.
- **Email capture pointed at Stan's existing Neon email list project**,
  not anything new built here. It conflicts with the signed privacy
  notice and the no-backend rule, so link out rather than collecting.
- The **`GameScreen.jsx` three-way split**, still deliberately deferred.
- Two remaining `minigame` skill lessons: fake-`disabled` buttons as an
  accessibility trap, and computing contrast against the CURRENT palette.

**Open questions nobody has answered:**
- The **second-Ace rule is the player's only** in one direction: the AI
  re-counters when the player counters it, but if the player counters and
  the AI has no Ace, nothing further happens — which is correct. What is
  untested is a long re-counter chain on both sides.
- The **log still reads "Opponent traded 1 card(s) to Scraps"** — the one
  place in the game that punts on pluralisation.
- The AI's replacement draws fly from the deck. If that ever looks busy on
  a big trade, the fix is sequencing, not hiding them.

### Do not do these next, and why

**Do not re-litigate removing `GlowPulse`.** It was specced for removal
on 2026-09-13 on the grounds that the border it ringed was going, then
reinstated the same day once the cost was named: it is the only cue
telling you which pile the Ace strike is acting on. It stays. The real
work is making it stop painting a rectangle — see spec section 1.10,
which has the two options and the reason the reduced-motion substitute
has to change with it.

**Do not re-open the table's composition.** It was examined on
2026-08-28 and deliberately left half-changed: the narrator panel and
both hands share one centre axis, while each side's Scraps still hangs
in the right gutter, so the hand rows sit 139-178px right of centre at
1920. That is the arrangement Session 3 established, Stan has not called
it, and centring the hand-and-Scraps pair as a group would move the
hands off the axis he explicitly said he likes. Three consecutive passes
have now touched this area. Let it settle unless he raises it.

**Do not chase the Ace tag's touch target on a landscape phone.** It
renders 39x37 there against a 44px bar, and it is width-bound, so the
only fixes are a wider-than-one-card tag or bigger cards. The whole
table is already scaled to 0.55 on that screen. This is the same trade
CLAUDE.md's known-issues entry records for every control in landscape,
and portrait is the intended orientation.

**Do not refactor `GameScreen.jsx` as part of something else.** The
2026-08-24 decision still holds — real code-health issue, no
user-visible payoff, real risk. It earns its own session, after launch,
and the Session 3 split into named pieces (`oppHandEl`, `actionEl`,
`playerHandEl`) has already made the lift easier than it was.

### Two things about how to work in this repo

**Measure the browser, do not read the CSS.** Both defects fixed on
2026-08-28 were invisible in the source and obvious in a measurement,
and the second one had its own comment recording the miss ("54 -> 42")
without anyone converting that into a fix.

**When the usual browser routes are dead, there is a third.** The
Playwright MCP server's profile can be locked by another session, and
the in-app pane can report a 0x0 viewport (which silently puts
`layoutMode()` into `stack` and makes every layout number wrong). The
server ships its own `playwright-core` at
`~/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core`; driving it
against `/Applications/Google Chrome.app/...` gives a real, unhidden
browser where timers fire, and `tools/responsive-qa.mjs` runs through
the same shim by rewriting its one `from 'playwright'` import. The
"Playwright is not a dependency" note in this repo is about `npm`, not
about whether a browser can be driven here.
