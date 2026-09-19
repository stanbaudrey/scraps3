// ============================================================
// SCRAPS — Splash screen and difficulty picker
//
// The splash is one screen with one button. The old six-panel
// RULES wall it used to open into is gone: the first-run
// storyboard (src/screens/Walkthrough.jsx) does that job now,
// and the ? button on the table keeps the full text one tap
// away for anyone who wants it mid-game.
// ============================================================
import { useState, useEffect, useRef } from "react";
import { DS, F } from "../styles/theme.js";
import { Btn, TOUCH_MIN } from "../components/buttons.jsx";
import { SceneBackdrop, TableSurface, AnimatedTitle } from "../components/backdrop.jsx";
import { loadStats, loadUnlocks, markUnfairSeen } from "../game/stats.js";
import { playSlap } from "../audio.js";
import { PlayingCard, scrapLook } from "../components/cards.jsx";
import { useViewport } from "../ui/viewport.jsx";
import { TAGLINE } from "../share.js";
import { RAIL_BOTTOM, railBtnStyle } from "./Walkthrough.jsx";

// The SUBTITLE is back (Stan, 2026-09-14): "Play poker with both hands"
// (his revision later the same day; it returned as "Poker with both
// hands"), in Fjalla, between the wordmark and PLAY. It was removed 2026-09-13 —
// the previous line was "Build two hands at once." and its 30
// candidates are still in PROJECT-BRIEF.md — and it returns as the
// game's ONE line: the same string is the share sentence's tail and
// the strapline on the share card, all read from TAGLINE in
// src/share.js so none of the three can drift from the others.

// A four-glyph suit row sat above the wordmark until 2026-09-13, in
// the colours the cards printed. It went with the suits themselves
// and NOTHING replaces it (Stan's call): the wordmark and one button
// carry the screen. The gap it left was closed by giving the wordmark
// back its own top margin rather than by inserting a substitute mark,
// which is the failure mode this kind of removal usually has.

// ─────────────────────────────────────────────────────────────
// SplashScreen
// ─────────────────────────────────────────────────────────────
export function SplashScreen({ onStart }) {
  return (
    <div className="app-vh" style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:'clamp(12px,3vh,24px)',
      position:'relative',overflow:'hidden'}}>
      <SceneBackdrop/>
      <div style={{position:'relative',zIndex:1,maxWidth:600,width:'100%'}}>
        <div style={{textAlign:'center',animation:'fadeUp .6s ease'}}>
          {/* The suit row's own height is deliberately NOT reclaimed in
              full: the splash is a wordmark and a button, and it reads
              better sitting slightly high in the frame than dead
              centre. This is the one line of spacing that stands in
              for the row that was removed. */}
          <div style={{height:'clamp(10px,4vh,40px)'}}/>
          <AnimatedTitle/>
          {/* Fjalla, sentence case as Stan wrote it. Tracked at 0.06em,
              not the 0.14em it first shipped with: wide tracking on a
              sentence-case line read as a caption (the critique's note,
              and Stan's call the same day).
              Pulled up into the wordmark's own bottom margin so the
              three things on this screen still read as one stack. */}
          {/* A size up (18-28 → 20-32) and a full stop of its own (Stan,
              2026-09-14 evening). TAGLINE itself stays bare: the share
              sentence appends its period and the share card sets the
              line as spaced capitals. */}
          <div style={{fontFamily:F.display,fontSize:'clamp(20px,3.8vw,32px)',
            color:DS.slateLight,letterSpacing:'0.06em',lineHeight:1.1,
            marginTop:'clamp(-20px,-4vw,-10px)',marginBottom:'clamp(22px,5vw,34px)',
            textShadow:'0 2px 0 rgba(0,0,0,.4)',
            animation:'fadeUp .6s ease .35s both'}}>{TAGLINE}.</div>
          <Btn onClick={onStart}>Play</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DifficultyPicker
//
// Two boxes and a way back — no third option, no copy to read past
// the two lines inside them. BACK was added 2026-09-13 at Stan's
// request: this screen is the first point in the product where a
// reader cannot retrace a step, and the thing they most plausibly
// want back is the rules they just skimmed. It returns to the
// storyboard's LAST beat rather than its first (see App.jsx), and
// arms on the same 720ms lock as the panels so a click-streak
// carried in from the storyboard cannot bounce straight back out
// of this screen either.
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

