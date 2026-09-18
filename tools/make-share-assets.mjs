// ============================================================
// SCRAPS — share-image, favicon and crawler-file generator
//
// WHY THIS IS A SCRIPT AND NOT A COMMITTED PNG SOMEBODY DREW
//
// A share card is the one surface nobody ever looks at while
// working. It is generated once from values that later move —
// the product name, the palette, the win condition — and
// nothing regenerates it, so it keeps advertising a version of
// the project that stopped existing. That is not hypothetical:
// a sibling project shipped six days of links naming a product
// it had already renamed away, in a typeface it had stopped
// using, because the site looked perfect the whole time.
//
// So every value that appears in the card is READ FROM THE
// LIVE SOURCE at generate time, recorded in
// public/share-manifest.json, and re-derived on --check. If a
// source moves and the assets are not regenerated, --check
// exits non-zero and names the field that drifted. Mirrors
// `npm run fonts:check`, which guards the webfonts the same way.
//
// NO NEW DEPENDENCIES. Rasterising goes through the copy of
// Chrome already on the machine, in headless mode, the same
// way tools/responsive-qa.mjs leans on a browser it does not
// vendor. `npm ls` is unchanged by this file.
//
//   node tools/make-share-assets.mjs           # generate
//   node tools/make-share-assets.mjs --check   # verify, exit 1 on drift
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const CHECK  = process.argv.includes('--check');

// The address lives in src/site.js, the one place it is declared; the
// game reads the same constant for its share sentence and share card.
import { SITE } from '../src/site.js';

// Chrome is looked up, never installed. If it is missing the
// script says so and stops rather than writing a broken asset.
const CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  process.env.CHROME_PATH,
].filter(Boolean);

const fail = (msg) => { console.error(`\n  ✗ ${msg}\n`); process.exit(1); };
const ok   = (msg) => console.log(`  ✓ ${msg}`);

// ── Read the live sources ───────────────────────────────────
// theme.js is imported rather than regexed: it is a plain ESM
// module with no imports of its own, so the real values are
// available and a rename cannot silently slip past a pattern.
const theme = await import(pathToFileURL(path.join(ROOT, 'src/styles/theme.js')).href);
const { DS, WIN_SCORE } = theme;

const indexHtml = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const grab = (re, what) => {
  const m = indexHtml.match(re);
  if (!m) fail(`could not find ${what} in index.html — the generator reads it from there`);
  return m[1].trim();
};
const TITLE = grab(/<title>([\s\S]*?)<\/title>/, '<title>');
const DESC  = grab(/<meta\s+name="description"\s+content="([^"]*)"/, '<meta name="description">');

// The splash's SUBTITLE is back (2026-09-14) and it is the strapline
// on the card too. It is read from `TAGLINE` in src/share.js — the
// one string the splash, the SHARE sentence and this image all print
// — so a change to the line under the wordmark shows up here as
// share-card drift and `--check` fails until the card is regenerated.
// (It was read out of MenuScreens.jsx until 2026-09-13, when Stan
// removed the subtitle and the card carried its own line instead.)

// The wordmark is the title's leading product name, and the exact
// field that went stale in the sibling project. Split on an em dash
// OR a spaced hyphen: the title has used both, and a version of this
// that only knew about the em dash silently took the WHOLE title as
// the product name the moment the separator changed.
const WORDMARK = TITLE.split(/\s+[—–-]\s+/)[0].trim();

// Share-surface copy, read from the app so the card says what the
// splash says. Recorded in the manifest and diffed by --check.
const shareJs = readFileSync(path.join(ROOT, 'src', 'share.js'), 'utf8');
const tagM = shareJs.match(/export const TAGLINE = '([^']*)'/);
if (!tagM) fail('could not find TAGLINE in src/share.js — the strapline is read from there');
const STRAPLINE = tagM[1];

