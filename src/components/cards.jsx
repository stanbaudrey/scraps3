// ============================================================
// SCRAPS — Card visuals: playing cards, hands, scraps zones,
// deck + discard piles, best-hand badges
//
// Design-pass notes (July 4):
//  • Card backs are NEUTRAL (ink field, slate diamonds). Voltage
//    now means "yours / act now" — it never appears on the
//    opponent's hidden hand.
//  • Cards carry a single, larger index. The rotated bottom
//    index is gone (glyph soup at these sizes).
//  • Each Scraps zone carries its own label + best-hand badge
//    INSIDE its border, so ownership is unambiguous.
//  • The badge under the player's hand is a change-detector:
//    subtle at rest, flashes only when the best hand upgrades.
// ============================================================
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { DS, F } from "../styles/theme.js";
import { playSelect } from "../audio.js";
import { evaluateBestHand } from "../game/engine.js";

// ─────────────────────────────────────────────────────────────
// CARD_DIMS — the four card sizes, exported because two other
// modules need the same numbers:
//   • the layout picks a size per band from the viewport mode
//     (src/ui/viewport.jsx) and has to know how wide the result
//     will be before it can lay a fan out;
//   • flight.jsx derives a ghost's start and end scale from a
//     card's MEASURED box against its natural one, which is the
//     only way a flight stays correct when the table is scaled.
//
// `tiny` carries a smaller index than the others on purpose: it
// is the compact-layout Scraps card, where cards overlap far
// enough that only the top-left corner shows, and a 23px rank
// beside a 24px suit did not fit in the sliver left exposed.
// ─────────────────────────────────────────────────────────────
export const CARD_DIMS = {
  tiny:  {w:60, h:84,  rank:20,suit:21,pad:5},
  small: {w:80, h:112, rank:29,suit:31,pad:7},
  normal:{w:104,h:146, rank:37,suit:39,pad:9},
  large: {w:124,h:174, rank:44,suit:46,pad:11},
};

