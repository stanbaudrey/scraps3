// ============================================================
// SCRAPS — Static backdrop + animated title
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { DS, F } from "../styles/theme.js";
import { playSquareUp } from "../audio.js";

// ─────────────────────────────────────────────────────────────
// SwirlBg + AnimatedTitle
// ─────────────────────────────────────────────────────────────
// SwirlBg — flowing, pulsating color swaths. Three separate composited
// layers, each animating ONLY opacity + transform (translate/scale) via
// CSS keyframes in index.html — never background-position, blur, or the
// gradient string itself. That distinction matters: an earlier version
// of this component animated properties that forced a repaint every
// frame and caused real hover lag; opacity/transform are compositor-only
// and stay cheap regardless of how long the animation runs.
export function SwirlBg() {
  return (
    <div style={{position:'absolute',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:'-12%',
        background:`radial-gradient(ellipse 60% 50% at 25% 30%, ${DS.canopy}66 0%, transparent 70%)`,
        animation:'swirlFlowA 16s ease-in-out infinite',willChange:'opacity, transform'}}/>
      <div style={{position:'absolute',inset:'-12%',
        background:`radial-gradient(ellipse 55% 45% at 75% 70%, ${DS.ember}55 0%, transparent 70%)`,
        animation:'swirlFlowB 20s ease-in-out infinite',willChange:'opacity, transform'}}/>
      <div style={{position:'absolute',inset:'-12%',
        background:`radial-gradient(ellipse 50% 40% at 50% 92%, ${DS.gold}4a 0%, transparent 70%)`,
        animation:'swirlFlowC 24s ease-in-out infinite',willChange:'opacity, transform'}}/>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
// TableSurface — the wood the game is played on
// ─────────────────────────────────────────────────────────────
// Added 2026-08-30. Before this the table was ONE two-stop radial
// gradient and nothing else — no material, no grain, no seams — and
// a flat dark-green field under cream cards is the universal read of
// a felt card table. That was the whole of the "it looks like boring
// cards on a felt table" problem: not the hue, the thinness. Changing
// the colour alone would have re-bought the same result in a new
// shade.
//
// Drawn as a weathered picnic table seen from directly overhead:
// individual boards running top-to-bottom, sized against the CARD so
// the table stays in scale with the game at every viewport, with warm
// light from the top edge as if from a lantern above.
//
// Zero dependencies, as everything here is. The grain is procedural
// rather than a repeating CSS pattern, because a tiling gradient
// reads instantly as wallpaper — the seams line up and the eye finds
// the tile. Every board here gets its own tint, its own grain lines
// and its own knots.
//
// The PRNG is seeded, deliberately, exactly as the audio exciter is:
// a table that reshuffles its own woodgrain on every render would
// shimmer, and any re-render would be visible as the wood moving.
// Same seed, same table, forever.
function woodRand(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

// Mix two hex colours. Board tints are a BLEND rather than a choice
// between two tokens: real boards differ from each other by a little,
// and two discrete shades read as a striped UI element instead of as
// timber. Nothing here may look like a control.
function mix(a, b, t) {
  const p = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  const c = (x,y) => Math.round(x + (y-x)*t).toString(16).padStart(2,'0');
  return `#${c(ar,br)}${c(ag,bg)}${c(ab,bb)}`;
}

// One horizontal slat: its own tint, grain running along its length,
// knots, and the occasional nail head.
function Board({ w, h, seed, nailXs }) {
  const rnd = woodRand(seed);
  // Close together on purpose. Distinct enough to read as separate
  // boards, never so distinct that a board reads as a panel.
  const base = mix(DS.timber, DS.timberLight, rnd() * 0.42);
  const wash = (rnd() * 5).toFixed(2);

  const grain = [];
  const lines = 12 + Math.floor(rnd() * 9);
  for (let i = 0; i < lines; i++) {
    const y = (rnd() * 0.94 + 0.03) * h;
    const s1 = (rnd() * 2 - 1) * h * 0.18;
    const s2 = (rnd() * 2 - 1) * h * 0.14;
    const light = rnd() > 0.5;
    grain.push(
      <path key={'g'+i}
        d={`M-4,${y.toFixed(1)} C${(w*0.3).toFixed(0)},${(y+s1).toFixed(1)} ${(w*0.68).toFixed(0)},${(y+s2).toFixed(1)} ${w+4},${(y+s1*0.35).toFixed(1)}`}
        fill="none"
        stroke={light ? DS.timberLight : DS.timberSeam}
        strokeWidth={(rnd() * 1.4 + 0.45).toFixed(2)}
        opacity={((light ? 0.34 : 0.40) * (0.4 + rnd() * 0.6)).toFixed(3)}
        strokeLinecap="round"/>
    );
  }

  // Knots, with the short crack that usually runs out of one. This is
  // the detail a repeating CSS pattern can never have.
  const knots = [];
  const knotCount = rnd() > 0.3 ? (rnd() > 0.62 ? 2 : 1) : 0;
  for (let k = 0; k < knotCount; k++) {
    const kx = (rnd() * 0.86 + 0.07) * w;
    const ky = (rnd() * 0.6 + 0.2) * h;
    // Small and tight. An over-large knot reads as a ripple or a
    // planet rather than a flaw in a board.
    const kr = (rnd() * 0.05 + 0.045) * h;
    const rot = (rnd() * 50 - 25).toFixed(1);
    for (let ring = 2; ring >= 1; ring--) {
      knots.push(
        <ellipse key={`k${k}-${ring}`} cx={kx.toFixed(1)} cy={ky.toFixed(1)}
          rx={(kr * ring * 1.15).toFixed(1)} ry={(kr * ring * 0.72).toFixed(1)}
          fill={ring === 1 ? DS.timberSeam : 'none'}
          stroke={DS.timberSeam} strokeWidth={(0.7 + rnd() * 0.6).toFixed(2)}
          opacity={ring === 1 ? 0.66 : 0.30}
          transform={`rotate(${rot} ${kx.toFixed(1)} ${ky.toFixed(1)})`}/>
      );
    }
    if (rnd() > 0.45) {
      const dir = rnd() > 0.5 ? 1 : -1;
      knots.push(
        <path key={`kc${k}`}
          d={`M${kx.toFixed(1)},${ky.toFixed(1)} l${(dir*kr*3.4).toFixed(1)},${(rnd()*5-2.5).toFixed(1)}`}
          stroke={DS.timberSeam} strokeWidth="1.2" opacity="0.42" fill="none" strokeLinecap="round"/>
      );
    }
  }

  // Nails. Their x positions are passed IN, identical on every board,
  // because nails follow the joist underneath — a column down the
  // table. Randomising them per board is the tell that it is drawn.
  const nails = nailXs.map((nx, i) => {
    const ny = h * (0.42 + (rnd() * 0.16 - 0.08));
    const r  = Math.max(1.6, h * 0.035);
    return (
      <g key={'n'+i}>
        <ellipse cx={nx} cy={ny.toFixed(1)} rx={(r*1.15).toFixed(1)} ry={r.toFixed(1)}
          fill={DS.timberSeam} opacity="0.62"/>
        <ellipse cx={nx} cy={(ny - r*0.34).toFixed(1)} rx={(r*0.6).toFixed(1)} ry={(r*0.34).toFixed(1)}
          fill={DS.frost} opacity="0.16"/>
      </g>
    );
  });

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
      aria-hidden="true" style={{display:'block',flex:`0 0 ${h}px`}}>
      <rect width={w} height={h} fill={base}/>
      <rect width={w} height={h} fill={DS.frost} opacity={(wash/100).toFixed(3)}/>
      {grain}
      {knots}
      {nails}
      {/* The shadowed gap where this board meets the next one down. */}
      <rect x="0" y={h-2.5} width={w} height="2.5" fill={DS.timberSeam} opacity="0.85"/>
      <rect x="0" y={h-4.5} width={w} height="2" fill={DS.timberSeam} opacity="0.28"/>
      <rect x="0" y="0" width={w} height="1.4" fill={DS.frost} opacity="0.05"/>
    </svg>
  );
}

// `cardH` keeps the slats in proportion to the game: a board is a bit
// taller than a card, so the table reads as furniture the cards are
// lying ON rather than a backdrop behind them.
export function TableSurface({ cardH = 146 }) {
  const boardH = Math.max(70, Math.round(cardH * 1.25));
  const W = 1600;                        // nominal; stretched to fit
  const count = Math.ceil(1200 / boardH) + 2;
  // Two to four nail columns, fixed for the whole table.
  const nr = woodRand(0x2C0DE);
  const cols = 2 + Math.floor(nr() * 3);
  const nailXs = Array.from({length:cols},(_,i)=>
    Math.round(W * ((i + 0.5) / cols + (nr() * 0.1 - 0.05))));

  return (
    <div aria-hidden="true" style={{position:'absolute',inset:0,zIndex:0,
      overflow:'hidden',pointerEvents:'none',background:DS.timber}}>
      <div style={{position:'absolute',inset:0,display:'flex',
        flexDirection:'column',justifyContent:'center'}}>
        {Array.from({length:count},(_,i)=>(
          <Board key={i} w={W} h={boardH} nailXs={nailXs} seed={0x5CAA9 + i * 2654435761}/>
        ))}
      </div>
      {/* Warm light from above, as if a lantern hangs over the table. */}
      <div style={{position:'absolute',inset:0,
        background:`radial-gradient(ellipse 78% 62% at 50% -6%, ${DS.gold}2E 0%, ${DS.ember}14 42%, transparent 72%)`}}/>
      <div style={{position:'absolute',inset:0,
        background:`linear-gradient(180deg, ${DS.frost}0F 0%, transparent 26%, ${DS.timberSeam}55 82%, ${DS.timberSeam}8C 100%)`}}/>
      <div style={{position:'absolute',inset:0,
        background:`radial-gradient(ellipse 74% 68% at 50% 42%, transparent 44%, ${DS.timberSeam}66 100%)`}}/>
    </div>
  );
}

// AnimatedTitle — the SCRAPS wordmark.
//
// Three behaviours share the letters, and each gets its own nested
// span because each wants `transform` (see the .scraps-* block in
// index.html):
//   1. Entrance, then a perpetual riffle — a spring travelling the row
//      the way a bridged deck releases.
//   2. Touch devices: the letters go loose and snap flush, once shortly
//      after the entrance settles and again on every tap, with a
//      matching sound. Hover has no meaning there, so the gesture needs
//      its own trigger or nobody would ever see it.
//   3. Pointer devices: the hand fans open under the cursor, pure CSS.
//      Note .scraps-title keeps `cursor: default` — hovering does
//      something, clicking does not, and the cursor must not promise
//      otherwise.
const LETTERS = 'SCRAPS'.split('');
// Fixed per letter, never random: a gesture that differs run to run
// reads as a glitch rather than a flourish. Mirrors the audio stagger.
const SCATTER = [
  { dx:-5, dy: 4, dr:-5 }, { dx: 4, dy:-3, dr: 4 }, { dx:-3, dy: 5, dr:-3 },
  { dx: 6, dy:-4, dr: 6 }, { dx:-6, dy: 3, dr:-4 }, { dx: 3, dy:-5, dr: 5 },
];
const TAP_STAGGER = 0.028;                        // seconds, matches playSquareUp
const TAP_MS = 720 + (LETTERS.length - 1) * TAP_STAGGER * 1000 + 60;

export function AnimatedTitle() {
  const [squaring, setSquaring] = useState(false);
  const timer = useRef(null);
  // (hover: none) rather than a width breakpoint: what actually
  // decides this is whether the device can hover, not how wide it is.
  const [isTouch] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none), (pointer: coarse)').matches
  );

  const squareUp = useCallback(() => {
    setSquaring(true);
    playSquareUp();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSquaring(false), TAP_MS);
  }, []);

  useEffect(() => {
    if (!isTouch) return undefined;
    const t = setTimeout(squareUp, 1400);          // after the entrance lands
    return () => { clearTimeout(t); clearTimeout(timer.current); };
  }, [isTouch, squareUp]);

  return (
    <h1 className="scraps-title" style={{marginBottom:'clamp(26px,6vw,36px)'}}
      onClick={isTouch ? squareUp : undefined}>
      {LETTERS.map((l,i)=>(
        <span key={i} className="scraps-letter"
          style={{fontFamily:F.title,
            fontSize:'clamp(44px,min(14.5vw,26vh),148px)',lineHeight:1,
            color:l==='A'?DS.voltage:DS.frost,
            textShadow:l==='A'?`0 0 30px ${DS.voltage}88,0 3px 0 rgba(0,0,0,.4)`:`0 3px 0 rgba(0,0,0,.4)`,
            animation:`letterAppear 0.6s cubic-bezier(.34,1.6,.64,1) ${i*.09}s both,`+
                      ` titleRiffle 2.08s cubic-bezier(.3,.9,.4,1) ${1.1+i*.055}s infinite`}}>
          <span className="scraps-kinetic">
            <span className={`tap-layer${squaring?' squaring':''}`}
              style={{'--dx':`${SCATTER[i].dx}px`,'--dy':`${SCATTER[i].dy}px`,
                '--dr':`${SCATTER[i].dr}deg`,
                animationDelay:`${i*TAP_STAGGER}s`}}>
              {l}
            </span>
          </span>
        </span>
      ))}
    </h1>
  );
}
