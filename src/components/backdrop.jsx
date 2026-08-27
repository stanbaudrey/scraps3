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
