# SCRAPS

A two-player card game against an AI opponent, played in the browser. Each
round runs two private "small hands" (worth 1 point each) plus one public
"Scraps" hand (worth 2). You move cards from your hidden hand into your
face-up Scraps pile to draw fresh cards, and both piles cap at 7. Aces are a
weapon: discard one to strip two cards from the opponent's Scraps pile, and
they can counter with an Ace of their own. First to 11, win by 2. Winning
both small hands *and* the Scraps hand is a FULL SCRAP, worth 5.

House rule, enforced everywhere in the engine: **flushes are never valid**. A
five-card suited straight scores as a plain straight, never a straight flush.

## Stack

- Vite 5 + React 18. No router — `App.jsx` swaps between three screens with
  a `useState`.
- **Zero runtime dependencies beyond React.** No animation library, no UI kit,
  no state library. Animation is CSS keyframes plus hand-rolled timers.
- Vitest for tests. 37 tests cover the engine and the reducer.
- Fonts come from Google Fonts via a `<link>` in `index.html` (Bebas Neue,
  Righteous, Space Grotesk, Space Mono) — not self-hosted.
- Audio is generated live in `src/audio.js` with the Web Audio API:
  oscillators and synthesized noise buffers. There are no audio files in the
  project and none are needed.
- The repo contains **no asset files at all** — no `public/` directory, no
  images, no SVG files on disk. Every graphic (card backs, icons, the swirl
  backdrop) is SVG written inline in JSX.

## Running locally

```bash
npm install
npm run dev
```

The dev server is pinned to **port 5193** through the shared launch config at
`~/Projects/.claude/launch.json` (entry `scraps3-dev`, using `--strictPort` so
it fails loudly instead of drifting to another port). Running `npm run dev`
by hand without those flags starts on 5173 instead.

```bash
npm test          # vitest, 37 tests, runs in under a second
npm run build     # production bundle into dist/
```

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
- **`src/game/reducer.js`** (565 lines) — the state machine. One pure reducer
  owns all game state: cards, scores, signals, and the phase. Turn order is
  dealer-aware and the dealer alternates each round; the non-dealer acts
  first. This file's header comment explains the phase vocabulary — read it
  before touching turn flow.
- **`src/screens/GameScreen.jsx`** (1,012 lines) — the table. Holds only
  UI-local state (selections, animation flags, overlays), schedules the
  timers that dispatch actions, and renders. See Known Issues.
- **`src/screens/MenuScreens.jsx`** — splash, the six-panel rules overview,
  and the difficulty picker.
- **`src/components/`** — `cards.jsx` (fanned hand, Scraps zone, deck and
  discard piles), `overlays.jsx` (round interstitials, reveal, win/lose
  screens, modals, fireworks), `hud.jsx` (scores, round progress, game log),
  `buttons.jsx`, `icons.jsx` (inline 24×24 SVG set that replaced all emoji),
  `flight.jsx` (the card-flying-across-the-table animation), `backdrop.jsx`.
- **`src/game/tutorial.js`** — the scripted tutorial, a fixed sequence of
  steps with a rigged deal (the opponent is dealt into four-of-a-kind so the
  player is forced to learn the Ace play).
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

- **One deck now, not two.** `createDeck()` used to build two full 52-card
  decks (104 cards, 8 copies of every rank) — deliberate at the time, but it
  turned out to be why four-of-a-kind Scraps hands came up far more than a
  normal deck would produce (confirmed by simulation in Session 2: quads in
  2.8% of rounds at two decks vs. 0.7% at one). Session 2 switched it back to
  a single 52-card deck to fix that. Cards still carry a unique `id` — no
  longer load-bearing for uniqueness now that rank+suit is unique again, but
  nothing assumes otherwise, so it was left in place rather than ripped out.
- **The reducer is pure on purpose.** Its header notes it replaced an older
  pattern of `setState` nested inside other `setState` updaters, which
  double-fired under React StrictMode and duplicated AI draws and log lines.
  Keep new game logic in the reducer, not in component callbacks, or that
  bug class comes back.
- **Timers read state through a ref** (`stateRef` in `GameScreen.jsx`) so a
  timeout scheduled seconds earlier never acts on a stale snapshot. Follow
  that pattern for any new delayed action.
- **Menu options are `<div>`s, not `<button>`s.** They work with a mouse but
  are not keyboard-focusable and screen readers won't announce them as
  controls. Browser automation can't find them by role either.
- Audio only starts after a user gesture, per browser autoplay policy. Silence
  before the first click is the browser, not a bug.

## Deploy

Connected to the Vercel project **scraps3** (team
`samvaudrey-3466s-projects`), framework preset Vite, output `dist`. GitHub
integration is already active on **`unclescrunch/scraps3`** — pushes to `main`
auto-deploy to production at
[scraps3.vercel.app](https://scraps3.vercel.app). The `dev` branch now exists
and is pushed, so `/preview` has somewhere to deploy before anything reaches
`main`.

Note there are also older `scraps2` and `scraps-game` Vercel projects on the
same account. This repo is `scraps3` — the other two are abandoned earlier
versions and should not be deployed to.

## Known issues

- **There is no README, and never was one.** Nothing in git history has ever
  added a `.md` file. So there are no stale README claims to correct — but
  there's also no written description of the game rules anywhere outside the
  code and the in-app rules panel. If the rules ever need to live somewhere
  readable, that's a gap worth filling.
- **The git remote points at the wrong username.** `origin` is
  `https://github.com/stanbaudrey/scraps3.git`, but the repo actually lives
  at `unclescrunch/scraps3` — GitHub's rename redirect is what keeps pushes
  working. It works today, silently, and would break if that redirect is ever
  reclaimed. Worth repointing the remote.
- **`GameScreen.jsx` is 1,012 lines** and mixes three concerns: UI state, the
  animation timer choreography, and the rendering of the whole table. Unlike
  the engine and reducer, nothing in the file claims this is deliberate. The
  animation scheduling is the natural first thing to lift out.
- **The color palette exists in three places.** `src/styles/theme.js` has the
  `DS` tokens; `index.html` repeats the same hex values as CSS literals; and
  `src/components/flight.jsx` hardcodes all of them again (`#FF3D5A`,
  `#C8FF00`, `#1A1A2E`, `#F5F5FA`, `#8A8FA855`) with no import of `DS` at
  all. `buttons.jsx` also introduces two hover tints (`#d4ff33`, `#ff6070`)
  that aren't tokens anywhere. Changing a brand color today means editing at
  least three files and hoping you found them all.
- **The table clips on short screens.** The game root is `height: 100vh` with
  `overflow: hidden` and no scroll fallback, so below roughly 800px of
  viewport height the player's own hand is cut off the bottom of the screen
  with no way to reach it. On a 1280×720 laptop the game is unplayable. This
  is the most user-visible problem in the project.
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
  so "run the linter before pushing" currently has nothing to run. `npm test`
  and `npm run build` are the available checks.
