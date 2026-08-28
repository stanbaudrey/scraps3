// ============================================================
// SCRAPS — Buttons (DOM-mutation press states, zero re-renders)
// ============================================================
import { DS, F } from "../styles/theme.js";

// The smallest a control is allowed to be on its short axis.
// 44px is the figure both Apple's and Google's guidance land on
// for a fingertip, and several controls here — the rules "?", the
// log line, the Play Ace tag — were built to a cursor's tolerance
// and came in at 20-28px.
export const TOUCH_MIN = 44;

// What a control asks for in the STACKED layout, where the table is
// often scaled to fit a short phone. 44 CSS px at a 0.78 scale is
// 34 real ones, which is back under the bar the constant exists to
// clear — so a compact control is deliberately taller than a
// desktop one. It costs a few px of layout height, and because a
// button row is a small share of the table's total, asking for the
// extra buys back more in rendered size than it gives away in
// scale. Measured on a 375x667 iPhone SE: 44 -> 34 real px, 54 ->
// 42.
export const TOUCH_MIN_COMPACT = 54;

// The Play Ace tag's own floor, and the only control that needs one.
// The two constants above are read as "desktop" and "phone", but the
// variable they are really tracking is FitBox's scale, and that is
// below 1 well before a layout is stacked: measured 0.81 at 1280x720
// and 0.90 on a portrait iPad, both of which take TOUCH_MIN. So the
// tag came in at 42 real px on a 1280x720 laptop and 43 on a 375x667
// iPhone SE — the same 2px miss the note above recorded and left.
//
// 62 is 44 divided by 0.72, the lowest scale the game produces in the
// orientations it is designed for, with a little margin for the fact
// that a taller tag lowers that scale slightly itself. Re-measured
// after the change rather than predicted; see the numbers in
// PROJECT-BRIEF.md.
//
// The one case it does not rescue is a 844x390 landscape phone, where
// the whole table renders at 0.55 and a 44px control would have to
// declare 80 to survive the trip. That is the same trade CLAUDE.md's
// known-issues entry already records for every control in landscape,
// and buying it here would cost every card on the table height on the
// screen that has the least of it.
export const ACE_TAG_MIN = 62;

// ─────────────────────────────────────────────────────────────
// pressStyles — pointer-driven visual states.
//
// Every button in this project used onMouseEnter/onMouseLeave,
// which is a hover contract, and a phone has no hover. The
// failure is not just "no effect on touch": touch browsers
// synthesise a mouseenter on tap and never send the matching
// mouseleave, so a tapped button KEPT its hover look afterwards —
// on a phone, the last thing you touched stayed lit.
//
// Pointer events answer both halves. enter/leave still drive the
// mouse case and filter touch out of it; a press pair
// (down / up / cancel) gives touch the immediate feedback that
// hover used to provide, and ends it when the finger lifts.
//
// Handlers take the ELEMENT, not the event, so the same pair can
// be reused by callers that already hold a node.
// ─────────────────────────────────────────────────────────────
export function pressStyles(applyIn, applyOut) {
  return {
    onPointerEnter: (e) => { if (e.pointerType !== 'touch') applyIn(e.currentTarget); },
    onPointerLeave: (e) => applyOut(e.currentTarget),
    onPointerDown:  (e) => applyIn(e.currentTarget),
    onPointerUp:    (e) => { if (e.pointerType === 'touch') applyOut(e.currentTarget); },
    onPointerCancel:(e) => applyOut(e.currentTarget),
  };
}

