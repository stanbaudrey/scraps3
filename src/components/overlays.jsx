// ============================================================
// SCRAPS — Overlays: interstitial, reveals, win/lose, modals
// ============================================================
import { useState, useEffect, useRef } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { playGameWon, playFireworkPop, playGameLost } from "../audio.js";
import { Btn, AceTag } from "./buttons.jsx";
import { PlayingCard } from "./cards.jsx";
import { SwirlBg } from "./backdrop.jsx";
import { FitBox } from "../ui/viewport.jsx";
import { useViewport } from "../ui/viewport.jsx";
import { IconBolt, IconTrophy, IconCards, IconFan, IconCycle, IconSpade } from "./icons.jsx";

// ─────────────────────────────────────────────────────────────
// Shell — the frame every full-screen overlay in this file
// shares, and the one place the "never scrolls" rule is applied
// to them.
//
// The six modals below were all the same thing written six
// times: a fixed backdrop, centred, with 24px of padding around
// a max-width card. Centring alone is fine until the card is
// taller than the screen — then half of it is above the top
// edge, unreachable, and on a 375x667 phone that was true of the
// Ace lightbox and the rules panel both.
//
// A column flex parent gives FitBox a definite height to measure
// against (an `align-items:center` row does not — the box would
// be exactly as tall as its content and always "fit"), and
// FitBox scales anything that still comes up too tall.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// useDialogFocus — the keyboard half of a modal.
//
// Every overlay in this file already trapped a POINTER: a fixed
// backdrop covers the table, so nothing behind it can be clicked.
// Focus was never trapped to match. Tab from inside the Ace counter
// modal walked straight out into the hand underneath it — cards that
// are role="button" and reachable — so a keyboard player could tab
// onto controls the modal exists to block, with no way to tell they
// had left the dialog.
//
// Three things, all of them standard and none of them optional:
// move focus in on open, keep Tab inside while it is up, and put
// focus back where it came from on close. The last one is the one
// that gets skipped and the one people notice: without it, dismissing
// a modal drops focus to the top of the document.
// ─────────────────────────────────────────────────────────────
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function useDialogFocus(active) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const restoreTo = document.activeElement;
    const list = () => Array.from(node.querySelectorAll(FOCUSABLE));
    const first = list()[0];
    (first || node).focus();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const f = list();
      if (!f.length) { e.preventDefault(); node.focus(); return; }
      const at = f.indexOf(document.activeElement);
      if (e.shiftKey && at <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (restoreTo && typeof restoreTo.focus === 'function') restoreTo.focus();
    };
  }, [active]);
  return ref;
}

function Shell({ children, zIndex, background, onClick, pad = 16, style = {},
  dialogLabel = null }) {
  // `dialogLabel` is opt-in, because not every user of this Shell is a
  // dialog. RoundInterstitial is a 2-second flash nobody can act on;
  // announcing it as a modal and stealing focus into it would be a lie
  // and a nuisance. The overlays that ask a question all pass one.
  const dialogRef = useDialogFocus(!!dialogLabel);
  return (
    <div onClick={onClick}
      ref={dialogLabel ? dialogRef : undefined}
      {...(dialogLabel ? { role:'dialog', 'aria-modal':true, 'aria-label':dialogLabel, tabIndex:-1 } : {})}
      style={{position:'fixed',inset:0,zIndex,background,
      display:'flex',flexDirection:'column',padding:pad,...style,
      ...(dialogLabel ? { outline:'none' } : {})}}>
      <FitBox modeMinW={300}>
        <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center'}}>
          {children}
        </div>
      </FitBox>
    </div>
  );
}

