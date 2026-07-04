// ============================================================
// SCRAPS — HUD: score corners, round progress, banners, log
// ============================================================
import { useEffect, useRef } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";

// ─────────────────────────────────────────────────────────────
// RoundProgressIndicator
// ─────────────────────────────────────────────────────────────
export function RoundProgressIndicator({ phase }) {
  const h1=['player-turn-1a','ai-turn-1a','player-turn-1b','ai-turn-1b','signal-ai','signal-player','reveal-1','replenish'];
  const h2=['player-turn-2a','ai-turn-2a','player-turn-2b','ai-turn-2b','signal-ai-2','signal-player-2','reveal-2'];
  const sc=['scraps-reveal','round-end'];
  const steps=[
    {label:'HAND 1',active:h1.includes(phase),done:h2.includes(phase)||sc.includes(phase)},
    {label:'HAND 2',active:h2.includes(phase),done:sc.includes(phase)},
    {label:'SCRAPS',active:sc.includes(phase),done:false},
  ];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,
      background:DS.duskMid,border:`2px solid ${DS.slate}44`,
      borderRadius:14,padding:'14px 20px',minWidth:220,
      boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
      <div style={{fontFamily:F.mono,fontSize:14,color:DS.slate,
        letterSpacing:'0.18em',fontWeight:700,textAlign:'center',marginBottom:2}}>ROUND</div>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,
          padding:'9px 14px',borderRadius:10,
          background:s.active?DS.voltage+'22':s.done?DS.slate+'11':'transparent',
          border:`2px solid ${s.active?DS.voltage:s.done?DS.slate+'44':DS.slate+'22'}`,
          transition:'all 0.3s',boxShadow:s.active?`0 0 16px ${DS.voltage}55`:'none'}}>
          <div style={{width:14,height:14,borderRadius:'50%',flexShrink:0,
            background:s.active?DS.voltage:s.done?DS.slate:DS.slate+'33',
            boxShadow:s.active?`0 0 10px ${DS.voltage}`:'none'}}/>
          <span style={{fontFamily:F.ui,fontSize:20,fontWeight:700,
            color:s.active?DS.voltage:s.done?DS.slate:DS.slate+'55',
            letterSpacing:'0.05em'}}>{s.label}</span>
          {s.done&&<span style={{marginLeft:'auto',fontSize:18,color:DS.slate}}>✓</span>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScoreBar
// ─────────────────────────────────────────────────────────────
// ScoreBar removed — scores shown inline in status bar
export function ScoreCorners({ playerScore, aiScore, playerFlash, aiFlash, phase }) {
  // Compute round progress for inline display
  const h1=['player-turn-1a','ai-turn-1a','player-turn-1b','ai-turn-1b','signal-ai','signal-player','reveal-1','replenish'];
  const h2=['player-turn-2a','ai-turn-2a','player-turn-2b','ai-turn-2b','signal-ai-2','signal-player-2','reveal-2'];
  const sc=['scraps-reveal','round-end'];
  const roundLabel = sc.includes(phase)?'SCRAPS':h2.includes(phase)?'HAND 2':'HAND 1';
  const roundDot = sc.includes(phase)?DS.ember:h2.includes(phase)?DS.voltage:DS.slate;
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'8px 22px 4px',background:DS.dusk,
      borderBottom:`1px solid ${DS.slate}22`,flexShrink:0}}>
      <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
        <span style={{fontFamily:F.ui,fontSize:22,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>YOU</span>
        <span style={{
          fontFamily:F.display,fontSize:96,color:DS.voltage,lineHeight:0.95,
          animation:playerFlash?'scorePop 0.5s cubic-bezier(.34,1.8,.64,1)':undefined,
          display:'inline-block',
        }}>{playerScore}</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
        <span style={{fontFamily:F.mono,fontSize:11,color:DS.slate+'88',letterSpacing:'0.12em'}}>FIRST TO {WIN_SCORE} · WIN BY 2</span>
        <div style={{display:'flex',alignItems:'center',gap:6,
          background:DS.duskMid,borderRadius:20,padding:'4px 14px',
          border:`1px solid ${roundDot}66`}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:roundDot,
            boxShadow:`0 0 6px ${roundDot}`}}/>
          <span style={{fontFamily:F.ui,fontSize:13,fontWeight:700,color:roundDot,letterSpacing:'0.08em'}}>{roundLabel}</span>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',lineHeight:1}}>
        <span style={{fontFamily:F.ui,fontSize:22,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>OPP</span>
        <span style={{
          fontFamily:F.display,fontSize:96,color:DS.ember,lineHeight:0.95,
          animation:aiFlash?'scorePop 0.5s cubic-bezier(.34,1.8,.64,1)':undefined,
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
// GameLog
// ─────────────────────────────────────────────────────────────
export function GameLog({ messages }) {
  const ref=useRef();
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[messages]);
  return (
    <div ref={ref} style={{height:72,overflowY:'auto',background:DS.dusk,
      borderTop:`1px solid ${DS.slate}22`,padding:'8px 20px',flexShrink:0}}>
      {messages.slice(-4).map((m,i,arr)=>(
        <div key={i} style={{fontFamily:F.mono,fontSize:14,lineHeight:1.5,
          color:i===arr.length-1?DS.frost:DS.slate,
          fontWeight:i===arr.length-1?700:400}}>{m}</div>
      ))}
    </div>
  );
}
