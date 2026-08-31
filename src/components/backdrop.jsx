// ============================================================
// SCRAPS — Static backdrop + animated title
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { DS, F } from "../styles/theme.js";
import { playSquareUp } from "../audio.js";

// ─────────────────────────────────────────────────────────────
// RidgeBackdrop — sunset foothills behind every menu screen
// ─────────────────────────────────────────────────────────────
// Rebuilt 2026-08-31 from Stan's reference, second pass. The first pass
// was a faceted night range; he asked to keep the reference's DAYTIME
// sunset instead, drop the stars, round the peaks down into foothills,
// and get the low-poly futurism out of it. Rustic and natural, with the
// style carried by the colour rather than by the geometry.
//
// It replaced `SwirlBg` on all four screens that use it (splash,
// difficulty picker, walkthrough, lose screen). SwirlBg was three
// blurred radial gradients on near-black green and was the entire
// background: a coloured glow parked behind hero content and an
// animated gradient field, which are two named tells at once. It was
// also the same thinness the audit found on the TABLE, and the table
// was rebuilt as real material while the splash kept the old treatment,
// so the game's first screen had become its least-drawn one.
//
// WHAT MAKES THIS READ AS DRAWN RATHER THAN GENERATED, since the whole
// note of the second pass was "less low-poly":
//   1. Every ridge is a bezier. The night version banned curves so its
//      facets would stay crisp; this one bans straight ridgelines for
//      exactly the same reason in reverse. A single hard vertex in a
//      rounded range reads instantly as the other drawing.
//   2. Form is carried by GRADIENTS across each mass, not by flat
//      planes meeting at an edge. That is the whole difference between
//      a low-poly mountain and a painted one.
//   3. Each mass carries seeded contour hatching, the same idiom
//      `TableSurface` uses for woodgrain. Texture is what stops a
//      vector shape looking die-cut.
//   4. The two masses are lit by ONE light, low and to the right, where
//      the sun just went. Highlight edges and cast shadow agree.
//
// THE RULE THAT SURVIVES FROM THE NIGHT VERSION, because it is about
// the wordmark rather than about the weather: `frost` BELONGS TO THE
// TITLE. A sunset sky is bright, and the wordmark is near-white, so the
// bright half of the ramp is kept BELOW the ridgeline where the
// mountains cover it, and the sky the type actually crosses is held
// deep. Verified by sampling the pixels behind the glyphs, not by eye.
//
// The PRNG is seeded, exactly as `TableSurface` and the audio exciter
// are: a hillside that re-hatches itself on every render would crawl,
// and any re-render would show as the texture moving.

// One band of conifers whose tops follow a line, filled to the bottom
// of the frame. This is the reference's strongest single device and it
// is what keeps the ridges from reading as bare shapes.
//
// `x0..x1` is where this segment draws TREES; the fill runs 8 units
// wider on each side. That overlap is not cosmetic — the bands sway,
// adjacent segments sway out of phase, and without it the skew opens a
// visible notch between two segments at the treeline.
function coniferPath({ x0, y0, x1, y1, count, minH, maxH, seed }) {
  const r = woodRand(seed);
  let d = `M${(x0 - 8).toFixed(1)},112 L${(x0 - 8).toFixed(1)},${(y0 + 1).toFixed(1)} L${x0.toFixed(1)},${y0.toFixed(1)}`;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const bx = x0 + (x1 - x0) * t;
    const by = y0 + (y1 - y0) * t;
    const h = minH + r() * (maxH - minH);
    const w = (0.36 + r() * 0.32) * h;
    const lean = (r() - 0.5) * w * 0.34;
    // A slight curve into the tip rather than a straight triangle: a
    // spruce is not a cone, and the eye reads the difference long
    // before it can name it.
    d += ` L${(bx - w / 2).toFixed(1)},${by.toFixed(1)}`
      +  ` Q${(bx - w * 0.16).toFixed(1)},${(by - h * 0.55).toFixed(1)} ${(bx + lean).toFixed(1)},${(by - h).toFixed(1)}`
      +  ` Q${(bx + w * 0.18).toFixed(1)},${(by - h * 0.52).toFixed(1)} ${(bx + w / 2).toFixed(1)},${by.toFixed(1)}`;
  }
  d += ` L${(x1 + 8).toFixed(1)},${(y1 + 1).toFixed(1)} L${(x1 + 8).toFixed(1)},112 Z`;
  return d;
}

