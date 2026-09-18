// ============================================================
// SCRAPS — Responsive QA harness (Session 3)
//
// Drives the REAL app in a headless browser at six viewports,
// walks it from the splash through all four storyboard beats, the
// difficulty picker, a dealt table, a completed trade and the
// rules panel, and asserts three things on every screen:
//
//   • the document does not scroll,
//   • nothing inside it is a scroll container either (the rules
//     panel is the one deliberate exception),
//   • no card or button is painted outside the viewport box.
//
// It also reports every enabled button whose short axis renders
// under 44px, which is how the touch-target work was measured.
//
// NOT wired into `npm test`: Playwright is not a dependency of
// this project and adding it would be the largest devDependency
// in the tree by an order of magnitude. Run it by hand against a
// dev server, with playwright available (a global install is
// fine):
//
//   npm run dev -- --port 5193 --strictPort
//   node tools/responsive-qa.mjs after
//
// Screenshots land in tools/shots/<label>/, which is gitignored.
// ============================================================
// A bare 'playwright' when one is installed; otherwise the copy the
// Playwright MCP server keeps in the npx cache, which is the one every
// verification pass on this machine has actually used.
const pw = await import('playwright').catch(() => import(
  '/Users/stan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs'));
const { chromium } = pw;
// PORT=… to point at a server other than the launch config's 5193.
const PORT = process.env.PORT || 5193;
import fs from 'node:fs';

const OUT = process.argv[2] || 'after';
const DIR = new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(DIR + OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'iphone-se',  width: 375,  height: 667,  touch: true  },
  { name: 'iphone-14',  width: 390,  height: 844,  touch: true  },
  { name: 'phone-land', width: 844,  height: 390,  touch: true  },
  { name: 'ipad',       width: 768,  height: 1024, touch: true  },
  { name: 'laptop-720', width: 1280, height: 720,  touch: false },
  { name: 'desktop-hd', width: 1920, height: 1080, touch: false },
];

const probe = () => {
  const d = document.documentElement;
  const scrollers = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    const y = /auto|scroll/.test(s.overflowY) && el.scrollHeight - el.clientHeight > 1;
    const x = /auto|scroll/.test(s.overflowX) && el.scrollWidth - el.clientWidth > 1;
    return y || x;
  }).map(el => ({
    tag: el.tagName, cls: String(el.className || '').slice(0, 24),
    over: [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight],
  }));
  // Anything meaningful painted outside the viewport box.
  const clipped = [...document.querySelectorAll('[data-card-id],button')].filter(el => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (getComputedStyle(el).visibility === 'hidden') return false;
    return r.top < -1 || r.left < -1 || r.bottom > d.clientHeight + 1 || r.right > d.clientWidth + 1;
  }).map(el => ({
    what: el.dataset.cardId || (el.textContent || '').trim().slice(0, 18) || el.tagName,
    box: (({ top, left, right, bottom }) => [Math.round(top), Math.round(left), Math.round(right), Math.round(bottom)])(el.getBoundingClientRect()),
  }));
  // Touch targets: every enabled button's short axis.
  const small = [...document.querySelectorAll('button')].filter(el => {
    if (el.disabled) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && Math.min(r.width, r.height) < 43;
  }).map(el => ({
    label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 22),
    size: [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)],
  }));
  // Which overlay was actually on top when this screen was measured.
  // The walk is dealt a random hand, so a screen labelled `4-table` is
  // sometimes the table and sometimes the table under the Ace explainer
  // — and without this the results give no way to tell which, which is
  // what made the Ace explainer's touch-target report so hard to read.
  const dialogs = [...document.querySelectorAll('[role="dialog"]')]
    .map(el => el.getAttribute('aria-label') || '(unlabelled)');
  return {
    doc: [d.scrollWidth - d.clientWidth, d.scrollHeight - d.clientHeight],
    dialogs, scrollers, clipped, small,
  };
};

const results = [];

