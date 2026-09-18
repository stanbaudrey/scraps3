// ============================================================
// SCRAPS — TRIM measurement (2026-09-14)
//
// Renders every cue in src/audio.js into an OfflineAudioContext at
// gain 1, reports the raw peak of every variant, and prints the trim
// each cue needs to land on its declared target — the number that
// belongs in the TRIM table. This is the method the file's own header
// describes; it existed only as a scratch page until today, and a
// scratch page is how nine of thirteen cues shipped off target once.
//
//   npm run dev -- --port 5193 --strictPort
//   node tools/trim-measure.mjs            # report every cue (PORT=… for another port)
//   node tools/trim-measure.mjs slap roundSign   # just these
//
// It needs a real browser because the in-app pane suspends offline
// rendering along with rAF and timers (see PROJECT-BRIEF.md, the
// Woodshed entry). Playwright is not a dependency of this project;
// it uses the copy in the npx cache, or a global one, and drives the
// Chrome already on the machine.
//
// TARGETS are declared here, not read from the file, because the file
// only stores the derived trim. Keep this list in step with the
// header comment of src/audio.js.
// ============================================================
// A bare 'playwright' when one is installed; otherwise the copy the
// Playwright MCP server keeps in the npx cache, which is the one every
// verification pass on this machine has actually used.
const pw = await import('playwright').catch(() => import(
  '/Users/stan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs'));
const { chromium } = pw;

const TARGET = {
  select: .12, draw: .22, slap: .26, scrap: .30, invalid: .34, handWon: .34,
  handLost: .34, roundSign: .40, roundLost: .46, roundWon: .50, aceStrike: .56,
  gameLost: .66, gameWon: .72, aceCounter: .80, cleanSweep: .94, revealBuild: .297,
  // The Throw, 2026-09-16.
  lock: .12, whoosh: .18, whooshHer: .18, chips: .26, armDraw: .30, clash: .56,
};
const only = process.argv.slice(2);

const launch = async () => {
  try { return await chromium.launch(); }
  catch (e) {
    if (!/Executable doesn't exist/.test(String(e))) throw e;
    return chromium.launch({ channel: 'chrome' });
  }
};

const browser = await launch();
const page = await browser.newPage();
const PORT = process.env.PORT || 5193;
await page.goto(`http://localhost:${PORT}/?rate=${process.env.RATE || 48000}`, { waitUntil: "networkidle" });

const rows = await page.evaluate(async (only) => {
  const m = await import('/src/audio.js');
  const names = Object.keys(m.CUE_DUR).filter(n => !only.length || only.includes(n));
  const out = [];
  for (const name of names) {
    const variants = m.CUE_VARIANTS[name] || 1;
    const peaks = [];
    for (let i = 0; i < variants; i++) {
      const dur = m.CUE_DUR[name] + 0.15;
      const RATE = Number(new URLSearchParams(location.search).get("rate")) || 48000;
      const c = new OfflineAudioContext(1, Math.ceil(RATE * dur), RATE);
      const g = c.createGain(); g.gain.value = 1; g.connect(c.destination);
      const trim = m.renderCue(name, c, g, 0.01, i);
      const buf = await c.startRendering();
      const d = buf.getChannelData(0);
      let peak = 0, tail = 0;
      for (let k = 0; k < d.length; k++) { const a = Math.abs(d[k]); if (a > peak) peak = a; }
      const tailFrom = Math.floor(m.CUE_DUR[name] * RATE);
      for (let k = tailFrom; k < d.length; k++) { const a = Math.abs(d[k]); if (a > tail) tail = a; }
      peaks.push({ peak, tail, trim });
    }
    out.push({ name, peaks });
  }
  return out;
}, only);
await browser.close();

for (const r of rows) {
  const loudest = Math.max(...r.peaks.map(p => p.peak));
  const target = TARGET[r.name];
  const current = r.peaks[0].trim;
  const want = target ? target / loudest : null;
  const lands = (current * loudest).toFixed(4);
  const flag = want && Math.abs(current - want) / want > 0.002 ? '  <-- retrim' : '';
  console.log(`${r.name.padEnd(12)} peak ${loudest.toFixed(4)}` +
    (r.peaks.length > 1 ? ` (${r.peaks.map(p => p.peak.toFixed(3)).join('/')})` : '') +
    `  target ${target ?? '?'}  trim now ${current}  lands ${lands}` +
    (want ? `  trim wanted ${want.toFixed(4)}` : '') +
    `  tail ${Math.max(...r.peaks.map(p => p.tail)).toFixed(4)}${flag}`);
}
