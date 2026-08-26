// ============================================================
// SCRAPS — Overlays: interstitial, reveals, win/lose, modals
// ============================================================
import { useState, useEffect, useRef } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { playGrandFanfare, playFireworkPop, playNeutralJingle } from "../audio.js";
import { Btn } from "./buttons.jsx";
import { PlayingCard } from "./cards.jsx";
import { SwirlBg } from "./backdrop.jsx";
import { IconBolt, IconTrophy, IconCards, IconFan, IconCycle, IconSpade } from "./icons.jsx";

// ─────────────────────────────────────────────────────────────
// RoundInterstitial — "BEGIN ROUND N" full-screen flash
// ─────────────────────────────────────────────────────────────
export function RoundInterstitial({ roundNum, onDone }) {
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
      background: phase==='out' ? 'transparent' : `rgba(20,31,25,${phase==='hold'?0.92:0.6})`,
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
          fontFamily:F.display,
          fontWeight:700,
          fontSize:'clamp(52px,12vw,96px)',
          color:DS.voltage,
          letterSpacing:'0.08em',
          textShadow:`0 0 40px ${DS.voltage}99, 0 0 80px ${DS.voltage}55`,
          whiteSpace:'nowrap',
        }}>
          BEGIN ROUND {roundNum}
        </div>
        <div style={{
          fontFamily:F.ui,
          fontSize:'clamp(20px,4vw,36px)',
          color:DS.frost,
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
// RevealOverlay
// ─────────────────────────────────────────────────────────────
export function RevealOverlay({ playerCards, aiCards, playerHandName, aiHandName, winner, points, onDismiss, playerBestIds=null, aiBestIds=null, bonusLine=null }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),50);},[]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:80,background:'rgba(20,31,25,0.94)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:20,padding:20,opacity:vis?1:0,transition:'opacity 0.3s',overflowY:'auto'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
        <div style={{fontFamily:F.ui,fontSize:17,color:DS.slate,letterSpacing:'0.14em',fontWeight:700}}>OPPONENT</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
          {(aiCards||[]).map((c,i)=>(
            <div key={c.id} style={{animation:`slideDown 0.3s ease ${i*.07}s both`,
              filter:aiBestIds&&!aiBestIds.has(c.id)?'brightness(0.35) saturate(0.3)':'',
              transition:'filter 0.4s'}}>
              <PlayingCard card={c} size="normal" isScrap={false}/>
            </div>
          ))}
        </div>
        <div style={{fontFamily:F.display,fontWeight:600,fontSize:26,color:winner==='ai'?DS.ember:DS.slate,letterSpacing:'0.06em'}}>{aiHandName}</div>
      </div>
      <div style={{padding:'16px 40px',borderRadius:12,textAlign:'center',
        background:winner==='player'?DS.voltage+'18':winner==='ai'?DS.ember+'18':DS.slate+'18',
        border:`3px solid ${winner==='player'?DS.voltage:winner==='ai'?DS.ember:DS.slate}`,
        boxShadow:winner==='player'?`0 0 32px ${DS.voltage}66`:winner==='ai'?`0 0 32px ${DS.ember}55`:'none',
        animation:'popIn 0.4s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:42,letterSpacing:'0.04em',
          color:winner==='player'?DS.voltage:winner==='ai'?DS.ember:DS.slate}}>
          {winner==='player'?'YOU WIN!':winner==='ai'?'OPPONENT WINS.':'TIE'}
        </div>
        {points>0&&<div style={{fontFamily:F.mono,fontSize:20,color:DS.frost,marginTop:4}}>
          +{points} POINT{points>1?'S':''}
        </div>}
        {bonusLine&&<div style={{fontFamily:F.mono,fontSize:13,color:DS.voltage,marginTop:4,letterSpacing:'0.1em'}}>
          {bonusLine}
        </div>}
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
          {(playerCards||[]).map((c,i)=>(
            <div key={c.id} style={{animation:`slideUp 0.3s ease ${i*.07}s both`,
              filter:playerBestIds&&!playerBestIds.has(c.id)?'brightness(0.35) saturate(0.3)':'',
              transition:'filter 0.4s'}}>
              <PlayingCard card={c} size="normal" isScrap={false} wiggle={winner==='player'&&(!playerBestIds||playerBestIds.has(c.id))}/>
            </div>
          ))}
        </div>
        <div style={{fontFamily:F.display,fontWeight:600,fontSize:26,color:winner==='player'?DS.voltage:DS.slate,letterSpacing:'0.06em'}}>{playerHandName}</div>
        <div style={{fontFamily:F.ui,fontSize:17,color:DS.slate,letterSpacing:'0.14em',fontWeight:700}}>YOU</div>
      </div>
      <button onClick={onDismiss} style={{background:DS.voltage,color:DS.ink,border:'none',
        padding:'13px 40px',borderRadius:8,cursor:'pointer',fontFamily:F.ui,
        fontWeight:700,fontSize:17,letterSpacing:'0.1em',textTransform:'uppercase',
        boxShadow:`0 0 20px ${DS.voltage}88`}}>Continue →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FullScrapLightbox — elaborate celebration
