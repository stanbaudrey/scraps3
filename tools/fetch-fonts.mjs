#!/usr/bin/env node
/**
 * fetch-fonts.mjs — vendor the five Google Fonts into public/fonts/.
 *
 * Session 6 removed the runtime dependency on fonts.googleapis.com and
 * fonts.gstatic.com: no third-party request means no third-party log entry
 * of a visitor's IP and user-agent, which is the whole privacy issue.
 *
 * This script is the reproducible half of that. Re-run it to refresh the
 * vendored files (Google revs the `v16`-style version in the URL when a
 * family is re-hinted). It rewrites public/fonts/*.woff2 AND the
 * @font-face rules between the FONT-FACE:BEGIN/END sentinels in
 * index.html, so the rules and the files can never drift apart.
 *
 *   npm run fonts          # download + rewrite index.html
 *   npm run fonts:check    # verify only, exit 1 on any drift
 *
 * WEIGHTS: exactly what index.html's old <link> asked for, no more. The
 * per-family audit lives in PROJECT-BRIEF.md's Session 6 entry — three of
 * these faces are provably unused today and one used weight (Work Sans 900)
 * is not here, matching Google's old behaviour rather than silently
 * changing it.
 *
 * SUBSETS: latin and latin-ext only. Google's default also serves cyrillic,
 * greek and vietnamese; nothing in this game renders those. The
 * unicode-range descriptors are preserved verbatim, so a browser still
 * downloads only the subset it actually needs — latin, in practice.
 */

import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'fonts');

// A modern Chrome UA is required: Google serves woff2 only to browsers it
// recognises, and falls back to the much larger ttf otherwise.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0.0.0 Safari/537.36';

const KEEP_SUBSETS = new Set(['latin', 'latin-ext']);

/** Mirrors the family+weight set index.html requested before self-hosting. */
const SPEC = [
  { family: 'Bungee Shade',  slug: 'bungee-shade',  css: 'Bungee+Shade' },
  { family: 'Fjalla One',    slug: 'fjalla-one',    css: 'Fjalla+One' },
  { family: 'Baloo 2',       slug: 'baloo-2',       css: 'Baloo+2:wght@600;700;800' },
  { family: 'Work Sans',     slug: 'work-sans',     css: 'Work+Sans:wght@400;500;600;700' },
  { family: 'IBM Plex Mono', slug: 'ibm-plex-mono', css: 'IBM+Plex+Mono:wght@400;500;700' },
];

async function get(url, asBuffer = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : res.text();
}

/**
 * Google's CSS is a flat list of @font-face rules, each preceded by a
 * `/* subset *\/` comment. Split on those comments so every rule keeps the
 * subset label that identifies it.
 */
function parseFaces(css, family) {
  const faces = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while ((m = re.exec(css))) {
    const [, subset, block] = m;
    const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
    const style = /font-style:\s*(\w+)/.exec(block)?.[1] ?? 'normal';
    const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    if (!weight || !url || !range) continue;
    faces.push({ family, subset, weight, style, url, range });
  }
  return faces;
}

const banner = (s) => `\n\x1b[1m${s}\x1b[0m`;

