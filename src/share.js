// ============================================================
// SCRAPS — Share. The SHARE button on the match screen.
//
// Added 2026-09-14. What it sends is a sentence with the result in
// it and the game's line — TAGLINE below, the splash subtitle — plus
// the site's address, and where the platform can
// carry one, a PICTURE of the result drawn on the spot.
//
// Three tiers, best first, and the button never has to know which:
//
//   1. The Web Share sheet WITH the image (iOS and iPadOS Safari
//      15+, macOS Safari, Android Chrome): text, URL and a PNG
//      result card rendered on a canvas from the live tokens and
//      the game's own self-hosted Rye and Fjalla. This is the
//      "full iOS share" — Messages, Mail, AirDrop, Photos all take
//      the picture.
//   2. The Web Share sheet without files, where `share` exists but
//      `canShare({files})` does not.
//   3. The clipboard, everywhere else (desktop Chrome and Firefox):
//      the sentence and the URL are copied and the button says
//      COPIED for a moment.
//
// The address is the site's, from src/site.js, never the page's own
// (Stan, 2026-09-17: "the URL is scraps.games and should read as such").
// It used to be `window.location.origin`, which put a Vercel preview's
// long address into every share made from a preview. The copied text
// carries the bare host, scraps.games; the share sheet gets the full
// https address as its link.
//
// The card is rendered BEFORE the button is pressed (see
// `prepareShareCard`), so the press itself calls `navigator.share`
// inside the user's gesture with the file already in hand. Safari
// is strict about that window.
// ============================================================
import { DS } from "./styles/theme.js";
import { SITE, SITE_HOST } from "./site.js";

// No trailing period on purpose: the share sentence appends its own,
// and the share card sets this line as spaced capitals, where a period
// would hang off the end as a stray dot. The splash adds its own.
// "Poker with both hands" until 2026-09-14 (Stan's revision).
export const TAGLINE = 'Play poker with both hands';

const DIFF = { easy: 'Easy', hard: 'Hard' };

export function buildShareText({ won, p, a, difficulty }) {
  const d = DIFF[difficulty] || (difficulty ? difficulty[0].toUpperCase() + difficulty.slice(1) : '');
  const on = d ? ` on ${d}` : '';
  return won
    ? `I beat Scraps ${p}–${a}${on}. ${TAGLINE}.`
    : `Scraps beat me ${a}–${p}${on}. ${TAGLINE}.`;
}

// ─────────────────────────────────────────────────────────────
// The result card. 1200×630, the Open Graph shape, so it sits in a
// message the same way the site's link preview does. Drawn from the
// same tokens the table uses; nothing here is a file.
// ─────────────────────────────────────────────────────────────
const W = 1200, H = 630;

async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load("400 100px 'Rye'"),
      document.fonts.load("400 60px 'Fjalla One'"),
      document.fonts.load("700 30px 'Work Sans'"),
    ]);
  } catch { /* the system fallbacks draw instead */ }
}

// A torn edge: the rectangle walked in short steps with a seeded
// jitter, the way scrapLook tears a Scraps card. Same xorshift as
// everything else in this project, so the card is stable.
function tornPath(g, x, y, w, h, seed = 1) {
  let s = (seed * 0x9E3779B9) >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const jit = () => (rnd() * 2 - 1) * 7;
  const step = 34;
  g.beginPath();
  g.moveTo(x + jit(), y + jit());
  for (let px = x + step; px < x + w; px += step) g.lineTo(px, y + jit());
  g.lineTo(x + w + jit(), y + jit());
  for (let py = y + step; py < y + h; py += step) g.lineTo(x + w + jit(), py);
  g.lineTo(x + w + jit(), y + h + jit());
  for (let px = x + w - step; px > x; px -= step) g.lineTo(px, y + h + jit());
  g.lineTo(x + jit(), y + h + jit());
  for (let py = y + h - step; py > y; py -= step) g.lineTo(x + jit(), py);
  g.closePath();
}

