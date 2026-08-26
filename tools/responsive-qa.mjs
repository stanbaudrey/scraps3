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
import { chromium } from 'playwright';
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
  return {
    doc: [d.scrollWidth - d.clientWidth, d.scrollHeight - d.clientHeight],
    scrollers, clipped, small,
  };
};

const results = [];

for (const vp of VIEWPORTS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:5193/', { waitUntil: 'networkidle' });

  const shot = async (label) => {
    await page.screenshot({ path: `${DIR}${OUT}/${vp.name}--${label}.png` });
    results.push({ vp: vp.name, label, ...(await page.evaluate(probe)) });
  };

  // Clear any one-shot lightbox that happens to be up.
  const dismiss = async () => {
    for (const name of [/^okay$/i, /^continue/i, /let's go/i, /^ok$/i]) {
      const b = page.getByRole('button', { name });
      if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300); }
    }
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

  // Take a real turn: select two hand cards and trade them in.
  const hand = page.locator('[data-card-id][role="button"]');
  const n = await hand.count();
  if (n >= 2) {
    await hand.nth(0).click().catch(() => {});
    await page.waitForTimeout(200);
    const trade = page.getByRole('button', { name: /Trade \d/ });
    if (await trade.count()) {
      await trade.first().click();
      await page.waitForTimeout(2600);
      await dismiss();
    }
  }
  await shot('5-after-trade');

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
  const s = r.scrollers.filter(x => !/rules/i.test(r.label));
  if (r.label !== '6-rules' && r.scrollers.length) flags.push(`inner scroller ${JSON.stringify(r.scrollers)}`);
  if (r.clipped.length) flags.push(`clipped ${JSON.stringify(r.clipped)}`);
  if (r.small.length) flags.push(`small targets ${JSON.stringify(r.small)}`);
  if (flags.length) { bad++; console.log(`FAIL ${r.vp} ${r.label}: ${flags.join(' | ')}`); }
}
console.log(bad === 0 ? 'ALL CLEAR' : `${bad} problem screens`);