// ─────────────────────────────────────────────────────────────
export function FullScrapLightbox({ onDone }) {
  const canvasRef=useRef();
  const [phase,setPhase]=useState(0); // 0=fireworks, 1=text
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    const pts=[]; const cols=[DS.gold,DS.ember,DS.frost,DS.canopy,'#fff','#F2A68C','#D9CB6B'];
    function burst(x,y,n=100){
      for(let i=0;i<n;i++){
        const a=(Math.PI*2/n)*i+Math.random()*.4,s=3+Math.random()*9;
        pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,
          color:cols[Math.floor(Math.random()*cols.length)],
          life:1,decay:.006+Math.random()*.006,size:3+Math.random()*5});
      }
    }
    const positions=[[.25,.25],[.75,.2],[.5,.15],[.15,.5],[.85,.45],[.4,.6],[.65,.55],[.5,.35]];
    positions.forEach(([x,y],i)=>setTimeout(()=>burst(canvas.width*x,canvas.height*y,120),i*250));
    setTimeout(()=>setPhase(1),600);
    let raf;
    function draw(){
      ctx.fillStyle='rgba(20,31,25,0.1)';ctx.fillRect(0,0,canvas.width,canvas.height);
      for(let i=pts.length-1;i>=0;i--){
        const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.08;p.life-=p.decay;
        if(p.life<=0){pts.splice(i,1);continue;}
        ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(raf);
  },[]);

  return (
    <div style={{position:'fixed',inset:0,zIndex:200}}>
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
      {phase===1&&(
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
          justifyContent:'center',flexDirection:'column',gap:20,padding:24}}>
          <div style={{
            fontFamily:F.display,
            fontWeight:700,
            fontSize:'clamp(56px,13vw,112px)',
            color:DS.gold,
            textShadow:`0 0 40px ${DS.gold},0 0 80px ${DS.gold}88`,
            animation:'fullScrapPop 0.5s cubic-bezier(.34,1.8,.64,1)',
            letterSpacing:'0.04em',whiteSpace:'nowrap',textAlign:'center',
          }}>FULL SCRAP!</div>
          <div style={{
            background:DS.inkLight,border:`3px solid ${DS.gold}`,
            borderRadius:16,padding:'24px 40px',textAlign:'center',
            boxShadow:`0 0 40px ${DS.gold}55`,
            animation:'slideUp 0.4s ease 0.2s both',
          }}>
            <div style={{fontFamily:F.ui,color:DS.frost,fontSize:22,fontWeight:700,lineHeight:1.6}}>
              You won both small hands<br/>and the Scraps hand!
            </div>
            <div style={{fontFamily:F.display,fontWeight:700,color:DS.gold,fontSize:36,
              letterSpacing:'0.08em',marginTop:12}}>
              ENJOY THIS BONUS POINT!
            </div>
            <div style={{fontFamily:F.mono,color:DS.gold,fontSize:28,marginTop:6}}>
              +5 TOTAL
            </div>
          </div>
          <button onClick={onDone} style={{
            background:DS.gold,color:DS.ink,border:'none',
            padding:'16px 52px',borderRadius:10,cursor:'pointer',
            fontFamily:F.ui,fontWeight:700,fontSize:19,
            letterSpacing:'0.1em',textTransform:'uppercase',
            boxShadow:`0 0 28px ${DS.gold}88`,
            animation:'slideUp 0.4s ease 0.4s both',
          }}>Let's Go! →</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WinScreen — elaborate fireworks
// ─────────────────────────────────────────────────────────────
export function WinScreen({ playerScore, aiScore, onNewGame, margin=null, bestMargin=null, isNewRecord=false }) {
  const canvasRef=useRef();
  const [textPhase,setTextPhase]=useState(0);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    // Five-second fanfare starts with the screen. It's scheduled on
    // the audio clock, so nothing below waits on it.
    playGrandFanfare();
    const pts=[]; const cols=[DS.gold,DS.ember,DS.frost,DS.canopy,'#fff','#F2A68C','#D9CB6B','#B8874A'];
    function burst(x,y,n=120){
      playFireworkPop(); // one pop per visual explosion
      for(let i=0;i<n;i++){
        const a=(Math.PI*2/n)*i+Math.random()*.4,s=3+Math.random()*10;
        pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,
          color:cols[Math.floor(Math.random()*cols.length)],
          life:1,decay:.004+Math.random()*.005,size:3+Math.random()*6});
      }
    }
    // Continuous bursts
    let burstInterval=setInterval(()=>{
      burst(Math.random()*canvas.width, Math.random()*canvas.height*.7);
    },400);
    setTimeout(()=>clearInterval(burstInterval),8000);
    // Initial burst wave
    [[.5,.3],[.2,.4],[.8,.35],[.35,.25],[.65,.28]].forEach(([x,y],i)=>
      setTimeout(()=>burst(canvas.width*x,canvas.height*y),i*200));
    setTimeout(()=>setTextPhase(1),500);
    let raf;
    function draw(){
      ctx.fillStyle='rgba(20,31,25,0.08)';ctx.fillRect(0,0,canvas.width,canvas.height);
      for(let i=pts.length-1;i>=0;i--){
        const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.06;p.life-=p.decay;
        if(p.life<=0){pts.splice(i,1);continue;}
        ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);clearInterval(burstInterval);};
  },[]);

  const lines=['YOU WIN!','YOU WIN!','WOW.','HOLY COW.','YOU DID IT!'];

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:DS.dusk}}>
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
        justifyContent:'center',flexDirection:'column',gap:16,padding:24}}>
        {textPhase>=1&&(
          <>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              {lines.map((l,i)=>(
                <div key={i} style={{
                  fontFamily:F.display,
                  fontWeight:700,
                  fontSize:i<=1?'clamp(34px,7vw,64px)':i===2?'clamp(28px,6vw,52px)':'clamp(24px,5vw,46px)',
                  color:i===0||i===1?DS.gold:i===2?DS.ember:DS.frost,
                  textShadow:`0 0 30px ${i<=1?DS.gold:DS.ember}`,
                  letterSpacing:'0.04em',lineHeight:1,
                  animation:`letterAppear 0.5s cubic-bezier(.34,1.6,.64,1) ${i*.12}s both`,
                }}>{l}</div>
              ))}
            </div>
            {/* FINAL SCORE — the biggest text on the screen, by design */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              animation:'slideUp 0.4s ease 0.7s both'}}>
              <div style={{fontFamily:F.mono,color:DS.slate,fontSize:15,
                letterSpacing:'0.28em',marginBottom:2}}>FINAL SCORE</div>
              <div style={{fontFamily:F.display,fontWeight:700,color:DS.gold,lineHeight:1,
                fontSize:'clamp(110px,22vw,220px)',letterSpacing:'0.03em',
                textShadow:`0 0 50px ${DS.gold}aa, 0 0 100px ${DS.gold}55`}}>
                {playerScore}–{aiScore}
              </div>
              {margin!=null&&(
                <div style={{display:'flex',alignItems:'center',gap:14,marginTop:10,
                  animation:'slideUp 0.4s ease 0.85s both'}}>
                  <span style={{fontFamily:F.mono,fontSize:16,color:DS.slateLight,
                    letterSpacing:'0.14em'}}>WON BY {margin}</span>
                  {isNewRecord?(
                    <span style={{display:'inline-flex',alignItems:'center',gap:8,
                      fontFamily:F.mono,fontSize:16,fontWeight:700,color:DS.gold,
                      letterSpacing:'0.14em',background:DS.gold+'18',
                      border:`1px solid ${DS.gold}88`,borderRadius:20,padding:'4px 16px',
                      boxShadow:`0 0 18px ${DS.gold}55`,
                      animation:'popIn 0.4s cubic-bezier(.34,1.6,.64,1) 1.1s both'}}>
                      <IconTrophy size={16}/> NEW BEST MARGIN
                    </span>
                  ):bestMargin!=null&&bestMargin>0&&(
                    <span style={{fontFamily:F.mono,fontSize:16,color:DS.slate,
                      letterSpacing:'0.14em'}}>BEST {bestMargin}</span>
                  )}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:16,animation:'slideUp 0.4s ease 0.9s both'}}>
              <button onClick={onNewGame} style={{
                background:DS.gold,color:DS.ink,border:'none',
                padding:'16px 48px',borderRadius:10,cursor:'pointer',
                fontFamily:F.ui,fontWeight:700,fontSize:18,
                letterSpacing:'0.1em',textTransform:'uppercase',
                boxShadow:`0 0 28px ${DS.gold}88`,
              }}>NEW GAME</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LoseScreen
// ─────────────────────────────────────────────────────────────
export function LoseScreen({ playerScore, aiScore, onNewGame }) {
  // Deliberately quiet: no fireworks, no descending sad-trombone.
  // A neutral jingle plays once, and the final score is the
  // biggest text on the screen (matching the win screen's scale).
  useEffect(()=>{ playNeutralJingle(); },[]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:DS.dusk,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28}}>
      <SwirlBg/>
      <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:'clamp(34px,7vw,60px)',
          color:DS.ember,marginBottom:8,letterSpacing:'0.04em'}}>YOU LOSE.</div>
        <div style={{fontFamily:F.mono,color:DS.slate,fontSize:15,
          letterSpacing:'0.28em',marginBottom:2}}>FINAL SCORE</div>
        <div style={{fontFamily:F.display,fontWeight:700,color:DS.frost,lineHeight:1,
          fontSize:'clamp(100px,20vw,190px)',letterSpacing:'0.03em',
          marginBottom:36,textShadow:'0 0 40px rgba(237,227,208,0.25)'}}>
          {playerScore}–{aiScore}
        </div>
        <button onClick={onNewGame} style={{background:DS.voltage,color:DS.ink,border:'none',
          padding:'15px 44px',borderRadius:10,cursor:'pointer',fontFamily:F.ui,
          fontWeight:700,fontSize:17,letterSpacing:'0.1em',textTransform:'uppercase',
          boxShadow:`0 0 24px ${DS.voltage}88`}}>NEW GAME</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TransferHintArrow — first-time-per-game nudge shown the first