// ─────────────────────────────────────────────────────────────
// Btn — DOM-mutation press states (zero React re-renders)
// ─────────────────────────────────────────────────────────────
//
// DISABLED IS A STATE, NOT A LOOK (fixed 2026-08-27, Session 5).
// All three primitives below used to express "unavailable" with three
// visual tricks — opacity 0.35, `cursor: not-allowed`, and dropping the
// onClick — and never set the `disabled` attribute itself. Everything
// that is not a sighted mouse user therefore missed it entirely: the
// button stayed in the tab order, a screen reader announced it as an
// ordinary available control, and pressing Enter on it did nothing at
// all, with no explanation. TRADE IN is the game's primary action and
// spends most of its life in that state, so it was the FIRST tab stop
// on the table and it was dead.
//
// `disabled` now goes on the element. That takes it out of the tab
// order and makes assistive tech say so, which is exactly what
// MenuScreens' picker already does for its 720ms arm lock. AceTag was
// the one control that had this right all along.
export function Btn({ children, onClick, variant='primary', disabled=false, small=false }) {
  const base={border:'none',cursor:disabled?'not-allowed':'pointer',
    fontFamily:F.ui,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
    padding:small?'10px 20px':'14px 28px',
    fontSize:small?15:17,borderRadius:8,opacity:disabled?0.35:1,
    minHeight:TOUCH_MIN,
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
  const hIn=(el)=>{
    if(disabled) return;
    el.style.transform='scale(1.05)';
    if(variant==='primary'){el.style.background=DS.voltageHover;el.style.boxShadow=`0 0 28px ${DS.voltage}`;}
    if(variant==='ghost'){el.style.background=DS.slate+'22';}
    if(variant==='danger'){el.style.background=DS.emberHover;el.style.boxShadow=`0 0 24px ${DS.ember}`;}
    if(variant==='green'){el.style.background=DS.voltage+'22';el.style.boxShadow=`0 0 20px ${DS.voltage}66`;}
    if(variant==='sky'){el.style.background=DS.slateLight;}
    if(variant==='warning'){el.style.background=DS.voltage+'33';}
    if(variant==='gold'){el.style.background=DS.goldHover;el.style.boxShadow=`0 0 28px ${DS.gold}`;}
  };
  const hOut=(el)=>{
    el.style.transform='scale(1)';
    if(variant==='primary'){el.style.background=DS.voltage;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}55`;}
    if(variant==='ghost'){el.style.background='transparent';}
    if(variant==='danger'){el.style.background=DS.ember;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.ember}55`;}
    if(variant==='green'){el.style.background='transparent';el.style.boxShadow=disabled?'none':`0 0 14px ${DS.voltage}33`;}
    if(variant==='sky'){el.style.background=DS.slate;}
    if(variant==='warning'){el.style.background='transparent';}
    if(variant==='gold'){el.style.background=DS.gold;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.gold}66`;}
  };
  return <button type="button" disabled={disabled} style={{...base,...V[variant]}}
    {...pressStyles(hIn,hOut)}
    onClick={disabled?undefined:onClick}>{children}</button>;
}

// ─────────────────────────────────────────────────────────────
// BigBtn — 50% larger action buttons, prominent and satisfying.
// `compact` is the stacked layout's size, not a smaller one — see
// TOUCH_MIN_COMPACT above for why it is TALLER than the default.
// ─────────────────────────────────────────────────────────────
export function BigBtn({ children, onClick, variant='primary', disabled=false, compact=false }) {
  const base = {border:'none',cursor:disabled?'not-allowed':'pointer',
    fontFamily:F.ui,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
    padding:compact?'15px 20px':'18px 36px',fontSize:compact?16:20,borderRadius:12,
    opacity:disabled?0.35:1,
    minHeight:compact?TOUCH_MIN_COMPACT:TOUCH_MIN,
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
  const hIn = (el) => {
    if(disabled) return;
    el.style.transform='scale(1.06)';
    if(variant==='primary'){el.style.background=DS.voltageHover;el.style.boxShadow=`0 0 40px ${DS.voltage},0 6px 20px rgba(0,0,0,.5)`;}
    if(variant==='ghost'){el.style.background=DS.slate+'33';}
    if(variant==='danger'){el.style.background=DS.emberHover;el.style.boxShadow=`0 0 40px ${DS.ember},0 6px 20px rgba(0,0,0,.5)`;}
    if(variant==='green'){el.style.background=DS.voltage+'33';el.style.boxShadow=`0 0 30px ${DS.voltage}88`;}
    if(variant==='warning'){el.style.background=DS.voltage+'44';}
    if(variant==='sky'){el.style.background=DS.slateLight;}
    if(variant==='gold'){el.style.background=DS.goldHover;el.style.boxShadow=`0 0 40px ${DS.gold},0 6px 20px rgba(0,0,0,.5)`;}
  };
  const hOut = (el) => {
    el.style.transform='scale(1)';
    if(variant==='primary'){el.style.background=DS.voltage;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.voltage}66`;}
    if(variant==='ghost'){el.style.background='transparent';}
    if(variant==='danger'){el.style.background=DS.ember;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.ember}66`;}
    if(variant==='green'){el.style.background='transparent';el.style.boxShadow=`0 0 14px ${DS.voltage}44`;}
    if(variant==='warning'){el.style.background='transparent';}
    if(variant==='sky'){el.style.background=DS.slate;}
    if(variant==='gold'){el.style.background=DS.gold;el.style.boxShadow=disabled?'none':`0 0 20px ${DS.gold}66`;}
  };
  return <button type="button" disabled={disabled} style={{...base,...V[variant]}}
    {...pressStyles(hIn,hOut)}
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
export function TradeInBtn({ onClick, disabled, count, drawCount=0, projectedHand=0, overLimit=false, compact=false }) {
  // A disabled TRADE IN used to be `ink` on `duskMid` at opacity
  // 0.35 — a smudge. Since it is disabled most of the time, a
  // first-time player never learned the game's primary action
  // existed until they happened to select a card. It is a legible
  // outlined control now: slateLight on duskMid measures 8.20:1, at
  // full opacity, with a slate rule around it. Nothing about it
  // reads as live — the enabled state is a solid fern fill with a
  // glow, which is a different object, not a brighter one.
  const blocked = overLimit && !disabled;
  const fill = disabled ? DS.duskMid : blocked ? DS.ember : DS.voltage;
  const fillHover = blocked ? DS.emberHover : DS.voltageHover;
  const glow = blocked ? DS.ember : DS.voltage;
  const hIn = (el) => {
    if(disabled) return;
    el.style.background=fillHover;
    el.style.boxShadow=`0 0 32px ${glow},0 0 60px ${glow}55`;
    el.style.transform='scale(1.06)';
  };
  const hOut = (el) => {
    el.style.background=fill;
    el.style.boxShadow=disabled?'none':`0 0 20px ${glow}66`;
    el.style.transform='scale(1)';
  };
  let label;
  if (count === 0) label = 'Trade In';
  else if (blocked) label = `Hand would be ${projectedHand}/7`;
  else label = `Trade ${count} \u2192 Draw ${drawCount}`;
  return (
    <button type="button" disabled={disabled} {...pressStyles(hIn,hOut)}
      onClick={disabled?undefined:onClick}
      style={{
        border:disabled?`2px solid ${DS.slate}88`:'none',
        cursor:disabled?'not-allowed':'pointer',
        fontFamily:F.ui,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
        padding:compact?'14px 20px':'16px 36px',fontSize:compact?15:18,borderRadius:10,
        minHeight:compact?TOUCH_MIN_COMPACT:TOUCH_MIN,
        opacity:1,
        background:fill,
        color:disabled?DS.slateLight:DS.ink,
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
  const hIn = (el) => {
    if (!interactive) return;
    el.style.background = DS.goldHover;
    el.style.boxShadow = `0 0 24px ${DS.gold}`;
  };
  const hOut = (el) => {
    if (!interactive) return;
    el.style.background = DS.gold;
    el.style.boxShadow = `0 0 14px ${DS.gold}88`;
  };
  // A real <button> when it is live: this is the Ace strike, one of the
  // two most consequential moves in the game, and it used to be a div.
  // The decorative copy in the walkthrough (live={false}) stays inert
  // and is hidden from assistive tech instead of being a fake control.
  const Tag = live ? 'button' : 'div';
  return (
    <Tag
      {...(live ? { type:'button', disabled, 'aria-label': disabled
        ? 'Play Ace — unavailable until their Scraps has 2 or more cards'
        : 'Play Ace to strike their Scraps' } : { 'aria-hidden': true })}
      {...pressStyles(hIn,hOut)}
      onClick={interactive ? (e) => { e.stopPropagation(); onClick && onClick(); } : undefined}
      title={disabled ? "Their Scraps needs 2+ cards before an Ace can strike" : undefined}
      style={{
        width, boxSizing:'border-box',
        background: disabled ? DS.duskMid : DS.gold,
        color: disabled ? DS.slate : DS.ink,
        border: disabled ? `1px solid ${DS.slate}55` : 'none',
        borderRadius:8, padding:'6px 4px',
        minHeight:ACE_TAG_MIN,
        display:'flex', flexDirection:'column', justifyContent:'center',
        fontFamily:F.ui, fontWeight:700, fontSize:13, lineHeight:1.12,
        letterSpacing:'0.08em', textTransform:'uppercase', textAlign:'center',
        boxShadow: disabled ? 'none' : `0 0 14px ${DS.gold}88`,
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
        userSelect:'none',
        transition:'background 80ms, box-shadow 80ms',
      }}>
      <span>Play<br/>Ace</span>
    </Tag>
  );
}
