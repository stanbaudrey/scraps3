// ============================================================
// SCRAPS — play-through: whole rounds, in a real browser, on every
// difficulty, and a loud failure if the table ever stops advancing
//
//   node tools/play-through.mjs                 a whole match each of NORMAL, HARD, UNFAIR
//   MODES=unfair ROUNDS=2 node tools/play-through.mjs   stop after two rounds
//   PORT=5194 node tools/play-through.mjs       when 5193 is held (see CLAUDE.md)
//   HEADED=1 ...                                watch it
//
// WHY IT EXISTS. On 2026-09-18 the new HARD froze at the first signal, on
// the preview, in front of Stan: a name imported into GameScreen was
// shadowed by a field of game state, the call threw inside a timer, and
// the table sat on "Signal locked. Waiting for her..." for ever. The
// brain had 19 tests and an arena that had played 30,000 matches. None of
// it touches the SCREEN, which is where the bug was, and the browser walk
// done that night stopped one click short of signalling. It is the same
// shape as the Ace counter that never worked (2026-08-30): "the defect
// lived in the wiring between them".
//
// So this plays the game the way a person does, by pressing what is on
// the screen, and it fails on two things only: an error on the page, or
// the screen not changing for STALL_MS while it is waiting on HER. It is
// deliberately a poor player (it scraps its first card and signals its
// first card) because it is testing the table, not the odds. A match runs
// two rounds or more, so both dealers and both signal orders are always
// covered, and it ends on the match screen. One to two minutes a mode.
//
// Needs a dev server and Playwright (a global install, or the copy in the
// npx cache, which is what the fallback below finds). Not part of `npm
// test`, for the reason responsive-qa.mjs is not.
// ============================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  const cache = path.join(os.homedir(), '.npm', '_npx');
  for (const d of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    const p = path.join(cache, d, 'node_modules', 'playwright', 'index.mjs');
    if (fs.existsSync(p)) return import(p);
  }
  throw new Error('Playwright not found. Install it globally, or run the Playwright MCP once so it lands in the npx cache.');
}

const PORT = process.env.PORT || 5193;
const ROUNDS = Number(process.env.ROUNDS || 99);   // 99: play the match out
const MODES = (process.env.MODES || 'normal,hard,unfair').split(',');
const STALL_MS = 25000;
const LABEL = { normal: /NORMAL/, hard: /HARD/, unfair: /UNFAIR/ };
const FORWARD = [/^show .em$/i, /^play hand 2$/i, /^back to the table$/i, /^play scraps hand$/i,
  /^next round$/i, /^continue$/i, /^end turn$/i];

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
let failed = false;

for (const mode of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('scraps-walkthrough-seen-v1', '1'); } catch { /* blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).split('\n')[0]}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

  await page.goto(`http://localhost:${PORT}/?unfair=${mode === 'unfair' ? 'open' : 'locked'}`);
  await page.getByRole('button', { name: /^play$/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: LABEL[mode] }).click();

  const t0 = Date.now();
  let signs = 0, signUp = false;
  const did = { scraps: 0, signals: 0, reveals: 0, dialogs: 0 };
  let lastChange = Date.now(), lastSnap = '', outcome = null;

  while (!outcome) {
    await page.waitForTimeout(300);
    const snap = await page.evaluate(() => {
      const vis = (b) => b.offsetParent !== null || getComputedStyle(b).position === 'fixed';
      const btns = [...document.querySelectorAll('button')].filter(vis).map(b => ({
        t: (b.innerText || '').trim().replace(/\s+/g, ' '), dis: b.disabled, act: b.dataset.tableAction || null,
        dlg: !!b.closest('[role="dialog"]') }));
      const text = document.body.innerText.replace(/\s+/g, ' ');
      return { btns, text: text.slice(0, 600), flying: document.querySelectorAll('[data-flight]').length,
        over: btns.some(b => /^new game$/i.test(b.t)) };
    });
    const sig = JSON.stringify([snap.btns, snap.text, snap.flying]);
    if (sig !== lastSnap) { lastSnap = sig; lastChange = Date.now(); }

    if (errors.length) { outcome = `FAILED: ${errors[0]}`; break; }
    if (Date.now() - lastChange > STALL_MS) {
      outcome = `STALLED for ${STALL_MS / 1000}s on: "${snap.text.slice(0, 160)}"  buttons: ${snap.btns.map(b => b.t).filter(Boolean).join(' | ')}`;
      await page.screenshot({ path: `tools/shots/play-through-${mode}-stall.png` }).catch(() => {});
      break;
    }
    if (snap.over) { outcome = `ok: the match ended after ${did.reveals} reveals`; break; }
    if (snap.flying) continue;

    const click = async (loc) => { try { await loc.click({ timeout: 1500, force: true }); return true; } catch { return false; } };
    const byName = (re) => page.getByRole('button', { name: re }).first();

    // 1. the ROUND sign: the wood is the button. Looked for FIRST, because
    // the stage it stands on is itself a dialog, and the step below would
    // press its quiet button without ever counting the round.
    // A NEW sign is one that was not up on the last look: it stays on
    // screen for a few looks after the click that dismisses it.
    const quiet = snap.btns.find(b => /^(click|tap) anywhere$/i.test(b.t));
    if (quiet) {
      if (!signUp) { signUp = true; signs++; if (signs > ROUNDS) { outcome = `ok: ${ROUNDS} rounds played`; break; } }
      await page.mouse.click(24, 24);
      continue;
    }
    signUp = false;
    // 2. anything asking a question
    const dlg = snap.btns.filter(b => b.dlg && !b.dis);
    if (dlg.length) {
      const want = dlg.find(b => /let it happen/i.test(b.t)) || dlg.find(b => /^okay$/i.test(b.t)) || dlg[0];
      if (await click(page.locator('[role="dialog"] button', { hasText: want.t }).first())) did.dialogs++;
      continue;
    }
    // 3. a named way forward
    const fwd = FORWARD.map(re => snap.btns.find(b => re.test(b.t) && !b.dis)).find(Boolean);
    if (fwd) { if (await click(byName(new RegExp(`^${fwd.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')))) did.reveals++; continue; }
    // 4. my move: pick a card, press the table's button
    const act = snap.btns.find(b => b.act);
    if (act) {
      if (act.dis) {
        const card = page.locator('[role="button"][aria-pressed="false"]:has([data-card-id])').first();
        if (await card.count()) await click(card);
      } else if (await click(page.locator(`button[data-table-action="${act.act}"]`))) {
        if (act.act === 'scrap') did.scraps++; else did.signals++;
      }
    }
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const bad = !/^ok/.test(outcome);
  failed = failed || bad;
  console.log(`${bad ? 'FAIL' : 'pass'}  ${mode.padEnd(7)} ${outcome}   [${did.scraps} scraps, ${did.signals} signals, ${did.reveals} reveals, ${did.dialogs} dialogs, ${secs}s]`);
  if (!bad && did.signals < Math.min(ROUNDS, 2) * 2) { failed = true; console.log(`FAIL  ${mode.padEnd(7)} only ${did.signals} signals: it did not really play`); }
  await ctx.close();
}
await browser.close();
console.log(failed ? '\nPLAY-THROUGH FAILED' : '\nPLAY-THROUGH CLEAR');
process.exit(failed ? 1 : 0);
