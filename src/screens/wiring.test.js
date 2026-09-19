// ============================================================
// SCRAPS — a name imported into a screen must not be redeclared in it
//
// The freeze of 2026-09-18: GameScreen imported the brain's `aiSignal`
// and also pulled a field called `aiSignal` out of game state. The field
// shadowed the function, the call threw inside a timer, and the table
// waited for ever on "Signal locked. Waiting for her...". Nothing flagged
// it: the name was DEFINED, so the `no-undef` pass was clean, and no unit
// test imports a screen.
//
// This reads the source of every screen and component as text and fails
// if any imported name is declared again anywhere in the same file. It is
// blunt (it does not know about scope) and that is the point: a shadowed
// import is never what anyone meant, in any scope.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(f.name) && !/\.test\.js$/.test(f.name)) files.push(p);
  }
}(ROOT));

// comments and string literals out, so prose cannot trip it
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/`(?:\\.|[^`\\])*`/g, '``')
  .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
  .replace(/"(?:\\.|[^"\\\n])*"/g, '""');

function imported(src) {
  const names = new Set();
  for (const m of src.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/g)) {
    if (m[1]) names.add(m[1]);
    for (const part of (m[2] || '').split(',')) {
      const local = part.trim().split(/\s+as\s+/).pop().trim();
      if (local) names.add(local);
    }
  }
  return names;
}
function declared(src) {
  const body = src.replace(/import[\s\S]*?from\s*(?:''|""|``)\s*;?/g, ' ');
  const names = [];
  const add = (list) => list.split(',').forEach(part => {
    // `a`, `a = 1`, `a: b`, `...rest`
    const local = part.split('=')[0].split(':').pop().replace('...', '').trim();
    if (/^\w+$/.test(local)) names.push(local);
  });
  for (const m of body.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) add(m[1]);
  for (const m of body.matchAll(/\b(?:const|let|var)\s*\[([^\]]*)\]\s*=/g)) add(m[1]);
  for (const m of body.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=/g)) names.push(m[1]);
  for (const m of body.matchAll(/\bfunction\s+(\w+)\s*\(/g)) names.push(m[1]);
  return names;
}

describe('no screen redeclares a name it imports', () => {
  it('found the source files', () => {
    expect(files.some(f => f.endsWith('GameScreen.jsx'))).toBe(true);
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    it(path.relative(ROOT, file), () => {
      const src = strip(fs.readFileSync(file, 'utf8'));
      const imp = imported(src);
      const clash = [...new Set(declared(src).filter(n => imp.has(n)))];
      expect(clash, `${path.basename(file)} imports AND declares: ${clash.join(', ')}`).toEqual([]);
    });
  }

  it('would have caught the freeze', () => {
    const bad = strip(`import { aiSignal } from "../game/brain.js";
      export function G({ s }) { const { phase, aiSignal, aiPlayed } = s; return aiSignal(s); }`);
    expect(declared(bad).filter(n => imported(bad).has(n))).toEqual(['aiSignal']);
  });
});
