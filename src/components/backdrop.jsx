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

// One board: base tint, lengthwise grain, and the occasional knot.
function Board({ w, h, seed }) {
  const rnd = woodRand(seed);
  // Board-to-board tint variation. Real boards are cut from different
  // stock and weather unevenly; identical boards read as a texture map.
  const tint = rnd();
  const base = tint > 0.66 ? DS.timberLight : DS.timber;
  // Sun-bleaching: a per-board wash of frost. Old outdoor timber
  // silvers unevenly, board by board, which is what stops a row of
  // planks reading as one flat panel with lines drawn on it.
  const lift = (rnd() * 9 + 1);

  const grain = [];
  const lines = 10 + Math.floor(rnd() * 8);
  for (let i = 0; i < lines; i++) {
    // Grain runs the length of the board, wandering slightly. The
    // wander is what stops it reading as pinstripes.
    const x = (rnd() * 0.92 + 0.04) * w;
    const sway = (rnd() * 2 - 1) * w * 0.16;
    const sway2 = (rnd() * 2 - 1) * w * 0.12;
    const light = rnd() > 0.55;
    grain.push(
      <path key={'g' + i}
        d={`M${x.toFixed(1)},-4 C${(x + sway).toFixed(1)},${(h * 0.32).toFixed(1)} ${(x + sway2).toFixed(1)},${(h * 0.68).toFixed(1)} ${(x + sway * 0.4).toFixed(1)},${h + 4}`}
        fill="none"
        stroke={light ? DS.timberLight : DS.timberSeam}
        strokeWidth={(rnd() * 1.5 + 0.5).toFixed(2)}
        opacity={((light ? 0.40 : 0.46) * (0.45 + rnd() * 0.55)).toFixed(3)}
        strokeLinecap="round"/>
    );
  }

  // Knots: concentric rings, the thing that most says "this is a
  // real board" and the thing a repeating pattern can never have.
  const knots = [];
  const knotCount = rnd() > 0.22 ? (rnd() > 0.6 ? 2 : 1) : 0;
  for (let k = 0; k < knotCount; k++) {
    const kx = (rnd() * 0.7 + 0.15) * w;
    const ky = (rnd() * 0.82 + 0.09) * h;
    const kr = (rnd() * 0.05 + 0.045) * w;
    for (let ring = 3; ring >= 1; ring--) {
      knots.push(
        <ellipse key={`k${k}-${ring}`} cx={kx.toFixed(1)} cy={ky.toFixed(1)}
          rx={(kr * ring * 0.62).toFixed(1)} ry={(kr * ring).toFixed(1)}
          fill={ring === 1 ? DS.timberSeam : 'none'}
          stroke={DS.timberSeam} strokeWidth={(0.9 + rnd() * 0.7).toFixed(2)}
          opacity={ring === 1 ? 0.72 : 0.44}
          transform={`rotate(${(rnd() * 30 - 15).toFixed(1)} ${kx.toFixed(1)} ${ky.toFixed(1)})`}/>
      );
    }
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"
      style={{display:'block',flex:`0 0 ${w}px`}}>
      <rect width={w} height={h} fill={base}/>
      <rect width={w} height={h} fill={DS.frost} opacity={(lift / 100).toFixed(3)}/>
      {grain}
      {knots}
      {/* Seam: the shadowed gap where this board meets the next. */}
      <rect x={w - 2.5} y="0" width="2.5" height={h} fill={DS.timberSeam} opacity="0.85"/>
      <rect x={w - 4.5} y="0" width="2" height={h} fill={DS.timberSeam} opacity="0.30"/>
      <rect x="0" y="0" width="1.5" height={h} fill={DS.frost} opacity="0.045"/>
    </svg>
  );
}

// `cardW` keeps the boards in proportion to the game. A board is a
// little wider than a card, which is what makes the table read as
// furniture the cards are lying ON rather than a backdrop behind them.
export function TableSurface({ cardW = 120 }) {
  const boardW = Math.max(64, Math.round(cardW * 1.7));
  const H = 1400;                       // taller than any viewport; clipped
  const count = Math.ceil(2800 / boardW) + 1;
  return (
    <div aria-hidden="true" style={{position:'absolute',inset:0,zIndex:0,
      overflow:'hidden',pointerEvents:'none',background:DS.timber}}>
      <div style={{position:'absolute',inset:0,display:'flex',
        alignItems:'stretch',justifyContent:'center'}}>
        {Array.from({length:count},(_,i)=>(
          <Board key={i} w={boardW} h={H} seed={0x5CAA9 + i * 2654435761}/>
        ))}
      </div>
      {/* Warm light from above, as if a lantern hangs over the table.
          Two layers: the throw itself, then a floor of shadow at the
          far edge so the surface recedes instead of sitting flat. */}
      <div style={{position:'absolute',inset:0,
        background:`radial-gradient(ellipse 78% 62% at 50% -6%, ${DS.gold}2E 0%, ${DS.ember}14 42%, transparent 72%)`}}/>
      <div style={{position:'absolute',inset:0,
        background:`linear-gradient(180deg, ${DS.frost}0F 0%, transparent 26%, ${DS.timberSeam}55 82%, ${DS.timberSeam}8C 100%)`}}/>
      {/* Vignette, so the corners of the room fall away. */}
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