// A treeline split into segments that sway out of phase, so a gust
// crosses the frame instead of the whole forest leaning as one board.
// Each segment pivots about its own base (`transform-box: fill-box`
// plus a bottom origin in index.html), which is what makes a skew read
// as trees bending rather than as a picture being sheared.
function TreeBand({ x0, y0, x1, y1, segments, per, minH, maxH, seed, fill,
                    dur, step, amp, opacity = 1 }) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: segments }, (_, i) => {
        const a = x0 + ((x1 - x0) * i) / segments;
        const b = x0 + ((x1 - x0) * (i + 1)) / segments;
        const ya = y0 + ((y1 - y0) * i) / segments;
        const yb = y0 + ((y1 - y0) * (i + 1)) / segments;
        return (
          <path key={i} className="sc-tree" fill={fill}
            d={coniferPath({ x0:a, y0:ya, x1:b, y1:yb, count:per,
                             minH, maxH, seed: (seed + i * 0x9E3779B1) >>> 0 })}
            style={{ animationDuration:`${dur}s`, animationDelay:`${(i * step).toFixed(2)}s`,
                     '--sway': `${amp}deg` }}/>
        );
      })}
    </g>
  );
}

// Seeded contour hatching. Strokes follow the slope rather than running
// level, so they describe the form instead of lying across it.
function hatch({ x0, x1, yTop, yBot, count, seed, stroke, opacity }) {
  const r = woodRand(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = yTop + r() * (yBot - yTop);
    // Short. The first daytime pass ran these up to 12 units long and
    // they read as scratches across a lens rather than as tooth in the
    // surface — texture is many small marks, not a few big ones.
    const len = 1.2 + r() * 3.4;
    const drop = len * (0.42 + r() * 0.5);
    out.push(
      <path key={i}
        d={`M${x.toFixed(1)},${y.toFixed(1)} Q${(x + len * 0.5).toFixed(1)},${(y + drop * 0.35).toFixed(1)} ${(x + len).toFixed(1)},${(y + drop).toFixed(1)}`}
        fill="none" stroke={stroke} strokeLinecap="round"
        strokeWidth={(0.22 + r() * 0.38).toFixed(2)}
        opacity={(opacity * (0.35 + r() * 0.65)).toFixed(3)}/>
    );
  }
  return out;
}

// ── The land ─────────────────────────────────────────────────
//
// Ridgelines are GENERATED rather than hand-drawn, and that is the
// third attempt at this shape for a reason. Hand-placed bezier controls
// kept producing cones and, once the summits were rounded, narrow
// thumbs: with a curve you are choosing tangents and only inferring the
// silhouette, so width and rise are never actually under your hand.
//
// Here each mass is a sum of raised-cosine bumps sampled into a dense
// polyline. `w` is literally the half-width and `h` literally the rise,
// so a foothill is a number rather than a guess. Everything below sits
// near or above a 2.5:1 span-to-rise ratio; anything approaching 1:1 is
// a peak however softly its top is drawn.
//
// A cosine alone is too perfect to read as land, so a little seeded
// low-frequency roughness goes on top. That is the rustic part: real
// ground is lopsided.
//
// The left summit sits at x=46, inside the middle of the frame on
// purpose. The SVG is SLICED, so a 375-wide portrait phone sees only
// about 56 of these 160 units, cropped to the centre: anything outside
// roughly x=52..108 does not exist on a phone.
function ridgePath(bumps, base, seed, rough = 0) {
  const r = woodRand(seed);
  // Roughness as a handful of wide, shallow bumps rather than per-point
  // jitter: point jitter reads as a jagged edge, which is the opposite
  // of what this is for.
  const noise = Array.from({ length: 7 }, () => ({
    c: r() * 190 - 15, w: 10 + r() * 26, h: (r() * 2 - 1) * rough,
  }));
  const all = bumps.concat(rough ? noise : []);
  const pts = [];
  for (let x = -16; x <= 178; x += 2) {
    let y = base;
    for (const b of all) {
      const t = (x - b.c) / b.w;
      if (t > -1 && t < 1) y -= b.h * 0.5 * (1 + Math.cos(Math.PI * t));
    }
    pts.push(`${x},${y.toFixed(2)}`);
  }
  return `M${pts.join(' L')} L178,112 L-16,112 Z`;
}

// Left mass: spans 124 units, rises 50. The bigger of the two by a
// clear margin — 16 units taller and a third wider than the right.
const HILL_L = ridgePath(
  [{ c:46, w:62, h:50 }, { c:12, w:34, h:16 }], 96, 0x4C11E, 2.6);

