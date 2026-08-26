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
    danger:{background:DS.ember,color:DS.ink,boxShadow:disabled?'none':`0 0 20px ${DS.ember}55`},
    muted:{background:DS.duskMid,color:DS.slate,border:`1px solid ${DS.slate}44`},
    green:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}`,boxShadow:disabled?'none':`0 0 14px ${DS.voltage}33`},
    sky:{background:DS.slate,color:DS.ink,boxShadow:'none'},
    warning:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}88`,boxShadow:'none'},
    gold:{background:DS.gold,color:DS.ink,boxShadow:disabled?'none':`0 0 20px ${DS.gold}66`},
  };
  const hIn=(e)=>{
    if(disabled) return;
    const el=e.currentTarget; el.style.transform='scale(1.05)';
    if(variant==='primary'){el.style.background=DS.voltageHover;el.style.boxShadow=`0 0 28px ${DS.voltage}`;}
    if(variant==='ghost'){el.style.background=DS.slate+'22';}
    if(variant==='danger'){el.style.background=DS.emberHover;el.style.boxShadow=`0 0 24px ${DS.ember}`;}
    if(variant==='green'){el.style.background=DS.voltage+'22';el.style.boxShadow=`0 0 20px ${DS.voltage}66`;}
    if(variant==='sky'){el.style.background=DS.slateLight;}
    if(variant==='warning'){el.style.background=DS.voltage+'33';}
    if(variant==='gold'){el.style.background=DS.goldHover;el.style.boxShadow=`0 0 28px ${DS.gold}`;}
  };
  const hOut=(e)=>{
    const el=e.currentTarget; el.style.transform='scale(1)';
    if(variant==='primary'){el.style.background=DS.voltage;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}55`;}
    if(variant==='ghost'){el.style.background='transparent';}
    if(variant==='danger'){el.style.background=DS.ember;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.ember}55`;}
    if(variant==='green'){el.style.background='transparent';el.style.boxShadow=disabled?'none':`0 0 14px ${DS.voltage}33`;}
    if(variant==='sky'){el.style.background=DS.slate;}
    if(variant==='warning'){el.style.background='transparent';}
    if(variant==='gold'){el.style.background=DS.gold;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.gold}66`;}
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
    danger:{background:DS.ember,color:DS.ink,boxShadow:disabled?'none':`0 0 20px ${DS.ember}66`},
    green:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}`,boxShadow:`0 0 14px ${DS.voltage}44`},
    warning:{background:'transparent',color:DS.voltage,border:`2px solid ${DS.voltage}88`,boxShadow:'none'},
    sky:{background:DS.slate,color:DS.ink,boxShadow:'none'},
    gold:{background:DS.gold,color:DS.ink,boxShadow:disabled?'none':`0 0 20px ${DS.gold}66`},
  };
  const hIn = (e) => {
    if(disabled) return;
    const el=e.currentTarget; el.style.transform='scale(1.06)';
    if(variant==='primary'){el.style.background=DS.voltageHover;el.style.boxShadow=`0 0 40px ${DS.voltage},0 6px 20px rgba(0,0,0,.5)`;}
    if(variant==='ghost'){el.style.background=DS.slate+'33';}
    if(variant==='danger'){el.style.background=DS.emberHover;el.style.boxShadow=`0 0 40px ${DS.ember},0 6px 20px rgba(0,0,0,.5)`;}
    if(variant==='green'){el.style.background=DS.voltage+'33';el.style.boxShadow=`0 0 30px ${DS.voltage}88`;}
    if(variant==='warning'){el.style.background=DS.voltage+'44';}
    if(variant==='sky'){el.style.background=DS.slateLight;}
    if(variant==='gold'){el.style.background=DS.goldHover;el.style.boxShadow=`0 0 40px ${DS.gold},0 6px 20px rgba(0,0,0,.5)`;}
  };
  const hOut = (e) => {
    const el=e.currentTarget; el.style.transform='scale(1)';
    if(variant==='primary'){el.style.background=DS.voltage;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}66`;}
    if(variant==='ghost'){el.style.background='transparent';}
    if(variant==='danger'){el.style.background=DS.ember;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.ember}66`;}
    if(variant==='green'){el.style.background='transparent';el.style.boxShadow=`0 0 14px ${DS.voltage}44`;}
    if(variant==='warning'){el.style.background='transparent';}
    if(variant==='sky'){el.style.background=DS.slate;}
    if(variant==='gold'){el.style.background=DS.gold;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.gold}66`;}
  };
  return <button style={{...base,...V[variant]}}
    onMouseEnter={hIn} onMouseLeave={hOut}
    onClick={disabled?undefined:onClick}>{children}</button>;
}

// ─────────────────────────────────────────────────────────────
// TradeInBtn — prominent action button with hover effect
//
// The label carries the whole trade: how many cards leave, and
// how many come back. It used to read "Trade In (2)", where the
// 2 was cards SELECTED, which collided head-on with the rule the
// walkthrough had just taught (a 10-K draws 2, an Ace draws 3) —
// so "(2)" was routinely read as "draw 2".
//
// When the draw would blow the 7-card hand limit the button says
// so BEFORE the click, in ember, with the arithmetic. It stays
// clickable on purpose: pressing it fires the error copy and
// sound, which is how the rule gets taught rather than merely
// enforced.
// ─────────────────────────────────────────────────────────────
export function TradeInBtn({ onClick, disabled, count, drawCount=0, projectedHand=0, overLimit=false }) {
  const blocked = overLimit && !disabled;
  const fill = disabled ? DS.duskMid : blocked ? DS.ember : DS.voltage;
  const fillHover = blocked ? DS.emberHover : DS.voltageHover;
  const glow = blocked ? DS.ember : DS.voltage;
  const hIn = (e) => {
    if(disabled) return;
    e.currentTarget.style.background=fillHover;
    e.currentTarget.style.boxShadow=`0 0 32px ${glow},0 0 60px ${glow}55`;
    e.currentTarget.style.transform='scale(1.06)';
  };
  const hOut = (e) => {
    e.currentTarget.style.background=fill;
    e.currentTarget.style.boxShadow=disabled?'none':`0 0 20px ${glow}66`;
    e.currentTarget.style.transform='scale(1)';
  };
  let label;
  if (count === 0) label = 'Trade In';
  else if (blocked) label = `Hand would be ${projectedHand}/7`;
  else label = `Trade ${count} \u2192 Draw ${drawCount}`;
  return (
    <button onMouseEnter={hIn} onMouseLeave={hOut}
      onClick={disabled?undefined:onClick}
      style={{
        border:'none',cursor:disabled?'not-allowed':'pointer',
        fontFamily:F.ui,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
        outline:'none',padding:'16px 36px',fontSize:18,borderRadius:10,
        opacity:disabled?0.35:1,
        background:fill,
        color:DS.ink,
        boxShadow:disabled?'none':`0 0 20px ${glow}66`,
        transition:'background 60ms, box-shadow 60ms, transform 60ms',
      }}>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// AceTag — the Play Ace control, sized to sit on top of a card.
//
// It used to live in the centre action row beside TRADE, which
// made an optional, situational strike read as the expected next
// move — and said nothing about WHICH card it would spend. Here
// it is exactly one card wide, stacked PLAY / ACE, and it rides
// the same wrapper as its Ace (see FannedHand's cardSlot), so it
// leans with the card instead of hovering over it.
//
// `live={false}` renders the same object as pure illustration,
// which is what the You've-Drawn-an-Ace lightbox shows so the
// player learns the shape before meeting it on the table.
// ─────────────────────────────────────────────────────────────
export function AceTag({ onClick, disabled=false, live=true, width=104 }) {
  const interactive = live && !disabled;
  const hIn = (e) => {
    if (!interactive) return;
    e.currentTarget.style.background = DS.goldHover;
    e.currentTarget.style.boxShadow = `0 0 24px ${DS.gold}`;
  };
  const hOut = (e) => {
    if (!interactive) return;
    e.currentTarget.style.background = DS.gold;
    e.currentTarget.style.boxShadow = `0 0 14px ${DS.gold}88`;
  };
  return (
    <div
      onMouseEnter={hIn} onMouseLeave={hOut}
      onClick={interactive ? (e) => { e.stopPropagation(); onClick && onClick(); } : undefined}
      title={disabled ? "Their Scraps needs 2+ cards before an Ace can strike" : undefined}
      style={{
        width, boxSizing:'border-box',
        background: disabled ? DS.duskMid : DS.gold,
        color: disabled ? DS.slate : DS.ink,
        border: disabled ? `1px solid ${DS.slate}55` : 'none',
        borderRadius:8, padding:'5px 4px',
        fontFamily:F.ui, fontWeight:700, fontSize:13, lineHeight:1.12,
        letterSpacing:'0.08em', textTransform:'uppercase', textAlign:'center',
        boxShadow: disabled ? 'none' : `0 0 14px ${DS.gold}88`,
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
        userSelect:'none',
        transition:'background 80ms, box-shadow 80ms',
      }}>
      Play<br/>Ace
    </div>
  );
}
