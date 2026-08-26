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
// A soft, feather-edged dawn/dusk wash — warm gold low and center,
// deep canopy and ember at the corners, like light through trees.
export function SwirlBg() {
  return (
    <div style={{
      position:'absolute',inset:0,zIndex:0,pointerEvents:'none',
      background:`
        radial-gradient(ellipse 60% 50% at 25% 30%, rgba(62,92,70,0.20) 0%, transparent 70%),
        radial-gradient(ellipse 55% 45% at 75% 70%, rgba(226,121,59,0.13) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 50% 92%, rgba(240,187,85,0.10) 0%, transparent 70%)
      `
    }}/>
  );
}
export function AnimatedTitle() {
  return (
    <div style={{display:'flex',justifyContent:'center',gap:4,marginBottom:12}}>
      {'SCRAPS'.split('').map((l,i)=>(
        <span key={i} style={{fontFamily:F.display,fontWeight:700,fontStyle:'italic',
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
