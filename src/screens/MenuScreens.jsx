// ============================================================
// SCRAPS — Splash screen and difficulty picker
// ============================================================
import { useState } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { Btn } from "../components/buttons.jsx";
import { SwirlBg, AnimatedTitle } from "../components/backdrop.jsx";
import { IconBolt, IconTrophy, IconCards, IconFan, IconCycle, IconSpade } from "../components/icons.jsx";
import { loadStats } from "../game/stats.js";

// ─────────────────────────────────────────────────────────────
// SplashScreen
// ─────────────────────────────────────────────────────────────
export function SplashScreen({ onStart }) {
  const [page,setPage]=useState(0);
  const ov=[
    {icon:<IconCards size={22} color={DS.voltage}/>,text:`Scraps is a game of twos: Two decks. Two opponents. Two games of Poker happening at two speeds. First to ${WIN_SCORE} — win by 2.`},
    {icon:<IconFan size={22} color={DS.voltage}/>,text:"Each round: two private small hands (worth 1 point each) and one public 'Scraps' hand (worth 2). Max 7 cards in either."},
    {icon:<IconCycle size={22} color={DS.voltage}/>,text:'Transfer cards from your small hand into your Scraps pile, and pick up fresh cards. Transfer a 10-K and pick up 2 fresh cards. Ace earns 3. All others earn 1.'},
    {icon:<IconBolt size={22} color={DS.ember}/>,text:"Discard an Ace to remove two cards from your opponent's Scraps pile. They can counter with their own Ace."},
    {icon:<IconSpade size={22} color={DS.voltage}/>,text:'After two small hands, play your best 5-card Scraps hand for 2 pts. Flushes are never allowed.'},
    {icon:<IconTrophy size={22} color={DS.voltage}/>,text:'Bonus points: Win both small hands AND the Scraps hand for a FULL SCRAP — 5 points total.'},
  ];
  // Styles are in index.html — no style injection needed here
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:24,position:'relative',overflow:'hidden'}}>
      <SwirlBg/>
      <div style={{position:'relative',zIndex:1,maxWidth:600,width:'100%'}}>
        {page===0&&(
          <div style={{textAlign:'center',animation:'fadeUp .6s ease'}}>
            <div style={{fontFamily:F.display,fontWeight:600,fontSize:64,color:DS.slate,letterSpacing:'0.18em',
              marginBottom:10}}>♠ ♥ ♦ ♣</div>
            <AnimatedTitle/>
            <Btn onClick={()=>setPage(1)}>Rules</Btn>
          </div>
        )}
        {page===1&&(
          <div style={{animation:'fadeUp .4s ease'}}>
            <h2 style={{fontFamily:F.display,fontWeight:700,fontSize:44,color:DS.frost,marginBottom:22,
              textAlign:'center',letterSpacing:'0.06em'}}>RULES</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
              {ov.map((item,i)=>(
                <div key={i} style={{display:'flex',gap:18,alignItems:'flex-start',
                  background:DS.duskMid,border:`1px solid ${DS.slate}33`,
                  borderRadius:10,padding:'12px 18px',
                  animation:`fadeUp .4s ease ${i*.07}s both`}}>
                  <span style={{flexShrink:0,width:34,display:'flex',marginTop:2,
                    justifyContent:'center'}}>{item.icon}</span>
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
            <h2 style={{fontFamily:F.display,fontWeight:700,fontSize:44,color:DS.frost,marginBottom:10,letterSpacing:'0.06em'}}>READY?</h2>
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
  const stats=loadStats();
  const opts=[
    {id:'easy',  label:'EASY',   desc:'Conservative. Rarely uses Aces, and only to defend its Scraps.'},
    {id:'hard',  label:'HARD',   desc:'Aggressive. Will sacrifice small hands to win Scraps.'},
  ];
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:24,position:'relative',overflow:'hidden'}}>
      <SwirlBg/>
      <div style={{maxWidth:460,width:'100%',position:'relative',zIndex:1}}>
        <h2 style={{fontFamily:F.display,fontWeight:700,fontSize:44,color:DS.frost,marginBottom:10,
          textAlign:'center',letterSpacing:'0.06em'}}>DIFFICULTY</h2>
        <p style={{fontFamily:F.ui,color:DS.slate,fontSize:17,textAlign:'center',
          marginBottom:26,fontWeight:500}}>Affects how the opponent thinks — not the rules.</p>
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:22}}>
          {opts.map(o=>{
            const rec=stats[o.id];
            return (
              <div key={o.id} className="diff-opt" onClick={()=>onChoose(o.id)}>
                <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12,marginBottom:5}}>
                  <span style={{fontFamily:F.ui,color:DS.voltage,fontWeight:700,fontSize:18,letterSpacing:'0.06em'}}>{o.label}</span>
                  {rec&&(rec.w>0||rec.l>0)&&(
                    <span style={{fontFamily:F.mono,color:DS.slate,fontSize:13,letterSpacing:'0.1em'}}>
                      {rec.w}W · {rec.l}L{rec.bestMargin>0?` · BEST +${rec.bestMargin}`:''}
                    </span>
                  )}
                </div>
                <div style={{fontFamily:F.ui,color:DS.slateLight,fontSize:16,fontWeight:500}}>{o.desc}</div>
              </div>
            );
          })}
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
