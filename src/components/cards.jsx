// ============================================================
// SCRAPS — Card visuals: playing cards, hands, scraps zones
// ============================================================
import { useState, useEffect, useRef } from "react";
import { DS, F } from "../styles/theme.js";
import { playClick } from "../audio.js";
import { evaluateBestHand } from "../game/engine.js";

export function isRed(suit){ return suit==='♥'||suit==='♦'; }
function cardInk(suit,isScrap){ return isScrap?(isRed(suit)?DS.ember:DS.voltage):(isRed(suit)?DS.ember:DS.ink); }
export function sortByValue(cards){ return [...cards].sort((a,b)=>a.value-b.value); }

// ─────────────────────────────────────────────────────────────
// CardBackSVG — official SCRAPS design: Ink bg, ember+voltage diamonds
// ─────────────────────────────────────────────────────────────
export function CardBackSVG({ w, h }) {
  return (
    <svg width={w} height={h} viewBox="0 0 120 178" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{position:'absolute',inset:0,borderRadius:12,display:'block'}}>
      <rect width="120" height="178" fill="#1A1A2E"/>
      <rect x="-5"  y="-6"  width="10" height="10" rx="1" transform="rotate(45 0 -1)"    fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="-6"  width="10" height="10" rx="1" transform="rotate(45 20 -1)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="-6"  width="10" height="10" rx="1" transform="rotate(45 40 -1)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="-6"  width="10" height="10" rx="1" transform="rotate(45 60 -1)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="-6"  width="10" height="10" rx="1" transform="rotate(45 80 -1)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="-6"  width="10" height="10" rx="1" transform="rotate(45 100 -1)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="-6"  width="10" height="10" rx="1" transform="rotate(45 120 -1)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="6"   width="10" height="10" rx="1" transform="rotate(45 10 11)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="6"   width="10" height="10" rx="1" transform="rotate(45 30 11)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="6"   width="10" height="10" rx="1" transform="rotate(45 50 11)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="6"   width="10" height="10" rx="1" transform="rotate(45 70 11)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="6"   width="10" height="10" rx="1" transform="rotate(45 90 11)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="6"   width="10" height="10" rx="1" transform="rotate(45 110 11)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="18"  width="10" height="10" rx="1" transform="rotate(45 0 23)"    fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="18"  width="10" height="10" rx="1" transform="rotate(45 20 23)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="18"  width="10" height="10" rx="1" transform="rotate(45 40 23)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="18"  width="10" height="10" rx="1" transform="rotate(45 60 23)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="18"  width="10" height="10" rx="1" transform="rotate(45 80 23)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="18"  width="10" height="10" rx="1" transform="rotate(45 100 23)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="18"  width="10" height="10" rx="1" transform="rotate(45 120 23)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="30"  width="10" height="10" rx="1" transform="rotate(45 10 35)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="30"  width="10" height="10" rx="1" transform="rotate(45 30 35)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="30"  width="10" height="10" rx="1" transform="rotate(45 50 35)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="30"  width="10" height="10" rx="1" transform="rotate(45 70 35)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="30"  width="10" height="10" rx="1" transform="rotate(45 90 35)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="30"  width="10" height="10" rx="1" transform="rotate(45 110 35)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="42"  width="10" height="10" rx="1" transform="rotate(45 0 47)"    fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="42"  width="10" height="10" rx="1" transform="rotate(45 20 47)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="42"  width="10" height="10" rx="1" transform="rotate(45 40 47)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="42"  width="10" height="10" rx="1" transform="rotate(45 60 47)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="42"  width="10" height="10" rx="1" transform="rotate(45 80 47)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="42"  width="10" height="10" rx="1" transform="rotate(45 100 47)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="42"  width="10" height="10" rx="1" transform="rotate(45 120 47)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="54"  width="10" height="10" rx="1" transform="rotate(45 10 59)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="54"  width="10" height="10" rx="1" transform="rotate(45 30 59)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="54"  width="10" height="10" rx="1" transform="rotate(45 50 59)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="54"  width="10" height="10" rx="1" transform="rotate(45 70 59)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="54"  width="10" height="10" rx="1" transform="rotate(45 90 59)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="54"  width="10" height="10" rx="1" transform="rotate(45 110 59)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="66"  width="10" height="10" rx="1" transform="rotate(45 0 71)"    fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="66"  width="10" height="10" rx="1" transform="rotate(45 20 71)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="66"  width="10" height="10" rx="1" transform="rotate(45 40 71)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="66"  width="10" height="10" rx="1" transform="rotate(45 60 71)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="66"  width="10" height="10" rx="1" transform="rotate(45 80 71)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="66"  width="10" height="10" rx="1" transform="rotate(45 100 71)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="66"  width="10" height="10" rx="1" transform="rotate(45 120 71)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="78"  width="10" height="10" rx="1" transform="rotate(45 10 83)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="78"  width="10" height="10" rx="1" transform="rotate(45 30 83)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="78"  width="10" height="10" rx="1" transform="rotate(45 50 83)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="78"  width="10" height="10" rx="1" transform="rotate(45 70 83)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="78"  width="10" height="10" rx="1" transform="rotate(45 90 83)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="78"  width="10" height="10" rx="1" transform="rotate(45 110 83)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="90"  width="10" height="10" rx="1" transform="rotate(45 0 95)"    fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="90"  width="10" height="10" rx="1" transform="rotate(45 20 95)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="90"  width="10" height="10" rx="1" transform="rotate(45 40 95)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="90"  width="10" height="10" rx="1" transform="rotate(45 60 95)"   fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="90"  width="10" height="10" rx="1" transform="rotate(45 80 95)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="90"  width="10" height="10" rx="1" transform="rotate(45 100 95)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="90"  width="10" height="10" rx="1" transform="rotate(45 120 95)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="102" width="10" height="10" rx="1" transform="rotate(45 10 107)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="102" width="10" height="10" rx="1" transform="rotate(45 30 107)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="102" width="10" height="10" rx="1" transform="rotate(45 50 107)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="102" width="10" height="10" rx="1" transform="rotate(45 70 107)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="102" width="10" height="10" rx="1" transform="rotate(45 90 107)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="102" width="10" height="10" rx="1" transform="rotate(45 110 107)" fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="114" width="10" height="10" rx="1" transform="rotate(45 0 119)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="114" width="10" height="10" rx="1" transform="rotate(45 20 119)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="114" width="10" height="10" rx="1" transform="rotate(45 40 119)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="114" width="10" height="10" rx="1" transform="rotate(45 60 119)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="114" width="10" height="10" rx="1" transform="rotate(45 80 119)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="114" width="10" height="10" rx="1" transform="rotate(45 100 119)" fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="114" width="10" height="10" rx="1" transform="rotate(45 120 119)" fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="126" width="10" height="10" rx="1" transform="rotate(45 10 131)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="126" width="10" height="10" rx="1" transform="rotate(45 30 131)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="126" width="10" height="10" rx="1" transform="rotate(45 50 131)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="126" width="10" height="10" rx="1" transform="rotate(45 70 131)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="126" width="10" height="10" rx="1" transform="rotate(45 90 131)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="126" width="10" height="10" rx="1" transform="rotate(45 110 131)" fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="138" width="10" height="10" rx="1" transform="rotate(45 0 143)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="138" width="10" height="10" rx="1" transform="rotate(45 20 143)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="138" width="10" height="10" rx="1" transform="rotate(45 40 143)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="138" width="10" height="10" rx="1" transform="rotate(45 60 143)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="138" width="10" height="10" rx="1" transform="rotate(45 80 143)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="138" width="10" height="10" rx="1" transform="rotate(45 100 143)" fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="138" width="10" height="10" rx="1" transform="rotate(45 120 143)" fill="#FF3D5A" opacity="0.55"/>
      <rect x="5"   y="150" width="10" height="10" rx="1" transform="rotate(45 10 155)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="25"  y="150" width="10" height="10" rx="1" transform="rotate(45 30 155)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="45"  y="150" width="10" height="10" rx="1" transform="rotate(45 50 155)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="65"  y="150" width="10" height="10" rx="1" transform="rotate(45 70 155)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="85"  y="150" width="10" height="10" rx="1" transform="rotate(45 90 155)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="105" y="150" width="10" height="10" rx="1" transform="rotate(45 110 155)" fill="#FF3D5A" opacity="0.55"/>
      <rect x="-5"  y="162" width="10" height="10" rx="1" transform="rotate(45 0 167)"   fill="#FF3D5A" opacity="0.55"/>
      <rect x="15"  y="162" width="10" height="10" rx="1" transform="rotate(45 20 167)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="35"  y="162" width="10" height="10" rx="1" transform="rotate(45 40 167)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="55"  y="162" width="10" height="10" rx="1" transform="rotate(45 60 167)"  fill="#C8FF00" opacity="0.45"/>
      <rect x="75"  y="162" width="10" height="10" rx="1" transform="rotate(45 80 167)"  fill="#FF3D5A" opacity="0.55"/>
      <rect x="95"  y="162" width="10" height="10" rx="1" transform="rotate(45 100 167)" fill="#C8FF00" opacity="0.45"/>
      <rect x="115" y="162" width="10" height="10" rx="1" transform="rotate(45 120 167)" fill="#FF3D5A" opacity="0.55"/>
      <text x="60" y="92" textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Bebas Neue', sans-serif" fontSize="56"
        fill="#F5F5FA" opacity="0.07" letterSpacing="2">S</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// PlayingCard

// ─────────────────────────────────────────────────────────────
// PlayingCard
// ─────────────────────────────────────────────────────────────
export function PlayingCard({ card, faceDown=false, isScrap=false, selected=false,
  selectable=false, dimmed=false, onClick, size='normal',
  extraStyle={}, wiggle=false, shake=false, fading=false, fadingIn=false }) {

  const dims={
    tiny:  {w:60, h:84,  rank:17,suit:18,pad:5},
    small: {w:80, h:112, rank:22,suit:24,pad:7},
    normal:{w:104,h:146, rank:28,suit:30,pad:9},
    large: {w:124,h:174, rank:34,suit:36,pad:11},
  };
  const d=dims[size]||dims.normal;
  const ink=card?cardInk(card.suit,isScrap):DS.ink;
  const isTwoDigit=card&&card.rank==='10';
  const rankFs=isTwoDigit?d.rank*.82:d.rank;
  const notch=Math.round(d.w*.2);

  let bg,border,shadow;
  if(faceDown){
    bg='transparent';
    // Voltage outline, triple thickness
    border=`4px solid ${DS.voltage}`;
    shadow='0 4px 18px rgba(0,0,0,.5)';
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
      transform:selected?'translateY(-22px) scale(1.07)':'none',
      transition:'transform 0.44s cubic-bezier(.34,1.4,.64,1),box-shadow 0.4s,border-color 0.3s,opacity 0.6s',
      opacity:fading?0:fadingIn?0.15:dimmed?.28:1,
      animation:fadingIn?'cardFadeIn 0.5s ease forwards':animName?`${animName} 0.5s ease-in-out infinite alternate`:undefined,

      display:'flex',flexDirection:'column',justifyContent:'space-between',
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
        <>
          <div style={{display:'flex',alignItems:'center',gap:1,lineHeight:1,zIndex:1}}>
            <span style={{fontFamily:F.card,fontSize:rankFs,color:ink,lineHeight:1}}>{card.rank}</span>
            <span style={{fontFamily:F.card,fontSize:d.suit,color:ink,lineHeight:1,marginTop:-2}}>{card.suit}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:1,lineHeight:1,
            alignSelf:'flex-end',transform:'rotate(180deg)',zIndex:1}}>
            <span style={{fontFamily:F.card,fontSize:rankFs,color:ink,lineHeight:1}}>{card.rank}</span>
            <span style={{fontFamily:F.card,fontSize:d.suit,color:ink,lineHeight:1,marginTop:-2}}>{card.suit}</span>
          </div>
        </>
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
                ?`translateX(calc(-50% + ${tx}px)) translateY(${ty-28}px) rotate(${rot}deg) scale(1.05)`
                :`translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg)`,
              transition:'all 0.56s cubic-bezier(.34,1.2,.64,1)',
              zIndex:i,
              animation: waveIds.has(card.id) ? 'waveUp 0.4s ease' : undefined,
            }} onClick={()=>onCardClick&&onCardClick(card)}>
              <PlayingCard card={card} faceDown={faceDown} isScrap={false}
                selected={isSel} selectable={selectable&&!faceDown}
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
// DiscardPile — labeled, messy stack
// ─────────────────────────────────────────────────────────────
export function DiscardPile({ count }) {
  const layers=Math.min(count,4);
  const rots=[-11,6,-4,1];
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:0.55}}>
      <div style={{position:'relative',width:80,height:112}}>
        {count===0?(
          <div style={{width:80,height:112,borderRadius:10,
            border:`2px dashed ${DS.slate}22`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:F.mono,fontSize:11,color:DS.slate+'33'}}>—</span>
          </div>
        ):(
          Array.from({length:layers},(_,i)=>(
            <div key={i} style={{position:'absolute',top:0,left:0,
              transform:`rotate(${rots[i]||0}deg) translate(${i*1.5-2}px,${i-1}px)`,
              zIndex:i}}>
              <PlayingCard card={null} faceDown={true} size="small"/>
            </div>
          ))
        )}
      </div>
      <span style={{fontFamily:F.mono,fontSize:11,color:DS.slate+'88',
        letterSpacing:'0.12em'}}>DISCARD</span>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// RoundInterstitial — "BEGIN ROUND N" full-screen flash
