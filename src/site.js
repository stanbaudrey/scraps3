// ============================================================
// SCRAPS — the site's address, declared ONCE (2026-09-17).
//
// tools/make-share-assets.mjs imports this for every file it generates
// (the canonical tag and Open Graph checks, sitemap.xml, robots.txt,
// llms.txt, the privacy page), and `npm run share:check` holds
// index.html to it. The game reads it for the share sentence and the
// share card, so a viewer sees scraps.games on every copy of the site,
// a Vercel preview included (Stan: "the URL is scraps.games and should
// read as such ... anywhere viewers might see the URL"). Until today the
// share code used `window.location`, which put the preview's long
// address on every share made from a preview.
//
// To move the site: change this line, then run `npm run share`.
// ============================================================
export const SITE = 'https://scraps.games';

// The address as a viewer reads it: the bare host, no scheme, no slash.
export const SITE_HOST = SITE.replace(/^https?:\/\//, '').replace(/\/+$/, '');