async function main() {
  const check = process.argv.includes('--check');
  await mkdir(OUT_DIR, { recursive: true });

  const all = [];
  for (const { family, slug, css } of SPEC) {
    const url = `https://fonts.googleapis.com/css2?family=${css}&display=swap`;
    const sheet = await get(url);
    const faces = parseFaces(sheet, family).filter((f) => KEEP_SUBSETS.has(f.subset));
    if (!faces.length) throw new Error(`no latin faces parsed for ${family}`);
    // Work Sans and Baloo 2 are variable fonts: Google serves ONE file per
    // subset and varies only the font-weight descriptor, so several faces
    // share a URL. Name by weight only where the weights are genuinely
    // different files, or we write identical bytes four times over.
    for (const f of faces) f.slug = slug;
    for (const subset of new Set(faces.map((f) => f.subset))) {
      const group = faces.filter((f) => f.subset === subset);
      const oneFile = new Set(group.map((f) => f.url)).size === 1;
      for (const f of group) {
        f.file = oneFile
          ? `${slug}-${subset}.woff2`
          : `${slug}-${f.weight}-${subset}.woff2`;
      }
    }
    all.push(...faces);
    const files = new Set(faces.map((f) => f.file)).size;
    console.error(`${family}: ${faces.length} faces over ${files} file(s) (${
      [...new Set(faces.map((f) => f.weight))].join(', ')})${
      files < faces.length ? '  [variable]' : ''}`);
  }

  // Download every face we do not already have byte-identical on disk.
  let changed = 0;
  const seen = new Set();
  for (const f of all) {
    if (seen.has(f.file)) continue;
    seen.add(f.file);
    const dest = join(OUT_DIR, f.file);
    const body = await get(f.url, true);
    const prev = existsSync(dest) ? await readFile(dest) : null;
    if (prev && prev.equals(body)) continue;
    changed++;
    if (!check) await writeFile(dest, body);
    console.error(`  ${prev ? 'UPDATED' : 'NEW'} ${f.file} (${(body.length / 1024).toFixed(1)} KB)`);
  }

  // Anything in the directory we no longer reference is stale.
  const want = new Set(all.map((f) => f.file));
  const have = existsSync(OUT_DIR) ? await readdir(OUT_DIR) : [];
  const stale = have.filter((n) => n.endsWith('.woff2') && !want.has(n));
  for (const n of stale) console.error(`  STALE ${n} (no longer referenced)`);

  const cssOut = all
    .map((f) =>
      [
        `      /* ${f.family} ${f.weight} — ${f.subset} */`,
        `      @font-face {`,
        `        font-family: '${f.family}';`,
        `        font-style: ${f.style};`,
        `        font-weight: ${f.weight};`,
        `        font-display: swap;`,
        `        src: url('/fonts/${f.file}') format('woff2');`,
        `        unicode-range: ${f.range};`,
        `      }`,
      ].join('\n')
    )
    .join('\n');

  console.error(banner(
    `${all.length} faces over ${want.size} files, ${changed} changed, ${stale.length} stale`));

  // Rewrite the @font-face rules in place, between the sentinels in
  // index.html's <style>. Pasting them by hand is how the rules and the
  // files in public/fonts drift apart without anything noticing.
  const htmlPath = join(ROOT, 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const BEGIN = '      /* FONT-FACE:BEGIN */\n';
  const END = '      /* FONT-FACE:END */\n';
  const i = html.indexOf(BEGIN);
  const j = html.indexOf(END);
  if (i < 0 || j < 0 || j < i) {
    throw new Error('FONT-FACE:BEGIN/END sentinels missing from index.html');
  }
  const nextHtml = html.slice(0, i + BEGIN.length) + cssOut + '\n' + html.slice(j);
  const htmlDrifted = nextHtml !== html;

  if (check) {
    const problems = [];
    if (changed) problems.push(`${changed} font file(s) differ from Google`);
    if (stale.length) problems.push(`${stale.length} stale file(s) in public/fonts`);
    if (htmlDrifted) problems.push("index.html's @font-face rules are out of date");
    if (problems.length) {
      console.error(`\x1b[31mDRIFT: ${problems.join('; ')}.\x1b[0m`);
      console.error('Run `npm run fonts` to regenerate.');
      process.exit(1);
    }
    console.error('\x1b[32mVendored fonts and index.html are in sync with Google.\x1b[0m');
    return;
  }

  if (htmlDrifted) {
    await writeFile(htmlPath, nextHtml);
    console.error('index.html: @font-face rules rewritten');
  } else {
    console.error('index.html: @font-face rules already current');
  }
}

main().catch((e) => {
  console.error(`fetch-fonts failed: ${e.message}`);
  process.exit(1);
});