// The hand drawn on the card, as plain ranks. It used to carry suits,
// and carrying them cost this card its only real inaccuracy: a suited
// A-K-Q-J-10 was a hand the house rule did not recognise, shipped
// knowingly because it was the most legible "card game" image
// available. That tension is gone — cards have no suit as of
// 2026-09-13, so these five ranks ARE a straight, which is the best
// hand in the game, and the card now shows something the player can
// actually be dealt.
const HAND = ['10','J','Q','K','A'];

// ── The privacy notice ──────────────────────────────────────
// This copy lived in a `RulesModal` in src/components/overlays.jsx
// until 2026-09-14. That modal lost its last importer on 2026-08-30
// when the storyboard took over as the in-game rules, so Vite
// tree-shook the whole thing out — the notice was not merely
// unreachable, it had stopped shipping at all, while llms.txt went on
// pointing readers at "the Privacy notice inside the game's rules
// panel". It is a static page now, for the reason a privacy notice
// usually is one: it wants an address that can be linked to, and it
// has no business being a screen in a card game.
//
// It is GENERATED rather than hand-written so the page cannot drift
// from the app it describes: the palette comes from theme.js, the
// @font-face rules are borrowed verbatim from index.html (so
// `npm run fonts` reaches this page too), and every URL derives from
// SITE. --check byte-compares the whole file, so an edited notice that
// was never regenerated still fails.
//
// THERE IS NO "last updated" DATE, and that is deliberate (Stan,
// 2026-09-15). No law requires one on a notice like this. More to the
// point, a hand-typed date would be the ONLY value on this page not
// derived from the app, so it is the only thing here that can silently
// go stale. Do not "fix" that by generating it from the build clock
// either: it would then change on every regeneration and claim an
// update that never happened, which is a worse lie than no date.
// Stan's own words, and DELIBERATELY THIS SHORT (2026-09-15). The
// first version ran four paragraphs and spent one of them listing
// what the game does NOT do — no analytics, no tracking pixels, no
// cookies, no third-party scripts. None of that is a disclosure
// obligation: you disclose what you do. "Nothing else is collected"
// does the same job in four words and is a checkable claim rather
// than a list of absences. The SHARE paragraph went the same way —
// the player hands their own result to an app they picked, with the
// share sheet visible while it happens, and nothing is collected
// from it. Do not pad this back out.
//
// What is left is the actual minimum: what is stored on the device,
// and the one thing that reaches a third party (Vercel's logs get
// the IP). Note this is a plain-English transparency statement, not
// a GDPR Article 13 notice — there is no named controller, legal
// basis, retention period or contact route, because Stan's call is
// no name and no contact line. That is a deliberate trade for a
// hobby game, recorded so nobody "fixes" it by accident.
const PRIVACY = [
  `SCRAPS saves two things to your browser: a win-loss record for each difficulty and a note that you've seen the "How to Play" intro. Clearing your browser data removes them.`,
  `This site is hosted on Vercel, so they log your IP address.`,
  `Nothing else is collected.`,
];

// Everything baked into the pixels. Drift in ANY of these means
// the committed PNGs no longer describe the project.
const sources = {
  title: TITLE,
  description: DESC,
  wordmark: WORDMARK,
  strapline: STRAPLINE,
  hand: HAND.join(' '),
  winScore: WIN_SCORE,
  palette: {
    dusk: DS.dusk, frost: DS.frost, voltage: DS.voltage,
    slate: DS.slate, slateLight: DS.slateLight,
    canopy: DS.canopy, ember: DS.ember, gold: DS.gold, ink: DS.ink,
  },
};

// ── The card ────────────────────────────────────────────────
const fontFace = (family, file, weight = 400) => `
  @font-face{font-family:'${family}';font-style:normal;font-weight:${weight};
    src:url('${pathToFileURL(path.join(PUBLIC, 'fonts', file)).href}') format('woff2');}`;