// UNFAIR's FIRST APPEARANCE (Stan, 2026-09-18: "animate it after a small
// delay on the picker screen. give it a special umph"). The first time
// the picker is shown after the mode is unlocked, the two usual panels
// deal in and arm as they always do, there is a held beat, and then the
// third panel LANDS: the same fall to a dead stop a winning card makes on
// a reveal (slapDown's shape, the `slap` thud on the frame it stops), a
// ring of its own colour off the impact, and the word landing pale and
// large and settling into its gold. Solid type throughout: a band of
// light swept through the word was tried first, and it is gradient text,
// which the lookbook bans (index.html says why). Nothing filed there fit
// better than the game's own slap-down. Every later visit it deals in with the
// others, third in line. Its room is reserved from the first frame either
// way, so the two panels above it never move when it arrives.
//
// Reduced motion: no fall, no ring, no sweep and no thud on a timer. The
// panel is simply there with the others (the blanket rule in index.html
// lands every entrance on its resting frame), and it is still marked seen.
const UNLOCK_BEAT = 1500;      // after mount: the others have dealt and armed
const UNLOCK_FALL = 420;       // the fall itself; the thud sits on its end

// UNFAIR IS NOT A THIRD BOX (Stan, 2026-09-18: "give UNFAIR mode a unique
// visual treatment"). NORMAL and HARD are the game's interface talking:
// two dusk panels with a coloured rule round them. UNFAIR is HER talking.
// It is a sheet of her own kraft stock, the browner of the game's two
// papers and the one every card of hers is printed on, torn along its
// edges like a Scraps card, stained and creased by the same generator,
// lying a degree and a half out of true on the wood, with the word in
// ink. And an Ace is tucked under its corner, because that is the first
// thing the mode does: she starts with one. It says the rule before the
// sentence under it does.
//
// The word stays in Fjalla, like the two above it. It is tempting to set
// it in Rye, since this is a card, but theme.js keeps a closed list of
// what Rye may be used for and "a heading that wants Rye and is not on
// this list is wrong". The Ace under the corner IS a card rank, so that
// one is Rye by right.
//
// The outline is cut here rather than borrowed from a card. It is written
// in PIXELS through calc(), not percentages, so the teeth are the same
// size on a 620px desktop strip and a 327px phone one, and nothing has to
// be measured. Seeded, so it is the same sheet on every visit.
function tornStrip(seed) {
  let s = seed >>> 0;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r();
  const pt = [];
  const TOP = 17, SIDE = 4, BITE = 5;
  for (let i = 0; i <= TOP; i++) pt.push(`${(i / TOP * 100).toFixed(1)}% ${(r() * BITE).toFixed(1)}px`);
  for (let i = 1; i < SIDE; i++) pt.push(`calc(100% - ${(r() * BITE).toFixed(1)}px) ${(i / SIDE * 100).toFixed(1)}%`);
  // one corner has come away, bottom right, under where the Ace sits
  pt.push(`calc(100% - ${(r() * 3).toFixed(1)}px) calc(100% - 19px)`);
  pt.push(`calc(100% - 11px) calc(100% - 9px)`);
  pt.push(`calc(100% - 24px) calc(100% - ${(r() * 3).toFixed(1)}px)`);
  for (let i = 1; i < TOP; i++) pt.push(`${(100 - i / TOP * 100).toFixed(1)}% calc(100% - ${(r() * BITE).toFixed(1)}px)`);
  for (let i = 0; i < SIDE; i++) pt.push(`${(r() * BITE).toFixed(1)}px ${(100 - i / SIDE * 100).toFixed(1)}%`);
  return `polygon(${pt.join(',')})`;
}
const UNFAIR_TEAR = tornStrip(0x5C4A9);
const UNFAIR_ACE = { id: 'picker-unfair-ace', rank: 'A', value: 14 };