// Playwright's own bundled Chromium is downloaded by `npx playwright
// install`, which this project does not run — it is not a dependency
// here and adding it would be the largest devDependency in the tree by
// an order of magnitude. So fall back to the copy of Google Chrome
// already on the machine, exactly as tools/make-share-assets.mjs does
// for rasterising. Without this the script is unrunnable on a machine
// that has Playwright available but no downloaded browser, which is
// the normal state of this one.
const launch = async () => {
  try { return await chromium.launch(); }
  catch (e) {
    if (!/Executable doesn't exist/.test(String(e))) throw e;
    return chromium.launch({ channel: 'chrome' });
  }
};

for (const vp of VIEWPORTS) {
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // Say which viewport is being walked. A six-viewport run that throws
  // part way through otherwise reports a bare Playwright timeout with
  // no way to tell which screen it died on.
  console.log(`-- ${vp.name} ${vp.width}x${vp.height}`);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

  // Wait for the page to STOP MOVING, rather than for a fixed number of
  // milliseconds. Every assertion in `probe` reads getBoundingClientRect,
  // which returns the TRANSFORMED box, so a measurement taken during an
  // entrance animation is a measurement of the animation: `popIn` opens
  // at scale(.5), so the Ace explainer's 54px OKAY button measures 27
  // there and the same button measures 38 a few frames later. Both are
  // indistinguishable from a control that is genuinely too small.
  //
  // This replaced a flat 450ms wait, which covered popIn's own 0.35s but
  // not an overlay that MOUNTS LATE. The Ace explainer is exactly that:
  // it waits for `animating` to clear, so on a deal that runs long it
  // appears after the wait has already elapsed and starts a fresh popIn
  // under the probe. That is why this only ever failed on the runs where
  // the opening hand happened to hold an Ace, and on a different viewport
  // each time.
  //
  // Infinite animations are excluded because they never finish: the Ace
  // card's `cardWiggle` and the zone cue's pulse would hang this forever.
  // They also do not move a control's box enough to matter.
  //
  // A card in FLIGHT is invisible to getAnimations: the FLIP ghosts in
  // flight.jsx are moved by requestAnimationFrame, not by CSS. So between
  // two flights of a deal the page can look still while the deal is half
  // done, and a probe taken there measured a pile's `scrapSettle` mid-run
  // and raced the Ace explainer that waits for the deal (2026-09-17). Quiet
  // now also means no ghost on the page.
  const QUIET = () => !document.querySelector('[data-flight]') && !document.getAnimations().some(a => {
    if (a.playState !== 'running') return false;
    const t = a.effect && a.effect.getComputedTiming();
    return !t || t.iterations !== Infinity;
  });

  const settle = async () => {
    await page.waitForFunction(QUIET, null, { timeout: 6000 }).catch(() => {});
    // A beat for anything that mounts on the back of what just finished,
    // then settle that too.
    await page.waitForTimeout(250);
    await page.waitForFunction(QUIET, null, { timeout: 6000 }).catch(() => {});
  };

  const shot = async (label) => {
    await settle();
    await page.screenshot({ path: `${DIR}${OUT}/${vp.name}--${label}.png` });
    // Record whether the page was ACTUALLY still when measured, and if
    // not, WHAT was still moving. If a future run times out waiting and
    // probes something mid-transform anyway, the report names the
    // animation instead of reading as a layout defect.
    const moving = await page.evaluate(() => document.getAnimations()
      .filter(a => {
        if (a.playState !== 'running') return false;
        const t = a.effect && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      })
      .map(a => a.animationName || `transition:${a.transitionProperty || '?'}`));
    results.push({ vp: vp.name, label, quiet: moving.length === 0, moving,
      ...(await page.evaluate(probe)) });
  };

  // Clear any one-shot lightbox that happens to be up.
  const dismiss = async () => {
    // Settle FIRST. The Ace explainer only mounts once `animating`
    // clears, so a dismiss fired on a fixed timer can run before the
    // overlay it is meant to clear has appeared — which then leaves it
    // up over the table and blocks the trade the walk takes next.
    await settle();
    for (const name of [/^okay$/i, /^continue/i, /let's go/i, /^ok$/i]) {
      const b = page.getByRole('button', { name });
      if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300); }
    }
    // The interstitial layer, which the list above CANNOT clear (fixed
    // 2026-09-15). Two reasons it needs its own case: its button reads
    // "Tap to continue", which `/^continue/i` does not match, and it
    // sits UNDER the layer's own tap surface, so an ordinary click is
    // refused as intercepted — `force` is the point, not a shortcut.
    // Until this existed the walk sat on the ROUND 1 sign for every
    // viewport: `4-table` and `5-after-trade` were both a photograph of
    // the sign, the trade step found no cards, and the run died 30s
    // later on the rules button the sign was covering. The sign stopped
    // advancing itself on 2026-09-14 and nothing here was taught to tap
    // it, so the harness had been measuring a screen with no table on it
    // ever since.
    for (let i = 0; i < 4; i++) {
      const stage = page.locator('[role="dialog"] button').first();
      if (!(await stage.count())) break;
      await stage.click({ force: true, timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(350);
    }
    await settle();
  };

  await shot('1-splash');
  await page.getByRole('button', { name: /^play$/i }).click();
  await page.waitForTimeout(400);

  if (await page.getByRole('button', { name: /^skip$/i }).count()) {
    await shot('2-walkthrough-1');
    await page.locator('body').click({ position: { x: 10, y: 10 } });   // advance a beat
    await page.waitForTimeout(250);
    await shot('2-walkthrough-2');
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(250);
    await shot('2-walkthrough-3');
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(250);
    await shot('2-walkthrough-4');
    await page.getByRole('button', { name: /^skip$/i }).click();
    await page.waitForTimeout(400);
  }

  await shot('3-difficulty');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /EASY/ }).click();
  await page.waitForTimeout(3200);
  await dismiss();
  await shot('4-table');

  // Take a real turn: select a hand card and scrap it.
  //
  // The card and its button are TWO elements — `data-card-id` is on the
  // card, `role="button"` on the fan slot wrapping it — so the selector
  // this used to use, `[data-card-id][role="button"]`, asked for both on
  // one element and matched nothing. Found 2026-09-16: `5-after-trade`
  // was the same photograph as `4-table` at every viewport, the SAME
  // green-on-nothing this harness was already fixed for once. It had
  // not taken a turn since the card redesign.
  const hand = page.locator('[role="button"][aria-pressed]:has([data-card-id])');
  const n = await hand.count();
  if (n >= 2) {
    // "Trade In (2)" became "SCRAP n → DRAW n" when the vocabulary was
    // settled; the old name matched nothing, so the walk never took a
    // turn even on the runs that reached a table.
    const trade = page.getByRole('button', { name: /Scrap \d/i });
    // WAIT for it rather than counting it: since 2026-09-16 the band's
    // buttons only arrive once the last card of the deal has landed.
    await trade.first().waitFor({ timeout: 5000 }).catch(() => {});
    // The Ace explainer mounts when the deal lands, which is also when
    // that button arrives, so clear it BEFORE picking a card: a pick made
    // under it is swallowed, and the click that follows used to hang the
    // whole walk for 30s on the covered button (2026-09-17).
    await dismiss();
    await hand.nth(0).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (await trade.count()) {
      await trade.first().click({ timeout: 5000 }).catch(e => errors.push(`scrap click: ${String(e).split('\n')[0]}`));
      await page.waitForTimeout(2600);
      await dismiss();
    }
  }
  await shot('5-after-trade');

  // Clear anything that opened LATE. Since 2026-08-30 the Ace
  // explainer deliberately waits for the draw animation to finish
  // before it appears, so it can surface after the post-trade
  // dismiss() above has already run — and it blocks the table until
  // acknowledged, which is the point of it.
  await page.waitForTimeout(600);
  await dismiss();

  // Rules panel — the one overlay allowed to scroll internally.
  const rules = page.getByRole('button', { name: /^rules$/i });
  if (await rules.count()) {
    await rules.first().click();
    await page.waitForTimeout(300);
    await shot('6-rules');
    const close = page.getByRole('button', { name: /^close$/i });
    if (await close.count()) await close.first().click();
  }

  if (errors.length) results.push({ vp: vp.name, label: 'ERRORS', errors });
  await ctx.close();
  await browser.close();
}