// Card padding shrinks with the viewport: 32px of inset around a
// modal is a third of a phone's width.
const CARD_PAD = 'clamp(18px,5vw,32px)';

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
          fontSize:'clamp(34px,11vw,96px)',
          color:DS.voltage,
          letterSpacing:'0.08em',
          textShadow:`0 0 40px ${DS.voltage}99, 0 0 80px ${DS.voltage}55`,
          whiteSpace:'nowrap',
        }}>
          BEGIN ROUND {roundNum}
        </div>
        <div style={{
          fontFamily:F.ui,
          fontSize:'clamp(15px,3.6vw,36px)',
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
  const { w } = useViewport();
  // Two five-card hands, a verdict and two labels do not fit a
  // phone at 'normal'. Dropping a size keeps the pips crisp; the
  // Shell's scaling is the fallback under that, not the first
  // answer.
  const cardSize = w < 700 ? 'small' : 'normal';
  useEffect(()=>{setTimeout(()=>setVis(true),50);},[]);
  return (
    <Shell zIndex={80} background="rgba(20,31,25,0.94)" pad={14} dialogLabel="Hand reveal"
      style={{opacity:vis?1:0,transition:'opacity 0.3s'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
        gap:'clamp(10px,2.4vh,20px)'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
        <div style={{fontFamily:F.ui,fontSize:17,color:DS.slate,letterSpacing:'0.14em',fontWeight:700}}>OPPONENT</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
          {(aiCards||[]).map((c,i)=>(
            <div key={c.id} style={{animation:`slideDown 0.3s ease ${i*.07}s both`,
              filter:aiBestIds&&!aiBestIds.has(c.id)?'brightness(0.35) saturate(0.3)':'',
              transition:'filter 0.4s'}}>
              <PlayingCard card={c} size={cardSize} isScrap={false}/>
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
              <PlayingCard card={c} size={cardSize} isScrap={false} wiggle={winner==='player'&&(!playerBestIds||playerBestIds.has(c.id))}/>
            </div>
          ))}
        </div>
        <div style={{fontFamily:F.display,fontWeight:600,fontSize:26,color:winner==='player'?DS.voltage:DS.slate,letterSpacing:'0.06em'}}>{playerHandName}</div>
        <div style={{fontFamily:F.ui,fontSize:17,color:DS.slate,letterSpacing:'0.14em',fontWeight:700}}>YOU</div>
      </div>
      <button onClick={onDismiss} style={{background:DS.voltage,color:DS.ink,border:'none',
        padding:'13px 40px',minHeight:44,borderRadius:8,cursor:'pointer',fontFamily:F.ui,
        fontWeight:700,fontSize:17,letterSpacing:'0.1em',textTransform:'uppercase',
        boxShadow:`0 0 20px ${DS.voltage}88`}}>Continue →</button>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// FullScrapLightbox — elaborate celebration
// ─────────────────────────────────────────────────────────────
export function FullScrapLightbox({ onDone }) {
  const canvasRef=useRef();
  const [phase,setPhase]=useState(0); // 0=fireworks, 1=text
  // Phase 0 is fireworks over a canvas with nothing to press. Trapping
  // focus before the button exists would park it on the container and
  // announce an empty dialog, so the trap arms with the text.
  const dialogRef=useDialogFocus(phase===1);
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
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}
      aria-label="Full Scrap — you won all three hands"
      style={{position:'fixed',inset:0,zIndex:200,outline:'none'}}>
      <canvas ref={canvasRef} aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
      {phase===1&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',padding:16}}>
          <FitBox modeMinW={300}>
          <div style={{flex:'1 0 auto',display:'flex',alignItems:'center',
            justifyContent:'center',flexDirection:'column',gap:'clamp(12px,2.6vh,20px)'}}>
          <div style={{
            fontFamily:F.display,
            fontWeight:700,
            fontSize:'clamp(40px,12vw,112px)',
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
            letterSpacing:'0.1em',textTransform:'uppercase',minHeight:44,
            boxShadow:`0 0 28px ${DS.gold}88`,
            animation:'slideUp 0.4s ease 0.4s both',
          }}>Let's Go! →</button>
          </div>
          </FitBox>
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
    playGameWon();
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
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',padding:16}}>
        <FitBox modeMinW={300}>
        <div style={{flex:'1 0 auto',display:'flex',alignItems:'center',
          justifyContent:'center',flexDirection:'column',gap:'clamp(10px,2vh,16px)'}}>
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
                letterSpacing:'0.1em',textTransform:'uppercase',minHeight:44,
                boxShadow:`0 0 28px ${DS.gold}88`,
              }}>NEW GAME</button>
            </div>
          </>
        )}
        </div>
        </FitBox>
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
  useEffect(()=>{ playGameLost(); },[]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:DS.dusk,
      display:'flex',flexDirection:'column',padding:16}}>
      <SwirlBg/>
      <FitBox modeMinW={300} style={{zIndex:1}}>
      <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',textAlign:'center'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:'clamp(34px,7vw,60px)',
          color:DS.ember,marginBottom:8,letterSpacing:'0.04em'}}>YOU LOSE.</div>
        <div style={{fontFamily:F.mono,color:DS.slate,fontSize:15,
          letterSpacing:'0.28em',marginBottom:2}}>FINAL SCORE</div>
        <div style={{fontFamily:F.display,fontWeight:700,color:DS.frost,lineHeight:1,
          fontSize:'clamp(100px,20vw,190px)',letterSpacing:'0.03em',
          marginBottom:'clamp(18px,4vh,36px)',textShadow:'0 0 40px rgba(237,227,208,0.25)'}}>
          {playerScore}–{aiScore}
        </div>
        <button onClick={onNewGame} style={{background:DS.voltage,color:DS.ink,border:'none',
          padding:'15px 44px',minHeight:44,borderRadius:10,cursor:'pointer',fontFamily:F.ui,
          fontWeight:700,fontSize:17,letterSpacing:'0.1em',textTransform:'uppercase',
          boxShadow:`0 0 24px ${DS.voltage}88`}}>NEW GAME</button>
      </div>
      </FitBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AceDrawnLightbox — first-time-per-game tip, shown the moment an