// time the player can move cards from hand to Scraps. A sketchy,
// hand-drawn-looking curve (SVG turbulence displacement, not a
// clean bezier) from the right half of the hand to the Scraps
// pile. Tracks the two zones' live positions via refs so it holds
// up under window resizes and layout shifts, and fades in without
// claiming a new accent color — it borrows voltage, the palette's
// existing "yours / active" token.
// ─────────────────────────────────────────────────────────────
export function TransferHintArrow({ fromRef, toRef }) {
  const [pts, setPts] = useState(null);
  const lastPts = useRef(null);
  useEffect(() => {
    function measure() {
      const f = fromRef.current, t = toRef.current;
      if (!f || !t) return;
      const fr = f.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      const next = {
        x1: fr.left + fr.width * 0.64, y1: fr.top + fr.height * 0.32,
        x2: tr.left + tr.width * 0.2,  y2: tr.top + tr.height * 0.45,
      };
      const last = lastPts.current;
      if (last && last.x1===next.x1 && last.y1===next.y1 && last.x2===next.x2 && last.y2===next.y2) return;
      lastPts.current = next;
      setPts(next);
    }
    measure();
    window.addEventListener('resize', measure);
    const id = setInterval(measure, 400);
    return () => { window.removeEventListener('resize', measure); clearInterval(id); };
  }, [fromRef, toRef]);
  if (!pts) return null;
  const { x1, y1, x2, y2 } = pts;
  const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 70;
  const angle = Math.atan2(y2 - cy, x2 - cx) * 180 / Math.PI;
  return (
    <svg style={{position:'fixed',inset:0,width:'100vw',height:'100vh',
      pointerEvents:'none',zIndex:40,animation:'popIn 0.4s cubic-bezier(.34,1.6,.64,1)'}}>
      <defs>
        <filter id="sketchWobble" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.05" numOctaves="2" seed="7" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7"/>
        </filter>
      </defs>
      <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none"
        stroke={DS.voltage} strokeWidth="4.5" strokeLinecap="round"
        filter="url(#sketchWobble)" opacity="0.92"
        style={{animation:'pulse 1.6s ease-in-out infinite'}}/>
      <g transform={`translate(${x2},${y2}) rotate(${angle})`} filter="url(#sketchWobble)">
        <path d="M -16 -10 L 5 0 L -16 10" fill="none" stroke={DS.voltage}
          strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// AceDrawnLightbox — first-time-per-game tip shown the moment an
// Ace lands in the player's hand. The Ace and the Play Ace button
// wiggle on the same animation so they read as dancing in sync.
// ─────────────────────────────────────────────────────────────
export function AceDrawnLightbox({ ace, onDismiss }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:95,background:'rgba(20,31,25,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.gold}`,
        borderRadius:16,padding:32,maxWidth:480,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.gold}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:32,color:DS.gold,
          letterSpacing:'0.06em',marginBottom:22}}>You've drawn an Ace!</div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:26}}>
          {ace && <PlayingCard card={ace} size="large" wiggle/>}
        </div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:18,lineHeight:1.6,marginBottom:10}}>
          On your turn, you can play your Ace and select two cards to remove
          from your opponent's Scraps pile. If your opponent has an Ace, they
          can "counter," causing both Aces to be discarded and your turn to end.
        </p>
        <p style={{fontFamily:F.mono,color:DS.slate,fontSize:14,marginBottom:28}}>
          When transferred to your Scraps pile, an Ace is worth three cards.
        </p>
        <button onClick={onDismiss} style={{
          background:DS.gold,color:DS.ink,border:'none',
          padding:'16px 40px',borderRadius:10,cursor:'pointer',
          fontFamily:F.ui,fontWeight:700,fontSize:18,
          letterSpacing:'0.08em',textTransform:'uppercase',
          boxShadow:`0 0 24px ${DS.gold}88`,
          display:'inline-flex',alignItems:'center',gap:8,
          animation:'cardWiggle 0.5s ease-in-out infinite alternate',
        }}>
          Play Ace <IconBolt size={18}/>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AceCounterModal — prompt player to counter opponent's ace