// The card: SwirlBg's three radial layers at rest, the Rye
// wordmark with its one voltage letter, a real fanned hand drawn
// with the same geometry and ink as the game's own PlayingCard
// (frost face, 6px ink border, one big left-anchored Rye numeral,
// one ink for every rank), and one line of copy. The rules line that
// used to sit here was cut: a share card has about one second to be
// interesting and "first to 10, win by 2" is not the interesting part.
//
// These constants mirror CARD_DIMS.normal and the numeral's own
// placement in cards.jsx, and they are kept in step BY EYE — this
// file cannot import a JSX module. If the card face is redesigned
// again, this is the second place it lives.
const CARD_W = 104, CARD_H = 146;
// CARD_DIMS.normal's rank/gx/gy, plus the two Rye constants beside them.
const RANK_FS = 104, GX = 11, GY = 12, RYE_CAP_LEAD = 0.108, FACE_BORDER = 6, TEN_SQUEEZE = 0.70;

const handHtml = (hand, scale) => {
  const n = hand.length;
  return hand.map((rank, i) => {
    const t = i - (n - 1) / 2;                 // -2..2 about the centre
    const rot = t * 7.5;                       // lean out from the middle
    const lift = Math.abs(t) * Math.abs(t) * 8; // outer cards sit lower
    // Identical height for every rank; only "10" is condensed, and
    // from its LEFT edge so all five numerals share a starting line.
    const squeeze = rank === '10' ? `transform:scaleX(${TEN_SQUEEZE})` : '';
    return `<div class="pc" style="
      width:${CARD_W * scale}px;height:${CARD_H * scale}px;
      margin:0 ${-CARD_W * scale * 0.10}px;
      transform:rotate(${rot}deg) translateY(${lift * scale}px);
      border-width:${6 * scale}px">
      <span class="rk" style="left:${(GX - FACE_BORDER) * scale}px;
        top:${(GY - FACE_BORDER - RANK_FS * RYE_CAP_LEAD) * scale}px;
        font-size:${RANK_FS * scale}px;${squeeze}">${rank}</span>
    </div>`;
  }).join('');
};

const cardHtml = ({ w, h, scale, hand = HAND }) => `<!doctype html><meta charset="utf-8"><style>
  ${fontFace('Rye', 'rye-latin.woff2')}
  ${fontFace('Fjalla One', 'fjalla-one-latin.woff2')}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px;overflow:hidden}
  /* Padding is not decoration here: share surfaces crop, round the
     corners, and letterbox this image, so nothing that must survive
     is allowed near an edge. */
  body{background:${DS.dusk};position:relative;
    font-size:${scale}px;padding:0 ${Math.round(w * 0.05)}px;
    display:flex;align-items:center;justify-content:center}
  .swirl{position:absolute;inset:-12%}
  .a{background:radial-gradient(ellipse 60% 50% at 25% 30%, ${DS.canopy}66 0%, transparent 70%)}
  .b{background:radial-gradient(ellipse 55% 45% at 75% 70%, ${DS.ember}55 0%, transparent 70%)}
  .c{background:radial-gradient(ellipse 50% 40% at 50% 92%, ${DS.gold}4a 0%, transparent 70%)}
  .stack{position:relative;z-index:1;text-align:center;width:100%;
    display:flex;flex-direction:column;align-items:center}
  .word{font-family:'Rye',serif;font-size:5.1em;line-height:1;
    color:${DS.frost};text-shadow:0 3px 0 rgba(0,0,0,.4);letter-spacing:0.01em}
  .word i{font-style:normal;color:${DS.voltage};
    text-shadow:0 0 30px ${DS.voltage}88, 0 3px 0 rgba(0,0,0,.4)}
  /* The bottom margin has to clear the fan's own droop, not just the
     card box: the outer cards are rotated AND pushed down, so the
     lowest painted corner sits well below where flex thinks the row
     ends. Sized against the largest lift below, with room to spare —
     the first version of this had the strapline running through the
     10 and the ace. */
  .fan{display:flex;justify-content:center;align-items:flex-start;
    margin:0.34em 0 1.5em}
  /* Same face as the game deals: frost ground, heavy ink edge, one
     big Rye numeral anchored to the top-left. */
  .pc{background:${DS.frost};border-style:solid;border-color:${DS.ink};
    border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.45);
    position:relative;overflow:hidden;flex-shrink:0}
  .pc .rk{position:absolute;font-family:'Rye',serif;font-weight:400;
    line-height:1;white-space:nowrap;color:${DS.ink};
    display:inline-block;transform-origin:left center}
  .sub{font-family:'Fjalla One',sans-serif;color:${DS.slateLight};
    letter-spacing:0.04em;font-size:1.85em}
</style>
<div class="swirl a"></div><div class="swirl b"></div><div class="swirl c"></div>
<div class="stack">
  <div class="word">${[...WORDMARK].map(ch =>
      ch === 'A' ? `<i>${ch}</i>` : ch).join('')}</div>
  <div class="fan">${handHtml(hand, scale / 24)}</div>
  <div class="sub">${STRAPLINE}</div>
</div>`;