const HILL_R = ridgePath(
  [{ c:126, w:48, h:34 }, { c:158, w:30, h:14 }], 96, 0x9B402, 2.2);

// The far range shows only over the col between the two masses and
// along the outer edges, so it is one hazy value with no interior
// detail. Depth here is the value gap, not more drawing.
const HILL_FAR = ridgePath(
  [{ c:20, w:52, h:26 }, { c:88, w:46, h:30 }, { c:150, w:44, h:24 }],
  88, 0x2D75C, 2.0);

// The foreground roll, and it is the piece both earlier passes were
// missing. Hill country does not read as discrete cones standing on a
// plain; it reads as ROUNDED LAND OVERLAPPING ITSELF, each layer darker
// and less hazy than the one behind. Two peaks alone will always look
// like two objects. A low mass crossing in front of both is what turns
// them into terrain.
const HILL_FORE = ridgePath(
  [{ c:36, w:66, h:14 }, { c:118, w:58, h:18 }], 100, 0x7F318, 1.6);

// The hatching is built ONCE, at module load, not per render. It is 610
// <path> elements, it takes no props, and it is seeded — so it is the
// same 610 elements every time. Left inside the component it was being
// rebuilt on every render of a backdrop that four screens mount, and
// the walkthrough re-renders on every beat.
const HATCH_R_SHADE = hatch({ x0:92, x1:172, yTop:50, yBot:100, count:120,
  seed:0x3C71A, stroke:DS.ink, opacity:0.13 });
const HATCH_R_LIGHT = hatch({ x0:114, x1:152, yTop:50, yBot:82, count:60,
  seed:0x77B12, stroke:DS.gold, opacity:0.13 });
const HATCH_L_SHADE = hatch({ x0:-14, x1:116, yTop:38, yBot:100, count:250,
  seed:0x5A20D, stroke:DS.ink, opacity:0.12 });
const HATCH_L_LIGHT = hatch({ x0:46, x1:100, yTop:40, yBot:90, count:110,
  seed:0x11D9F, stroke:DS.gold, opacity:0.15 });
const HATCH_L_HAZE = hatch({ x0:-8, x1:48, yTop:46, yBot:98, count:70,
  seed:0x2FA84, stroke:DS.frost, opacity:0.05 });