// ─────────────────────────────────────────────────────────────
export function AceCounterModal({ onCounter, onAllow, playerScraps }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(20,31,25,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:32,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:36,color:DS.ember,
          letterSpacing:'0.06em',marginBottom:14}}>OPPONENT PLAYS ACE!</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:14}}>
          They will remove two cards from your Scraps pile.
        </p>
        {/* Show player's scraps so they know what's at stake */}
        {playerScraps&&playerScraps.length>0&&(
          <div style={{margin:'0 auto 18px',background:DS.inkLight,
            border:`2px solid ${DS.ember}66`,borderRadius:12,padding:'12px 16px',
            display:'inline-block'}}>
            <div style={{fontFamily:F.mono,fontSize:12,color:DS.ember,marginBottom:8,
              letterSpacing:'0.12em'}}>YOUR SCRAPS AT STAKE</div>
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
              {playerScraps.map(c=>(
                <PlayingCard key={c.id} card={c} size="small" isScrap={true}/>
              ))}
            </div>
          </div>
        )}
        <p style={{fontFamily:F.ui,color:DS.voltage,fontSize:17,fontWeight:700,
          marginBottom:24}}>You have an Ace. Counter to cancel theirs?</p>
        <p style={{fontFamily:F.ui,color:DS.slate,fontSize:14,marginBottom:24,lineHeight:1.5}}>
          Countering cancels their Ace — nothing is removed. Both Aces are discarded.
        </p>
        <div style={{display:'flex',gap:16,justifyContent:'center'}}>
          <Btn variant="danger" onClick={onCounter}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
              Counter <IconBolt size={16}/> Cancel Their Ace
            </span>
          </Btn>
          <Btn variant="ghost" onClick={onAllow}>Let It Happen</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OpponentAceReveal — step 2 of the opponent-Ace sequence.
