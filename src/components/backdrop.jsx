// ============================================================
// SCRAPS — Static backdrop + animated title
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { DS, F } from "../styles/theme.js";

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
// AnimatedTitle — the SCRAPS wordmark.
//
// Three behaviours share the letters, and each gets its own nested
// span because each wants `transform` (see the .scraps-* block in
// index.html):
//   1. Entrance, then a perpetual letter-by-letter rise and fall.
//   2. Touch devices: a staggered 3D barrel flip, once shortly after
//      the entrance settles and again on every tap. Hover has no
//      meaning there, so the effect needs its own trigger or nobody
//      would ever see it.
//   3. Pointer devices: the kinetic hover ripple, pure CSS.
const LETTERS = 'SCRAPS'.split('');
const FLIP_STAGGER = 0.075;                       // seconds between letters
const FLIP_MS = 560 + (LETTERS.length - 1) * FLIP_STAGGER * 1000 + 80;

export function AnimatedTitle() {
  const [flipping, setFlipping] = useState(false);
  const timer = useRef(null);
  // (hover: none) rather than a width breakpoint: what actually
  // decides this is whether the device can hover, not how wide it is.
  // Lazy initialiser, not useRef(expr): useRef evaluates its argument
  // on every render and throws all but the first away, so the media
  // query would re-run on each flip toggle for no reason.
  const [isTouch] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none), (pointer: coarse)').matches
  );

  const flip = useCallback(() => {
    setFlipping(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlipping(false), FLIP_MS);
  }, []);

  useEffect(() => {
    if (!isTouch) return undefined;
    const t = setTimeout(flip, 1400);              // after the entrance lands
    return () => { clearTimeout(t); clearTimeout(timer.current); };
  }, [isTouch, flip]);

  return (
    <div className="scraps-title" style={{marginBottom:'clamp(14px,4.5vh,36px)'}}
      onClick={isTouch ? flip : undefined}>
      {LETTERS.map((l,i)=>(
        <span key={i} className="scraps-letter"
          style={{fontFamily:F.title,
            fontSize:'clamp(44px,min(14.5vw,26vh),148px)',lineHeight:1,
            color:l==='A'?DS.voltage:DS.frost,
            textShadow:l==='A'?`0 0 30px ${DS.voltage}88,0 3px 0 rgba(0,0,0,.4)`:`0 3px 0 rgba(0,0,0,.4)`,
            animation:`letterAppear 0.6s cubic-bezier(.34,1.6,.64,1) ${i*.09}s both,`+
                      ` titleBreathe 3.4s ease-in-out ${1.1+i*.16}s infinite`}}>
          <span className="scraps-kinetic">
            <span className={`t3d${flipping?' flipping':''}`}
              style={{animationDelay:`${i*FLIP_STAGGER}s`}}>
              <span className="t3d-face t3d-front">{l}</span>
              <span className="t3d-face t3d-back" data-char={l} aria-hidden="true"/>
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
