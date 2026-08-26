// ============================================================
// SCRAPS — HUD: score corners, round progress strip, banners, log
//
// Design-pass notes (July 4):
//  • The redundant round pill in the top bar is gone. Round
//    state lives in ONE place: a slim horizontal strip that
//    sits above the opponent's Scraps.
//  • The strip is informational, so it speaks slate/frost —
//    voltage is reserved for "yours / act now."
//  • The difficulty label rides in the header so screenshots
//    brag for you.
//  • Log text bumped to legible sizes in the lighter slate.
// ============================================================
import { useEffect, useRef } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { IconCheck } from "./icons.jsx";
import { getValidSignals } from "../game/engine.js";

// ─────────────────────────────────────────────────────────────
// RoundProgressIndicator — slim horizontal three-step strip
// ─────────────────────────────────────────────────────────────
export function RoundProgressIndicator({ phase }) {
  const h1=['player-turn-1a','ai-turn-1a','player-turn-1b','ai-turn-1b','signal-ai','signal-player','reveal-1','replenish'];
  const h2=['player-turn-2a','ai-turn-2a','player-turn-2b','ai-turn-2b','signal-ai-2','signal-player-2','reveal-2'];
  const sc=['scraps-reveal','round-end'];
  // Point values ride in the label. This strip is the one piece
  // of chrome a player looks at all game, and it was the only
  // place naming the three hands without naming the stakes.
  const steps=[
    {label:'HAND 1',pts:'1PT',active:h1.includes(phase),done:h2.includes(phase)||sc.includes(phase)},
    {label:'HAND 2',pts:'1PT',active:h2.includes(phase),done:sc.includes(phase)},
    {label:'SCRAPS',pts:'2PTS',active:sc.includes(phase),done:false},
  ];
  return (
    <div style={{display:'flex',alignItems:'center',gap:3,
      background:DS.duskMid,border:`1px solid ${DS.slate}33`,
      borderRadius:10,padding:'4px 6px',maxWidth:'100%'}}>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:5,
          padding:'3px 7px',borderRadius:8,whiteSpace:'nowrap',
          background:s.active?DS.frost+'0e':'transparent',
          border:`1px solid ${s.active?DS.slateLight+'88':DS.slate+'22'}`,
          transition:'all 0.3s'}}>
          <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
            background:s.active?DS.frost:s.done?DS.slate:DS.slate+'33',
            boxShadow:s.active?`0 0 8px ${DS.frost}88`:'none',
            transition:'all 0.3s'}}/>
          <span style={{fontFamily:F.ui,fontSize:13,fontWeight:700,
            color:s.active?DS.frost:s.done?DS.slate:DS.slate+'55',
            letterSpacing:'0.04em',transition:'color 0.3s'}}>{s.label}</span>
          <span style={{fontFamily:F.mono,fontSize:10,fontWeight:700,
            color:s.active?DS.slateLight:DS.slate+'55',
            letterSpacing:'0.02em',transition:'color 0.3s'}}>{s.pts}</span>
          {s.done&&<IconCheck size={12} color={DS.slate}/>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScoreCorners — scores dominate the corners; center carries
// the win condition + the difficulty label. Round state is NOT
// repeated here (it lives in the strip above opponent Scraps).
// ─────────────────────────────────────────────────────────────
export function ScoreCorners({ playerScore, aiScore, playerFlash, aiFlash, difficultyLabel, roundEndPulse }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'8px 22px 4px',background:DS.dusk,
      borderBottom:`1px solid ${DS.slate}22`,flexShrink:0}}>
      <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
        <span style={{fontFamily:F.ui,fontSize:22,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>YOU</span>
        <span style={{
          fontFamily:F.display,fontWeight:700,fontSize:96,color:DS.voltage,lineHeight:0.95,
          animation:roundEndPulse?'roundEndScorePop 1.4s cubic-bezier(.34,1.4,.64,1)'
            :playerFlash?'scorePop 0.5s cubic-bezier(.34,1.8,.64,1)':undefined,
          textShadow:roundEndPulse?'0 0 30px currentColor':'none',
          transformOrigin:'left center',
          display:'inline-block',
        }}>{playerScore}</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
        <span style={{fontFamily:F.mono,fontSize:12,color:DS.slate+'88',letterSpacing:'0.12em'}}>FIRST TO {WIN_SCORE} · WIN BY 2</span>
        {difficultyLabel&&(
          <span style={{fontFamily:F.mono,fontSize:13,fontWeight:700,color:DS.slate,
            letterSpacing:'0.18em',background:DS.duskMid,borderRadius:20,
            padding:'3px 14px',border:`1px solid ${DS.slate}44`}}>
            {difficultyLabel}
          </span>
        )}
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',lineHeight:1}}>
        <span style={{fontFamily:F.ui,fontSize:22,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>OPP</span>
        <span style={{
          fontFamily:F.display,fontWeight:700,fontSize:96,color:DS.ember,lineHeight:0.95,
          animation:roundEndPulse?'roundEndScorePop 1.4s cubic-bezier(.34,1.4,.64,1)'
            :aiFlash?'scorePop 0.5s cubic-bezier(.34,1.8,.64,1)':undefined,
          textShadow:roundEndPulse?'0 0 30px currentColor':'none',
          transformOrigin:'right center',
          display:'inline-block',
        }}>{aiScore}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NearWinBanner — shown when someone hits WIN_SCORE but needs +2
// ─────────────────────────────────────────────────────────────
export function NearWinBanner({ playerScore, aiScore }) {
  const bothOver = playerScore >= WIN_SCORE && aiScore >= WIN_SCORE;
  const playerOver = playerScore >= WIN_SCORE && aiScore < WIN_SCORE;
  const aiOver = aiScore >= WIN_SCORE && playerScore < WIN_SCORE;
  if(!bothOver && !playerOver && !aiOver) return null;
  let msg;
  if(bothOver) msg=`Both players are at ${WIN_SCORE}+. Win by 2 — keep playing!`;
  else if(playerOver) msg=`You've hit ${WIN_SCORE}! Win by 2 to claim victory.`;
  else msg=`Opponent hit ${WIN_SCORE}. Win by 2 — no letting up!`;
  return (
    <div style={{padding:'6px 20px',background:DS.voltage+'22',
      border:`1px solid ${DS.voltage}66`,textAlign:'center',
      fontFamily:F.ui,fontSize:14,color:DS.voltage,fontWeight:700,
      letterSpacing:'0.06em',flexShrink:0}}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GameLog — full round-by-round history, opened by tapping the
// bottom bar. Auto-scrolls to the newest line. The log is the
// only record of what the opponent just did — it earns legible
// sizes in the lighter slate.
// ─────────────────────────────────────────────────────────────
export function GameLog({ messages }) {
  const ref=useRef();
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[messages]);
  return (
    <div ref={ref} style={{maxHeight:280,overflowY:'auto',background:DS.dusk,
      borderTop:`1px solid ${DS.slate}44`,padding:'10px 20px'}}>
      <div style={{fontFamily:F.mono,fontSize:12,color:DS.slate,
        letterSpacing:'0.14em',marginBottom:6}}>GAME LOG</div>
      {messages.map((m,i,arr)=>(
        <div key={i} style={{fontFamily:F.mono,fontSize:15,lineHeight:1.6,
          color:i===arr.length-1?DS.frost:DS.slateLight,
          fontWeight:i===arr.length-1?700:400}}>{m}</div>
      ))}
      {messages.length===0&&(
        <div style={{fontFamily:F.mono,fontSize:14,color:DS.slate}}>No log entries yet.</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SignalLegalityStrip — what a small hand is allowed to be.
//
// A signal is not "any cards you like": engine.isValidSignal
// accepts one exact shape per count (1 anything, 2 a pair, 3
// trips, 4 two pair or quads, 5 a straight or better). Nothing
// on the table ever said so, so a first-timer selecting two
// unmatched cards got a disabled button and no reason.
//
// engine.getValidSignals already computes this set against the
// live hand and had no UI caller until now. Options the hand
// cannot make are struck through, so the strip doubles as the
// explanation for why SIGNAL is disabled.
// ─────────────────────────────────────────────────────────────
const SIGNAL_SHAPES = [
  { n:1, name:'ANY CARD' },
  { n:2, name:'PAIR' },
  { n:3, name:'TRIPS' },
  { n:4, name:'2 PAIR / QUADS' },
  { n:5, name:'STRAIGHT+' },
];

export function SignalLegalityStrip({ hand, selectedCount=0 }) {
  const valid = new Set(getValidSignals(hand));
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',
      justifyContent:'center',background:DS.duskMid,
      border:`1px solid ${DS.slate}33`,borderRadius:10,padding:'6px 10px'}}>
      <span style={{fontFamily:F.mono,fontSize:11,color:DS.slate,
        letterSpacing:'0.14em',marginRight:2}}>PLAYABLE</span>
      {SIGNAL_SHAPES.map(sh=>{
        const ok=valid.has(sh.n);
        const on=ok&&selectedCount===sh.n;
        return (
          <span key={sh.n} style={{
            fontFamily:F.mono,fontSize:12,fontWeight:700,letterSpacing:'0.06em',
            padding:'3px 8px',borderRadius:6,whiteSpace:'nowrap',
            color:on?DS.ink:ok?DS.voltage:DS.slate+'66',
            background:on?DS.voltage:ok?DS.voltage+'18':'transparent',
            border:`1px solid ${on?DS.voltage:ok?DS.voltage+'55':DS.slate+'22'}`,
            textDecoration:ok?'none':'line-through',
            transition:'all 0.2s'}}>
            {sh.n} {sh.name}
          </span>
        );
      })}
    </div>
  );
}
