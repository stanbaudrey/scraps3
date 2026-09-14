// ============================================================
// SCRAPS — Overlay touch-target bench (2026-09-14)
//
// Measures every button in every modal, at rest, at six viewports.
//
// WHY THIS EXISTS ALONGSIDE responsive-qa.mjs. That harness walks a
// REAL game, so it only ever reaches a modal the random deal happens
// to open — which is why the Ace explainer's OKAY button had gone
// unmeasured until it failed intermittently, on a different viewport
// each run, and why the reveal, Clean Sweep, win and lose screens had
// never been measured at all. This one mounts each overlay in the real
// `Shell` on demand, so the answer does not depend on the cards.
//
// It measures at REST. Every assertion here reads
// getBoundingClientRect, which returns the TRANSFORMED box, so a
// reading taken during an entrance animation is a reading of the
// animation: `popIn` opens at scale(.5), which turns a 54px button
// into a 27px one. Both waits below are for the page to stop moving,
// not for a number of milliseconds.
//
//   npm run dev -- --port 5193 --strictPort
//   node tools/overlay-targets.mjs
//
// A human can look at any single case instead, at:
//   http://localhost:5193/tools/bench/overlay-targets.html?case=reveal
//
// Nothing under tools/ is built into dist/ — Vite's only entry is
// index.html — so the bench page cannot reach production.
// ============================================================
import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'iphone-se',  width: 375,  height: 667,  touch: true  },
  { name: 'iphone-14',  width: 390,  height: 844,  touch: true  },
  { name: 'phone-land', width: 844,  height: 390,  touch: true  },
  { name: 'ipad',       width: 768,  height: 1024, touch: true  },
  { name: 'laptop-720', width: 1280, height: 720,  touch: false },
  { name: 'desktop-hd', width: 1920, height: 1080, touch: false },
];
const CASES = ['reveal', 'cleanSweep', 'win', 'lose', 'aceDrawn', 'aceCounter'];

// Infinite animations are excluded because they never finish — the Ace
// card's `cardWiggle` would hang this forever — and they do not move a
// control's box.
const QUIET = () => !document.getAnimations().some(a => {
  if (a.playState !== 'running') return false;
  const t = a.effect && a.effect.getComputedTiming();
  return !t || t.iterations !== Infinity;
});

const probe = () => [...document.querySelectorAll('button')]
  .filter(b => !b.disabled)
  .map(b => {
    // The RENDERED height is what a thumb gets. Walk the ancestors for
    // every scale between the button and the viewport — `Shell`'s
    // FitBox is usually the only one, and it is 1 on most screens.
    let scale = 1;
    for (let el = b.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      if (m.a !== 1) scale *= m.a;
    }
    return {
      label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 16),
      declared: getComputedStyle(b).minHeight,
      natural: b.offsetHeight,
      rendered: Math.round(b.getBoundingClientRect().height),
      scale: +scale.toFixed(3),
    };
  });

// Same fallback as responsive-qa.mjs: Playwright's bundled Chromium is
// not downloaded here, so use the Chrome already on the machine.
const launch = async () => {
  try { return await chromium.launch(); }
  catch (e) {
    if (!/Executable doesn't exist/.test(String(e))) throw e;
    return chromium.launch({ channel: 'chrome' });
  }
};

const browser = await launch();
const rows = [];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  for (const c of CASES) {
    await page.goto(`http://localhost:5193/tools/bench/overlay-targets.html?case=${c}`,
      { waitUntil: 'networkidle' });
    await page.waitForFunction(QUIET, null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.waitForFunction(QUIET, null, { timeout: 6000 }).catch(() => {});
    for (const b of await page.evaluate(probe)) rows.push({ vp: vp.name, case: c, ...b });
  }
  await ctx.close();
}
await browser.close();

for (const r of rows) {
  console.log(`${r.rendered < 43 ? 'UNDER' : '     '} ${r.vp.padEnd(11)} ${r.case.padEnd(11)} ` +
    `${r.label.padEnd(16)} declared=${r.declared.padEnd(5)} natural=${String(r.natural).padStart(3)} ` +
    `scale=${String(r.scale).padEnd(5)} rendered=${r.rendered}`);
}

// Landscape phone is an accepted trade, recorded in PROJECT-BRIEF.md and
// CLAUDE.md: ~300px of height scales the whole screen and every control
// with it, and portrait is the intended orientation. Printed, not fatal —
// the surest way to get a real failure ignored is to leave a check red
// for a reason nobody intends to act on.
const under = rows.filter(r => r.rendered < 43);
const fatal = under.filter(r => r.vp !== 'phone-land');
for (const r of under) {
  console.log(`${fatal.includes(r) ? 'FAIL' : 'note'} ${r.vp} ${r.case} "${r.label}" ` +
    `renders ${r.rendered}px against the 44px floor (natural ${r.natural} x scale ${r.scale})`);
}
console.log(fatal.length === 0
  ? `ALL CLEAR (${under.length} accepted landscape shortfall${under.length === 1 ? '' : 's'})`
  : `${fatal.length} controls under the touch floor`);
if (fatal.length) process.exit(1);
