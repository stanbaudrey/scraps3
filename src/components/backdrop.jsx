// ============================================================
// SCRAPS — Static backdrop + animated title
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { DS, F } from "../styles/theme.js";
import { playSquareUp } from "../audio.js";

// ─────────────────────────────────────────────────────────────
// RidgeBackdrop — the night range behind every menu screen
// ─────────────────────────────────────────────────────────────
// Added 2026-08-30, replacing `SwirlBg` on all four screens that used
// it (splash, difficulty picker, walkthrough, lose screen). SwirlBg was
// three blurred radial gradients on near-black green and was the entire
// background, which is two of the lookbook's named tells at once: a
// coloured glow parked behind hero content, and an aurora/mesh gradient
// field. It is also the same defect the audit found on the TABLE —
// thinness, not hue — and the table was rebuilt as real material while
// the splash kept the old treatment, so the game's first screen had
// become its least-drawn one.
//
// Traced and re-cut from a low-poly reference Stan supplied, then
// re-lit: his reference is a DAYLIT sunset, this is a moonlit night.
// Every value is a Forest Dusk token or a blend of two.
//
// THE ONE ART-DIRECTION RULE HERE, and it is load-bearing:
// `frost` BELONGS TO THE WORDMARK. The snow is lit in `slateLight`
// and `slate` and never goes brighter, with `frost` spent only on a
// handful of summit shards a few units across. A literal reading of the
// reference would put a field of near-white snow directly behind
// near-white type. The brightest thing on this screen has to be the
// word SCRAPS, so the range is lit one full step below it.
//
// No sun, by Stan's call: a disc low on the horizon reads as exactly
// the glow-behind-the-headline this component exists to remove. The
// sky's warmth is a broad low afterglow band instead, at single-digit
// alpha, which is a gradient rather than a bloom.
//
// Drawn with a clipPath rather than by fitting each facet to the
// silhouette: facets are painted as generous overlapping polygons and
// the clip trims them to the mountain. Fitting them by hand is how
// low-poly art picks up hairline seams between planes.
//
// The PRNG is seeded, exactly as `TableSurface` and the audio exciter
// are: stars that re-scatter on every render would visibly jump on any
// re-render, and a background that reshuffles itself is a background
// nobody trusts. Same seed, same sky, forever.

// Weighted toward the top of the frame: a real sky has more visible
// sky where there is more sky, and an even scatter reads as a texture.
const STARS = (() => {
  const r = woodRand(0x51A25);
  return Array.from({ length: 74 }, () => {
    const t = r();
    return {
      x: +(r() * 160).toFixed(2),
      y: +(t * t * 62 + 1).toFixed(2),          // squared: crowds the top
      r: +(r() * 0.40 + 0.15).toFixed(2),
      o: +(r() * 0.46 + 0.26).toFixed(2),
      dur: +(r() * 4.4 + 2.8).toFixed(2),
      delay: +(r() * 7).toFixed(2),
    };
  });
})();

// One band of conifers whose tops run along a line, filled to the
// bottom of the frame. Heights and widths vary per tree and the seed is
// fixed, so the treeline is irregular the way a real one is without
// being different on every paint. This is the reference's strongest
// single device and it is what stops the ridges reading as bare shapes.
function conifers({ x0, y0, x1, y1, count, minH, maxH, seed, fill, opacity = 1 }) {
  const r = woodRand(seed);
  let d = `M${x0 - 6},110 L${x0 - 6},${y0.toFixed(1)}`;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const bx = x0 + (x1 - x0) * t;
    const by = y0 + (y1 - y0) * t;
    const h = minH + r() * (maxH - minH);
    const w = (0.34 + r() * 0.30) * h;          // narrow: spruce, not oak
    const lean = (r() - 0.5) * w * 0.30;
    d += ` L${(bx - w / 2).toFixed(1)},${by.toFixed(1)}`
      +  ` L${(bx + lean).toFixed(1)},${(by - h).toFixed(1)}`
      +  ` L${(bx + w / 2).toFixed(1)},${by.toFixed(1)}`;
  }
  d += ` L${(x1 + 6).toFixed(1)},${y1.toFixed(1)} L${(x1 + 6).toFixed(1)},110 Z`;
  return <path d={d} fill={fill} opacity={opacity}/>;
}