// Shown after the player allows the Ace (or holds no Ace to
// counter with): the two targeted cards are revealed in the
// center of the table. On OK they animate to the discard pile.
// ─────────────────────────────────────────────────────────────
export function OpponentAceReveal({ targets, onOk }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(20,31,25,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:32,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:32,color:DS.ember,
          letterSpacing:'0.06em',marginBottom:16,lineHeight:1.2}}>
          OPPONENT plays an Ace and removes two cards from your Scraps
        </div>
        <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:24}}>
          {(targets||[]).map((c,i)=>(
            <div key={c.id} style={{animation:`popIn 0.4s cubic-bezier(.34,1.6,.64,1) ${0.15+i*0.12}s both`}}>
              <PlayingCard card={c} size="normal" isScrap={true}/>
            </div>
          ))}
        </div>
        <Btn variant="danger" onClick={onOk}>OK</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AiCounterNotice — the AI countered the player's Ace.
// Both Aces are shown cancelled; nothing was removed.
// ─────────────────────────────────────────────────────────────
export function AiCounterNotice({ playerAce, aiAce, onOk }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(20,31,25,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:32,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:32,color:DS.ember,
          letterSpacing:'0.06em',marginBottom:16,lineHeight:1.2}}>
          Opponent counters your Ace!
        </div>
        <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:18}}>
          {[playerAce,aiAce].filter(Boolean).map((c,i)=>(
            <div key={c.id} style={{position:'relative',
              animation:`popIn 0.4s cubic-bezier(.34,1.6,.64,1) ${0.15+i*0.12}s both`}}>
              <div style={{filter:'saturate(0.4) brightness(0.75)'}}>
                <PlayingCard card={c} size="normal" isScrap={false}/>
              </div>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
                justifyContent:'center',fontFamily:F.display,fontSize:52,color:DS.ember,
                textShadow:'0 0 12px rgba(0,0,0,0.8)'}}>✕</div>
            </div>
          ))}
        </div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          Both Aces discarded. Nothing removed.
        </p>
        <Btn onClick={onOk}>OK</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RulesModal