export function isRed(suit){ return suit==='♥'||suit==='♦'; }
// Red suits use a different red on each face, because the two faces are
// different backgrounds: `ember` reads 6.65:1 on the dark Scraps card
// and 1.98:1 on the pale hand card. `emberInk` is the hand-card red.
function cardInk(suit,isScrap){ return isScrap?(isRed(suit)?DS.ember:DS.voltage):(isRed(suit)?DS.emberInk:DS.ink); }
// Spoken names for the four glyphs. A screen reader hands "♠" to the
// user as anything from "black spade suit" to nothing at all, so every
// interactive card gets an explicit label built from these.
const SUIT_NAMES = { '\u2660':'spades', '\u2665':'hearts', '\u2666':'diamonds', '\u2663':'clubs' };
export function cardLabel(card){
  if(!card) return 'card';
  const rank = card.rank === 'A' ? 'ace' : card.rank === 'K' ? 'king'
    : card.rank === 'Q' ? 'queen' : card.rank === 'J' ? 'jack' : card.rank;
  return `${rank} of ${SUIT_NAMES[card.suit] || card.suit}`;
}
// Enter and Space are what a native button responds to; anything acting
// like a button has to answer both or it is a button in appearance only.
export function buttonKeys(fn){
  return (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
}

export function sortByValue(cards){ return [...cards].sort((a,b)=>a.value-b.value); }

// ─────────────────────────────────────────────────────────────
// CardBackSVG — NEUTRAL back: a quiet dusk ridgeline scene.
// Three soft, hand-drawn hill layers recede into a warm haze,
// with a low ember glow standing in for the sun. Deliberately
// quiet so the player's own hand and the action zone stay the
// brightest things on the table — no framing device, no crest.
// Uses ember (not gold) and slate (not voltage) on purpose: this
// renders on every face-down card regardless of owner, including
// the opponent's hand, and gold/voltage are reserved tokens
// ("milestone only" and "yours / act now") that must never appear
// on a neutral, owner-agnostic surface.
// ─────────────────────────────────────────────────────────────
export function CardBackSVG({ w, h }) {
  return (
    <svg width={w} height={h} viewBox="0 0 120 178" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{position:'absolute',inset:0,borderRadius:12,display:'block'}}>
      <rect width="120" height="178" fill={DS.dusk}/>
      {/* low sun / moon glow — brighter, more saturated */}
      <circle cx="60" cy="46" r="22" fill={DS.ember} opacity="0.20"/>
      <circle cx="60" cy="46" r="11" fill={DS.ember} opacity="0.42"/>
      {/* a few stars for extra texture */}
      <circle cx="22" cy="22" r="1.4" fill={DS.frost} opacity="0.4"/>
      <circle cx="96" cy="16" r="1.1" fill={DS.frost} opacity="0.32"/>
      <circle cx="80" cy="34" r="1" fill={DS.frost} opacity="0.28"/>
      {/* back ridge — furthest, saturated canopy */}
      <path d="M0,118 C18,100 38,112 60,96 C82,80 100,106 120,90 L120,178 L0,178 Z"
        fill={DS.canopy} opacity="0.45"/>
      {/* mid ridge */}
      <path d="M0,140 C16,120 36,134 58,116 C80,98 98,128 120,112 L120,178 L0,178 Z"
        fill={DS.canopy} opacity="0.72"/>
      {/* near ridge — darkest, fully opaque */}
      <path d="M0,160 C20,138 44,152 66,130 C86,110 102,140 120,126 L120,178 L0,178 Z"
        fill={DS.ink}/>
      {/* winding river, brighter ember */}
      <path d="M0,172 C24,166 30,176 52,170 C74,164 82,174 120,168"
        fill="none" stroke={DS.ember} strokeWidth="1.8" opacity="0.4" strokeLinecap="round"/>
      {/* pronounced frame so backs stand out against each other and the table —
          slate, matching PlayingCard's own face-down border, not a single extra ring */}
      <rect x="3" y="3" width="114" height="172" rx="9" fill="none"
        stroke={DS.slate} strokeWidth="2.5" opacity="0.7"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// PlayingCard — single index, top-left only. Rank sizes are
// bumped ~15% with the visual quiet reclaimed from the old
// rotated bottom index.
// ─────────────────────────────────────────────────────────────
export function PlayingCard({ card, faceDown=false, isScrap=false, selected=false,
  selectable=false, dimmed=false, onClick, size='normal',
  extraStyle={}, wiggle=false, shake=false, fading=false, fadingIn=false, liftTransform=true,
  registerEl=null, hidden=false }) {

  // The motion system measures this node to build a card's real
  // flight path, and hides it (visibility, so LAYOUT SURVIVES —
  // display:none would collapse the fan and move every sibling)
  // while a ghost is standing in for it mid-flight.
  //
  // LAYOUT effect, not a passive one, and deliberately so. A card
  // moving hand → Scraps unmounts under one parent and mounts
  // under another; the motion hook measures destinations in its
  // own layout effect, and layout effects run child-first, so
  // registering here is the only way the new node exists in the
  // registry in time to be measured. The unregister also passes
  // its node so a late cleanup from the OLD mount cannot delete
  // the NEW mount's entry.
  const selfRef = useRef(null);
  useLayoutEffect(() => {
    if (!registerEl || !card) return;
    const el = selfRef.current;
    registerEl(card.id, el);
    return () => registerEl(card.id, null, el);
  }, [registerEl, card && card.id]);

  const d=CARD_DIMS[size]||CARD_DIMS.normal;
  const ink=card?cardInk(card.suit,isScrap):DS.ink;
  const isTwoDigit=card&&card.rank==='10';
  const rankFs=isTwoDigit?d.rank*.82:d.rank;
  const notch=Math.round(d.w*.2);

  let bg,border,shadow;
  if(faceDown){
    bg='transparent';
    // Pronounced outline: neighboring face-down cards need a real edge
    // to read as separate objects, not a merged silhouette.
    border=`4px solid ${DS.slate}`;
    shadow='0 4px 14px rgba(0,0,0,.55)';
  } else if(isScrap){
    bg=DS.ink;
    border=selected?`6px solid ${DS.voltage}`:`4px solid ${isRed(card?.suit)?DS.ember:DS.voltage}`;
    shadow=selected?`0 0 0 3px ${DS.voltage}66,0 -18px 28px ${DS.voltage}44`:'0 4px 18px rgba(0,0,0,.5)';
  } else {
    bg=DS.frost;
    border=selected?`6px solid ${DS.voltage}`:`6px solid ${DS.ink}`;
    shadow=selected?`0 0 0 3px ${DS.voltage}66,0 -18px 28px ${DS.voltage}44`:'0 4px 18px rgba(0,0,0,.45)';
  }

  const animName = shake?'cardShake':wiggle?'cardWiggle':undefined;

  return (
    <div ref={selfRef} onClick={onClick} data-card-id={card?card.id:undefined}
      // `live-cue-*` marks motion that is the ONLY carrier of a state, so
      // the reduced-motion block in index.html can hand it a static
      // substitute instead of simply deleting the signal. See the comment
      // above that block.
      className={animName === 'cardWiggle' ? 'live-cue-card'
        : animName === 'cardShake' ? 'live-cue-busy' : undefined}
      style={{
      visibility:hidden?'hidden':'visible',
      width:d.w,height:d.h,borderRadius:12,
      background:faceDown?'transparent':bg,
      border,boxShadow:shadow,
      transform:selected?(liftTransform?'translateY(-22px) scale(1.07)':'none'):'none',
      transition:'transform 0.44s cubic-bezier(.34,1.4,.64,1),box-shadow 0.4s,border-color 0.3s,opacity 0.6s',
      opacity:fading?0:fadingIn?0.15:dimmed?.28:1,
      animation:fadingIn?'cardFadeIn 0.5s ease forwards':animName?`${animName} 0.5s ease-in-out infinite alternate`:undefined,

      display:'flex',flexDirection:'column',justifyContent:'flex-start',
      padding:`${d.pad}px ${d.pad+1}px`,
      position:'relative',overflow:'hidden',
      flexShrink:0,userSelect:'none',
      cursor:(selectable||onClick)?'pointer':'default',
      boxSizing:'border-box',
      ...extraStyle,
    }}>
      {faceDown&&<CardBackSVG w={d.w} h={d.h}/>}
      {!faceDown&&isScrap&&card&&(
        <div style={{position:'absolute',top:0,right:0,
          width:notch,height:notch,
          clipPath:'polygon(100% 0,0 0,100% 100%)',
          background:ink,zIndex:2}}/>
      )}
      {!faceDown&&card&&(
        <div style={{display:'flex',alignItems:'center',gap:1,lineHeight:1,zIndex:1}}>
          <span style={{fontFamily:F.card,fontWeight:600,fontSize:rankFs,color:ink,lineHeight:1}}>{card.rank}</span>
          <span style={{fontFamily:F.card,fontWeight:600,fontSize:d.suit,color:ink,lineHeight:1,marginTop:-2}}>{card.suit}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GlowPulse
// ─────────────────────────────────────────────────────────────
export function GlowPulse({ active, color=DS.voltage, children, style:extStyle={} }) {
  return (
    <div className={active ? 'live-cue-zone' : undefined} style={{borderRadius:16,
      boxShadow:active?`0 0 0 3px ${color}88,0 0 22px ${color}55`:'none',
      animation:active?'zonePulse 1.6s ease-in-out infinite':'none',
      transition:'box-shadow 0.3s',...extStyle}}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FannedHand
// ─────────────────────────────────────────────────────────────
// How far a selected (or opponent-signalled) card lifts out of the
// fan, as a share of the card's height. It was a flat 28px, which
// is a fifth of a full-size card and a THIRD of a tiny one — the
// compact layout paid for a lift nobody asked for on the one row
// that could least afford the height.
const LIFT_RATIO = 0.19;
// A hand carrying the Play Ace tag has to clear it: the tag is a
// real touch target now (it used to be a 39px cursor target) plus
// its offset above the card. Sized for the taller compact tag, so
// the reservation is the same in both layouts and an orientation
// change does not move the fan under the player's thumb.
const SLOT_ROOM = 59;
// A card never shows less of itself than this fraction of its
// width, however tight the fan gets: below it the rank in the
// top-left corner starts disappearing under the next card and the
// fan stops being readable at all.
//
// A FACE-DOWN fan has no rank to protect. All it has to say is how
// many cards are there, so it is allowed to close up far tighter —
// which is what lets the opponent's seven-card hand share a row
// with the deck and discard on a 375px screen.
const MIN_EXPOSED = { up: 0.34, down: 0.13 };

export function FannedHand({ cards, selectedIds=new Set(), tradeSelectedIds=new Set(),
  onCardClick, faceDown=false, selectable=false,
  wiggleIds=new Set(), glowZone=false, activeWiggle=false, aiSignaledIds=new Set(),
  shakeIds=new Set(), fadingIds=new Set(), fadingInIds=new Set(), waveIds=new Set(),
  registerEl=null, hiddenIds=new Set(), cardSlot=null,
  size='normal', maxWidth=null }) {

  const sorted=faceDown?cards:sortByValue(cards);
  const count=sorted.length;
  const d=CARD_DIMS[size]||CARD_DIMS.normal;
  const W=d.w;
  // Step between neighbouring cards. The open-hand default is the
  // old `spread*2`, restated as the distance it always was; when a
  // maxWidth is given the fan closes up to honour it, never past
  // MIN_EXPOSED.
  const openStep=Math.min(84,Math.max(44,480/Math.max(count,1)))*(W/104);
  const room=maxWidth!=null&&count>1?(maxWidth-W)/(count-1):Infinity;
  const step=Math.max(W*(faceDown?MIN_EXPOSED.down:MIN_EXPOSED.up),Math.min(openStep,room));
  // The container used to be `count*step + W` wide, which is a full
  // card-and-a-bit wider than the fan it holds — the outermost card
  // sits at (count-1)/2 steps from centre, not count/2. That dead
  // margin on both sides is most of why the table needed a
  // horizontal scrollbar below ~900px.
  const span=(count-1)*step+W;
  const lift=Math.round(d.h*LIFT_RATIO);
  const head=faceDown?lift+4:Math.max(lift+4,SLOT_ROOM);
  // Cards fan DOWNWARD as well (ty below), so the box owes them a
  // little floor too.
  const foot=Math.ceil(Math.max(0,(count-1)/2)*3)+6;

  return (
    <div style={{padding:0}}>
      <div style={{position:'relative',height:d.h+head+foot,
        width:Math.max(span,W),
        display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
        {count===0&&(
          <div style={{border:`2px dashed ${DS.slate}44`,borderRadius:12,width:W,height:d.h,
            display:'flex',alignItems:'center',justifyContent:'center',
            color:DS.slate+'66',fontSize:16,fontFamily:F.mono}}>empty</div>
        )}
        {sorted.map((card,i)=>{
          const offset=count===1?0:(i-(count-1)/2);
          const rot=offset*(count<=3?4:2.8);
          const tx=offset*step;
          const ty=Math.abs(offset)*3;
          const isSel=selectedIds.has(card.id);
          const isTradeSel=tradeSelectedIds.has(card.id);
          // Only a card the player can actually act on becomes a stop
          // on the tab order; the opponent's face-down fan must not be.
          const interactive = !faceDown && selectable && !!onCardClick;
          const isAiSig=aiSignaledIds.has(card.id);
          const doWiggle=wiggleIds.has(card.id)||(activeWiggle&&!isSel&&!faceDown);
          // Slot width is the card's exposed share of the fan, not the
          // full card width: two Aces sitting next to each other would
          // otherwise overlap their tags by the fan's overlap amount.
          const slotW=Math.min(W,Math.round(step));
          const slot=cardSlot?cardSlot(card,slotW):null;
          // A slot (today: the Play Ace button) has to move with its
          // card, wiggle included. So when one is present the wiggle
          // moves up to a wrapper around BOTH, and the card itself
          // stops wiggling — otherwise the two would lean out of sync.
          const body=(
            <PlayingCard card={card} faceDown={faceDown} isScrap={false} size={size}
              selected={isSel} selectable={selectable&&!faceDown} liftTransform={false}
              registerEl={registerEl} hidden={hiddenIds.has(card.id)}
              fadingIn={fadingInIds&&fadingInIds.has(card.id)}
              wiggle={doWiggle&&!slot}
              shake={shakeIds.has(card.id)}
              fading={fadingIds.has(card.id)}
              extraStyle={isTradeSel?{border:`6px solid ${DS.voltage}`,
                boxShadow:`0 0 0 3px ${DS.voltage}55`}:{}}
            />
          );
          return (
            <div key={card.id}
              {...(interactive ? {
                role:'button', tabIndex:0,
                'aria-pressed': isSel,
                'aria-label': `${cardLabel(card)}${isSel ? ', selected' : ''}`,
                onKeyDown: buttonKeys(() => onCardClick(card)),
              } : {})}
              style={{
              position:'absolute',bottom:foot,left:'50%',
              transform:isSel||isAiSig
                ?`translateX(calc(-50% + ${tx}px)) translateY(${ty-lift}px) rotate(${rot}deg)`
                :`translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg)`,
              transition:'all 0.56s cubic-bezier(.34,1.2,.64,1)',
              zIndex:slot?count+5:i,
              animation: waveIds.has(card.id) ? 'waveUp 0.4s ease' : undefined,
            }} onClick={()=>onCardClick&&onCardClick(card)}>
              {slot?(
                <div className={doWiggle ? 'live-cue-card' : undefined}
                  style={{position:'relative',
                  animation:doWiggle?'cardWiggle 0.5s ease-in-out infinite alternate':undefined}}>
                  <div style={{position:'absolute',bottom:'100%',left:0,width:'100%',
                    marginBottom:5,display:'flex',justifyContent:'center'}}>{slot}</div>
                  {body}
                </div>
              ):body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DeckPile — the draw deck, live on the table. Gives the
// dealing wave and every trade draw a physical origin point.
// ─────────────────────────────────────────────────────────────
export function DeckPile({ count, size='small' }) {
  const d=CARD_DIMS[size]||CARD_DIMS.small;
  const fs=size==='tiny'?10:13;
  const layers = count === 0 ? 0 : Math.min(4, 1 + Math.floor(count / 14));
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,
      minWidth:d.w}}>
      <div style={{position:'relative',width:d.w,height:d.h}}>
        {layers===0?(
          <div style={{width:d.w,height:d.h,borderRadius:10,
            border:`2px dashed ${DS.slate}33`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:F.mono,fontSize:12,color:DS.slate+'55'}}>—</span>
          </div>
        ):(
          Array.from({length:layers},(_,i)=>(
            <div key={i} style={{position:'absolute',top:0,left:0,
              transform:`translate(${-i*1.5}px,${-i*2}px)`,zIndex:i}}>
              <PlayingCard card={null} faceDown={true} size={size}/>
            </div>
          ))
        )}
      </div>
      <span style={{fontFamily:F.mono,fontSize:fs,color:DS.slate,
        letterSpacing:'0.12em',whiteSpace:'nowrap'}}>DECK · {count}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DiscardPile — labeled, messy stack. Sits beside the deck now
// instead of orphaned in its own column. Label bumped to
// legible size + full slate.
// ─────────────────────────────────────────────────────────────
export function DiscardPile({ count, size='small' }) {
  const d=CARD_DIMS[size]||CARD_DIMS.small;
  const fs=size==='tiny'?10:13;
  const layers=Math.min(count,4);
  const rots=[-11,6,-4,1];
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:0.8,
      minWidth:d.w}}>
      <div style={{position:'relative',width:d.w,height:d.h}}>
        {count===0?(
          <div style={{width:d.w,height:d.h,borderRadius:10,
            border:`2px dashed ${DS.slate}22`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:F.mono,fontSize:12,color:DS.slate+'44'}}>—</span>
          </div>
        ):(
          Array.from({length:layers},(_,i)=>(
            <div key={i} style={{position:'absolute',top:0,left:0,
              transform:`rotate(${rots[i]||0}deg) translate(${i*1.5-2}px,${i-1}px)`,
              zIndex:i,opacity:0.6}}>
              <PlayingCard card={null} faceDown={true} size={size}/>
            </div>
          ))
        )}
      </div>
      <span style={{fontFamily:F.mono,fontSize:fs,color:DS.slate,
        letterSpacing:'0.12em',whiteSpace:'nowrap'}}>{size==='tiny'?'DISC':'DISCARD'} · {count}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Best-hand evaluation + upgrade-flash hook (shared by the
// zone badges and the under-hand change-detector). Flashes
// ONLY when the hand category upgrades (Pair → Trips, etc.) —
// never on a downgrade or a same-category reshuffle.
// ─────────────────────────────────────────────────────────────
function useBestHand(cards) {
  const best = cards.length > 0 ? evaluateBestHand(cards) : null;
  const prevRank = useRef(null);
  const [flash, setFlash] = useState(false);
  const rank = best ? best.rank : null;
  useEffect(() => {
    if (rank == null) { prevRank.current = null; return; }
    if (prevRank.current != null && rank > prevRank.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      prevRank.current = rank;
      return () => clearTimeout(t);
    }
    prevRank.current = rank;
  }, [rank]);
  return { best, flash };
}

// Compact badge that lives INSIDE a Scraps zone header. Owner
// determines the color story: player = voltage by strength,
// opponent = ember when threatening, slate otherwise.
function ZoneBadge({ cards, owner, fontSize=13 }) {
  const { best, flash } = useBestHand(cards);
  // `emberHover`, not `ember`, and not for a hover reason: this badge is
  // 13px on the zone's inkLight fill, where plain ember measures 4.27:1 —
  // just under AA for text this size. emberHover is the same hue one step
  // brighter and measures 5.24:1. Both owners use it, since the player's
  // own badge turns ember at rank 5 too.
  let col;
  if (!best) col = DS.slate + '55';
  else if (owner === 'player') col = best.rank>=7?DS.voltage:best.rank>=5?DS.emberHover:best.rank>=3?DS.slateLight:DS.slate;
  else col = best.rank>=5?DS.emberHover:DS.slate;
  return (
    <span style={{
      fontFamily:F.mono,fontSize:fontSize,fontWeight:700,color:col,
      letterSpacing:'0.08em',whiteSpace:'nowrap',
      overflow:'hidden',textOverflow:'ellipsis',display:'inline-block',maxWidth:'100%',
      verticalAlign:'bottom',
      textShadow:flash?`0 0 14px ${col}`:'none',
      animation:flash?'badgeFlash 0.6s ease':'none',
      transition:'color 0.3s, text-shadow 0.3s'}}>
      {best?`▸ ${best.name.toUpperCase()}`:''}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// HandUpgradeBadge — under the player's hand. Subtle at rest;
// turns voltage and flashes only when the best hand upgrades,
// so it works as feedback instead of wallpaper.
// ─────────────────────────────────────────────────────────────
export function HandUpgradeBadge({ cards, fontSize=15 }) {
  const { best, flash } = useBestHand(cards);
  return (
    <div style={{
      fontFamily:F.mono,fontSize:fontSize,fontWeight:700,
      color:flash?DS.voltage:DS.slate,
      letterSpacing:'0.1em',textAlign:'center',
      minHeight:fontSize+6,padding:'2px 14px',borderRadius:8,
      background:flash?DS.voltage+'14':'transparent',
      boxShadow:flash?`0 0 20px ${DS.voltage}66`:'none',
      animation:flash?'badgeFlash 0.6s ease':'none',
      transition:'color 0.35s, box-shadow 0.35s, background 0.35s'}}>
      {best?best.name.toUpperCase():''}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HorizontalScrapsZone — cards spread horizontally, lift on
// select. The label AND best-hand badge now live inside the
// zone's border, so at a glance each badge unambiguously
// belongs to its pile.
// ─────────────────────────────────────────────────────────────
export function HorizontalScrapsZone({ cards, label, selectable=false, selectedIds=new Set(),
  onCardClick, discardMode=false, isOpponent=false, glowZone=false,
  registerEl=null, hiddenIds=new Set(),
  size='small', width=340, fill=false }) {

  const sorted = sortByValue(cards);
  const borderCol = discardMode ? DS.voltage : isOpponent ? DS.ember : DS.voltage;
  const glowColor = isOpponent ? DS.ember : DS.voltage;
  const count = sorted.length;
  const d = CARD_DIMS[size] || CARD_DIMS.small;
  const cardW = d.w, cardH = d.h;
  // `fill` means "you have been handed the whole rail" — the stacked
  // layout. It decides both the header shape and whether the zone
  // keeps its full width when it is nearly empty. It is a prop and
  // not inferred from the card size, because a tablet gets the
  // stacked ARRANGEMENT with the roomy CARDS and needs both halves
  // of this to follow the arrangement.
  const oneRowHeader = fill;
  const fs = fill && size === 'tiny' ? 11 : 13;
  // Fan overlap: compress as cards grow so the pile always fits
  const maxContainerW = width - 20;
  const naturalW = count * cardW;
  const overlap = count <= 1 ? 0 : Math.max(0, (naturalW - maxContainerW) / (count - 1));
  const step = cardW - overlap;
  // Stacked, the zone owns the whole rail whatever it holds: a pile
  // that grows from 2 cards to 7 must not resize the column under it
  // every turn. Side by side it keeps the old behaviour, where a
  // narrow zone earns its width back for the hand beside it.
  const innerW = fill
    ? maxContainerW
    : Math.max(Math.min(cardW * 3, maxContainerW), Math.min(naturalW, maxContainerW));

  return (
    <GlowPulse active={glowZone} color={glowColor} style={{padding:glowZone?4:0}}>
      <div style={{
        width: innerW + 20, maxWidth:'100%',
        background:DS.inkLight, border:`2px solid ${borderCol}`,
        borderRadius:12, padding:size==='tiny'?'5px 8px 4px':'8px 10px 6px',
        boxShadow: discardMode?`0 0 22px ${DS.voltage}66`
          :isOpponent?`0 0 10px ${DS.ember}33`:`0 0 10px ${DS.voltage}22`,
        transition:'border-color 0.2s', flexShrink:0,
      }}>
        {/* Header carries the ownership label. The best-hand badge
            sits BELOW the cards in the side-by-side layout, because
            both are nowrap and a 260px zone cannot hold "YOUR SCRAPS
            5/7" and "FOUR OF A KIND" side by side — measured overflow
            past the border was 17px on FULL HOUSE and 61px on THREE OF
            A KIND, with HIGH CARD already touching it.

            In the stacked layout the zone is the full width of the
            screen (~355px at 375) and the type is a notch smaller, so
            the pair measures ~205px and shares one row comfortably —
            which buys back a whole 20px row per zone, twice over, on
            the screen that has the least height to spare. The badge
            can still truncate rather than push the label out. */}
        <div style={{display:'flex',alignItems:'baseline',gap:8,
          marginBottom:oneRowHeader?3:5,padding:'0 2px'}}>
          <span style={{fontFamily:F.mono,fontSize:fs,fontWeight:700,
            color:discardMode?DS.voltage:isOpponent?DS.ember:DS.voltage,
            letterSpacing:'0.14em',textTransform:'uppercase',whiteSpace:'nowrap',flexShrink:0}}>
            {label} <span style={{color:DS.slate,fontWeight:400}}>{cards.length}/7</span>
          </span>
          {oneRowHeader&&(
            <span style={{flex:1,minWidth:0,overflow:'hidden',textAlign:'right'}}>
              <ZoneBadge cards={cards} owner={isOpponent?'opponent':'player'} fontSize={fs}/>
            </span>
          )}
        </div>
        {/* The extra height over a card is room for the select
            lift, which scales with the card like the fan's does. */}
        <div style={{position:'relative',width:'100%',height:cardH+(size==='tiny'?12:22)}}>
          {count === 0 && (
            <div style={{width:cardW,height:cardH,borderRadius:8,
              border:`2px dashed ${DS.slate}33`,
              display:'flex',alignItems:'center',justifyContent:'center',
              color:DS.slate+'44',fontSize:13,fontFamily:F.mono}}>—</div>
          )}
          {sorted.map((card,i) => {
            // The zone used to treat every card as clickable whenever
            // the zone was selectable, while GameScreen's click handler
            // silently dropped cards with eligibleForDiscard false. The
            // two disagreed, so a locked card looked live and did
            // nothing on click. The flag decides both now, and locked
            // cards render dimmed.
            const isElig = selectable && card.eligibleForDiscard !== false;
            const isSel = selectedIds.has(card.id);
            return (
              // A toggled card lifts STRAIGHT UP and keeps its own
              // place in the stack. It used to jump to the top of the
              // z-order and scale up, which threw it over the cards to
              // its right and hid whatever they showed. The pile reads
              // as a pile, so relative depth has to survive the toggle;
              // the vertical lift alone is what marks the selection.
              <div key={card.id} style={{
                position:'absolute',
                left: i * step,
                top: size==='tiny'?6:8,
                transform: isSel ? `translateY(${-Math.round(cardH*0.16)}px)` : 'translateY(0)',
                transition:'transform 0.22s cubic-bezier(.34,1.2,.64,1), left 0.3s ease',
                zIndex: i,
              }}
                {...(isElig && onCardClick ? {
                  role:'button', tabIndex:0,
                  'aria-pressed': isSel,
                  'aria-label': `${cardLabel(card)}${isSel ? ', selected' : ''}`,
                  onKeyDown: buttonKeys(() => { playSelect(); onCardClick(card); }),
                } : {})}
                onClick={()=>{ if(isElig){ playSelect(); onCardClick&&onCardClick(card); }}}>
                <PlayingCard card={card} size={size} isScrap={true}
                  selectable={isElig} selected={isSel} liftTransform={false}
                  registerEl={registerEl} hidden={hiddenIds.has(card.id)}
                  dimmed={selectable&&!isElig}/>
              </div>
            );
          })}
        </div>
        {/* Best hand, under its own pile — same relationship the small
            hand's badge has to the fan. Centred and full-width, so no
            hand name can reach the border. */}
        {!oneRowHeader&&(
          <div style={{display:'flex',justifyContent:'center',minHeight:18,
            alignItems:'center',marginTop:2}}>
            <ZoneBadge cards={cards} owner={isOpponent?'opponent':'player'}/>
          </div>
        )}
      </div>
    </GlowPulse>
  );
}