// The range silhouette. A sharp dominant summit left of centre and a
// second massif right of it, both held inside the middle 60% of the
// frame on purpose: the SVG is sliced, so on a portrait phone the outer
// thirds are cropped away and anything important out there is simply
// gone.
// Two summits carry the frame, at x=68 and x=119, with a lesser one at
// x=34. That spread is not decorative: the SVG is SLICED, so a 375-wide
// portrait phone sees only about 56 viewBox units, cropped to the
// middle — roughly x=52 to x=108. The dominant summit sits inside that
// window on purpose, so the phone gets a whole mountain rather than an
// anonymous slope, while a desktop sees the full range.
//
// Every vertex is a straight line. The reference has no curves in it
// and neither does this: one bezier anywhere in a faceted range reads
// instantly as a different drawing.
const MAIN_RIDGE =
  'M0,78 L10,74 L18,76 L26,66 L34,58 L40,62 ' +
  'L48,46 L56,32 L62,22 L68,13 ' +
  'L74,24 L79,33 L84,29 L90,42 L96,52 ' +
  'L102,52 L110,44 L118,33 L126,21 ' +
  'L132,32 L138,41 L144,37 L150,49 L156,57 L160,54 ' +
  'L160,110 L0,110 Z';

const FAR_RIDGE =
  'M0,84 L12,76 L21,81 L32,71 L44,77 L54,68 L64,74 L73,64 ' +
  'L84,72 L95,64 L106,71 L118,62 L129,70 L140,64 L151,71 L160,67 ' +
  'L160,110 L0,110 Z';