// The favicon is drawn, not typeset: at 16px a wordmark is mush,
// and a suit reads instantly as "card game". Voltage on dusk is
// the brand's own accent pairing.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${DS.dusk}"/>
  <path fill="${DS.voltage}" d="M32 9c-2.2 6.4-8.6 11.5-13 16.2-3.4 3.6-5 7-5 10.7 0 6.3 4.7 10.9 10.6 10.9 3 0 5.6-1.2 7.4-3.1-.6 5.7-2.4 9.4-5.3 11.3h18.6c-2.9-1.9-4.7-5.6-5.3-11.3 1.8 1.9 4.4 3.1 7.4 3.1C53.3 46.8 58 42.2 58 35.9c0-3.7-1.6-7.1-5-10.7C48.6 20.5 42.2 15.4 40 9c-1.3-3.7-6.7-3.7-8 0z" transform="translate(-4 0)"/>
</svg>`;

const iconHtml = (px) => `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0}html,body{width:${px}px;height:${px}px;overflow:hidden}
  svg{display:block;width:${px}px;height:${px}px}</style>${faviconSvg}`;

// ── PNG helpers (no image library) ──────────────────────────
// Width and height live at a fixed offset in the IHDR chunk, so
// reading them back is 8 bytes of arithmetic rather than a
// dependency. This is what makes "the file is really 1200x630"
// a checkable claim.
function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);

function shoot(html, out, w, h) {
  const chrome = CHROMES.find(p => existsSync(p));
  if (!chrome) fail(
    'no Chrome/Chromium found to rasterise with.\n' +
    '    Install Google Chrome, or set CHROME_PATH to a Chromium binary.\n' +
    '    Nothing else in this project needs it — see the header.');
  const tmp = path.join(PUBLIC, `.shot-${process.pid}.html`);
  writeFileSync(tmp, html);
  try {
    execFileSync(chrome, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--screenshot=${out}`, `--window-size=${w},${h}`,
      pathToFileURL(tmp).href,
    ], { stdio: 'pipe' });
  } finally { try { unlinkSync(tmp); } catch {} }
  const size = pngSize(out);
  if (!size || size.w !== w || size.h !== h)
    fail(`${path.basename(out)} rendered at ${size ? size.w + 'x' + size.h : 'nothing'}, expected ${w}x${h}`);
}

// ── Crawler files ───────────────────────────────────────────
const robotsTxt = `# ${WORDMARK} — ${SITE}
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

const sitemapXml = (lastmod) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE}/privacy</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
`;