// Ace lands in the player's hand.
//
// The Play Ace control here is an ILLUSTRATION, not a control: it
// shows the player exactly what they are about to see on the
// table — a gold tag sitting on top of an Ace, leaning with it —
// so the real one is recognised on sight rather than discovered.
// It shares one wiggle wrapper with the card for that reason; two
// separate animations would drift apart and break the pairing.
// The only thing to press is OKAY, at the bottom.
// ─────────────────────────────────────────────────────────────
export function AceDrawnLightbox({ ace, onDismiss }) {
  return (
    <Shell zIndex={95} background="rgba(20,31,25,.92)" dialogLabel="You drew an Ace">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.gold}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:480,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.gold}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:32,color:DS.gold,
          letterSpacing:'0.06em',marginBottom:24}}>You've drawn an Ace!</div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:26}}>
          <div className="live-cue-card"
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,
            animation:'cardWiggle 0.5s ease-in-out infinite alternate'}}>
            <AceTag live={false} width={124}/>
            {ace && <PlayingCard card={ace} size="large" liftTransform={false}/>}
          </div>
        </div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:18,lineHeight:1.6,marginBottom:12}}>
          On your turn, you can play your Ace and select two cards to remove
          from your opponent's Scraps pile. If your opponent has an Ace, they
          can "counter," causing both Aces to be discarded and your turn to end.
        </p>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:18,lineHeight:1.6,marginBottom:28}}>
          You can also play an Ace in a hand or transfer it to your Scraps pile,
          worth 3 cards.
        </p>
        <button onClick={onDismiss} style={{
          background:DS.gold,color:DS.ink,border:'none',
          padding:'16px 44px',borderRadius:10,cursor:'pointer',
          fontFamily:F.ui,fontWeight:700,fontSize:18,
          letterSpacing:'0.1em',textTransform:'uppercase',
          boxShadow:`0 0 24px ${DS.gold}88`,
        }}>
          Okay
        </button>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// AceCounterModal — prompt player to counter opponent's ace