// ─────────────────────────────────────────────────────────────
function RoundInterstitial({ roundNum, onDone }) {
  const [phase, setPhase] = useState('in'); // in | hold | out
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('out'),  1400);
    const t3 = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background: phase==='out' ? 'transparent' : `rgba(10,10,20,${phase==='hold'?0.92:0.6})`,
      display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:16,
      transition: phase==='out' ? 'background 0.5s ease, opacity 0.5s ease' : 'background 0.35s ease',
      opacity: phase==='out' ? 0 : 1,
      pointerEvents: phase==='out' ? 'none' : 'all',
    }}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,
        opacity: phase==='in' ? 0 : 1,
        transform: phase==='in' ? 'scale(0.7) translateY(20px)' : 'scale(1) translateY(0)',
        transition:'opacity 0.35s ease, transform 0.35s cubic-bezier(.34,1.4,.64,1)',
      }}>
        <div style={{
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:'clamp(52px,12vw,96px)',
          color:'#C8FF00',
          letterSpacing:'0.08em',
          textShadow:`0 0 40px #C8FF0099, 0 0 80px #C8FF0055`,
          whiteSpace:'nowrap',
        }}>
          BEGIN ROUND {roundNum}
        </div>
        <div style={{
          fontFamily:"'Space Grotesk', sans-serif",
          fontSize:'clamp(20px,4vw,36px)',
          color:'#F5F5FA',
          letterSpacing:'0.18em',
          fontWeight:700,
          textTransform:'uppercase',
          opacity:0.85,
        }}>
          {roundNum%2===1 ? 'YOU GO FIRST' : 'OPPONENT GOES FIRST'}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HorizontalScrapsZone — cards spread horizontally, lift on select