export function DifficultyPicker({ onChoose, onBack = null }) {
  const stats = loadStats();
  const { w: vw, h: vh } = useViewport();
  // Read once per visit: the entrance must not switch itself off halfway
  // through because it has just been marked seen.
  const unlocks = useRef(null);
  if (!unlocks.current) unlocks.current = { ...loadUnlocks() };
  const unfairOpen = unlocks.current.unfair;
  const debut = unfairOpen && !unlocks.current.unfairSeen;
  const [armed, setArmed] = useState(false);
  // The debut panel arms when it lands, not with the other two.
  const [landed, setLanded] = useState(!debut);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!debut) return undefined;
    markUnfairSeen();
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { setLanded(true); return undefined; }
    const t = setTimeout(() => { playSlap(); setLanded(true); }, UNLOCK_BEAT + UNLOCK_FALL);
    return () => clearTimeout(t);
  }, [debut]);

  // Ember on HARD, not a second fern box. Ember is the committed
  // opponent/danger colour everywhere else in the game, and this is the
  // screen where you pick an opponent — so the two boxes now differ by
  // something other than the words inside them.
  // EASY became NORMAL on 2026-09-18 (Stan), when HARD became a far
  // stronger player and UNFAIR arrived above it. The ID is still `easy`:
  // it is the key the win-loss record is saved under, and renaming it
  // would have wiped every record in every browser.
  const opts = [
    { id:'easy', label:'NORMAL', tone:DS.voltage,
      desc:'Doesn’t take risks. Rarely attacks. Not too bright.' },
    // Stan's copy, 2026-09-18, for the new HARD. It was "Bold. Sacrifices
    // a 1-pt hand to win a 2-pointer.", written for the player she
    // replaced, with a nowrap helper to stop a phone breaking "2-" from
    // "pointer"; three words need no helper and it went with the line.
    { id:'hard', label:'HARD', tone:DS.ember, desc:'Strategic. Bold. Mean.' },
    // The earned one, and her own paper rather than a panel (see
    // tornStrip above). Gold, the milestone colour, is only its GLOW: the
    // light under it when it lands and when it is picked up. Its three
    // sentences are the whole of what the mode changes that you can plan
    // around (her picking what your Ace removes is told at the moment it
    // matters, on the Ace alert).
    ...(unfairOpen ? [{ id:'unfair', label:'UNFAIR', tone:DS.gold, debut, paper:true,
      desc:'Starts with an Ace. Wins ties. Signals second.' }] : []),
  ];
  // The sheet's stains, crease and grime, from the generator every Scraps
  // card uses. The seed is fixed, so it is the same sheet every visit.
  const sheet = scrapLook('picker-unfair-sheet-3', 0.2);
  // The Ace under the corner is a size down on a phone or a short screen.
  const aceSize = vw < 520 || vh < 520 ? 'tiny' : 'small';

  return (
    <div className="app-vh" style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',background:DS.dusk,padding:'clamp(12px,3vh,24px)',
      // The strip BACK is pinned in (see below), kept clear of the panels.
      ...(onBack ? { paddingBottom:`calc(${RAIL_BOTTOM + TOUCH_MIN}px + clamp(12px,3vh,24px))` } : {}),
      position:'relative',overflow:'hidden'}}>
      {/* The same table the game is played on. Two backgrounds in the
          whole product, by Stan's call 2026-09-01: the scene carries
          the title and the storyboard, the table carries the
          difficulty pick and everything after it. Picking an opponent
          is the first move at the table, so it belongs to the table. */}
      <TableSurface/>
      <div style={{position:'absolute',inset:0,zIndex:0,pointerEvents:'none',
        background:`radial-gradient(ellipse 74% 64% at 50% 50%, ${DS.ink}00 40%, ${DS.ink}59 100%)`}}/>
      <h1 className="sr-only">SCRAPS — choose your opponent</h1>
      {/* Gaps and box padding are viewport-relative so the two
          panels stay whole on a short screen instead of the second
          one running off the bottom. */}
      <div style={{maxWidth:620,width:'100%',position:'relative',zIndex:1,
        display:'flex',flexDirection:'column',gap:'clamp(12px,3vh,22px)'}}>
        {opts.map((o, i) => {
          const rec = stats[o.id];
          const live = o.debut ? armed && landed : armed;
          const ink = o.paper ? DS.ink : null;
          const head = (
            <span style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:14}}>
              <span className={o.debut ? 'pick-debut-word' : undefined}
                style={{fontFamily:F.display,fontSize:'clamp(30px,min(7vw,5.6vh),54px)',
                color: ink || o.tone,letterSpacing:'0.06em',lineHeight:1}}>{o.label}</span>
              {/* The record. 13px slate until 2026-09-18, which Stan could
                  not read, and his Mac's scaled resolution draws a CSS
                  pixel LARGER than most screens do, so it was smaller
                  still for everyone else. BEST +N went the same day: the
                  margin is still recorded (stats.js), nothing shows it. */}
              {rec && (rec.w > 0 || rec.l > 0) && (
                <span style={{fontFamily:F.mono,color: ink || DS.slateLight,fontWeight: ink ? 600 : 500,
                  fontSize:'clamp(17px,min(3.4vw,3vh),22px)',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>
                  {rec.w}W · {rec.l}L
                </span>
              )}
            </span>
          );
          const blurb = (
            <span style={{display:'block',fontFamily:F.ui,color: ink || DS.slateLight,
              fontSize:'clamp(14px,min(3.8vw,2.2vh),20px)',
              fontWeight: ink ? 600 : 500,marginTop:'clamp(4px,1vh,8px)',lineHeight:1.4}}>{o.desc}</span>
          );
          const pad = 'clamp(12px,min(3.2vh,2.6vw + 8px),26px) clamp(18px,4vw,30px)';
          return (
            // A real <button>, not a div with an onClick: this is the
            // last decision before a game starts and it was unreachable
            // by keyboard entirely. `disabled` also expresses the 720ms
            // arm lock semantically, which pointer-events never could —
            // assistive tech now knows the control is not yet live.
            <button key={o.id} type="button"
              className={`pick-box${live ? ' armed' : ''}${o.debut ? ' pick-debut' : ''}${o.paper ? ' pick-card' : ''}`}
              disabled={!live}
              onClick={live ? () => onChoose(o.id) : undefined}
              style={{animationDelay: o.debut ? `${UNLOCK_BEAT}ms` : `${i * 150}ms`,
                animationDuration: o.debut ? `${UNLOCK_FALL}ms` : undefined,
                '--accent':o.tone, '--debut-at':`${UNLOCK_BEAT + UNLOCK_FALL}ms`,
                padding: o.paper ? 0 : pad}}>
              {o.paper ? (
                // The tilt and the shadow live on this wrapper, NOT on the
                // button: the button's entrance ends on `transform: none`,
                // and an entrance has to end on the element's resting
                // style. The shadow is a drop-shadow for the reason every
                // torn card's is: box-shadow ignores a clip-path and would
                // draw the rectangle the sheet has stopped being. It
                // traces the Ace as well, which is what seats the two
                // together on the wood.
                <span className="pick-card-tilt">
                  <span className="pick-card-ace" aria-hidden="true">
                    {/* A hand card, so it is the pale stock: her kraft is
                        only ever seen on a Scraps card, and a pale card
                        against the kraft sheet is what lets it be seen. */}
                    <PlayingCard card={UNFAIR_ACE} size={aceSize} liftTransform={false}/>
                  </span>
                  <span className="pick-card-paper" style={{clipPath:UNFAIR_TEAR,padding:pad,
                    backgroundColor:DS.stockKraft,backgroundImage:sheet.paint,boxShadow:sheet.grime}}>
                    {head}{blurb}
                  </span>
                </span>
              ) : <>{head}{blurb}</>}
            </button>
          );
        })}
        {/* What the third panel's room is for, until it is earned. Quiet on
            purpose: it is a note, not a third option, and it cannot be
            pressed. It comes in with the panels, after them. */}
        {!unfairOpen && (
          <p className="pick-note" style={{margin:0,textAlign:'center',fontFamily:F.ui,fontWeight:500,
            color:DS.slateLight,fontSize:'clamp(15px,min(3.8vw,2.4vh),19px)',lineHeight:1.35,
            animationDelay:'420ms'}}>
            Beat <span style={{color:DS.ember,fontWeight:700,letterSpacing:'0.04em'}}>HARD</span> to
            unlock <span style={{color:DS.gold,fontWeight:700,letterSpacing:'0.04em'}}>UNFAIR</span>.
          </p>
        )}
      </div>
      {/* Quieter than the two panels by design: it is the way out of
          a decision, not a third option to weigh. Ghost outline in
          slate, no accent, no glow.

          PINNED to the storyboard's rail (Stan, 2026-09-16): it sits at
          exactly the height the storyboard's own Back had on the beat
          this screen follows, the same button in the same place, only
          centred — so it does not jump when the screen changes. It used
          to follow the panels in the flow and landed wherever their
          height put it. RAIL_BOTTOM and railBtnStyle come from the
          storyboard so the two cannot drift apart. The column above
          reserves the same strip at the bottom, so the panels never run
          under it on a short screen. */}
      {onBack && (
        <div style={{position:'absolute',left:0,right:0,bottom:RAIL_BOTTOM,zIndex:1,
          display:'flex',justifyContent:'center',pointerEvents:'none'}}>
          <button type="button" onClick={armed ? onBack : undefined} disabled={!armed}
            style={{...railBtnStyle,pointerEvents:'auto',
              cursor:armed?'pointer':'default',
              opacity:armed?1:0.4,transition:'opacity 0.3s'}}>Back</button>
        </div>
      )}
    </div>
  );
}