export async function renderShareCard({ won, p, a, difficulty }) {
  if (typeof document === 'undefined') return null;
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return null;

  // Ground: the redwood, flat, with the lantern from above.
  g.fillStyle = DS.timber;
  g.fillRect(0, 0, W, H);
  const boards = 7, bh = H / boards;
  for (let i = 0; i < boards; i++) {
    g.fillStyle = i % 2 ? DS.timber : DS.timberLight;
    g.globalAlpha = i % 2 ? 1 : 0.22;
    g.fillRect(0, i * bh, W, bh);
    g.globalAlpha = 1;
    g.fillStyle = DS.timberSeam;
    g.globalAlpha = 0.8;
    g.fillRect(0, (i + 1) * bh - 3, W, 3);
    g.globalAlpha = 1;
  }
  const lamp = g.createRadialGradient(W / 2, -40, 60, W / 2, -40, 780);
  lamp.addColorStop(0, `${DS.gold}33`);
  lamp.addColorStop(0.45, `${DS.ember}14`);
  lamp.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lamp; g.fillRect(0, 0, W, H);
  const vig = g.createRadialGradient(W / 2, H * 0.46, H * 0.2, W / 2, H * 0.46, W * 0.62);
  vig.addColorStop(0, 'rgba(36,28,20,0)');
  vig.addColorStop(1, 'rgba(36,28,20,0.62)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);

  // The wordmark, Rye, the A in voltage as on the splash.
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.font = "400 118px 'Rye', serif";
  const word = 'SCRAPS';
  let tw = 0;
  for (const ch of word) tw += g.measureText(ch).width + 8;
  let x = W / 2 - tw / 2;
  for (const ch of word) {
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 0; g.shadowOffsetY = 4;
    g.fillStyle = ch === 'A' ? DS.voltage : DS.frost;
    g.fillText(ch, x, 168);
    x += g.measureText(ch).width + 8;
  }
  g.shadowColor = 'transparent'; g.shadowOffsetY = 0;

  // The tagline under it, Fjalla, as on the splash.
  g.textAlign = 'center';
  g.font = "400 34px 'Fjalla One', sans-serif";
  g.fillStyle = DS.slateLight;
  g.fillText(TAGLINE.toUpperCase().split('').join(' '), W / 2, 218);

  // The result on one of the game's own SCRAPS cards (Stan, 2026-09-14):
  // torn pale stock, a shade of lean, a little grime at the edges, ink
  // on it — not a rounded cream panel. The tear is seeded so the card
  // is the same card every time.
  const cw = 580, ch = 270, cx = W / 2 - cw / 2, cy = 258;
  g.save();
  g.translate(W / 2, cy + ch / 2);
  g.rotate(-1.6 * Math.PI / 180);
  g.translate(-W / 2, -(cy + ch / 2));
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 22; g.shadowOffsetX = -4; g.shadowOffsetY = 10;
  tornPath(g, cx, cy, cw, ch, 7);
  g.fillStyle = DS.stockPale;
  g.fill();
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  // Edge grime and two faint stains, clipped to the tear.
  g.save();
  tornPath(g, cx, cy, cw, ch, 7);
  g.clip();
  const grime = g.createLinearGradient(cx, cy, cx + cw, cy + ch);
  grime.addColorStop(0, `${DS.timberSeam}00`);
  grime.addColorStop(1, `${DS.timberSeam}33`);
  g.fillStyle = grime; g.fillRect(cx, cy, cw, ch);
  for (const [sx, sy, sr] of [[cx + cw * 0.82, cy + ch * 0.22, 70], [cx + cw * 0.14, cy + ch * 0.8, 52]]) {
    const st = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
    st.addColorStop(0, `${DS.timberSeam}2E`);
    st.addColorStop(1, `${DS.timberSeam}00`);
    g.fillStyle = st; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  }
  g.lineWidth = 3; g.strokeStyle = `${DS.timberSeam}55`;
  tornPath(g, cx + 1.5, cy + 1.5, cw - 3, ch - 3, 7); g.stroke();
  g.restore();

  const verdict = won ? 'YOU WIN' : 'OPPONENT WINS';
  g.fillStyle = DS.ink;
  g.font = "400 58px 'Rye', serif";
  g.fillText(verdict, W / 2, cy + 96);
  g.font = "400 96px 'Fjalla One', sans-serif";
  g.fillStyle = DS.ink;
  const score = won ? `${p}–${a}` : `${a}–${p}`;
  g.fillText(score, W / 2, cy + 200);
  const d = DIFF[difficulty] || '';
  if (d) {
    g.font = "700 22px 'Work Sans', sans-serif";
    g.fillStyle = DS.inkLight;
    g.fillText(d.toUpperCase().split('').join(' '), W / 2, cy + 240);
  }
  g.restore();

  // The address, small, bottom right.
  g.textAlign = 'right';
  g.font = "700 24px 'Work Sans', sans-serif";
  g.fillStyle = DS.slateLight;
  g.fillText(siteHost(), W - 48, H - 40);

  return new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
}

const siteHost = () => SITE_HOST;
const siteUrl = () => `${SITE}/`;

// Pre-render, so the press has the file ready. Cached per result.
let prepared = null;
export function prepareShareCard(args) {
  const key = JSON.stringify(args);
  if (prepared && prepared.key === key) return prepared.promise;
  const promise = renderShareCard(args).catch(() => null);
  prepared = { key, promise };
  return promise;
}

export async function shareResult({ won, p, a, difficulty, text }) {
  const url = siteUrl();
  const line = text || buildShareText({ won, p, a, difficulty });
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (nav && typeof nav.share === 'function') {
    let files = null;
    try {
      const blob = await prepareShareCard({ won, p, a, difficulty });
      if (blob && typeof File !== 'undefined') {
        const file = new File([blob], 'scraps-result.png', { type: 'image/png' });
        if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) files = [file];
      }
    } catch { files = null; }
    try {
      await nav.share(files ? { title: 'SCRAPS', text: line, url, files } : { title: 'SCRAPS', text: line, url });
      return 'shared';
    } catch (e) {
      // The user closing the sheet is an AbortError and is not a
      // failure; anything else falls through to the clipboard.
      if (e && e.name === 'AbortError') return 'idle';
    }
  }
  try {
    await nav.clipboard.writeText(`${line} ${siteHost()}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
