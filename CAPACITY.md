# Capacity: bandwidth, and nothing else

Written 2026-09-14. This project has the simplest risk profile of the eight.
The cross-project picture is in `~/Projects/Brain/CAPACITY.md`.

Production: https://scraps.games (registered 2026-09-08, live 2026-09-12;
`scraps3.vercel.app` and `www.scraps.games` both 308 to the apex)

## The situation

There is no backend. No API routes, no database, and no network calls at
runtime: a search for `fetch`, `XMLHttpRequest` and `sendBeacon` across `src`
returns nothing. `vercel.json` is build configuration only. The game runs
entirely in the browser off a static Vite build.

That means every visitor is a cache hit on Vercel's edge network, which is the
one component in the whole stack genuinely built for a crowd. There is nothing
here to exhaust except bandwidth, and nothing that can be slow, rate limited or
suspended. If a link to this project goes viral, the realistic outcome is a
nice traffic graph.

## The only number that matters

Vercel Hobby includes 100 GB of Fast Data Transfer a month, shared across every
project on the team. Measured on 2026-09-14, this project's compiled output is
1.7 MB with 1.4 MB of that in `public`, the heaviest single file being
`public/og.png` at roughly 300 KB.

Actual per-visit transfer is well under the build size after code splitting,
compression and repeat-visit caching, so a working estimate of somewhere under
1 MB a visit puts the allotment at roughly 100,000 visits. One genuinely viral
link is about one month of bandwidth.

What happens if you cross it is worth knowing, because the instinct is to assume
a free plan fails safe. There is no overage billing on Hobby and no automatic
pause, because Spend Management is a Pro feature. Sustained overage can lead to
Vercel pausing the deployment, at which point visitors get a
`503 DEPLOYMENT_PAUSED` and it does not resume itself.

## Worth knowing, not worth acting on today

**`public/og.png` is the single heaviest asset at about 300 KB.** It is fetched
by social crawlers rather than by visitors, so it does not multiply across a
spike the way a page asset would. Not a priority, but it is the obvious trim if
bandwidth ever becomes the live constraint.

**There is no analytics here.** This project does not ship
`@vercel/analytics`, which means it is not spending the team's 50,000 event
monthly pool, and also that a spike would be invisible except through Vercel's
own request metrics. Given the pool is shared team-wide and EGOT and knowtient
are already drawing on it, leaving this project out is defensible. Just know it
is a choice, and that adding analytics here would draw from the same pool the
other projects need.

**The domain is done and this file originally said otherwise.** The first draft
claimed there was no custom domain, because it picked the most frequent URL in
the repository and `scraps3.vercel.app` appears more often than `scraps.games`
precisely because it is the historical one. The live address is
`https://scraps.games`, registered 2026-09-08 and published 2026-09-12, with
the old Vercel address and `www` both 308ing to the apex. Frequency is a bad
proxy for currency in a long brief; read the top of the file or Notion instead.

## What to actually do

Nothing. This project is fine. It is in this set because it is the clearest
illustration of the general principle: the static projects absorb a crowd
without complaint, and all the real exposure in the account sits in the four
that talk to a database.