export function RidgeBackdrop() {
  // Sunset ramp. Deep at the top, blazing at the horizon — which is how
  // a sunset actually reads once the sun is down, and which is also the
  // only arrangement that leaves the wordmark somewhere dark to sit.
  const skyTop  = mix(DS.ink, DS.duskLight, 0.42);
  const skyHigh = mix(DS.duskLight, DS.emberInk, 0.34);
  const skyMid  = mix(DS.emberInk, DS.ember, 0.62);
  const skyWarm = mix(DS.ember, DS.gold, 0.52);
  const skyLow  = DS.gold;

  const farFill  = mix(DS.canopy, DS.emberInk, 0.30);
  const farHaze  = mix(DS.ember, DS.gold, 0.5);

  // A wider value range than the first daytime pass carried. That build
  // ran lit-to-dark across about one step and the masses read as flat
  // dark silhouettes with a tint on them: dimension is the SPREAD, not
  // the presence of a gradient.
  const lLit   = mix(DS.canopy, DS.gold, 0.62);
  const lBody  = mix(DS.canopy, DS.ink, 0.22);
  const lDeep  = mix(DS.ink, DS.canopy, 0.14);
  const rLit   = mix(DS.canopy, DS.gold, 0.70);
  const rBody  = mix(DS.canopy, DS.emberInk, 0.30);

  const treeMid  = mix(DS.canopy, DS.ink, 0.52);
  const treeNear = mix(DS.ink, DS.canopy, 0.14);

  return (
    <div aria-hidden="true" style={{position:'absolute',inset:0,zIndex:0,
      pointerEvents:'none',overflow:'hidden'}}>
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"
        style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block'}}>
        <defs>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
            {/* The blaze is a NARROW band low down, not half the sky.
                Foothills are low, so the wordmark sits on sky rather
                than on a mountain, and a warm ramp that starts high
                puts near-white type on bright gold. Keeping the deep
                half tall and the hot band short is what buys the title
                somewhere to live — and it is also how a sunset actually
                looks once the sun is under the horizon. */}
            <stop offset="0%"   stopColor={skyTop}/>
            <stop offset="34%"  stopColor={skyHigh}/>
            <stop offset="54%"  stopColor={skyMid}/>
            <stop offset="70%"  stopColor={skyWarm}/>
            <stop offset="84%"  stopColor={skyLow}/>
            <stop offset="100%" stopColor={mix(DS.gold, DS.frost, 0.34)}/>
          </linearGradient>

          {/* EVERY HILL GRADIENT IS userSpaceOnUse, AND THAT IS A FIX
              RATHER THAN A STYLE. The default `objectBoundingBox` units
              resolve against the path's bounding box — and since every
              ridge path is closed across the FULL width of the frame to
              make its filled body, each of those boxes is the whole
              viewport. So a gradient meant to run across one hill was
              being stretched across all 160 units, which is exactly why
              two passes of "give the mountains more dimension" kept
              producing flat masses with a faint tint on them. The
              coordinates below are the real ones, in viewBox units, and
              each is aimed at its own hill.

              One sun, low and to the right, where it has just gone
              down: every axis here points back at the same place. */}
          <linearGradient id="sc-gl" gradientUnits="userSpaceOnUse"
            x1="88" y1="42" x2="6" y2="104">
            <stop offset="0%"   stopColor={lLit}/>
            <stop offset="38%"  stopColor={lBody}/>
            <stop offset="100%" stopColor={lDeep}/>
          </linearGradient>
          <linearGradient id="sc-gr" gradientUnits="userSpaceOnUse"
            x1="152" y1="56" x2="88" y2="106">
            <stop offset="0%"   stopColor={rLit}/>
            <stop offset="48%"  stopColor={rBody}/>
            <stop offset="100%" stopColor={mix(DS.canopy, DS.ink, 0.50)}/>
          </linearGradient>
          <linearGradient id="sc-gfar" gradientUnits="userSpaceOnUse"
            x1="140" y1="52" x2="16" y2="100">
            <stop offset="0%"   stopColor={farHaze} stopOpacity="0.9"/>
            <stop offset="55%"  stopColor={farFill}/>
            <stop offset="100%" stopColor={mix(DS.canopy, DS.emberInk, 0.55)}/>
          </linearGradient>
          {/* Nearest land, so: darkest and least hazy. Aerial
              perspective is the whole reason the layers separate. */}
          <linearGradient id="sc-gfore" gradientUnits="userSpaceOnUse"
            x1="150" y1="76" x2="10" y2="110">
            <stop offset="0%"   stopColor={mix(DS.canopy, DS.ink, 0.52)}/>
            <stop offset="52%"  stopColor={mix(DS.ink, DS.canopy, 0.14)}/>
            <stop offset="100%" stopColor={mix(DS.ink, DS.canopy, 0.04)}/>
          </linearGradient>

          <clipPath id="sc-cl"><path d={HILL_L}/></clipPath>
          <clipPath id="sc-cr"><path d={HILL_R}/></clipPath>

          {/* Legibility. The wordmark runs nearly edge to edge on a wide
              screen, so a centred radial alone leaves its last letters
              on whatever happens to be out there. The band holds the
              whole title line down at every viewport width. */}
          <linearGradient id="sc-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={DS.ink} stopOpacity="0"/>
            <stop offset="30%"  stopColor={DS.ink} stopOpacity="0.34"/>
            <stop offset="54%"  stopColor={DS.ink} stopOpacity="0.44"/>
            <stop offset="78%"  stopColor={DS.ink} stopOpacity="0.26"/>
            <stop offset="100%" stopColor={DS.ink} stopOpacity="0"/>
          </linearGradient>
          <radialGradient id="sc-scrim" cx="0.5" cy="0.5" r="0.66">
            <stop offset="0%"   stopColor={DS.ink} stopOpacity="0.40"/>
            <stop offset="50%"  stopColor={DS.ink} stopOpacity="0.24"/>
            <stop offset="100%" stopColor={DS.ink} stopOpacity="0"/>
          </radialGradient>

          {/* Modelling, in two soft passes over each mass rather than
              one gradient. A single lit-to-dark ramp gives a mass a
              tint; a ramp PLUS a shadow flank PLUS a warm cap on the
              sunward shoulder gives it a form. All three fade to
              transparent, so nowhere does a value meet another value
              at an edge. */}
          <linearGradient id="sc-shadowL" gradientUnits="userSpaceOnUse"
            x1="-10" y1="66" x2="62" y2="102">
            <stop offset="0%"   stopColor={DS.ink} stopOpacity="0.52"/>
            <stop offset="52%"  stopColor={DS.ink} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={DS.ink} stopOpacity="0"/>
          </linearGradient>
          {/* Warm light catching each summit. Centred on the apex the
              generator actually produced, not on a fraction of a
              bounding box that spans the whole frame. */}
          <radialGradient id="sc-capL" gradientUnits="userSpaceOnUse"
            cx="52" cy="48" r="42">
            <stop offset="0%"   stopColor={DS.gold} stopOpacity="0.46"/>
            <stop offset="52%"  stopColor={DS.gold} stopOpacity="0.16"/>
            <stop offset="100%" stopColor={DS.gold} stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="sc-capR" gradientUnits="userSpaceOnUse"
            cx="128" cy="64" r="34">
            <stop offset="0%"   stopColor={DS.gold} stopOpacity="0.42"/>
            <stop offset="56%"  stopColor={DS.gold} stopOpacity="0.13"/>
            <stop offset="100%" stopColor={DS.gold} stopOpacity="0"/>
          </radialGradient>
          {/* The left mass throws its shadow onto the right one. Two
              hills lit by one sun and casting nothing is the tell that
              they were drawn separately. */}
          <linearGradient id="sc-castR" gradientUnits="userSpaceOnUse"
            x1="86" y1="70" x2="132" y2="92">
            <stop offset="0%"   stopColor={DS.ink} stopOpacity="0.46"/>
            <stop offset="100%" stopColor={DS.ink} stopOpacity="0"/>
          </linearGradient>

          {/* Cloud bars get soft ends. A plain ellipse at this scale
              reads as a painted bar, which is the one thing a sunset
              sky must not look like. */}
          <radialGradient id="sc-cloud" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor={DS.frost} stopOpacity="1"/>
            <stop offset="52%"  stopColor={DS.frost} stopOpacity="0.55"/>
            <stop offset="100%" stopColor={DS.frost} stopOpacity="0"/>
          </radialGradient>
        </defs>

        <rect width="160" height="100" fill="url(#sc-sky)"/>

        {/* Sunset cloud bars. Soft, level, and few: they are what the
            stars used to do for the upper sky, and they carry the
            weather the gradient alone cannot. */}
        <g>
          {[[42,16,32,2.0,0.13],[104,11,24,1.5,0.10],[118,26,34,2.4,0.15],
            [28,32,28,2.1,0.13],[84,38,42,2.8,0.15],[58,45,30,2.2,0.10]].map(
            ([cx,cy,rx,ry,o],i)=>(
              <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
                fill="url(#sc-cloud)" opacity={o}/>
            ))}
        </g>

        <path d={HILL_FAR} fill="url(#sc-gfar)"/>

        {/* Right mass first: it is the smaller and the further back, so
            the left one overlaps it and the overlap says which is in
            front without either needing an outline. */}
        <path d={HILL_R} fill="url(#sc-gr)"/>
        <g clipPath="url(#sc-cr)">
          <path d={HILL_R} fill="url(#sc-capR)"/>
          <path d={HILL_R} fill="url(#sc-castR)"/>
          {HATCH_R_SHADE}
          {HATCH_R_LIGHT}
        </g>

        <path d={HILL_L} fill="url(#sc-gl)"/>
        <g clipPath="url(#sc-cl)">
          <path d={HILL_L} fill="url(#sc-capL)"/>
          <path d={HILL_L} fill="url(#sc-shadowL)"/>
          {HATCH_L_SHADE}
          {/* Warm light down the sunward flank as strokes rather than a
              band: a hard highlight edge is the low-poly move this pass
              exists to get away from. */}
          {HATCH_L_LIGHT}
          {HATCH_L_HAZE}
        </g>

        {/* The foreground roll, in front of both peaks. */}
        <path d={HILL_FORE} fill="url(#sc-gfore)"/>

        {/* Mid treeline, riding the lower slopes. Slower and shallower
            than the near band — distance costs amplitude. */}
        <TreeBand x0={-14} y0={90} x1={176} y1={87} segments={4} per={17}
          minH={3.0} maxH={6.8} seed={0x7E3D1} fill={treeMid}
          dur={9.5} step={0.8} amp={1.15} opacity={0.95}/>

        {/* The near band: the frame's foreground, and where the gust
            actually reads. Four segments, each a beat behind the last,
            so the breeze crosses left to right every few seconds
            instead of the whole treeline leaning at once. */}
        <TreeBand x0={-14} y0={95} x1={176} y1={90} segments={4} per={14}
          minH={5.5} maxH={12.5} seed={0x2B91C} fill={treeNear}
          dur={8} step={0.62} amp={2.3}/>

        <rect x="0" y="22" width="160" height="54" fill="url(#sc-band)"/>
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