export function RidgeBackdrop() {
  // Snow greys, one full step below `frost` so the wordmark stays the
  // brightest thing on the screen. `shard` is the only near-white and
  // it is spent on slivers a few units wide.
  const shard   = DS.frost;
  const lit     = DS.slateLight;
  const litMid  = DS.slate;
  const body    = mix(DS.slate, DS.inkLight, 0.52);
  const shade   = DS.inkLight;
  const deep    = mix(DS.inkLight, DS.dusk, 0.55);
  const rock    = mix(DS.dusk, DS.ink, 0.45);
  const far     = mix(DS.dusk, DS.inkLight, 0.42);
  const treeMid = mix(DS.canopy, DS.dusk, 0.52);
  const treeNear= mix(DS.ink, DS.dusk, 0.35);

  return (
    <div aria-hidden="true" style={{position:'absolute',inset:0,zIndex:0,
      pointerEvents:'none',overflow:'hidden'}}>
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"
        style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block'}}>
        <defs>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={mix(DS.ink, DS.dusk, 0.30)}/>
            <stop offset="46%"  stopColor={DS.dusk}/>
            <stop offset="82%"  stopColor={mix(DS.dusk, DS.inkLight, 0.55)}/>
            <stop offset="100%" stopColor={mix(DS.dusk, DS.inkLight, 0.80)}/>
          </linearGradient>
          {/* The afterglow. A wide, low, single-digit-alpha band, NOT a
              disc: it says the sun set an hour ago and went down over
              there, without putting a bloom behind the type. */}
          <radialGradient id="sc-afterglow" cx="0.68" cy="0.86" r="0.62">
            <stop offset="0%"   stopColor={DS.ember} stopOpacity="0.16"/>
            <stop offset="55%"  stopColor={DS.ember} stopOpacity="0.05"/>
            <stop offset="100%" stopColor={DS.ember} stopOpacity="0"/>
          </radialGradient>
          <clipPath id="sc-main"><path d={MAIN_RIDGE}/></clipPath>
          {/* Legibility. The content sits in the middle, so the middle
              is held down a step. Same job the table's vignette does. */}
          <radialGradient id="sc-scrim" cx="0.5" cy="0.52" r="0.66">
            <stop offset="0%"   stopColor={DS.dusk} stopOpacity="0.66"/>
            <stop offset="42%"  stopColor={DS.dusk} stopOpacity="0.48"/>
            <stop offset="76%"  stopColor={DS.dusk} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={DS.dusk} stopOpacity="0"/>
          </radialGradient>
          {/* A full-width band, not only the radial. The wordmark runs
              nearly edge to edge on a wide screen, so a centred radial
              leaves its last letters sitting on a lit snow plane at
              almost exactly their own value — `frost` type on
              `slateLight` snow, which is the one collision this whole
              component has to avoid. The band holds the entire
              wordmark line down regardless of viewport width. */}
          <linearGradient id="sc-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={DS.dusk} stopOpacity="0"/>
            <stop offset="26%"  stopColor={DS.dusk} stopOpacity="0.50"/>
            <stop offset="52%"  stopColor={DS.dusk} stopOpacity="0.62"/>
            <stop offset="76%"  stopColor={DS.dusk} stopOpacity="0.42"/>
            <stop offset="100%" stopColor={DS.dusk} stopOpacity="0"/>
          </linearGradient>
        </defs>

        <rect width="160" height="100" fill="url(#sc-sky)"/>
        <rect width="160" height="100" fill="url(#sc-afterglow)"/>

        {STARS.map((s, i) => (
          <circle key={i} className="sc-star" cx={s.x} cy={s.y} r={s.r} fill={DS.frost}
            style={{'--o': s.o, animationDuration:`${s.dur}s`, animationDelay:`${s.delay}s`}}/>
        ))}

        {/* Far range: one flat value, no facets. Depth comes from the
            value gap to the main range, not from detail. */}
        <path d={FAR_RIDGE} fill={far}/>

        <g clipPath="url(#sc-main)">
          <path d={MAIN_RIDGE} fill={body}/>

          {/* Lit planes: everything facing left, toward the moon.
              Painted generously and trimmed by the clip — fitting each
              plane to the silhouette by hand is how faceted art picks
              up hairline seams between adjacent planes. */}
          <path d="M68,13 L48,46 L58,56 L64,30 Z" fill={lit}/>
          <path d="M58,56 L48,46 L34,58 L28,80 L56,80 Z" fill={litMid}/>
          <path d="M68,13 L64,30 L69,33 L70,16 Z" fill={lit}/>
          <path d="M126,21 L110,44 L119,54 L123,35 Z" fill={lit}/>
          <path d="M119,54 L110,44 L102,52 L100,80 L125,78 Z" fill={litMid}/>
          <path d="M34,58 L26,66 L20,76 L33,78 L39,67 Z" fill={litMid}/>
          {/* Two extra planes low on the dominant peak's left flank.
              Without them that flank is one unbroken mid-grey field
              the width of the wordmark, which is where the whole range
              stopped reading as faceted. */}
          <path d="M48,46 L40,58 L46,66 L54,54 Z" fill={lit} opacity="0.55"/>
          <path d="M40,58 L30,68 L36,78 L46,66 Z" fill={shade} opacity="0.45"/>

          {/* Shadow planes: everything facing right, away from it. Two
              depths, so a flank steps down twice rather than once —
              that second step is most of what separates a faceted
              range from two flat cones. */}
          <path d="M68,13 L74,24 L79,33 L72,52 L65,36 Z" fill={shade}/>
          <path d="M79,33 L84,29 L90,42 L96,52 L85,74 L73,58 Z" fill={deep}/>
          <path d="M72,52 L85,74 L60,80 L59,58 Z" fill={shade}/>
          <path d="M126,21 L132,32 L138,41 L131,60 L123,38 Z" fill={shade}/>
          <path d="M138,41 L144,37 L150,49 L156,57 L146,78 L133,68 Z" fill={deep}/>
          <path d="M34,58 L40,62 L45,74 L33,78 Z" fill={shade}/>

          {/* Shards. The reference's signature move: thin angular
              slivers running down the lit faces, which is what makes
              faceted art read as carved rather than as flat shapes.
              Narrow on purpose, and the ONLY place `frost` appears —
              see the note at the top about the wordmark owning it. */}
          <path d="M68,14 L62,40 L64.8,37 Z" fill={shard} opacity="0.88"/>
          <path d="M67,18 L55,48 L58.6,44 Z" fill={shard} opacity="0.60"/>
          <path d="M65,25 L47,60 L51,56 Z" fill={shard} opacity="0.40"/>
          <path d="M62,33 L38,70 L42.5,67 Z" fill={shard} opacity="0.26"/>
          <path d="M69,15 L72,44 L74,37 Z" fill={shard} opacity="0.30"/>
          <path d="M126,22 L120,46 L122.6,43 Z" fill={shard} opacity="0.74"/>
          <path d="M125,26 L114,55 L117.4,51 Z" fill={shard} opacity="0.48"/>
          <path d="M123,33 L106,68 L110,65 Z" fill={shard} opacity="0.26"/>
          <path d="M127,24 L130,48 L132,42 Z" fill={shard} opacity="0.28"/>
          <path d="M34,59 L29,74 L31,72 Z" fill={shard} opacity="0.34"/>

          {/* Snowline. Below it the range is rock, not snow, which is
              what gives the white above it a reason to stop. Angular,
              like everything else here. */}
          <path d="M-2,70 L14,78 L28,72 L42,80 L54,74 L66,82 L78,76
                   L92,84 L106,77 L120,84 L134,78 L148,85 L162,80
                   L162,110 L-2,110 Z" fill={rock}/>
        </g>

        {/* Mid treeline, sitting on the snowline. */}
        {conifers({ x0:-4, y0:79, x1:164, y1:86, count:64, minH:3.2, maxH:7.4,
                    seed:0x7E3D1, fill:treeMid })}

        {/* The near slope: the reference's foreground mass, high on the
            left and falling away to the right, with taller trees along
            its edge. This is what gives the frame a foreground at all. */}
        {conifers({ x0:-6, y0:70, x1:170, y1:101, count:52, minH:5.5, maxH:13,
                    seed:0x2B91C, fill:treeNear })}

        <rect x="0" y="24" width="160" height="52" fill="url(#sc-band)"/>
        <rect width="160" height="100" fill="url(#sc-scrim)"/>
      </svg>
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
