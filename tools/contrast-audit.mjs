// ============================================================
// SCRAPS — contrast audit
//
// Every text/background pairing the app actually renders, checked
// against WCAG 2.1 AA and AAA from the real tokens in theme.js.
//
// It exists because eyeballing does not work and because the brief
// spent two months naming a contrast target (`slate #8A8FA8` on
// `dusk #1C1C28`) that the Forest Dusk reskin had already deleted.
// Running this on 2026-08-27 found two live AA failures nobody had
// seen: red suits on a hand card at 1.98:1, and the best-hand badge
// at 4.27:1.
//
// The PAIRS list is hand-maintained on purpose — it encodes which
// foreground genuinely lands on which background, which no amount of
// static parsing can work out for a codebase of inline styles. ADD A
// ROW whenever a new colour pairing ships.
//
//   node tools/contrast-audit.mjs
//
// Not part of `npm test`: it imports theme.js as an ES module and
// tells you numbers rather than asserting a threshold, so it is a
// report, not a gate.
// ============================================================
import { DS } from '../src/styles/theme.js';

const hex = h => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)/255); };
const lin = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
const L = h => { const [r,g,b] = hex(h).map(lin); return 0.2126*r + 0.7152*g + 0.0722*b; };
const ratio = (a,b) => { const la=L(a), lb=L(b); const [hi,lo]=la>lb?[la,lb]:[lb,la]; return (hi+0.05)/(lo+0.05); };

// Every pairing the app actually renders, read off the components.
const PAIRS = [
  // [fg token, bg token, where, size class]
  ['frost','dusk','narrator hint on the table','large'],
  ['frost','duskMid','modal body copy (skip-turn, ace notices)','large'],
  ['frost','inkLight','FULL SCRAP body copy','large'],
  ['slateLight','dusk','splash subtitle','large'],
  ['slateLight','duskMid','rules panel body, picker descriptions','normal'],
  ['slate','dusk','score labels OPP/YOU, storyboard footer','normal'],
  ['slate','duskLight','muted text on the lighter panel','normal'],
  ['slate','duskMid','difficulty W/L record, match conditions','normal'],
  ['voltage','dusk','your score, active narrator, legality strip','large'],
  ['voltage','duskMid','RULES heading, EASY label','large'],
  ['ember','dusk','opponent score, danger narrator','large'],
  ['ember','duskMid','HARD label on the picker panel','large'],
  ['gold','dusk','FULL SCRAP / win-screen milestone text','large'],
  ['gold','inkLight','FULL SCRAP bonus line','large'],
  ['ink','voltage','text on a primary button','normal'],
  ['ink','gold','text on a milestone button','normal'],
  ['ink','ember','text on a danger button','normal'],
  ['ink','frost','card rank + suit on a face-up card','normal'],
  ['frost','ink','card rank on a face-down/ink card','normal'],
  ['emberInk','frost','red suits, rank + pip, on a HAND card','normal'],
  ['ember','ink','red suits on a SCRAPS card (dark face)','normal'],
  ['voltage','ink','black suits on a SCRAPS card (dark face)','normal'],
  ['emberHover','inkLight','hand-name badge at rank 5+, either Scraps zone','normal'],
  ['voltage','inkLight','hand-name badge, your Scraps zone','normal'],
  ['slateLight','inkLight','hand-name badge, weak hand','normal'],
  ['voltage','duskLight','active cue on the lighter panel','normal'],
  ['slateLight','duskLight','body copy on the lighter panel','normal'],
];

const AA = (r,size) => r >= (size==='large' ? 3 : 4.5);
const AAA = (r,size) => r >= (size==='large' ? 4.5 : 7);

let fails = 0, aaOnly = 0;
console.log('ratio  AA   AAA  size    fg/bg                        where');
console.log('─'.repeat(96));
for (const [f,b,where,size] of PAIRS) {
  const r = ratio(DS[f], DS[b]);
  const aa = AA(r,size), aaa = AAA(r,size);
  if (!aa) fails++; else if (!aaa) aaOnly++;
  console.log(
    `${r.toFixed(2).padStart(5)}  ${(aa?'✓':'FAIL').padEnd(4)} ${(aaa?'✓':'—').padEnd(4)} ${size.padEnd(6)}  ${(f+'/'+b).padEnd(26)} ${where}`
  );
}
console.log('─'.repeat(96));
console.log(`${PAIRS.length} pairings · ${fails} below AA · ${aaOnly} AA but not AAA`);
console.log('\nsize: "large" = 18.66px bold or 24px+ (AA 3:1 / AAA 4.5:1); "normal" = AA 4.5:1 / AAA 7:1');