fs.writeFileSync(`${DIR}${OUT}/results.json`, JSON.stringify(results, null, 1));

let bad = 0;
for (const r of results) {
  if (r.errors) { console.log(`!! ${r.vp} JS ERROR ${r.errors[0]}`); bad++; continue; }
  const flags = [];
  if (r.doc[0] > 1 || r.doc[1] > 1) flags.push(`document scrolls ${r.doc}`);
  if (r.label !== '6-rules' && r.scrollers.length) flags.push(`inner scroller ${JSON.stringify(r.scrollers)}`);
  if (r.clipped.length) flags.push(`clipped ${JSON.stringify(r.clipped)}`);
  // A landscape phone is a DOCUMENTED, accepted exception, not a
  // defect: 844x390 leaves ~300px of height for two hands, two piles
  // and the control panel, so FitBox scales the whole table to ~0.55
  // and every control shrinks with it. The Ace tag is width-bound
  // there, so the only fixes are a wider-than-one-card tag or bigger
  // cards, and portrait is the intended orientation. This is recorded
  // in PROJECT-BRIEF.md ("do not chase the Ace tag's touch target on
  // a landscape phone") and in CLAUDE.md's known issues.
  //
  // It is exempted HERE rather than left to fail because this harness
  // now exits non-zero, and the surest way to get a real failure
  // ignored is to let the check sit red for a reason nobody intends to
  // act on. Landscape shortfalls are still PRINTED, just not fatal.
  const landscapePhone = r.vp === 'phone-land';
  if (r.small.length) {
    if (landscapePhone) console.log(`note ${r.vp} ${r.label}: small targets (accepted landscape trade) ${JSON.stringify(r.small)}`);
    else flags.push(`small targets ${JSON.stringify(r.small)}`);
  }
  // A screen that was still animating when it was measured is not
  // evidence of anything. Say so on the failure line rather than
  // letting a transform get reported as a size.
  if (flags.length && r.quiet === false) {
    flags.push(`(MEASURED WHILE ANIMATING: ${[...new Set(r.moving)].join(', ')} — suspect)`);
  }
  // Worth saying even on a screen that passed: a probe that never got a
  // still page is a probe that got lucky, and the next deal may not be.
  if (!flags.length && r.quiet === false) {
    console.log(`note ${r.vp} ${r.label}: measured while ${[...new Set(r.moving)].join(', ')} still ran`);
  }
  if (flags.length) { bad++; console.log(`FAIL ${r.vp} ${r.label}: ${flags.join(' | ')}`); }
}
console.log(bad === 0 ? 'ALL CLEAR' : `${bad} problem screens`);

// Exit non-zero on failure. Without this the harness printed its
// failures and still exited 0, so a `&&` chain, CI, or an npm script
// read a failing run as a pass — in the one tool here whose entire
// job is to assert.
if (bad > 0) process.exit(1);
