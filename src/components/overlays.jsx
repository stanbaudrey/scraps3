// ============================================================
// SCRAPS — Overlays: interstitial, reveals, win/lose, modals
// ============================================================
import { useState, useEffect, useRef } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { Btn } from "./buttons.jsx";
import { PlayingCard } from "./cards.jsx";
import { SwirlBg } from "./backdrop.jsx";

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
// RevealOverlay
// ─────────────────────────────────────────────────────────────
export function RevealOverlay({ playerCards, aiCards, playerHandName, aiHandName, winner, points, onDismiss, playerBestIds=null, aiBestIds=null, bonusLine=null }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),50);},[]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:80,background:'rgba(26,26,46,0.94)',
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
        <div style={{fontFamily:F.display,fontSize:26,color:winner==='ai'?DS.ember:DS.slate,letterSpacing:'0.06em'}}>{aiHandName}</div>
      </div>
      <div style={{padding:'16px 40px',borderRadius:12,textAlign:'center',
        background:winner==='player'?DS.voltage+'18':winner==='ai'?DS.ember+'18':DS.slate+'18',
        border:`3px solid ${winner==='player'?DS.voltage:winner==='ai'?DS.ember:DS.slate}`,
        boxShadow:winner==='player'?`0 0 32px ${DS.voltage}66`:winner==='ai'?`0 0 32px ${DS.ember}55`:'none',
        animation:'popIn 0.4s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontSize:42,letterSpacing:'0.04em',
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
        <div style={{fontFamily:F.display,fontSize:26,color:winner==='player'?DS.voltage:DS.slate,letterSpacing:'0.06em'}}>{playerHandName}</div>
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
    const pts=[]; const cols=[DS.voltage,DS.ember,DS.frost,DS.slateLight,'#fff','#ff99cc','#ccff66'];
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
      ctx.fillStyle='rgba(28,28,40,0.1)';ctx.fillRect(0,0,canvas.width,canvas.height);
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
            fontSize:'clamp(56px,13vw,112px)',
            color:DS.voltage,
            textShadow:`0 0 40px ${DS.voltage},0 0 80px ${DS.voltage}88`,
            animation:'fullScrapPop 0.5s cubic-bezier(.34,1.8,.64,1)',
            letterSpacing:'0.04em',whiteSpace:'nowrap',textAlign:'center',
          }}>FULL SCRAP!</div>
          <div style={{
            background:DS.inkLight,border:`3px solid ${DS.voltage}`,
            borderRadius:16,padding:'24px 40px',textAlign:'center',
            boxShadow:`0 0 40px ${DS.voltage}55`,
            animation:'slideUp 0.4s ease 0.2s both',
          }}>
            <div style={{fontFamily:F.ui,color:DS.frost,fontSize:22,fontWeight:700,lineHeight:1.6}}>
              You won both small hands<br/>and the Scraps hand!
            </div>
            <div style={{fontFamily:F.display,color:DS.voltage,fontSize:36,
              letterSpacing:'0.08em',marginTop:12}}>
              ENJOY THIS BONUS POINT!
            </div>
            <div style={{fontFamily:F.mono,color:DS.voltage,fontSize:28,marginTop:6}}>
              +5 TOTAL
            </div>
          </div>
          <button onClick={onDone} style={{
            background:DS.voltage,color:DS.ink,border:'none',
            padding:'16px 52px',borderRadius:10,cursor:'pointer',
            fontFamily:F.ui,fontWeight:700,fontSize:19,
            letterSpacing:'0.1em',textTransform:'uppercase',
            boxShadow:`0 0 28px ${DS.voltage}88`,
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
export function WinScreen({ playerScore, aiScore, onNewGame }) {
  const canvasRef=useRef();
  const [textPhase,setTextPhase]=useState(0);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    const pts=[]; const cols=[DS.voltage,DS.ember,DS.frost,DS.slateLight,'#fff','#ff99cc','#ccff66','#99ccff'];
    function burst(x,y,n=120){
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
      ctx.fillStyle='rgba(28,28,40,0.08)';ctx.fillRect(0,0,canvas.width,canvas.height);
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
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              {lines.map((l,i)=>(
                <div key={i} style={{
                  fontFamily:F.display,
                  fontSize:i<=1?'clamp(52px,12vw,100px)':i===2?'clamp(40px,9vw,80px)':'clamp(36px,8vw,72px)',
                  color:i===0||i===1?DS.voltage:i===2?DS.ember:DS.frost,
                  textShadow:`0 0 30px ${i<=1?DS.voltage:DS.ember}`,
                  letterSpacing:'0.04em',lineHeight:1,
                  animation:`letterAppear 0.5s cubic-bezier(.34,1.6,.64,1) ${i*.12}s both`,
                }}>{l}</div>
              ))}
            </div>
            <div style={{fontFamily:F.mono,color:DS.slate,fontSize:20,
              animation:'slideUp 0.4s ease 0.7s both'}}>
              {playerScore} — {aiScore}
            </div>
            <div style={{display:'flex',gap:16,animation:'slideUp 0.4s ease 0.9s both'}}>
              <button onClick={onNewGame} style={{
                background:DS.voltage,color:DS.ink,border:'none',
                padding:'16px 48px',borderRadius:10,cursor:'pointer',
                fontFamily:F.ui,fontWeight:700,fontSize:18,
                letterSpacing:'0.1em',textTransform:'uppercase',
                boxShadow:`0 0 28px ${DS.voltage}88`,
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
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:DS.dusk,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28}}>
      <SwirlBg/>
      <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{fontFamily:F.display,fontSize:'clamp(56px,12vw,96px)',
          color:DS.ember,marginBottom:12,letterSpacing:'0.04em'}}>YOU LOSE.</div>
        <div style={{fontFamily:F.mono,color:DS.slate,fontSize:24,marginBottom:40}}>
          {playerScore} — {aiScore}
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
// AceCounterModal — prompt player to counter opponent's ace
// ─────────────────────────────────────────────────────────────
export function AceCounterModal({ onCounter, onAllow, playerScraps }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(26,26,46,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:32,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`}}>
        <div style={{fontFamily:F.display,fontSize:36,color:DS.ember,
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
          <Btn variant="danger" onClick={onCounter}>Counter ⚡ Cancel Their Ace</Btn>
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
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(26,26,46,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:32,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontSize:32,color:DS.ember,
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
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(26,26,46,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:32,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontSize:32,color:DS.ember,
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
    {icon:'🃏',t:`Scraps is a game of twos: Two decks. Two opponents. Two games of Poker happening at two speeds. First to ${WIN_SCORE} — win by 2.`},
    {icon:'✋',t:"Each round: two private small hands (worth 1 point each) and one public 'Scraps' hand (worth 2). Max 7 cards in either."},
    {icon:'🔄',t:'Transfer cards from your small hand into your Scraps pile, and pick up fresh cards. Transfer a 10-K and pick up 2 fresh cards. Ace earns 3. All others earn 1.'},
    {icon:'⚡',t:"Discard an Ace to remove two cards from your opponent's Scraps pile. They can counter with their own Ace."},
    {icon:'♠️',t:'After two small hands, play your best 5-card Scraps hand for 2 pts. Flushes are never allowed.'},
    {icon:'🏆',t:'Bonus points: Win both small hands AND the Scraps hand for a FULL SCRAP — 5 points total.'},
  ];
  return (
    <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(26,26,46,.94)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:DS.duskMid,
        border:`2px solid ${DS.slate}44`,borderRadius:16,padding:'34px 40px',
        maxWidth:820,width:'100%',maxHeight:'88vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h2 style={{fontFamily:F.display,color:DS.voltage,fontSize:40,letterSpacing:'0.06em'}}>Rules</h2>
          <Btn small variant="ghost" onClick={onClose}>Close</Btn>
        </div>
        {rules.map((r,i)=>(
          <div key={i} style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:18}}>
            <span style={{fontSize:26,flexShrink:0,marginTop:1,width:38,display:'flex',
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
    <div style={{position:'fixed',inset:0,zIndex:90,background:'rgba(26,26,46,.92)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.slate}`,
        borderRadius:16,padding:32,maxWidth:520,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.slate}44`}}>
        <div style={{fontFamily:F.display,fontSize:34,color:DS.frost,
          letterSpacing:'0.06em',marginBottom:14}}>NO LEGAL TRADES</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          You have no legal trades available. Your trade is skipped.
        </p>
        <Btn onClick={onOk}>OK</Btn>
      </div>
    </div>
  );
}
