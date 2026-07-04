// ============================================================
// SCRAPS — Static backdrop + animated title
// ============================================================
import { DS, F } from "../styles/theme.js";

// ─────────────────────────────────────────────────────────────
// SwirlBg + AnimatedTitle
// ─────────────────────────────────────────────────────────────
// SwirlBg — completely static, zero animation, zero blur, zero compositor overhead.
// All previous animated/blur versions caused hover lag by blocking the browser paint thread.
// Static radial-gradient is painted once and never touched again.
export function SwirlBg() {
  return (
    <div style={{
      position:'absolute',inset:0,zIndex:0,pointerEvents:'none',
      background:`
        radial-gradient(ellipse 60% 50% at 25% 40%, rgba(200,255,0,0.13) 0%, transparent 70%),
        radial-gradient(ellipse 55% 45% at 75% 65%, rgba(255,61,90,0.11) 0%, transparent 70%),
        radial-gradient(ellipse 45% 40% at 55% 15%, rgba(138,143,168,0.08) 0%, transparent 70%)
      `
    }}/>
  );
}
export function AnimatedTitle() {
  return (
    <div style={{display:'flex',justifyContent:'center',gap:4,marginBottom:12}}>
      {'SCRAPS'.split('').map((l,i)=>(
        <span key={i} style={{fontFamily:F.display,fontSize:'clamp(80px,17vw,148px)',lineHeight:1,
          display:'inline-block',color:l==='A'?DS.voltage:DS.frost,
          textShadow:l==='A'?`0 0 30px ${DS.voltage}88,0 3px 0 rgba(0,0,0,.4)`:`0 3px 0 rgba(0,0,0,.4)`,
          animation:`letterAppear 0.6s cubic-bezier(.34,1.6,.64,1) ${i*.09}s both`}}>
          {l}
        </span>
      ))}
    </div>
  );
}
