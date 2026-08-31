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
import { RidgeBackdrop, AnimatedTitle } from "../components/backdrop.jsx";
import { loadStats } from "../game/stats.js";

// ─────────────────────────────────────────────────────────────
// SUBTITLE — the one line under the wordmark on the splash.
// Swap the string; the 30 candidates live in PROJECT-BRIEF.md.
// Keep it to one short sentence: it sits between the wordmark
// and PLAY, and anything longer breaks that stack.
// ─────────────────────────────────────────────────────────────
const SUBTITLE = "Build two hands at once.";

// The suit row under the wordmark, in the colours the cards actually
// print. `ember` is the game's red everywhere else; `frost` is its
// black-on-dark. Order matches a fresh deck.
const SUITS = [
  { g:'♠', c:DS.frost },
  { g:'♥', c:DS.ember },
  { g:'♦', c:DS.ember },
  { g:'♣', c:DS.frost },
];

// ─────────────────────────────────────────────────────────────
// SplashScreen
// ─────────────────────────────────────────────────────────────
export function SplashScreen({ onStart }) {
  return (
    <div className="app-vh" style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:'clamp(12px,3vh,24px)',
      position:'relative',overflow:'hidden'}}>
      <RidgeBackdrop/>
      <div style={{position:'relative',zIndex:1,maxWidth:600,width:'100%'}}>
        <div style={{textAlign:'center',animation:'fadeUp .6s ease'}}>
          {/* True suit colour, not four grey glyphs: red suits in
              `ember` and black in `frost`, exactly as every card face
              in the game prints them. The row used to be the one thing
              on this screen doing no work at all. The riffle is in
              index.html and shares the wordmark's 28ms stagger. */}
          <div className="suit-riffle"
            style={{fontFamily:F.display,fontSize:'clamp(24px,min(9vw,7vh),64px)',
            letterSpacing:'0.18em',marginBottom:'clamp(4px,1.4vh,10px)',
            whiteSpace:'nowrap'}}>
            {SUITS.map((s,i)=>(
              <span key={s.g} style={{color:s.c,animationDelay:`${i*0.028}s`}}>{s.g}</span>
            ))}
          </div>
          <AnimatedTitle/>
          <p style={{fontFamily:F.display,fontSize:'clamp(15px,min(4.4vw,2.6vh),22px)',color:DS.slateLight,
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
    <div className="app-vh" style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:'clamp(12px,3vh,24px)',
      position:'relative',overflow:'hidden'}}>
      <RidgeBackdrop/>
      <h1 className="sr-only">SCRAPS — choose your opponent</h1>
      {/* Gaps and box padding are viewport-relative so the two
          panels stay whole on a short screen instead of the second
          one running off the bottom. */}
      <div style={{maxWidth:620,width:'100%',position:'relative',zIndex:1,
        display:'flex',flexDirection:'column',gap:'clamp(12px,3vh,22px)'}}>
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
              style={{animationDelay:`${i * 150}ms`, '--accent':o.tone,
                padding:'clamp(14px,3.2vh,26px) clamp(18px,4vw,30px)'}}>
              <span style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:14}}>
                <span style={{fontFamily:F.display,fontSize:'clamp(30px,min(7vw,5.6vh),54px)',
                  color:o.tone,letterSpacing:'0.06em',lineHeight:1}}>{o.label}</span>
                {rec && (rec.w > 0 || rec.l > 0) && (
                  <span style={{fontFamily:F.mono,color:DS.slate,fontSize:13,letterSpacing:'0.1em',
                    whiteSpace:'nowrap'}}>
                    {rec.w}W · {rec.l}L{rec.bestMargin > 0 ? ` · BEST +${rec.bestMargin}` : ''}
                  </span>
                )}
              </span>
              <span style={{display:'block',fontFamily:F.ui,color:DS.slateLight,
                fontSize:'clamp(14px,min(3.8vw,2.2vh),20px)',
                fontWeight:500,marginTop:'clamp(4px,1vh,8px)',lineHeight:1.4}}>{o.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