// llms.txt: what an AI crawler should say about this if asked.
// Deliberately states the house rule and the win condition,
// because those are the two things a summary gets wrong.
//
// NO REAL NAME HERE, on purpose. The invented-it-ourselves origin is
// the launch hook and it is true, but this file is written to be
// ingested and repeated by crawlers, permanently — so whose name goes
// on it is the author's call to make deliberately, not a default a
// generator quietly picks. Stan's own launch drafts say "my wife and
// I" without a name; this matches that register. Add it if he asks.
const llmsTxt = `# ${WORDMARK}

> ${DESC}

${WORDMARK} is a two-player card game played in the browser against an AI
opponent. Its creator and his wife invented it themselves — the mechanics are
original, not a digital version of an existing game.

## How it plays

- You always have two hands running at once: your private hand and your
  face-up "Scraps" hand. A round scores two hands worth 1 point each, and
  one public "Scraps" hand worth 2 points.
- You scrap cards from your hidden hand into your face-up Scraps to draw
  fresh cards. Both piles cap at 7 cards.
- Aces are a weapon: attack with one to discard two cards from the
  opponent's Scraps. She can counter with an Ace of her own.
- First to ${WIN_SCORE} points. Winning both hands *and* the
  Scraps hand in one round is a CLEAN SWEEP, worth 5.

## Notes

- Free, no account, no download, no backend. Runs entirely in the browser.
- Nothing is collected beyond a local win/loss record kept in your own
  browser. Full notice: ${SITE}/privacy
- Built with Vite and React, with no runtime dependencies beyond React.
  Every graphic is inline SVG and every sound is synthesised live with the
  Web Audio API — the project ships no image or audio files.

## Links

- Play: ${SITE}/
- Privacy: ${SITE}/privacy
`;

