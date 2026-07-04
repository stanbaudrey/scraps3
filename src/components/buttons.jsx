// ============================================================
// SCRAPS — Buttons (DOM-mutation hover, zero re-renders)
// ============================================================
import { DS, F } from "../styles/theme.js";

// ─────────────────────────────────────────────────────────────
// Btn — DOM mutation hover (zero React re-renders on hover)
// ─────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant='primary', disabled=false, small=false }) {
  const base={border:'none',cursor:disabled?'not-allowed':'pointer',
    fontFamily:F.ui,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
    outline:'none',padding:small?'10px 20px':'14px 28px',
    fontSize:small?15:17,borderRadius:8,opacity:disabled?0.35:1,
    transition:'transform 60ms,box-shadow 60ms,background 60ms'};
  const V={
    primary:{background:DS.voltage,color:DS.ink,boxShadow:disabled?'none':`0 0 20px ${DS.voltage}55`},
    ghost:{background:'transparent',color:DS.frost,border:`2px solid ${DS.slate}`,boxShadow:'none'},
    danger:{background:DS.ember,color:DS.frost,boxShadow:disabled?'none':`0 0 20px ${DS.ember}55`},
    muted:{background:DS.duskMid,color:DS.slate,border:`1px solid ${DS.slate}44`},
    green:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}`,boxShadow:disabled?'none':`0 0 14px ${DS.voltage}33`},
    sky:{background:DS.slate,color:DS.ink,boxShadow:'none'},
    warning:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}88`,boxShadow:'none'},
  };
  const hIn=(e)=>{
    if(disabled) return;
    const el=e.currentTarget; el.style.transform='scale(1.05)';
    if(variant==='primary'){el.style.background='#d4ff33';el.style.boxShadow=`0 0 28px ${DS.voltage}`;}
    if(variant==='ghost'){el.style.background=DS.slate+'22';}
    if(variant==='danger'){el.style.background='#ff6070';el.style.boxShadow=`0 0 24px ${DS.ember}`;}
    if(variant==='green'){el.style.background=DS.voltage+'22';el.style.boxShadow=`0 0 20px ${DS.voltage}66`;}
    if(variant==='sky'){el.style.background=DS.slateLight;}
    if(variant==='warning'){el.style.background=DS.voltage+'33';}
  };
  const hOut=(e)=>{
    const el=e.currentTarget; el.style.transform='scale(1)';
    if(variant==='primary'){el.style.background=DS.voltage;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}55`;}
    if(variant==='ghost'){el.style.background='transparent';}
    if(variant==='danger'){el.style.background=DS.ember;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.ember}55`;}
    if(variant==='green'){el.style.background='transparent';el.style.boxShadow=disabled?'none':`0 0 14px ${DS.voltage}33`;}
    if(variant==='sky'){el.style.background=DS.slate;}
    if(variant==='warning'){el.style.background='transparent';}
  };
  return <button style={{...base,...V[variant]}}
    onMouseEnter={hIn} onMouseLeave={hOut}
    onClick={disabled?undefined:onClick}>{children}</button>;
}

// ─────────────────────────────────────────────────────────────
// BigBtn — 50% larger action buttons, prominent and satisfying
// ─────────────────────────────────────────────────────────────
export function BigBtn({ children, onClick, variant='primary', disabled=false }) {
  const base = {border:'none',cursor:disabled?'not-allowed':'pointer',
    fontFamily:F.ui,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
    outline:'none',padding:'18px 36px',fontSize:20,borderRadius:12,
    opacity:disabled?0.35:1,
    transition:'transform 60ms, box-shadow 60ms, background 60ms'};
  const V = {
    primary:{background:DS.voltage,color:DS.ink,boxShadow:disabled?'none':`0 0 20px ${DS.voltage}66`},
    ghost:{background:'transparent',color:DS.frost,border:`2px solid ${DS.slate}`,boxShadow:'none'},
    danger:{background:DS.ember,color:DS.frost,boxShadow:disabled?'none':`0 0 20px ${DS.ember}66`},
    green:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}`,boxShadow:`0 0 14px ${DS.voltage}44`},
    warning:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}88`,boxShadow:'none'},
    sky:{background:DS.slate,color:DS.ink,boxShadow:'none'},
  };
  const hIn = (e) => {
    if(disabled) return;
    const el=e.currentTarget; el.style.transform='scale(1.06)';
    if(variant==='primary'){el.style.background='#d4ff33';el.style.boxShadow=`0 0 40px ${DS.voltage},0 6px 20px rgba(0,0,0,.5)`;}
    if(variant==='ghost'){el.style.background=DS.slate+'33';}
    if(variant==='danger'){el.style.background='#ff6070';el.style.boxShadow=`0 0 40px ${DS.ember},0 6px 20px rgba(0,0,0,.5)`;}
    if(variant==='green'){el.style.background=DS.voltage+'33';el.style.boxShadow=`0 0 30px ${DS.voltage}88`;}
    if(variant==='warning'){el.style.background=DS.voltage+'44';}
    if(variant==='sky'){el.style.background=DS.slateLight;}
  };
  const hOut = (e) => {
    const el=e.currentTarget; el.style.transform='scale(1)';
    if(variant==='primary'){el.style.background=DS.voltage;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}66`;}
    if(variant==='ghost'){el.style.background='transparent';}
    if(variant==='danger'){el.style.background=DS.ember;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.ember}66`;}
    if(variant==='green'){el.style.background='transparent';el.style.boxShadow=`0 0 14px ${DS.voltage}44`;}
    if(variant==='warning'){el.style.background='transparent';}
    if(variant==='sky'){el.style.background=DS.slate;}
  };
  return <button style={{...base,...V[variant]}}
    onMouseEnter={hIn} onMouseLeave={hOut}
    onClick={disabled?undefined:onClick}>{children}</button>;
}

// ─────────────────────────────────────────────────────────────
// TradeInBtn — prominent action button with hover effect
// ─────────────────────────────────────────────────────────────
export function TradeInBtn({ onClick, disabled, count }) {
  const hIn = (e) => {
    if(disabled) return;
    e.currentTarget.style.background='#d4ff33';
    e.currentTarget.style.boxShadow=`0 0 32px ${DS.voltage},0 0 60px ${DS.voltage}55`;
    e.currentTarget.style.transform='scale(1.06)';
  };
  const hOut = (e) => {
    e.currentTarget.style.background=disabled?DS.duskMid:DS.voltage;
    e.currentTarget.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}66`;
    e.currentTarget.style.transform='scale(1)';
  };
  return (
    <button onMouseEnter={hIn} onMouseLeave={hOut}
      onClick={disabled?undefined:onClick}
      style={{
        border:'none',cursor:disabled?'not-allowed':'pointer',
        fontFamily:F.ui,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
        outline:'none',padding:'16px 36px',fontSize:18,borderRadius:10,
        opacity:disabled?0.35:1,
        background:disabled?DS.duskMid:DS.voltage,
        color:DS.ink,
        boxShadow:disabled?'none':`0 0 20px ${DS.voltage}66`,
        transition:'background 60ms, box-shadow 60ms, transform 60ms',
      }}>
      Trade In{count>0?` (${count})`:''}
    </button>
  );
}