// Like FannedHand but face-up scrap cards, fully visible
// ─────────────────────────────────────────────────────────────
export function HorizontalScrapsZone({ cards, label, selectable=false, selectedIds=new Set(),
  onCardClick, discardMode=false, isOpponent=false, glowZone=false,
  slideRight=false }) {

  const sorted = sortByValue(cards);
  const borderCol = discardMode ? DS.voltage : isOpponent ? DS.ember : DS.voltage;
  const glowColor = isOpponent ? DS.ember : DS.voltage;
  const count = sorted.length;
  const cardW = 80, cardH = 112;
  // Fan overlap: compress as cards grow so pile always fits
  const maxContainerW = 390; // 50% wider — suits remain visible
  const naturalW = count * cardW;
  const overlap = count <= 1 ? 0 : Math.max(0, (naturalW - maxContainerW) / (count - 1));
  const step = cardW - overlap; // how many px each card is offset

  return (
    <GlowPulse active={glowZone} color={glowColor} style={{padding:glowZone?4:0}}>
      <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'center'}}>
        <div style={{fontFamily:F.ui,fontSize:18,fontWeight:700,
          color:discardMode?DS.voltage:isOpponent?DS.ember:DS.voltage,
          letterSpacing:'0.12em',textTransform:'uppercase',
          background:DS.inkLight,borderRadius:6,padding:'4px 14px',
          border:`1px solid ${borderCol}44`}}>
          {label} <span style={{color:DS.slate,fontFamily:F.mono,fontWeight:400,fontSize:14}}>{cards.length}/7</span>
        </div>
        <div style={{
          position:'relative',
          width: count===0 ? cardW+20 : Math.min(naturalW, maxContainerW) + 20,
          height: cardH + 30,
          background:DS.inkLight, border:`2px solid ${borderCol}`,
          borderRadius:12, padding:'8px 10px',
          boxShadow: discardMode?`0 0 22px ${DS.voltage}66`
            :isOpponent?`0 0 10px ${DS.ember}33`:`0 0 10px ${DS.voltage}22`,
          transition:'border-color 0.2s', flexShrink:0,
        }}>
          {count === 0 && (
            <div style={{width:cardW,height:cardH,borderRadius:8,
              border:`2px dashed ${DS.slate}33`,
              display:'flex',alignItems:'center',justifyContent:'center',
              color:DS.slate+'44',fontSize:13,fontFamily:F.mono}}>—</div>
          )}
          {sorted.map((card,i) => {
            const isElig = selectable;
            const isSel = selectedIds.has(card.id);
            return (
              <div key={card.id} style={{
                position:'absolute',
                left: 10 + i * step,
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

// ─────────────────────────────────────────────────────────────
// BestHandBadge
// ─────────────────────────────────────────────────────────────
export function BestHandBadge({ cards }) {
  const best=cards.length>0?evaluateBestHand(cards):null;
  const name=best?best.name:'';
  const prevNameRef=useRef('');
  const [flash,setFlash]=useState(false);
  useEffect(()=>{
    if(name&&name!==prevNameRef.current){
      prevNameRef.current=name;
      setFlash(true);
      setTimeout(()=>setFlash(false),700);
    }
  },[name]);
  const col=best?(best.rank>=7?DS.voltage:best.rank>=5?DS.ember:best.rank>=3?DS.slateLight:DS.slate):DS.slate+'55';
  return (
    <div style={{
      fontFamily:F.mono,fontSize:30,fontWeight:700,color:col,
      letterSpacing:'0.08em',textAlign:'center',
      background:DS.duskMid,borderRadius:10,
      padding:'10px 28px',minWidth:220,minHeight:46,
      border:`1px solid ${flash?col:DS.slate+'22'}`,
      boxShadow:flash?`0 0 22px ${col}88`:'none',
      animation:flash?'badgeFlash 0.6s ease':'none',
      transition:'color 0.3s, border-color 0.3s, box-shadow 0.3s'}}>
      {best?`▸ ${best.name.toUpperCase()}`:''}
    </div>
  );
}