// The @font-face rules are lifted from index.html rather than
// rewritten, so the four self-hosted families stay in step with
// whatever `npm run fonts` last wrote. Both files serve them from
// the same /fonts paths, so the block needs no rewriting to work here.
const fontFaceBlock = (() => {
  const m = indexHtml.match(/\/\* FONT-FACE:BEGIN \*\/[\s\S]*?\/\* FONT-FACE:END \*\//);
  if (!m) fail('could not find the FONT-FACE block in index.html — /privacy borrows its @font-face rules from there');
  return m[0].replace(/^ {6}/gm, '    ');
})();

const privacyHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Privacy — ${WORDMARK}</title>
    <meta name="description" content="What ${WORDMARK} stores, what it sends, and what it does not collect." />
    <link rel="canonical" href="${SITE}/privacy" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/favicon-180.png" />
    <meta name="theme-color" content="${DS.dusk}" />
    <style>
${fontFaceBlock}
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      background: ${DS.dusk};
      color: ${DS.slateLight};
      font-family: 'Work Sans', system-ui, sans-serif;
      font-size: 17px;
      line-height: 1.65;
      -webkit-text-size-adjust: 100%;
    }
    .wrap {
      max-width: 680px;
      margin: 0 auto;
      padding: clamp(28px, 7vw, 64px) clamp(20px, 6vw, 32px) 64px;
    }
    /* The wordmark is the game's own Rye, and it is a link home
       rather than decoration: this page is reachable from a new tab,
       so it needs its own way back. */
    .home {
      display: inline-block;
      font-family: 'Rye', serif;
      font-size: clamp(26px, 6vw, 34px);
      color: ${DS.frost};
      text-decoration: none;
      letter-spacing: 0.02em;
    }
    .home .v { color: ${DS.voltage}; }
    .home:hover, .home:focus-visible { color: ${DS.voltage}; }
    h1 {
      font-family: 'Fjalla One', sans-serif;
      font-weight: 400;
      color: ${DS.voltage};
      font-size: clamp(32px, 8vw, 46px);
      letter-spacing: 0.04em;
      line-height: 1.1;
      margin: clamp(24px, 6vw, 38px) 0 clamp(18px, 4vw, 26px);
    }
    p { margin: 0 0 20px; }
    .back {
      display: inline-block;
      margin-top: 34px;
      font-family: 'Work Sans', system-ui, sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${DS.slateLight};
      text-decoration: none;
      border: 2px solid ${DS.slate}66;
      border-radius: 8px;
      /* 44px on the short axis, the same floor every control in the
         game is held to. */
      padding: 12px 26px;
      min-height: 44px;
    }
    .back:hover, .back:focus-visible {
      color: ${DS.voltage};
      border-color: ${DS.voltage};
    }
    /* Focus stays visible for keyboard users on both links. */
    a:focus-visible { outline: 3px solid ${DS.voltage}; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <a class="home" href="/">SCRAP<span class="v">S</span></a>
      <h1>Privacy</h1>
${PRIVACY.map(p => `      <p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('\n')}
      <a class="back" href="/">Back to the game</a>
    </main>
  </body>
</html>
`;

// ── Generate or check ───────────────────────────────────────
const assets = [
  { file: 'og.png',           w: 1200, h: 630 },
  { file: 'favicon-32.png',   w: 32,   h: 32  },
  { file: 'favicon-180.png',  w: 180,  h: 180 },
];
const textFiles = {
  'favicon.svg': faviconSvg + '\n',
  'robots.txt':  robotsTxt,
  'llms.txt':    llmsTxt,
  'privacy.html': privacyHtml,
};

const manifestPath = path.join(PUBLIC, 'share-manifest.json');

if (!CHECK) {
  mkdirSync(PUBLIC, { recursive: true });
  shoot(cardHtml({ w: 1200, h: 630, scale: 30 }), path.join(PUBLIC, 'og.png'), 1200, 630);
  ok('public/og.png            1200x630');
  shoot(iconHtml(32),  path.join(PUBLIC, 'favicon-32.png'),  32,  32);
  ok('public/favicon-32.png    32x32');
  shoot(iconHtml(180), path.join(PUBLIC, 'favicon-180.png'), 180, 180);
  ok('public/favicon-180.png   180x180');

  for (const [name, body] of Object.entries(textFiles)) {
    writeFileSync(path.join(PUBLIC, name), body);
    ok(`public/${name}`);
  }
  const lastmod = new Date().toISOString().slice(0, 10);
  writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemapXml(lastmod));
  ok('public/sitemap.xml');

  writeFileSync(manifestPath, JSON.stringify({
    note: 'Written by tools/make-share-assets.mjs. Do not hand-edit — ' +
          'run `npm run share` to regenerate, `npm run share:check` to verify.',
    generated: new Date().toISOString(),
    sources,
    files: Object.fromEntries([
      ...assets.map(a => [a.file, { ...pngSize(path.join(PUBLIC, a.file)), sha256: sha(path.join(PUBLIC, a.file)) }]),
      ...Object.keys(textFiles).map(f => [f, { sha256: sha(path.join(PUBLIC, f)) }]),
    ]),
  }, null, 2) + '\n');
  ok('public/share-manifest.json');
  console.log('\n  Share assets regenerated from live sources.\n');
  process.exit(0);
}

// ── --check ─────────────────────────────────────────────────
console.log('\n  Checking share assets against live sources…\n');
if (!existsSync(manifestPath))
  fail('public/share-manifest.json is missing — run `npm run share` first');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const problems = [];

// 1. Did any source value the pixels depend on move?
const walk = (was, now, prefix = '') => {
  for (const k of new Set([...Object.keys(was || {}), ...Object.keys(now || {})])) {
    const a = was?.[k], b = now?.[k];
    if (a && typeof a === 'object') { walk(a, b, `${prefix}${k}.`); continue; }
    if (String(a) !== String(b))
      problems.push(`${prefix}${k}\n      baked in: ${JSON.stringify(a)}\n      live now: ${JSON.stringify(b)}`);
  }
};
walk(manifest.sources, sources);

// 2. Do the files still exist, at the right size, unmodified?
for (const a of assets) {
  const p = path.join(PUBLIC, a.file);
  if (!existsSync(p)) { problems.push(`${a.file} is missing`); continue; }
  const size = pngSize(p);
  if (!size || size.w !== a.w || size.h !== a.h)
    problems.push(`${a.file} is ${size ? size.w + 'x' + size.h : 'not a PNG'}, expected ${a.w}x${a.h}`);
  else if (manifest.files?.[a.file]?.sha256 !== sha(p))
    problems.push(`${a.file} has been modified since it was generated`);
}
for (const name of Object.keys(textFiles)) {
  const p = path.join(PUBLIC, name);
  if (!existsSync(p)) { problems.push(`${name} is missing`); continue; }
  if (readFileSync(p, 'utf8') !== textFiles[name])
    problems.push(`${name} no longer matches what the live sources produce`);
}

// sitemap.xml is checked SEPARATELY and not byte-for-byte, because it
// carries a `lastmod` date that legitimately changes on every
// regeneration. It is not in `textFiles` for that reason — and being
// out of that loop is exactly how it went unverified: deleting it
// passed the check with exit 0, found by deliberately breaking each
// class of drift rather than by reading this code. Assert the things
// about it that DO NOT move.
{
  const p = path.join(PUBLIC, 'sitemap.xml');
  if (!existsSync(p)) problems.push('sitemap.xml is missing');
  else {
    const xml = readFileSync(p, 'utf8');
    if (!xml.includes('http://www.sitemaps.org/schemas/sitemap/0.9'))
      problems.push('sitemap.xml has the wrong urlset namespace — crawlers will reject it');
    if (!xml.includes(`<loc>${SITE}/</loc>`))
      problems.push(`sitemap.xml does not list ${SITE}/ as a URL`);
    if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(xml))
      problems.push('sitemap.xml has no valid <lastmod> date');
  }
}

// 3. Does index.html actually point at all of it, with values that agree?
const mustReference = [
  ['og:image',        /property="og:image"\s+content="([^"]*)"/,        `${SITE}/og.png`],
  ['og:title',        /property="og:title"\s+content="([^"]*)"/,        TITLE],
  ['og:description',  /property="og:description"\s+content="([^"]*)"/,  DESC],
  ['og:url',          /property="og:url"\s+content="([^"]*)"/,          `${SITE}/`],
  ['twitter:image',   /name="twitter:image"\s+content="([^"]*)"/,       `${SITE}/og.png`],
  ['canonical',       /rel="canonical"\s+href="([^"]*)"/,               `${SITE}/`],
];
for (const [label, re, expected] of mustReference) {
  const m = indexHtml.match(re);
  if (!m) problems.push(`index.html has no ${label} tag`);
  else if (m[1] !== expected)
    problems.push(`index.html ${label}\n      is:       ${JSON.stringify(m[1])}\n      should be:${JSON.stringify(expected)}`);
}
// The JSON-LD name has to be the product name too — it is the
// field a search engine reads back as the title.
const ld = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!ld) problems.push('index.html has no JSON-LD block');
else {
  try {
    const data = JSON.parse(ld[1]);
    if (data.name !== WORDMARK)
      problems.push(`JSON-LD name is ${JSON.stringify(data.name)}, expected ${JSON.stringify(WORDMARK)}`);
  } catch { problems.push('index.html JSON-LD is not valid JSON'); }
}

if (problems.length) {
  console.error('  Share assets are STALE. They no longer match the live sources:\n');
  for (const p of problems) console.error(`    ✗ ${p}`);
  console.error('\n  Run `npm run share` to regenerate, then commit the result.\n');
  process.exit(1);
}
ok('every baked-in value still matches its live source');
ok('every asset present, correct size, unmodified');
ok('index.html references agree with what was generated');
console.log('\n  Share assets are current.\n');
