// ============================================================
// SCRAPS — Static backdrop + animated title
// ============================================================
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
export function AnimatedTitle() {
  return (
    <div style={{display:'flex',justifyContent:'center',gap:4,marginBottom:12}}>
      {'SCRAPS'.split('').map((l,i)=>(
        <span key={i} style={{fontFamily:F.display,fontWeight:700,
          fontSize:'clamp(80px,17vw,148px)',lineHeight:1,
          display:'inline-block',color:l==='A'?DS.voltage:DS.frost,
          textShadow:l==='A'?`0 0 30px ${DS.voltage}88,0 3px 0 rgba(0,0,0,.4)`:`0 3px 0 rgba(0,0,0,.4)`,
          animation:`letterAppear 0.6s cubic-bezier(.34,1.6,.64,1) ${i*.09}s both`}}>
          {l}
        </span>
      ))}
    </div>
  );
}
