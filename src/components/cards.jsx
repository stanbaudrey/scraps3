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
import { useState, useEffect, useRef } from "react";
import { DS, F } from "../styles/theme.js";
import { playClick } from "../audio.js";
import { evaluateBestHand } from "../game/engine.js";

export function isRed(suit){ return suit==='♥'||suit==='♦'; }
function cardInk(suit,isScrap){ return isScrap?(isRed(suit)?DS.ember:DS.voltage):(isRed(suit)?DS.ember:DS.ink); }
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
  extraStyle={}, wiggle=false, shake=false, fading=false, fadingIn=false, liftTransform=true }) {

  const dims={
    tiny:  {w:60, h:84,  rank:23,suit:24,pad:5},
    small: {w:80, h:112, rank:29,suit:31,pad:7},
    normal:{w:104,h:146, rank:37,suit:39,pad:9},
    large: {w:124,h:174, rank:44,suit:46,pad:11},
  };
  const d=dims[size]||dims.normal;
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
    <div onClick={onClick} style={{
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
    <div style={{borderRadius:16,
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
export function FannedHand({ cards, selectedIds=new Set(), tradeSelectedIds=new Set(),
  onCardClick, faceDown=false, selectable=false,
  wiggleIds=new Set(), glowZone=false, activeWiggle=false, aiSignaledIds=new Set(),
  shakeIds=new Set(), fadingIds=new Set(), fadingInIds=new Set(), waveIds=new Set() }) {

  const sorted=faceDown?cards:sortByValue(cards);
  const count=sorted.length;
  const spread=Math.min(42,Math.max(22,240/Math.max(count,1)));
  const W=104; const H=160;

  return (
    <div style={{padding:0}}>
      <div style={{position:'relative',height:H+32,
        width:Math.max(count*spread*2+W,W+40),
        display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
        {count===0&&(
          <div style={{border:`2px dashed ${DS.slate}44`,borderRadius:12,width:W,height:H,
            display:'flex',alignItems:'center',justifyContent:'center',
            color:DS.slate+'66',fontSize:16,fontFamily:F.mono}}>empty</div>
        )}
        {sorted.map((card,i)=>{
          const offset=count===1?0:(i-(count-1)/2);
          const rot=offset*(count<=3?4:2.8);
          const tx=offset*spread*2;
          const ty=Math.abs(offset)*3;
          const isSel=selectedIds.has(card.id);
          const isTradeSel=tradeSelectedIds.has(card.id);
          const isAiSig=aiSignaledIds.has(card.id);
          return (
            <div key={card.id} style={{
              position:'absolute',bottom:0,left:'50%',
              transform:isSel||isAiSig
                ?`translateX(calc(-50% + ${tx}px)) translateY(${ty-28}px) rotate(${rot}deg)`
                :`translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg)`,
              transition:'all 0.56s cubic-bezier(.34,1.2,.64,1)',
              zIndex:i,
              animation: waveIds.has(card.id) ? 'waveUp 0.4s ease' : undefined,
            }} onClick={()=>onCardClick&&onCardClick(card)}>
              <PlayingCard card={card} faceDown={faceDown} isScrap={false}
                selected={isSel} selectable={selectable&&!faceDown} liftTransform={false}
                fadingIn={fadingInIds&&fadingInIds.has(card.id)}
                wiggle={wiggleIds.has(card.id)||(activeWiggle&&!isSel&&!faceDown)}
                shake={shakeIds.has(card.id)}
                fading={fadingIds.has(card.id)}
                extraStyle={isTradeSel?{border:`6px solid ${DS.voltage}`,
                  boxShadow:`0 0 0 3px ${DS.voltage}55`}:{}}
              />
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
export function DeckPile({ count }) {
  const layers = count === 0 ? 0 : Math.min(4, 1 + Math.floor(count / 14));
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
      <div style={{position:'relative',width:80,height:112}}>
        {layers===0?(
          <div style={{width:80,height:112,borderRadius:10,
            border:`2px dashed ${DS.slate}33`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:F.mono,fontSize:12,color:DS.slate+'55'}}>—</span>
          </div>
        ):(
          Array.from({length:layers},(_,i)=>(
            <div key={i} style={{position:'absolute',top:0,left:0,
              transform:`translate(${-i*1.5}px,${-i*2}px)`,zIndex:i}}>
              <PlayingCard card={null} faceDown={true} size="small"/>
            </div>
          ))
        )}
      </div>
      <span style={{fontFamily:F.mono,fontSize:13,color:DS.slate,
        letterSpacing:'0.12em'}}>DECK · {count}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DiscardPile — labeled, messy stack. Sits beside the deck now
// instead of orphaned in its own column. Label bumped to
// legible size + full slate.
// ─────────────────────────────────────────────────────────────
export function DiscardPile({ count }) {
  const layers=Math.min(count,4);
  const rots=[-11,6,-4,1];
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,opacity:0.8}}>
      <div style={{position:'relative',width:80,height:112}}>
        {count===0?(
          <div style={{width:80,height:112,borderRadius:10,
            border:`2px dashed ${DS.slate}22`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:F.mono,fontSize:12,color:DS.slate+'44'}}>—</span>
          </div>
        ):(
          Array.from({length:layers},(_,i)=>(
            <div key={i} style={{position:'absolute',top:0,left:0,
              transform:`rotate(${rots[i]||0}deg) translate(${i*1.5-2}px,${i-1}px)`,
              zIndex:i,opacity:0.6}}>
              <PlayingCard card={null} faceDown={true} size="small"/>
            </div>
          ))
        )}
      </div>
      <span style={{fontFamily:F.mono,fontSize:13,color:DS.slate,
        letterSpacing:'0.12em'}}>DISCARD · {count}</span>
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
function ZoneBadge({ cards, owner }) {
  const { best, flash } = useBestHand(cards);
  let col;
  if (!best) col = DS.slate + '55';
  else if (owner === 'player') col = best.rank>=7?DS.voltage:best.rank>=5?DS.ember:best.rank>=3?DS.slateLight:DS.slate;
  else col = best.rank>=5?DS.ember:DS.slate;
  return (
    <span style={{
      fontFamily:F.mono,fontSize:13,fontWeight:700,color:col,
      letterSpacing:'0.08em',whiteSpace:'nowrap',
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
export function HandUpgradeBadge({ cards }) {
  const { best, flash } = useBestHand(cards);
  return (
    <div style={{
      fontFamily:F.mono,fontSize:15,fontWeight:700,
      color:flash?DS.voltage:DS.slate,
      letterSpacing:'0.1em',textAlign:'center',
      minHeight:22,padding:'2px 14px',borderRadius:8,
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
  onCardClick, discardMode=false, isOpponent=false, glowZone=false }) {

  const sorted = sortByValue(cards);
  const borderCol = discardMode ? DS.voltage : isOpponent ? DS.ember : DS.voltage;
  const glowColor = isOpponent ? DS.ember : DS.voltage;
  const count = sorted.length;
  const cardW = 80, cardH = 112;
  // Fan overlap: compress as cards grow so the pile always fits
  const maxContainerW = 320;
  const naturalW = count * cardW;
  const overlap = count <= 1 ? 0 : Math.max(0, (naturalW - maxContainerW) / (count - 1));
  const step = cardW - overlap;
  const innerW = Math.max(240, Math.min(naturalW, maxContainerW));

  return (
    <GlowPulse active={glowZone} color={glowColor} style={{padding:glowZone?4:0}}>
      <div style={{
        width: innerW + 20,
        background:DS.inkLight, border:`2px solid ${borderCol}`,
        borderRadius:12, padding:'8px 10px 10px',
        boxShadow: discardMode?`0 0 22px ${DS.voltage}66`
          :isOpponent?`0 0 10px ${DS.ember}33`:`0 0 10px ${DS.voltage}22`,
        transition:'border-color 0.2s', flexShrink:0,
      }}>
        {/* In-zone header: ownership label left, best-hand badge right */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          gap:10,marginBottom:6,padding:'0 2px'}}>
          <span style={{fontFamily:F.mono,fontSize:13,fontWeight:700,
            color:discardMode?DS.voltage:isOpponent?DS.ember:DS.voltage,
            letterSpacing:'0.14em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
            {label} <span style={{color:DS.slate,fontWeight:400}}>{cards.length}/7</span>
          </span>
          <ZoneBadge cards={cards} owner={isOpponent?'opponent':'player'}/>
        </div>
        <div style={{position:'relative',width:'100%',height:cardH+22}}>
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
              <div key={card.id} style={{
                position:'absolute',
                left: i * step,
                top: isSel ? 0 : 8,
                transform: isSel ? 'translateY(-16px) scale(1.06)' : 'translateY(0)',
                transition:'transform 0.22s cubic-bezier(.34,1.2,.64,1), left 0.3s ease',
                zIndex: isSel ? count+10 : i,
              }} onClick={()=>{ if(isElig){ playClick(); onCardClick&&onCardClick(card); }}}>
                <PlayingCard card={card} size="small" isScrap={true}
                  selectable={isElig} selected={isSel}
                  dimmed={selectable&&!isElig}/>
              </div>
            );
          })}
        </div>
      </div>
    </GlowPulse>
  );
}
