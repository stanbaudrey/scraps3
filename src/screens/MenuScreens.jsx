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
// SUBTITLE — the one line under the wordmark on the splash.
// Swap the string; the 30 candidates live in PROJECT-BRIEF.md.
// Keep it to one short sentence: it sits between the wordmark
// and PLAY, and anything longer breaks that stack.
// ─────────────────────────────────────────────────────────────
const SUBTITLE = "Build two hands at once.";

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
          <div style={{fontFamily:F.display,fontWeight:600,fontSize:'clamp(28px,min(9vw,8vh),64px)',
            color:DS.slate,letterSpacing:'0.18em',marginBottom:10,whiteSpace:'nowrap'}}>♠ ♥ ♦ ♣</div>
          <AnimatedTitle/>
          <p style={{fontFamily:F.display,fontSize:'clamp(17px,2.4vw,22px)',color:DS.slateLight,
            letterSpacing:'0.04em',marginBottom:'clamp(10px,3.5vh,30px)',animation:'fadeUp .5s ease .7s both'}}>{SUBTITLE}</p>
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

  // Ember on HARD, not a second fern box. Ember is the committed
  // opponent/danger colour everywhere else in the game, and this is the
  // screen where you pick an opponent — so the two boxes now differ by
  // something other than the words inside them.
  const opts = [
    { id:'easy', label:'EASY', tone:DS.voltage,
      desc:'Doesn’t take risks. Rarely weaponizes Aces.' },
    { id:'hard', label:'HARD', tone:DS.ember,
      desc:'Aggressive. Bold. Will sacrifice small hands to win Scraps.' },
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
            // A real <button>, not a div with an onClick: this is the
            // last decision before a game starts and it was unreachable
            // by keyboard entirely. `disabled` also expresses the 720ms
            // arm lock semantically, which pointer-events never could —
            // assistive tech now knows the control is not yet live.
            <button key={o.id} type="button"
              className={`pick-box${armed ? ' armed' : ''}`}
              disabled={!armed}
              onClick={armed ? () => onChoose(o.id) : undefined}
              style={{animationDelay:`${i * 150}ms`, '--accent':o.tone}}>
              <span style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:14}}>
                <span style={{fontFamily:F.display,fontSize:'clamp(38px,6vw,54px)',
                  color:o.tone,letterSpacing:'0.06em',lineHeight:1}}>{o.label}</span>
                {rec && (rec.w > 0 || rec.l > 0) && (
                  <span style={{fontFamily:F.mono,color:DS.slate,fontSize:13,letterSpacing:'0.1em',
                    whiteSpace:'nowrap'}}>
                    {rec.w}W · {rec.l}L{rec.bestMargin > 0 ? ` · BEST +${rec.bestMargin}` : ''}
                  </span>
                )}
              </span>
              <span style={{display:'block',fontFamily:F.ui,color:DS.slateLight,
                fontSize:'clamp(16px,2vw,20px)',
                fontWeight:500,marginTop:8,lineHeight:1.4}}>{o.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