// ─────────────────────────────────────────────────────────────
export function RulesModal({ onClose }) {
  const rules=[
    {icon:<IconCards size={24} color={DS.voltage}/>,t:`Scraps is a game of twos: Two hands. Two opponents. Two games of Poker happening at two speeds. First to ${WIN_SCORE} — win by 2.`},
    {icon:<IconFan size={24} color={DS.voltage}/>,t:"Each round: two private small hands (worth 1 point each) and one public 'Scraps' hand (worth 2). Max 7 cards in either."},
    {icon:<IconCycle size={24} color={DS.voltage}/>,t:'Transfer cards from your small hand into your Scraps pile, and pick up fresh cards. Transfer a 10-K and pick up 2 fresh cards. Ace earns 3. All others earn 1.'},
    {icon:<IconBolt size={24} color={DS.ember}/>,t:"Discard an Ace to remove two cards from your opponent's Scraps pile. They can counter with their own Ace."},
    {icon:<IconSpade size={24} color={DS.voltage}/>,t:'After two small hands, play your best 5-card Scraps hand for 2 pts. Flushes are never allowed.'},
    {icon:<IconTrophy size={24} color={DS.voltage}/>,t:'Bonus points: Win both small hands AND the Scraps hand for a FULL SCRAP — 5 points total.'},
  ];
  return (
    <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(20,31,25,.94)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:DS.duskMid,
        border:`2px solid ${DS.slate}44`,borderRadius:16,padding:'34px 40px',
        maxWidth:820,width:'100%',maxHeight:'88vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h2 style={{fontFamily:F.display,fontWeight:700,color:DS.voltage,fontSize:40,letterSpacing:'0.06em'}}>Rules</h2>
          <Btn small variant="ghost" onClick={onClose}>Close</Btn>
        </div>
        {rules.map((r,i)=>(
          <div key={i} style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:18}}>
            <span style={{flexShrink:0,marginTop:3,width:38,display:'flex',
              justifyContent:'center'}}>{r.icon}</span>
            <div style={{fontFamily:F.ui,color:DS.slateLight,fontSize:19,lineHeight:1.6}}>{r.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TutorialOverlay
// ─────────────────────────────────────────────────────────────
export function TutorialOverlay({ step, onOk }) {
  if(!step) return null;
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:50,
      background:`linear-gradient(${DS.dusk} 82%,transparent)`,
      padding:'10px 18px 26px',pointerEvents:'none'}}>
      <div style={{maxWidth:680,margin:'0 auto',background:DS.duskMid,
        border:`2px solid ${DS.voltage}88`,borderRadius:12,
        padding:'16px 24px',pointerEvents:'all',
        boxShadow:`0 0 28px ${DS.voltage}33`}}>
        <div style={{fontFamily:F.ui,color:DS.voltage,fontSize:13,
          letterSpacing:'0.16em',marginBottom:8,fontWeight:700}}>{step.title.toUpperCase()}</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:16,
          lineHeight:1.65,marginBottom:step.waitForOk?14:0}}>{step.instruction}</p>
        {step.waitForOk&&<Btn small onClick={onOk}>Got it →</Btn>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SkipTurnModal — shown when the player has no legal trade
// ─────────────────────────────────────────────────────────────
export function SkipTurnModal({ onOk }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(20,31,25,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.slate}`,
        borderRadius:16,padding:32,maxWidth:520,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.slate}44`}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:34,color:DS.frost,
          letterSpacing:'0.06em',marginBottom:14}}>NO LEGAL TRADES</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          You have no legal trades available. Your trade is skipped.
        </p>
        <Btn onClick={onOk}>OK</Btn>
      </div>
    </div>
  );
}
