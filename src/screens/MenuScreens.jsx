// ============================================================
// SCRAPS — Splash screen and difficulty picker
//
// The splash is one screen with one button. The old six-panel
// RULES wall it used to open into is gone: the first-run
// storyboard (src/screens/Walkthrough.jsx) does that job now,
// and the ? button on the table keeps the full text one tap
// away for anyone who wants it mid-game.
// ============================================================
import { useState, useEffect } from "react";
import { DS, F } from "../styles/theme.js";
import { Btn } from "../components/buttons.jsx";
import { SwirlBg, AnimatedTitle } from "../components/backdrop.jsx";
import { loadStats } from "../game/stats.js";

// ─────────────────────────────────────────────────────────────
// SplashScreen
// ─────────────────────────────────────────────────────────────
export function SplashScreen({ onStart }) {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:24,position:'relative',overflow:'hidden'}}>
      <SwirlBg/>
      <div style={{position:'relative',zIndex:1,maxWidth:600,width:'100%'}}>
        <div style={{textAlign:'center',animation:'fadeUp .6s ease'}}>
          <div style={{fontFamily:F.display,fontWeight:600,fontSize:64,color:DS.slate,letterSpacing:'0.18em',
            marginBottom:10}}>♠ ♥ ♦ ♣</div>
          <AnimatedTitle/>
          <Btn onClick={onStart}>Play</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DifficultyPicker
//
// Two boxes, nothing else — no BACK, no third option, no copy
// to read past the two lines inside them.
//
// The ARM_MS lock is the point of the screen's timing: a player
// who just speed-tapped through the storyboard arrives here
// mid-click-streak, and without it their momentum lands on
// whichever box is under the cursor. So the panels unfold from
// a hairline (`panelUnfold`, index.html) and stay inert —
// pointer-events off, muted border — until the unfold finishes;
// then the borders snap to voltage and pulse once, which is the
// screen telling you it is now listening. Anything under 250ms
// is too short to interrupt a double-click, hence 720ms.
// ─────────────────────────────────────────────────────────────
const ARM_MS = 720;

export function DifficultyPicker({ onChoose }) {
  const stats = loadStats();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(t);
  }, []);

  const opts = [
    { id:'easy', label:'EASY', desc:'Doesn’t take risks. Rarely weaponizes Aces.' },
    { id:'hard', label:'HARD', desc:'Aggressive. Bold. Will sacrifice small hands to win Scraps.' },
  ];

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:24,position:'relative',overflow:'hidden'}}>
      <SwirlBg/>
      <div style={{maxWidth:620,width:'100%',position:'relative',zIndex:1,
        display:'flex',flexDirection:'column',gap:22}}>
        {opts.map((o, i) => {
          const rec = stats[o.id];
          return (
            <div key={o.id}
              className={`pick-box${armed ? ' armed' : ''}`}
              onClick={armed ? () => onChoose(o.id) : undefined}
              style={{animationDelay:`${i * 150}ms`}}>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:14}}>
                <span style={{fontFamily:F.display,fontSize:'clamp(38px,6vw,54px)',
                  color:DS.voltage,letterSpacing:'0.06em',lineHeight:1}}>{o.label}</span>
                {rec && (rec.w > 0 || rec.l > 0) && (
                  <span style={{fontFamily:F.mono,color:DS.slate,fontSize:13,letterSpacing:'0.1em',
                    whiteSpace:'nowrap'}}>
                    {rec.w}W · {rec.l}L{rec.bestMargin > 0 ? ` · BEST +${rec.bestMargin}` : ''}
                  </span>
                )}
              </div>
              <div style={{fontFamily:F.ui,color:DS.slateLight,fontSize:'clamp(16px,2vw,20px)',
                fontWeight:500,marginTop:8,lineHeight:1.4}}>{o.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