// ─────────────────────────────────────────────────────────────
export function AceCounterModal({ onCounter, onAllow, playerScraps }) {
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel="Opponent played an Ace — counter or allow">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:560,width:'100%',textAlign:'center',
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
          Countering cancels their Ace and nothing is removed. Both Aces are then
          discarded, so your Ace is spent either way: countering trades it for theirs
          instead of saving it for a strike of your own.
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
    </Shell>
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
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel="Opponent's Ace removed two of your Scraps cards">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:560,width:'100%',textAlign:'center',
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
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// AiCounterNotice — the AI countered the player's Ace.
// Both Aces are shown cancelled; nothing was removed.
// ─────────────────────────────────────────────────────────────
export function AiCounterNotice({ playerAce, aiAce, onOk }) {
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel="Opponent countered your Ace">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:560,width:'100%',textAlign:'center',
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
                <PlayingCard card={c} size={cardSize} isScrap={false}/>
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
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// RulesModal
// ─────────────────────────────────────────────────────────────
export function RulesModal({ onClose }) {
  const dialogRef = useDialogFocus(true);
  // Escape closes it. The backdrop already closes on click, which is the
  // pointer half of the same affordance; without this a keyboard user
  // has to find the Close button to leave.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rules=[
    {icon:<IconCards size={24} color={DS.voltage}/>,t:`Scraps is a game of twos: Two hands. Two opponents. Two games of Poker happening at two speeds. First to ${WIN_SCORE} — win by 2.`},
    {icon:<IconFan size={24} color={DS.voltage}/>,t:"Each round: two private small hands (worth 1 point each) and one public 'Scraps' hand (worth 2). Max 7 cards in either."},
    {icon:<IconCycle size={24} color={DS.voltage}/>,t:'Transfer cards from your small hand into your Scraps pile, and pick up fresh cards. Transfer a 10-K and pick up 2 fresh cards. Ace earns 3. All others earn 1.'},
    {icon:<IconBolt size={24} color={DS.ember}/>,t:"Discard an Ace to remove two cards from your opponent's Scraps pile. They can counter with their own Ace."},
    {icon:<IconSpade size={24} color={DS.voltage}/>,t:'After two small hands, play your best 5-card Scraps hand for 2 pts. Flushes are never allowed.'},
    {icon:<IconTrophy size={24} color={DS.voltage}/>,t:'Bonus points: Win both small hands AND the Scraps hand for a FULL SCRAP — 5 points total.'},
  ];
  // The rules panel is the ONE overlay that keeps a scrollbar. It
  // is a wall of reference text, and the alternative — scaling it
  // to fit a phone — would leave it too small to read, which
  // defeats the only thing the panel is for. Every other overlay
  // here is a short message and gets scaled instead.
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Rules" tabIndex={-1}
      style={{position:'fixed',inset:0,zIndex:100,background:'rgba(20,31,25,.94)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:12,outline:'none'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:DS.duskMid,
        border:`2px solid ${DS.slate}44`,borderRadius:16,padding:'clamp(20px,5vw,34px) clamp(16px,5vw,40px)',
        maxWidth:820,width:'100%',maxHeight:'min(88vh, 88dvh)',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          gap:12,marginBottom:20}}>
          <h2 style={{fontFamily:F.display,fontWeight:700,color:DS.voltage,
            fontSize:'clamp(28px,6vw,40px)',letterSpacing:'0.06em'}}>Rules</h2>
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
// SkipTurnModal — shown when the player has no legal trade
// ─────────────────────────────────────────────────────────────
export function SkipTurnModal({ onOk }) {
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel="No legal trades — your turn is skipped">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.slate}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:520,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.slate}44`}}>
        <div style={{fontFamily:F.display,fontWeight:700,fontSize:34,color:DS.frost,
          letterSpacing:'0.06em',marginBottom:14}}>NO LEGAL TRADES</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          Every card in your hand draws more than you have room for. Even the
          cheapest trade would put you over 7, and you have no Ace to play
          instead, so your turn is skipped.
        </p>
        <Btn onClick={onOk}>OK</Btn>
      </div>
    </Shell>
  );
}
