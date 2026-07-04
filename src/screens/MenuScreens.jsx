// ============================================================
// SCRAPS — Splash screen and difficulty picker
// ============================================================
import { useState } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { Btn } from "../components/buttons.jsx";
import { SwirlBg, AnimatedTitle } from "../components/backdrop.jsx";

// ─────────────────────────────────────────────────────────────
// SplashScreen
// ─────────────────────────────────────────────────────────────
export function SplashScreen({ onStart }) {
  const [page,setPage]=useState(0);
  const ov=[
    {icon:'🃏',text:`Scraps is a game of twos: Two decks. Two players. Two games of Poker happening at two speeds. First to ${WIN_SCORE} — win by 2.`},
    {icon:'✋',text:'Each round: two private small hands and one public Scraps hand.'},
    {icon:'🔄',text:'Trade cards from your small hand to grow your Scraps pile. Draw fresh cards. Trade-in values: 2–9 earns 1, 10–K earns 2, Ace earns 3. Max 7 cards.'},
    {icon:'♠', text:'After two small hands, play your best 5-card Scraps hand for 2 pts. Flushes are never allowed.'},
    {icon:'⚡',text:"Play an Ace to remove two of your opponent's Scraps cards. They can counter."},
    {icon:'🏆',text:'Win both small hands AND the Scraps hand for a FULL SCRAP — 5 points total.'},
  ];
  // Styles are in index.html — no style injection needed here
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:24,position:'relative',overflow:'hidden'}}>
      <SwirlBg/>
      <div style={{position:'relative',zIndex:1,maxWidth:600,width:'100%'}}>
        {page===0&&(
          <div style={{textAlign:'center',animation:'fadeUp .6s ease'}}>
            <div style={{fontFamily:F.display,fontSize:64,color:DS.slate,letterSpacing:'0.18em',
              marginBottom:10}}>♠ ♥ ♦ ♣</div>
            <AnimatedTitle/>
            <Btn onClick={()=>setPage(1)}>Rules</Btn>
          </div>
        )}
        {page===1&&(
          <div style={{animation:'fadeUp .4s ease'}}>
            <h2 style={{fontFamily:F.display,fontSize:44,color:DS.frost,marginBottom:22,
              textAlign:'center',letterSpacing:'0.06em'}}>RULES</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
              {ov.map((item,i)=>(
                <div key={i} style={{display:'flex',gap:18,alignItems:'flex-start',
                  background:DS.duskMid,border:`1px solid ${DS.slate}33`,
                  borderRadius:10,padding:'12px 18px',
                  animation:`fadeUp .4s ease ${i*.07}s both`}}>
                  <span style={{fontSize:24,flexShrink:0}}>{item.icon}</span>
                  <span style={{fontFamily:F.ui,fontSize:17,color:DS.slateLight,
                    lineHeight:1.5,fontWeight:500}}>{item.text}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:14,justifyContent:'center'}}>
              <Btn variant="ghost" onClick={()=>setPage(0)}>Back</Btn>
              <Btn onClick={()=>setPage(2)}>Play</Btn>
            </div>
          </div>
        )}
        {page===2&&(
          <div style={{animation:'fadeUp .4s ease',textAlign:'center'}}>
            <h2 style={{fontFamily:F.display,fontSize:44,color:DS.frost,marginBottom:10,letterSpacing:'0.06em'}}>READY?</h2>
            <p style={{fontFamily:F.ui,color:DS.slate,fontSize:18,marginBottom:28,fontWeight:500}}>Choose your path</p>
            <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:400,margin:'0 auto'}}>
              {[
                {id:'tutorial',label:'TUTORIAL HAND',desc:'Two minutes to learn everything.'},
                {id:'difficulty',label:'JUMP RIGHT IN',desc:'Start playing. Rules via the ? button anytime.'},
              ].map(opt=>(
                <div key={opt.id} className="menu-opt" onClick={()=>onStart(opt.id)}>
                  <div style={{fontFamily:F.ui,color:DS.frost,fontWeight:700,fontSize:17,marginBottom:5,letterSpacing:'0.06em'}}>{opt.label}</div>
                  <div style={{fontFamily:F.ui,color:DS.slate,fontSize:14,fontWeight:500}}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Styles in index.html */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DifficultyPicker
// ─────────────────────────────────────────────────────────────
export function DifficultyPicker({ onChoose, onBack }) {
  const opts=[
    {id:'easy',  label:'EASY',   desc:'Conservative. Never uses Aces. Good for learning.'},
    {id:'medium',label:'MEDIUM', desc:'Balanced. Uses Aces occasionally.'},
    {id:'hard',  label:'HARD',   desc:'Aggressive. Will sacrifice small hands to win Scraps.'},
  ];
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:24,position:'relative',overflow:'hidden'}}>
      <SwirlBg/>
      <div style={{maxWidth:460,width:'100%',position:'relative',zIndex:1}}>
        <h2 style={{fontFamily:F.display,fontSize:44,color:DS.frost,marginBottom:10,
          textAlign:'center',letterSpacing:'0.06em'}}>DIFFICULTY</h2>
        <p style={{fontFamily:F.ui,color:DS.slate,fontSize:17,textAlign:'center',
          marginBottom:26,fontWeight:500}}>Affects how the opponent thinks — not the rules.</p>
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:22}}>
          {opts.map(o=>(
            <div key={o.id} className="diff-opt" onClick={()=>onChoose(o.id)}>
              <div style={{fontFamily:F.ui,color:DS.voltage,fontWeight:700,fontSize:18,marginBottom:5,letterSpacing:'0.06em'}}>{o.label}</div>
              <div style={{fontFamily:F.ui,color:DS.slateLight,fontSize:16,fontWeight:500}}>{o.desc}</div>
            </div>
          ))}
        </div>
        <div style={{textAlign:'center'}}>
          <div className="diff-opt" onClick={onBack}
            style={{display:'inline-block',padding:'10px 22px',
              fontFamily:F.ui,fontWeight:700,fontSize:15,
              letterSpacing:'0.1em',textTransform:'uppercase',color:DS.frost}}>Back</div>
        </div>
      </div>

    </div>
  );
}
