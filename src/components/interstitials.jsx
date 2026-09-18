// ============================================================
// SCRAPS — Interstitials: everything that happens ON the table
// between one hand and the next.
//
// Built 2026-09-14 from Stan's picks off the Win bench (see the
// "interstitials onto the table" entry in PROJECT-BRIEF.md). The
// one rule that shapes all of it: NOTHING HERE IS A SCRIM. The old
// reveal, round card, Clean Sweep lightbox and win/lose screens
// were dusk-coloured curtains over a hidden table with canvas
// fireworks on top. Every screen below plays on the same redwood
// the round plays on, with the game's real cards, and leaves it by
// being swept off the right edge to the discard, the same way any
// card leaves this table.
//
// ONE opaque layer, `TableStage`, holds every scene. It stays
// mounted while a scene changes underneath it — the Scraps reveal
// sweeps itself clear and the ROUND N sign lands on the same
// boards in the same frame — so the wood never cuts or flickers
// between beats. Its wood is centred on the live table's wood
// (`tableAnchorRef`), so the moment it covers the table the boards
// do not move; only the cards change.
//
// Tap anywhere. There is no labelled button carrying the flow: a
// tap DURING a choreography skips to its resting frame, a tap AT
// REST continues. One real, visually quiet <button> stays in the
// DOM so Enter, Space and a screen reader have the same way
// forward, and the layer is a dialog with the focus trap every
// modal in overlays.jsx uses. The REVEALS are the exception: since
// 2026-09-16 (Hand 1), 2026-09-17 (Hand 2) and 2026-09-18 (the Scraps)
// each rests on a green named button instead of the quiet one, and at
// rest only that button (or a key) moves on — see `namedCta` in
// RevealScene. NOTHING ADVANCES ITSELF except a
// match-ending reveal running on into the match screen: the ROUND N
// sign and the Clean Sweep beat both used to, and both wait for a
// tap since 2026-09-14 (Stan).
//
// Skipping is per BEAT, not per screen. `fast` carries three flags
// — the build (loser, slap, verdict, tick), the Clean Sweep beat,
// and the match screen — because every entrance keyframe is
// re-issued at zero duration to land on the resting frame, and a
// single flag would have flattened the Clean Sweep beat because the
// player skipped the slap-down before it.
//
// Reduced motion: every keyframe here is collapsed by the blanket
// rule in index.html, and the three that carry meaning get a static
// substitute keyed on a `stage-*` class (see that block). The
// timers between beats are shortened rather than removed, so a
// reduced-motion reveal still BUILDS — loser, winner, verdict,
// score — it just does not travel.
// ============================================================
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useId } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { PlayingCard, CARD_DIMS } from "./cards.jsx";
import { TableSurface } from "./backdrop.jsx";
import { FitBox, useViewport, usePointerVerb } from "../ui/viewport.jsx";
import { useDialogFocus, SETTLE } from "./overlays.jsx";
import { Btn, MODAL_BTN_MIN } from "./buttons.jsx";
import {
  playSlap, playHandWon, playHandLost, playRoundWon, playRoundLost,
  playCleanSweep, playGameWon, playGameLost, playDraw, playSelect, playRoundSign, SIGN_BEATS,
} from "../audio.js";
import { shareResult, buildShareText, prepareShareCard } from "../share.js";

const OVER = 'cubic-bezier(.34,1.4,.64,1)';
const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};

// ─────────────────────────────────────────────────────────────
// Timing, as the bench measured it. Every number in play below is
// one of these, so a retune is a one-line edit and not a hunt.
// ─────────────────────────────────────────────────────────────
// The slap, retimed 2026-09-17 (Stan: the thump played "when the card
// appears and BEGINS its descent"). Measured before: every thump was
// within 25ms of its own card's end, but the drops overlapped (230ms
// apart, 280 long) and glided in, so each thump coincided with the NEXT
// card appearing. Now each card falls faster into a dead stop (`ease` is
// an ease-in; see slapDown in index.html), the thump and the sawdust are
// ON the stop (`land` = `dur`), and the next card starts 70ms after it.
const SLAP = { dur: 170, stagger: 240, land: 170, ease: 'cubic-bezier(.5,0,.85,.5)' };
// A tap this soon after one that landed a resting frame is the second
// half of a double-click, not a request to move on (see onTap).
const LAND_GRACE = 400;
const ROLL = 380;                       // the score's old digit out, new digit in
const JUMP = 500;                       // the match-winning score's jump and vibrate
// The sweep: a shadow band crosses first, then each element leaves
// on a delay set by where it is on screen, left to right, so the
// wipe reads as one hand crossing the table. `done` is when the
// last card is off and the scene hands over.
const SWEEP = { band: 1000, bandDelay: 250, first: 300, spread: 700, dur: 620, done: 1700 };
const DEAL = { dur: 380, stagger: 70 };
const FLIP = { dur: 520, stagger: 85 };
// ROUND N's own beats are SIGN_BEATS (src/audio.js), shared with its
// voice. Once at rest it WAITS for a tap. It advanced itself until
// 2026-09-14 (Stan: "don't automatically progress past the Round X
// screen").
const SWEEP_EASE = 'cubic-bezier(.5,0,.9,.6)';
// Hard drop, no glow. The verdict, the Clean Sweep title, the winning
// score and the final score all carried a coloured glow text-shadow,
// the last trace of the neon palette; on wood a hard drop is what the
// sign already used, and Stan asked for it everywhere (2026-09-14).
const DROP = '0 3px 0 rgba(0,0,0,.4)';
// MATCH POINT is EXACTLY one short of WIN_SCORE (Stan, 2026-09-16:
// "only when either player, or both, has exactly 9 points"). It used
// to be two short and `>=`, on the reasoning that the Scraps hand pays
// 2 and so a player on 8 can already end the match in one reveal. That
// is still true, and it is the trade this rule makes on purpose: the
// warning now means "any hand won ends it", which is the one reading a
// player never has to work out. This used to be the HUD's banner; the
// stage covers the HUD exactly when it matters, so it lives here now.
const MATCH_POINT = WIN_SCORE - 1;
const atMatchPoint = (score) => (score || 0) === MATCH_POINT;

// Tracked timers: every beat is a timeout, and a tap or an unmount
// has to be able to drop all of them at once.
function useTimeline(scale = 1) {
  const timers = useRef([]);
  const at = useCallback((ms, fn) => {
    const t = setTimeout(fn, Math.max(0, Math.round(ms * scale)));
    timers.current.push(t);
    return t;
  }, [scale]);
  const clear = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  useEffect(() => clear, [clear]);
  return { at, clear };
}

// ─────────────────────────────────────────────────────────────
// SlideBox — a block whose HEIGHT follows its content over 200ms
// instead of snapping to it (Stan, 2026-09-16: when CLEAN SWEEP
// arrives "the cards abruptly jump out of the way ... make that a
// 200ms gradual slide with gentle acceleration and deceleration").
//
// Every scene here is a column CENTRED on the table, so a line that
// grows by 68px moves everything above it up 34px and everything
// below it down 34px — measured, in ONE frame, when the CLEAN SWEEP
// title and its bonus line replaced the verdict. Wrapping the part
// that grows in this box turns that frame into a slide: the outer box
// holds an explicit height and transitions it, the inner box is
// measured, and the content stays centred inside the outer one while
// it catches up, so the words never drift while the cards part.
//
// A ResizeObserver rather than a measure-on-render, because what
// changes the height is not always a render of THIS component — a
// ScoreRoll swapping to its Rye size is a child's render. Its callback
// runs after layout and before paint, so the first painted frame of a
// change is already the START of the transition, never the end state.
// Reduced motion collapses the transition to 1ms with every other one
// (index.html), which is the snap this replaces and the right answer
// there.
// ─────────────────────────────────────────────────────────────
const SLIDE = { dur: 200, ease: 'cubic-bezier(.45,0,.55,1)' };
// `instant` is a skip: the box SNAPS to its content instead of sliding,
// the same resting-frame rule every entrance here keeps. A tap in the
// first 200ms of the CLEAN SWEEP beat drops the title's wait, so its
// letters paint at once; left to slide, the box would still be short of
// them and the title would sit over the cards until it caught up.
// Switching the transition off mid-slide cancels it and lands the end.
function SlideBox({ children, style = {}, instant = false }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  useLayoutEffect(() => {
    const outer = outerRef.current, inner = innerRef.current;
    if (!outer || !inner) return undefined;
    let h = inner.offsetHeight;
    outer.style.height = `${h}px`;
    const ro = new ResizeObserver(() => {
      const next = inner.offsetHeight;
      if (next === h) return;
      h = next;
      outer.style.height = `${next}px`;
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outerRef} style={{display:'flex',flexDirection:'column',justifyContent:'center',
      transition: instant ? 'none' : `height ${SLIDE.dur}ms ${SLIDE.ease}`,...style}}>
      <div ref={innerRef} style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TableStage — the layer. One per GameScreen, mounted only while a
// scene is up; `stage` says which.
//
//   { kind:'sign', roundNum }                  ROUND N
//   { kind:'reveal', ...RevealScene props }    a hand, the Scraps,
//                                              and everything that
//                                              can follow them
// ─────────────────────────────────────────────────────────────
export function TableStage({ stage, cardH, tableAnchorRef = null, onSignDone, onContinue, onSwept, onNewGame,
  difficulty, winStats, instant = false }) {
  const rootRef = useRef(null);
  const R = useMemo(prefersReducedMotion, []);
  const dialogRef = useDialogFocus(true);
  // The sign's dealer line rides in the dialog's name: who acts first
  // is real information, and the name is read the moment the layer
  // opens rather than whenever a live region gets round to it.
  const signMP = stage.kind === 'sign' && (atMatchPoint(stage.playerScore) || atMatchPoint(stage.aiScore));
  const label = stage.kind === 'sign'
    ? `Round ${stage.roundNum}. ${stage.roundNum % 2 === 1 ? 'You go first.' : 'She goes first.'}${signMP ? ' Match point.' : ''}`
    : stage.which === 'scraps' ? 'Scraps result' : `Hand ${stage.which === 'hand1' ? 1 : 2} result`;

  // Where the live table's wood is, measured once on mount and again
  // on resize — never during a render.
  const [tableRect, setTableRect] = useState(null);
  useLayoutEffect(() => {
    const read = () => {
      const el = tableAnchorRef && tableAnchorRef.current;
      setTableRect(el ? el.getBoundingClientRect() : null);
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, [tableAnchorRef]);

  // "A shiver in the boards." Imperative rather than a keyframe on
  // the wrapper, because it has to RESTART on every landing and a
  // re-keyed wrapper would remount the wood under it. One-shot,
  // 140ms, and skipped outright under reduced motion.
  const shake = useCallback((amt = 2) => {
    const el = rootRef.current;
    if (!el || R || !el.animate) return;
    el.animate([
      { transform: 'translate(0,0)' }, { transform: `translate(0,${amt}px)` },
      { transform: `translate(0,-${amt * 0.4}px)` }, { transform: 'translate(0,0)' },
    ], { duration: 140, easing: 'ease-out' });
  }, [R]);

  // The wood is centred on the LIVE table's centre and tall enough
  // to reach both viewport edges, so its board seams land exactly
  // where the game's do — TableSurface centres its boards in
  // whatever box it is given. Without this the boards jumped by up
  // to half a board the instant this layer covered the table.
  const wood = useMemo(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cy = tableRect && tableRect.height ? tableRect.top + tableRect.height / 2 : vh / 2;
    const K = Math.max(cy, vh - cy) + 40;
    return { top: cy - K, height: 2 * K };
  }, [tableRect]);

  return (
    <div ref={(el) => { rootRef.current = el; dialogRef.current = el; }}
      role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="fit-frame"
      style={{position:'fixed',inset:0,zIndex:500,background:DS.timber,overflow:'hidden',
        outline:'none',userSelect:'none'}}>
      <div aria-hidden="true" style={{position:'absolute',left:0,right:0,top:wood.top,height:wood.height}}>
        <TableSurface cardH={cardH}/>
      </div>
      {/* Seats the type. The lose screen already did this on the same
          wood; frost on the lightest board tint is the pairing that
          needs it. */}
      <div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',
        background:`radial-gradient(ellipse 72% 62% at 50% 46%, ${DS.ink}00 30%, ${DS.ink}80 100%)`}}/>
      {stage.kind === 'sign'
        ? <RoundSign key={`sign-${stage.roundNum}`} roundNum={stage.roundNum} matchPoint={signMP}
            onDone={onSignDone} R={R} instant={instant}/>
        : <RevealScene key={stage.key} {...sceneProps(stage)} onContinue={onContinue} onSwept={onSwept}
            onNewGame={onNewGame} difficulty={difficulty} winStats={winStats}
            shake={shake} R={R} instant={instant}/>}
    </div>
  );
}

// The stage object carries its own `key` (so a new reveal remounts
// the scene); React wants that passed on its own, not spread.
const sceneProps = ({ key, kind, ...rest }) => rest;

// The quiet button. It is the only focusable thing on a stage, so
// Enter and Space land here, a screen reader finds a control with a
// name, and the pointer gets the whole viewport instead.
// While it is hidden it is DISABLED, not merely transparent: a
// transparent button is still in the tab order and still what the
// dialog's focus trap lands on, so a keyboard user was parked on a
// control they could not see. Disabled, it leaves the tab order and
// the trap falls back to the dialog itself; Enter there still goes
// through the window handler to the same tap. `buttonRef` lets the
// scene move focus onto it the moment it becomes real.
function QuietButton({ onClick, children, show = true, style = {}, buttonRef = null }) {
  return (
    <button type="button" ref={buttonRef} disabled={!show}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{background:'transparent',border:'none',cursor:'pointer',
        fontFamily:F.ui,fontSize:13,fontWeight:700,letterSpacing:'0.18em',
        textTransform:'uppercase',color:DS.slateLight,padding:'12px 18px',minHeight:44,
        opacity:show?1:0,transition:'opacity .3s',pointerEvents:show?'auto':'none',...style}}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// RoundSign — ROUND N dealt as letter cards (Stan's pick off The
// Turnover, 2026-09-17; it was Rye letters with one riffle pass).
// Six cards deal in face down over the top edge, the way a round deals;
// ROUND turns face up a card at a time; then a held breath, and the
// NUMBER turns on its own, bigger, and lands askew so it is the thing
// the eye stays on. The roundSign voice puts a note on each card as its
// face comes round, the top note on the number; both read SIGN_BEATS
// (src/audio.js), so they cannot drift. While the sign waits for a tap
// it CYCLES, silently: the row turns face down and the reveal plays
// again, every 6.2s (signCycleWord / signCycleNumber in index.html,
// held to SIGN_BEATS by signCycle.test.js).
// The dealer line sits small under it in Fjalla, because who acts
// first is real information and the log is the only other place it
// lives. A tap mid-entrance lands the resting frame; a tap at rest
// deals, the same contract as every reveal.
// ─────────────────────────────────────────────────────────────
function RoundSign({ roundNum, matchPoint = false, onDone, R, instant }) {
  const B = SIGN_BEATS;
  const letters = 'ROUND'.split('');
  const num = String(roundNum);
  // CLICK ANYWHERE on a desktop, TAP ANYWHERE on a phone (Stan,
  // 2026-09-16). It said "Tap to continue" everywhere until then.
  const verb = usePointerVerb();
  const { w, h } = useViewport();
  const { at, clear } = useTimeline(1);
  const doneRef = useRef(false);
  // Under reduced motion the cards are at rest from the first frame, so
  // the sign is too: it used to wait out the whole entrance it was not
  // playing, and the first tap only woke it (review, 2026-09-17).
  const [settled, setSettled] = useState(!!instant || !!R);
  // The voice runs 1.7s under the entrance. A tap that lands the resting
  // frame hushes whatever has not played yet, and so does leaving.
  const voice = useRef(null);
  const hush = () => { if (voice.current) { voice.current.stop(); voice.current = null; } };
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clear();
    hush();
    onDone();
  }, [clear, onDone]);
  const tap = useCallback(() => {
    if (settled) { finish(); return; }
    clear();
    hush();
    setSettled(true);
  }, [settled, finish, clear]);
  useEffect(() => {
    if (!instant) voice.current = playRoundSign();
    if (!instant && !R) at(B.settle, () => setSettled(true));
    return hush;
  }, []);
  // Once settled the entrances come off and every card sits on its
  // resting pose, which is the inline transform below and the first
  // frame of the cycle; so dropping them after they finish changes
  // nothing, and dropping them EARLY on a tap lands the sign at once.
  const stop = R || instant || settled;
  const cycling = settled && !R;

  // The game's `normal` card, scaled to fit: five letters, a space, and
  // the number, which is drawn 12% bigger by its own transform.
  const d = CARD_DIMS.normal;
  const GAP = 12, SPACE = 0.45 * d.w;
  const numberX = 5 * (d.w + GAP) + SPACE;
  const rowW = numberX + d.w;
  const lift = d.h * 0.08;
  const k = Math.max(0.34, Math.min(1, (Math.min(w, 860) - 48) / rowW, (0.24 * h) / d.h));
  const numScale = num.length > 1 && num !== '10' ? 0.52 : 0.78;
  const REST_WORD = 'rotateY(180deg) translateY(0)';
  // The number's askew, bigger landing lives on its POP layer (see the
  // markup below), so its flip is a plain turn: one stroke, 0 to 180deg
  // over a ROUND letter's own 520ms, with no frame in the middle to stop
  // on (signNumberFlip; ribbonFlip's 60% frame held it still ~100ms).
  const REST_POP = 'translateY(0) rotate(8deg) scale(1.12)';
  const card = (i, ch, isNum) => {
    const x = isNum ? numberX : i * (d.w + GAP);
    const t = i / 4;
    const y = isNum ? lift * 0.5 : lift - Math.sin(t * Math.PI) * lift;
    const rot = isNum ? 0 : -4 + t * 8;
    const flipAnim = cycling
      ? (isNum ? `signCycleNumber ${B.cycle}ms ease-in-out ${5 * B.stagger}ms infinite`
               : `signCycleWord ${B.cycle}ms ease-in-out ${i * B.stagger}ms infinite`)
      : stop ? undefined
      : isNum ? `signNumberFlip ${B.numberDur}ms ease-in-out ${B.numberAt}ms both`
      : `ribbonFlip ${B.flipDur}ms ease-in-out ${B.flipAt + i * B.stagger}ms both`;
    const popAnim = !isNum ? undefined
      : cycling ? `signCyclePop ${B.cycle}ms ease-in-out ${5 * B.stagger}ms infinite`
      : stop ? undefined
      : `signNumberPop ${B.numberDur}ms ease-in-out ${B.numberAt}ms both`;
    const flipBox = (
      <div style={{width:d.w,height:d.h,perspective:900}}>
        <div className={cycling ? 'sign-cycle' : 'stage-flip'}
          style={{position:'relative',width:d.w,height:d.h,transformStyle:'preserve-3d',
            transform: REST_WORD, animation: flipAnim}}>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden'}}>
            <PlayingCard card={null} faceDown size="normal" liftTransform={false}/>
          </div>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>
            <PlayingCard card={{ id:`sign-${i}`, rank:ch }} rankScale={isNum ? numScale : 0.78}
              rankAlign="center" size="normal" liftTransform={false}/>
          </div>
        </div>
      </div>
    );
    return (
      <div key={i} style={{position:'absolute',left:x * k,top:y * k,width:d.w * k,height:d.h * k,zIndex:isNum ? 9 : i,
        '--dx': `${Math.round((rowW / 2 - x - d.w / 2) * k)}px`, '--rot': `${rot.toFixed(1)}deg`,
        transform:`rotate(${rot.toFixed(1)}deg)`,
        animation: stop ? undefined : `dealOn ${B.dealDur}ms cubic-bezier(.2,.9,.3,1.05) ${i * B.deal}ms both`}}>
        <div style={{width:d.w,height:d.h,transform:`scale(${k})`,transformOrigin:'0 0'}}>
          {/* The number's POP wraps the whole 3D card as one flat layer,
              so its swell and tilt never touch the flip inside it. */}
          {isNum ? (
            <div className={cycling ? 'sign-cycle' : undefined}
              style={{width:d.w,height:d.h,transform:REST_POP,animation:popAnim}}>{flipBox}</div>
          ) : flipBox}
        </div>
      </div>
    );
  };
  return (
    <div onClick={tap}
      style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',gap:'clamp(14px,3vh,28px)',
        padding:16,cursor:'pointer'}}>
      <div className="stage-fade" role="img" aria-label={`Round ${roundNum}`}
        style={{position:'relative',width:rowW * k,height:(d.h + lift) * k}}>
        {letters.map((ch, i) => card(i, ch, false))}
        {card(5, num, true)}
      </div>
      {/* Full stops and SHE (Stan, 2026-09-16). MATCH POINT drops to a
          line of its own under it, because a sentence that has ended
          cannot carry "· MATCH POINT" on after its full stop. The pair
          shares one block so the sign's own gap does not open between
          them. It arrives once the number has landed. */}
      <div className="stage-fade" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,
        fontFamily:F.display,fontSize:'clamp(15px,2.6vw,24px)',
        color:DS.slateLight,letterSpacing:'0.18em',textAlign:'center',
        animation: stop ? undefined : `scrapArrive 0.25s ease ${B.numberAt + B.numberDur - 120}ms both`}}>
        <span>{roundNum % 2 === 1 ? 'YOU GO FIRST.' : 'SHE GOES FIRST.'}</span>
        {matchPoint && <span style={{color:DS.gold}}>MATCH POINT</span>}
      </div>
      <div style={{position:'absolute',bottom:'clamp(8px,3vh,28px)'}}>
        <QuietButton onClick={tap} style={settled ? {} : {opacity:.55}}>
          {settled ? `${verb} anywhere` : 'Skip'}
        </QuietButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScoreRoll — one side's score, and THE score animation. The HUD
// bars used to flash on the same event a couple of seconds later;
// that flash is gone, this is the only place a point lands.
//
//   tick   the old digit slides up and out, the new slides in
//   wave   after the roll, the new score lifts and flashes on a
//          loop until the player leaves (gold flash for you, ember
//          for her — a less celebratory version of the same motion,
//          on the file's SETTLE curve with no overshoot)
//   rye    the match-winning score: set in Rye and, once it has
//          rolled in, jumped and vibrated for 500ms
//
// The box clips while the digits roll and opens up again after, so
// the old digit leaves cleanly and the wave's lift is not cut off.
// The digit spans are keyed on their values so a SECOND roll (the
// Clean Sweep bonus point after the Scraps point) replays.
// ─────────────────────────────────────────────────────────────
// `lead` holds the whole roll back by that many ms. Only the CLEAN
// SWEEP bonus uses it, so its point lands after the cards have slid
// apart for the title rather than while they are still moving.
function ScoreRoll({ label, from, to, mine, tick, wave, rye, align, instant, sweepDelay, lead = 0 }) {
  const color = mine ? DS.voltage : DS.ember;
  // The point itself, said once: a "+1" or "+2" ghost rising off the
  // numeral as it rolls. It is the only place the game states what a
  // hand is worth against what the Scraps are worth; before this the
  // player subtracted to find out. Under reduced motion the blanket
  // rule lands it on its final, invisible frame, which is fine — the
  // number is the information and it is already there.
  const delta = tick ? to - from : 0;
  const glow = mine ? DS.gold : DS.ember;
  const ease = mine ? OVER : SETTLE;
  const dur = instant ? 0 : ROLL;
  const ld = instant ? 0 : lead;
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!tick || instant) return undefined;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), ld + ROLL + 40);
    return () => clearTimeout(t);
  }, [tick, to, instant, lead]);
  const size = rye ? 52 : 44;
  const numStyle = {fontFamily: rye ? F.title : F.display, fontSize: size,
    lineHeight:1, color: rye ? (mine ? DS.gold : DS.ember) : color, display:'block',
    position:'absolute', left:0, right:0, textAlign: align==='right' ? 'right' : 'left'};
  return (
    <div data-sweep="text" data-sweep-id={`score-${mine ? 'p' : 'a'}`}
      style={{display:'flex',alignItems:'baseline',gap:10,lineHeight:1,whiteSpace:'nowrap',
        flexDirection: align==='right' ? 'row-reverse' : 'row',
        animation: sweepDelay != null ? `sweepOffText ${SWEEP.dur}ms ${SWEEP_EASE} ${sweepDelay}ms both` : undefined}}>
      <span style={{fontFamily:F.ui,fontSize:15,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>{label}</span>
      <span className={tick && wave && !rye ? 'stage-wave' : undefined}
        style={{position:'relative',display:'block',height:size,minWidth: rye ? 64 : 54,
          // `!instant` as well: a skip mid-roll cancels the timer that
          // would have cleared `rolling`, and the effect returns early
          // without setting another, so the clip would otherwise stick and
          // cut the top off the wave for the rest of the scene.
          overflow: rolling && !instant ? 'hidden' : 'visible',
          animation: !tick ? undefined
            : rye ? `scoreJump ${instant ? 0 : JUMP}ms ease-out ${ld + dur}ms both`
            : wave ? `scoreWave 2.2s ease-in-out ${ld + dur + 200}ms infinite` : undefined}}>
        {tick && (
          <span key={`old-${from}`} aria-hidden="true" style={{...numStyle,
            animation:`scoreRollOut ${dur}ms ${ease} ${ld}ms both`}}>{from}</span>
        )}
        <span key={`new-${to}-${tick ? 1 : 0}`} style={{...numStyle,
          animation: tick ? `scoreRollIn ${dur}ms ${ease} ${ld}ms both` : undefined,
          textShadow: rye ? DROP : undefined}}>
          {tick ? to : from}
        </span>
        {delta > 0 && (
          <span key={`ghost-${to}`} aria-hidden="true" style={{position:'absolute',
            [align === 'right' ? 'right' : 'left']: 0, top:-6,
            fontFamily:F.display,fontSize:22,lineHeight:1,color:glow,
            textShadow:'0 2px 0 rgba(0,0,0,.4)',pointerEvents:'none',
            animation:`scoreGhost ${instant ? 0 : 1100}ms ease-out ${ld + dur}ms both`}}>
            +{delta}
          </span>
        )}
      </span>
    </div>
  );
}

// A puff of sawdust off the table where a card lands. A radial
// blob that grows and fades; it carries its own delay so it is
// silent until its card has landed.
function Sawdust({ delay, w }) {
  return (
    <span aria-hidden="true" style={{position:'absolute',left:'50%',bottom:-6,
      width:Math.round(w * 0.8),height:14,marginLeft:-Math.round(w * 0.4),borderRadius:'50%',
      background:`radial-gradient(ellipse at center, ${DS.timberLight}CC 0%, ${DS.timberLight}66 40%, transparent 72%)`,
      pointerEvents:'none',opacity:0,
      animation:`sawdust 520ms cubic-bezier(.2,.7,.3,1) ${delay}ms both`}}/>
  );
}

// One row of cards, laid left to right with the same overlap rule
// the Scraps pile uses when a row is wider than the space: never
// less than ~70% of a card exposed. `slap` means the row slaps down
// card by card from `slapAt`; otherwise it simply appears.
function CardRow({ cards, size, isScrap, kraft, bestIds, slap, slapAt, availW, instant, sweepDelays }) {
  const d = CARD_DIMS[size] || CARD_DIMS.small;
  const n = cards.length;
  const step = n > 1 ? Math.min(d.w + 8, (availW - d.w) / (n - 1)) : 0;
  const width = d.w + (n - 1) * step;
  return (
    <div style={{position:'relative',width,height:d.h,flexShrink:0}}>
      {cards.map((c, i) => {
        const dim = bestIds && !bestIds.has(c.id);
        const sd = sweepDelays ? sweepDelays[`c-${c.id}`] : undefined;
        const slapDelay = slap && !instant ? slapAt + i * SLAP.stagger : 0;
        let anim;
        if (sd != null) anim = `sweepOffCard ${SWEEP.dur}ms ${SWEEP_EASE} ${sd}ms both`;
        else if (slap) anim = `slapDown ${instant ? 0 : SLAP.dur}ms ${SLAP.ease} ${slapDelay}ms both`
          + (isScrap ? '' : `, slapShadow ${instant ? 0 : SLAP.dur}ms ${SLAP.ease} ${slapDelay}ms both`);
        else anim = `scrapArrive ${instant ? 0 : 220}ms ease ${instant ? 0 : i * 40}ms both`;
        return (
          <div key={c.id} data-sweep="card" data-sweep-id={`c-${c.id}`}
            style={{position:'absolute',left:i * step,top:0,zIndex:i,
              borderRadius: isScrap ? 0 : 12,
              animation: anim,
              filter: dim ? 'brightness(0.42) saturate(0.35)' : undefined,
              transition:'filter 0.4s'}}>
            <PlayingCard card={c} size={size} isScrap={isScrap} kraft={kraft} liftTransform={false}/>
            {slap && sd == null && !instant && <Sawdust delay={slapDelay + SLAP.land} w={d.w}/>}
          </div>
        );
      })}
    </div>
  );
}

// The face-down-then-flipped letter cards of the match screen.
// A hand card whose "rank" is a letter, at 0.84 of the rank size;
// the flip is the lookbook's preserve-3d rotateY, one wrapper per
// card, the front face hidden as it turns. Cards deal on into a
// shallow arc — the ribbon spread — from over the top edge, the way
// a round deals in.
// Rows deal and flip IN PARALLEL, a beat apart (ROW_OFFSET), rather
// than one after the other: serially, the old OPPONENT / WINS. took
// 1.2s longer to land than YOU WIN, so the loser got the longest
// ceremony in the game. A loss now lands in the win's time. (It is
// SHE WINS. since 2026-09-17: one row where there is room, SHE / WINS.
// on a narrow screen, where nine cards in one row cover each other's
// letters.)
const ROW_OFFSET = 120;
// `pace` scales every stagger: 1 for the win, LOSS_PACE for the loss,
// so that a loss lands SOONER than the win's six cards, and NEW GAME
// is under the thumb first. The loser
// gets the shorter ceremony on purpose.
const LOSS_PACE = 0.5;
// The row at rest (Stan, 2026-09-17: "this screen is too static"). Every
// card wobbles a little, out of step with its neighbours; a winning row
// also CYCLES, a wave flipping each card over and straight back every
// `CYCLE.period`, the way the splash wordmark riffles. Each has its own
// wrapper, between the deal (outer) and the turnover (inner), so neither
// replaces the other's transform.
const WOBBLE = { dur: 2100 };
const CYCLE = { period: 2600, stagger: 90 };
function LetterRow({ word, size, availW, dealAt, flipAt, instant, rowIndex = 0, pace = 1,
  cycle = false, cycleAt = 0 }) {
  const d = CARD_DIMS[size] || CARD_DIMS.small;
  const slots = word.split('');
  const n = slots.length;
  // The end cards lean 9deg and the wobble adds 1.3 more, and a leaning
  // card's box is wider than the card: the row's ends reached past
  // `availW` by that much, and the frame sheared 7px off YOU WIN at 390
  // (review, 2026-09-17). So the lean's overhang comes off first.
  const lean = (9 + 1.3) * Math.PI / 180;
  const over = (d.w * Math.cos(lean) + d.h * Math.sin(lean) - d.w) / 2;
  const step = n > 1 ? Math.min(d.w + 10, (availW - 2 * over - d.w) / (n - 1)) : 0;
  const width = d.w + (n - 1) * step;
  const lift = Math.min(18, d.h * 0.16);
  return (
    <div style={{position:'relative',width,height:d.h + lift,flexShrink:0}}>
      {slots.map((ch, i) => {
        if (ch === ' ') return null;
        const t = n > 1 ? i / (n - 1) : 0.5;
        const y = lift - Math.sin(t * Math.PI) * lift;
        const rot = -9 + t * 18;
        const k = rowIndex * 10 + i;
        const dealDelay = instant ? 0 : dealAt + (i * DEAL.stagger + rowIndex * ROW_OFFSET) * pace;
        const flipDelay = instant ? 0 : flipAt + (i * FLIP.stagger + rowIndex * ROW_OFFSET) * pace;
        return (
          <div key={i} style={{position:'absolute',left:i * step,top:y,zIndex:i,
            '--dx': `${Math.round(width / 2 - i * step - d.w / 2)}px`,
            '--rot': `${rot.toFixed(1)}deg`,
            animation:`dealOn ${instant ? 0 : DEAL.dur}ms cubic-bezier(.2,.9,.3,1.05) ${dealDelay}ms both`}}>
            {/* The perspective lives here now, on the wobble, so the
                cycle and the turnover under it both turn in 3D. A
                negative delay puts each card somewhere different in its
                lean from the first frame. */}
            <div className="letter-wobble" style={{perspective:800,
              animation:`letterWobble ${WOBBLE.dur + (k % 3) * 260}ms ease-in-out ${-((k * 470) % 2000)}ms infinite alternate`}}>
              <div className={cycle ? 'letter-cycle' : undefined}
                style={{position:'relative',width:d.w,height:d.h,transformStyle:'preserve-3d',
                  animation: cycle ? `letterCycle ${CYCLE.period}ms ease-in-out ${(instant ? 700 : cycleAt) + i * CYCLE.stagger}ms infinite` : undefined}}>
                <div className="stage-flip" style={{position:'relative',width:d.w,height:d.h,transformStyle:'preserve-3d',
                  animation:`ribbonFlip ${instant ? 0 : FLIP.dur}ms ease-in-out ${flipDelay}ms both`}}>
                  <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden'}}>
                    <PlayingCard card={null} faceDown size={size} liftTransform={false}/>
                  </div>
                  <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)'}}>
                    <PlayingCard card={{ id:`letter-${k}`, rank:ch }} rankScale={0.84} rankAlign="center"
                      size={size} liftTransform={false}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const T = {
  // Rye (Stan, 2026-09-14) — the eighth consumer on theme.js's list.
  // Since 2026-09-17 it is the table's SIGN rather than a label (Stan's
  // pick off The Turnover: "arched bigger fainter", in capitals, a
  // slightly taller arch than the bench showed). At 30px, pale, and
  // exactly as close to her cards as the verdict was, it read as her
  // row's label. Now: twice the size, faint, arched, with room under it
  // (`marginBottom`) so it heads the whole column. The lettering, its
  // size, fade and drop are all ArchedTitle's; this is only its box.
  title: {display:'flex',justifyContent:'center',
    marginTop:'clamp(4px,1.2vh,12px)',marginBottom:'clamp(10px,3vh,28px)'},
};
// The arch, rebuilt 2026-09-17 (Stan: "faint and fanned, but less strewn.
// an even and designed arc, 15% taller"). It was each letter turned about
// a pivot under it, the wordmark's hover fan: the end letters leaned 16deg
// as if on an arc, but the letters themselves stayed almost in a straight
// line (their baselines rose 0.098em from the ends to the middle), and a
// lean with nothing under it read as strewn. Now the word is SET ON A
// CURVE, an SVG textPath along a circle, so every letter sits on one arc
// at its own advance and turns to the tangent.
//
// The circle is chosen by the END LETTERS' LEAN, not a fixed radius, so
// every title has the same arc whatever its length: the radius is the end
// letters' distance from the middle, measured off Rye's real advances,
// over the lean. The first version used a fixed radius (8.2em): SCRAPS
// curved a quarter again as much as HAND 1, and its end letters leaned
// only 12 to 13 degrees, so beside the old fan it read no taller at all
// (review, 2026-09-18). Measured the same way, on each letter's baseline,
// the old fan rose 0.098em with a 16deg lean and that version 0.15 to
// 0.19em with 12 to 13; side by side on the real reveal the two read as
// the same height, because a lean reads as arc as much as a rise does.
// 15deg, on the circle, reads about 15% taller than both.
//
// FAINT, BUT 3:1 (Stan, 2026-09-18: "adjust the faint titles to meet the
// 3:1 minimum"). The letters were frost at 46% fill over their own hard
// drop, so each letter was drawn over its shadow and came out darker
// still: 2.4 to 2.7:1 against the wood, under WCAG's 3:1 for large text.
// Now the whole title, letters and drop together, is ONE layer at
// `fade` (opacity applies after the filter), so a letter is frost over
// wood and nothing else. 0.55 clears 3:1 against the lightest pixel of
// wood behind any title at 1024, 1280, 390 and 375 wide (3.1:1 at the
// worst, 3.4:1 on the typical board).
const ARCH = { lean: 15, fade: 0.55 };
function ArchedTitle({ text }) {
  const { w } = useViewport();
  const fs = Math.max(40, Math.min(62, 0.072 * w));
  const id = `arch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const textRef = useRef(null);
  // How far the end letters' centres sit from the middle along the arc,
  // in ems. Estimated until measured, and measured again once the fonts
  // are in: a measurement taken in the fallback face is wrong.
  const [reach, setReach] = useState(null);
  useLayoutEffect(() => {
    let live = true;
    const measure = () => {
      const t = textRef.current;
      if (!live || !t || !t.getNumberOfChars) return;
      try {
        const n = t.getNumberOfChars();
        if (n < 2) return;
        const L = t.getComputedTextLength();
        const a = (L - (t.getSubStringLength(0, 1) + t.getSubStringLength(n - 1, 1)) / 2) / 2;
        if (a > 0) setReach(a / fs);
      } catch (e) { /* keep the estimate */ }
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => { live = false; };
  }, [text, fs]);
  const lean = ARCH.lean * Math.PI / 180;
  const R = (reach ?? 0.3 * text.length) * fs / lean;
  const W = 6.6 * fs, top = 0.86 * fs;           // the middle baseline sits `top` down
  const half = Math.min(1.4, (W / 2) / R + 0.3);  // the path runs well past the word
  const cx = W / 2, cy = top + R;                 // the circle's centre, under the word
  const x0 = cx - R * Math.sin(half), x1 = cx + R * Math.sin(half), y0 = cy - R * Math.cos(half);
  // Deep enough for the end letters, which sit lower and lean outwards.
  const H = top + R * (1 - Math.cos(lean)) + 0.24 * fs;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W.toFixed(1)} ${H.toFixed(1)}`} aria-hidden="true"
      style={{display:'block',overflow:'visible',filter:'drop-shadow(0 2px 0 rgba(0,0,0,.28))',opacity:ARCH.fade}}>
      <path id={id} d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y0.toFixed(1)}`} fill="none"/>
      <text ref={textRef} fontFamily={F.title} fontSize={fs.toFixed(1)} letterSpacing={(0.04 * fs).toFixed(1)}
        fill={DS.frost} textAnchor="middle">
        <textPath href={`#${id}`} startOffset="50%">{text.toUpperCase()}</textPath>
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// RevealScene — Hand 1, Hand 2, the Scraps, and everything that can
// follow them: the CLEAN SWEEP beat, the sweep out of the round, and
// the whole match end.
//
// Order, fixed by Stan: the title at once; the LOSING side quickly
// and without ceremony; the WINNING side slapped down card by card;
// the verdict; the winner's score ticking up and waving. Then a tap.
// A tie has no motion and no sound.
//
// The steps are a string, in order. Every entrance keyframe ends on
// the element's resting style, so jumping to a later step with the
// animations at zero duration lands every element exactly where the
// full choreography would have left it.
// ─────────────────────────────────────────────────────────────
// `csRest` is the Clean Sweep beat at rest: title in, bonus point
// rolled, waiting for a tap. It did not exist while the beat swept
// itself after a hold (Stan, 2026-09-14: "don't automatically progress
// past the Clean Sweep screen").
const STEPS = ['open','loser','slap','winlabel','verdict','tick','rest',
               'cleanSweep','csRest','sweep','deal','flip','final'];
const idx = (s) => STEPS.indexOf(s);

function RevealScene({ which, playerCards, aiCards, playerHandName, aiHandName,
  playerBestIds = null, aiBestIds = null, winner, pts, cleanSweep = false, aiSweep = false,
  endsIt = false, before, onContinue, onSwept, onNewGame, difficulty, winStats, shake, R, instant }) {

  const { w } = useViewport();
  const verb = usePointerVerb();
  const narrow = w < 700;
  const isScraps = which === 'scraps';
  const cardSize = isScraps ? (narrow ? 'tiny' : 'small') : (narrow ? 'small' : 'normal');
  const letterSize = narrow ? 'tiny' : 'small';
  const availW = Math.min(Math.max(w, 300), 900) - 28;
  const tie = winner === 'tie';
  const mineWon = winner === 'player';
  const sweepBeat = cleanSweep || aiSweep;      // the same event, whoever did it
  // HAND 1's way on is a real green button, PLAY HAND 2, where every
  // other reveal says "Tap to continue" (Stan, 2026-09-16; Hand 2's is
  // left exactly as it was). It mirrors PLAY SCRAPS HAND on the table
  // after hand 2, so each hand of a round is asked for by name. A tap on
  // the wood still SKIPS the build, but at rest it no longer continues:
  // with a named button on screen, a stray second tap that sailed past
  // the result would be a hidden gesture beating the visible one.
  // Hand 2 has one too since 2026-09-17 (Stan: "the button to go back to
  // gameplay should appear without a preliminary click, after a timed
  // animation. tapping during animation jumps to ... done"): BACK TO THE
  // TABLE, where the hands are swept and PLAY SCRAPS HAND waits. It used
  // to rest on the quiet CLICK ANYWHERE, which read as a screen waiting
  // for a click before it would offer a way back.
  // And the Scraps since 2026-09-18 (Stan: "sure", to a named button, which
  // also stops a double-click from sailing past the round's two-point
  // result): NEXT ROUND, or CONTINUE when a CLEAN SWEEP beat or the match
  // screen comes first. Only a result that ends the match with no beat to
  // show runs on by itself, and needs no button.
  const namedCta = isScraps ? !(endsIt && !sweepBeat) : (which === 'hand1' || which === 'hand2') && !endsIt;
  // The CLEAN SWEEP beat waits this long for the cards to slide apart
  // (SlideBox) before its title, its sound and its bonus point arrive.
  const CS_LEAD = SLIDE.dur;

  const [step, setStep] = useState(instant ? (endsIt ? 'final' : 'rest') : 'open');
  // Per-beat skip flags — see the header.
  const [fast, setFast] = useState({ build: !!instant, beat: !!instant, end: !!instant });
  const [sweepDelays, setSweepDelays] = useState(null);
  const [shareState, setShareState] = useState('idle');
  const rootRef = useRef(null);
  // Focus follows the beat: onto the quiet button when it becomes
  // real at rest, onto NEW GAME when the match screen lands. Without
  // this the dialog's trap had nothing to hold once the reveal's
  // button unmounted, focus fell to the page, and the next Tab found
  // the HUD's buttons under the wood.
  const quietRef = useRef(null);
  const ctaRef = useRef(null);
  // When a tap last landed a resting frame (see onTap).
  const landedAt = useRef(-1e9);
  const finalBtnsRef = useRef(null);
  const { at, clear } = useTimeline(R ? 0.3 : 1);
  const cued = useRef({ outcome: !!instant, end: !!instant, sweep: !!instant, cs: !!instant });
  const stepRef = useRef(step);
  stepRef.current = step;

  const after = mineWon ? { p: before.p + pts, a: before.a } : winner === 'ai'
    ? { p: before.p, a: before.a + pts } : before;
  const bonus = !sweepBeat ? after : cleanSweep ? { p: after.p + 1, a: after.a } : { p: after.p, a: after.a + 1 };
  const winnerCards = mineWon ? playerCards : aiCards;
  const slapCount = tie ? 0 : winnerCards.length;
  const slapAt = 420;
  const slapEnd = slapAt + slapCount * SLAP.stagger;
  // In a Scraps reveal up to seven cards slap down but only the five
  // that make the hand are lit; the dimmed extras land SILENT (Stan,
  // 2026-09-14). A hand reveal has no dimmed cards and every card
  // sounds. The table still shivers under each landing either way.
  const winnerBestIds = mineWon ? playerBestIds : aiBestIds;
  const slapSounds = (i) => !isScraps || !winnerBestIds || winnerBestIds.has(winnerCards[i].id);

  // The outcome cue lands WITH the score, not with the screen. It
  // used to fire when the reveal mounted, two seconds before the
  // point arrived.
  const cueOutcome = useCallback(() => {
    if (cued.current.outcome || tie) return;
    cued.current.outcome = true;
    if (isScraps) (mineWon ? playRoundWon : playRoundLost)();
    else (mineWon ? playHandWon : playHandLost)();
  }, [tie, isScraps, mineWon]);
  const cueEnd = useCallback(() => {
    if (cued.current.end) return;
    cued.current.end = true;
    (mineWon ? playGameWon : playGameLost)();
  }, [mineWon]);
  const runSweep = useCallback(() => setStep('sweep'), []);

  // ── The build ──────────────────────────────────────────────
  useEffect(() => {
    if (instant) return;
    if (tie) {
      at(120, () => setStep('loser'));
      at(520, () => setStep('verdict'));
      at(720, () => setStep('rest'));
      return;
    }
    at(120, () => setStep('loser'));
    at(slapAt, () => setStep('slap'));
    if (R) {
      // The cards are already down under reduced motion; one landing.
      at(slapAt, () => playSlap());
    } else {
      for (let i = 0; i < slapCount; i++) {
        const loud = slapSounds(i);
        at(slapAt + i * SLAP.stagger + SLAP.land, () => { shake(2); if (loud) playSlap(); });
      }
    }
    at(slapEnd + 120, () => setStep('winlabel'));
    at(slapEnd + 420, () => setStep('verdict'));
    at(slapEnd + 780, () => { setStep('tick'); cueOutcome(); });
    at(slapEnd + 780 + ROLL + (endsIt && !sweepBeat ? 0 : 220), () => setStep('rest'));
  }, []);

  // ── What follows the resting frame ─────────────────────────
  // A match-ending reveal runs on by itself: the score that just
  // ended it jumps in Rye, then the table is swept and the letter
  // cards deal on. A Clean Sweep that ALSO ends the match composes
  // the two (Stan, 2026-09-14): the reveal ticks to 11, the bonus
  // ticks to 12 in Rye with the jump, then ONE sweep.
  useEffect(() => {
    if (step !== 'rest' || !endsIt || sweepBeat) return;
    cueEnd();
    at(fast.build ? 0 : JUMP + 500, runSweep);
  }, [step]);

  useEffect(() => {
    // preventScroll, every one: the stage is overflow-clipped with wood
    // hanging past its edges, and a plain focus() scrolled it to reach a
    // button still sliding up, shifting the wood off the table's seams
    // (3px at 1024x662, 11px on a landscape phone; review, 2026-09-18).
    if ((step === 'rest' || step === 'csRest') && quietRef.current && !quietRef.current.disabled) quietRef.current.focus({ preventScroll: true });
    if ((step === 'rest' || step === 'csRest') && namedCta && ctaRef.current) {
      const b = ctaRef.current.querySelector('button');
      if (b) b.focus({ preventScroll: true });
    }
    if (step === 'final' && finalBtnsRef.current) {
      const b = finalBtnsRef.current.querySelector('button');
      if (b) b.focus({ preventScroll: true });
    }
  }, [step]);

  // Her sweep is a LOSS and sounds like one (Stan, 2026-09-14): the
  // round-lost run rather than the ten-bar climb, which is yours.
  const cueSweepBeat = useCallback(() => {
    if (cued.current.cs) return;
    cued.current.cs = true;
    (aiSweep ? playRoundLost : playCleanSweep)();
  }, [aiSweep]);
  useEffect(() => {
    if (step !== 'cleanSweep') return;
    // The cards slide apart first (CS_LEAD), THEN the beat lands: the
    // title's letters, its sound and the bonus point all start once the
    // gap they need is open. Title in (letters at 55ms), bonus line, the
    // bonus point rolls in — then the beat RESTS and waits for a tap; it
    // no longer sweeps itself. If the match ends here the roll is the
    // Rye jump.
    if (!fast.beat) at(CS_LEAD, cueSweepBeat);
    if (endsIt) at(fast.beat ? 0 : CS_LEAD + 1100, cueEnd);
    at(fast.beat ? 0 : CS_LEAD + 1500, () => setStep('csRest'));
  }, [step]);

  // The sweep measures the REAL position of everything on the
  // table and sends each thing off on a delay set by where it is,
  // left to right. Text follows the same rule as cards. The score
  // row goes last, after the band has passed.
  useLayoutEffect(() => {
    if (step !== 'sweep' || sweepDelays) return;
    const root = rootRef.current;
    if (!root) return;
    const W = Math.max(1, window.innerWidth);
    const delays = {};
    const cardTimes = [];
    root.querySelectorAll('[data-sweep-id]').forEach(el => {
      const r = el.getBoundingClientRect();
      let dl = SWEEP.first + (Math.max(0, r.left) / W) * SWEEP.spread;
      if (/^score/.test(el.dataset.sweepId)) dl += 260;
      delays[el.dataset.sweepId] = Math.round(dl);
      if (el.dataset.sweep === 'card') cardTimes.push(Math.round(dl));
    });
    setSweepDelays(delays);
    if (!cued.current.sweep && !R) {
      cued.current.sweep = true;
      // A fast run of the draw taps as the cards go: one per card,
      // thinned to eight so fourteen scraps do not become a rattle.
      const sorted = cardTimes.sort((a, b) => a - b);
      const every = Math.max(1, Math.ceil(sorted.length / 8));
      sorted.forEach((t, i) => { if (i % every === 0) at(t + 60, playDraw); });
    }
    at(SWEEP.done, () => { if (endsIt) setStep('deal'); else onSwept(); });
  }, [step]);

  // ── The match screen ───────────────────────────────────────
  // SHE WINS. on one row, mirroring YOU WIN (Stan, 2026-09-17), where
  // there is room. On a narrow screen nine cards in one row show only 38
  // of their 60px each and cover each other's letters (found by review,
  // measured at 390 and 375), so it is SHE / WINS. there, which fits.
  const word = mineWon ? ['YOU WIN'] : narrow ? ['SHE', 'WINS.'] : ['SHE WINS.'];
  const pace = mineWon ? 1 : LOSS_PACE;
  const longest = Math.max(...word.map(r => r.length)) - 1;
  const rowsExtra = (word.length - 1) * ROW_OFFSET;
  const dealAt = 0;
  const dealEnd = dealAt + (longest * DEAL.stagger + rowsExtra) * pace + DEAL.dur;
  const flipAt = dealEnd + 160 * pace;
  const flipEnd = flipAt + (longest * FLIP.stagger + rowsExtra) * pace + FLIP.dur;
  // The win's cards start cycling once they are all face up and have sat
  // still for a beat.
  const cycleAt = flipEnd + 600;
  useEffect(() => {
    if (step !== 'deal') return;
    if (fast.end) { setStep('final'); return; }
    word.forEach((row, ri) => row.split('').forEach((ch, i) => {
      if (ch === ' ') return;
      // One cue per card on the longer row only; the two rows land a
      // beat apart and doubling every tap read as a rattle.
      if (ri > 0 && word[0].length > i) return;
      if (!R) at(dealAt + (i * DEAL.stagger + ri * ROW_OFFSET) * pace + DEAL.dur - 40, playDraw);
      if (!R) at(flipAt + (i * FLIP.stagger + ri * ROW_OFFSET) * pace + FLIP.dur * 0.55, playSelect);
    }));
    at(flipAt, () => setStep('flip'));
    at(flipEnd + 120, () => setStep('final'));
  }, [step]);
  // The share card is drawn before SHARE is pressed, so the press
  // itself calls the share sheet with the file already in hand.
  useEffect(() => {
    if (step !== 'final') return;
    prepareShareCard({ won: mineWon, p: bonus.p, a: bonus.a, difficulty });
  }, [step]);

  // ── Skipping and continuing ────────────────────────────────
  // `fromKey` is Enter or Space arriving through the window listener
  // below — focus somewhere other than a button. A key still continues
  // from Hand 1's resting frame; only a tap on the bare wood does not.
  const onTap = useCallback((fromKey = false) => {
    const s = stepRef.current;
    const i = idx(s);
    // A double-click whose first press landed a resting frame must not
    // go on to leave it: the second press of a double-click on the Scraps
    // reveal skipped the round's two-point result before it had been seen
    // (review, 2026-09-18). A deliberate second tap still moves on.
    const justLanded = performance.now() - landedAt.current < LAND_GRACE;
    if (i < idx('rest')) {
      // Mid-build: land on the resting frame with the score in.
      clear();
      cueOutcome();
      setFast(f => ({ ...f, build: true }));
      landedAt.current = performance.now();
      setStep('rest');
      return;
    }
    // The named button passes 'pointer' for a click or tap and 'button' for
    // a key. A pointer press is held by the grace like any tap: the first
    // press of a double-click (or a double TAP, which a phone never marks
    // as one) landed the resting frame and put the button under the
    // finger, and the second then swept the Scraps result away unseen
    // (review, 2026-09-18). A key press is never half of a double-click,
    // and a held key's repeats are cancelled at the button.
    const pressed = fromKey === true || fromKey === 'button' || fromKey === 'pointer';
    if (s === 'rest') {
      if (namedCta && !pressed) return;
      if (justLanded && fromKey !== 'button') return;
      if (sweepBeat) { setStep('cleanSweep'); return; }
      if (endsIt) {
        // The jump hold before the sweep. A tap here used to be
        // swallowed; it now goes straight to the sweep, the same way
        // a tap goes straight to anything else on this table.
        clear(); cueEnd(); runSweep();
        return;
      }
      if (isScraps) { runSweep(); return; }
      onContinue();
      return;
    }
    if (s === 'cleanSweep') {
      // Mid-beat: land on the beat's resting frame, bonus point in.
      // A second tap sweeps. The beat's own sound still plays if the
      // tap beat it — it waits out CS_LEAD, so a quick tap would
      // otherwise land a CLEAN SWEEP in silence.
      clear();
      cueSweepBeat();
      setFast(f => ({ ...f, beat: true }));
      if (endsIt) cueEnd();
      landedAt.current = performance.now();
      setStep('csRest');
      return;
    }
    if (s === 'csRest') {
      if (namedCta && !pressed) return;
      if (justLanded && fromKey !== 'button') return;
      runSweep();
      return;
    }
    if (s === 'sweep' && !endsIt) {
      // The round's sweep hands off at once. Safe by construction —
      // the layer stays mounted and the ROUND sign lands on the same
      // boards — and it used to swallow the tap, which taught the
      // player that taps do not work one beat before the sign, where
      // they do.
      clear();
      onSwept();
      return;
    }
    if (s === 'sweep' || s === 'deal' || s === 'flip') {
      clear();
      setFast(f => ({ ...f, end: true }));
      setStep('final');
    }
  }, [clear, cueOutcome, sweepBeat, endsIt, isScraps, runSweep, onContinue, onSwept, cueEnd, namedCta, cueSweepBeat]);

  // Keys land on the quiet button through the dialog's focus trap;
  // this catches the case where focus has wandered (a screen reader
  // moving through the cards) so Enter still moves things on.
  useEffect(() => {
    const onKey = (e) => {
      // A HELD key is one press: its repeats ran straight through the
      // Scraps result, the Clean Sweep beat and the sweep in 150ms.
      if (e.repeat) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onTap(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTap]);

  // ── Share ──────────────────────────────────────────────────
  const doShare = useCallback(async () => {
    if (shareState === 'busy') return;
    setShareState('busy');
    const text = buildShareText({ won: mineWon, p: bonus.p, a: bonus.a, difficulty });
    const r = await shareResult({ won: mineWon, p: bonus.p, a: bonus.a, difficulty, text });
    if (r === 'copied' || r === 'failed') {
      setShareState(r);
      setTimeout(() => setShareState('idle'), 2600);
    } else setShareState('idle');
  }, [shareState, mineWon, bonus.p, bonus.a, difficulty]);

  // ── Render ─────────────────────────────────────────────────
  const i = idx(step);
  const showLoser   = i >= idx('loser');
  const showSlap    = i >= idx('slap');
  // 'winlabel' is still a step — it is the beat between the last slap
  // and the verdict — but nothing renders on it now that the side
  // labels and hand names are gone.
  const showVerdict = i >= idx('verdict');
  const ticked      = i >= idx('tick') && !tie;
  const atRest      = step === 'rest' || step === 'csRest';
  // The named button's words (see `namedCta`): on the Scraps they say
  // what the press leads to, the CLEAN SWEEP beat and the match screen
  // being part of this result rather than the next round.
  const ctaLabel = which === 'hand1' ? 'Play Hand 2'
    : which === 'hand2' ? 'Back to the table'
    : (step === 'rest' && sweepBeat) || endsIt ? 'Continue' : 'Next round';
  const sweeping    = step === 'sweep';
  const matchScreen = i >= idx('deal');
  const beatOn      = sweepBeat && i >= idx('cleanSweep');
  const fb = fast.build;
  const sd = (id) => (sweeping && sweepDelays) ? sweepDelays[id] : undefined;
  const fadeIn = (ms, delay = 0, f = fb) => `scrapArrive ${f ? 0 : ms}ms ease ${f ? 0 : delay}ms both`;
  const textAnim = (id, entrance) => sd(id) != null
    ? `sweepOffText ${SWEEP.dur}ms ${SWEEP_EASE} ${sd(id)}ms both` : entrance;
  // `stage-fade` is the reduced-motion fade-on; it comes OFF while
  // sweeping, or the substitute would fade a leaving line back in.
  const fadeCls = sweeping ? undefined : 'stage-fade';
  const verdictText = tie ? 'TIE' : mineWon ? 'YOU WIN' : 'SHE WINS';
  const verdictColor = tie ? DS.slate : mineWon ? DS.voltage : DS.ember;
  const title = which === 'hand1' ? 'Hand 1' : which === 'hand2' ? 'Hand 2' : 'Scraps';

  const side = (who) => {
    const isP = who === 'player';
    const cards = isP ? playerCards : aiCards;
    const isWinner = !tie && ((isP && mineWon) || (!isP && winner === 'ai'));
    const show = isWinner ? showSlap : showLoser;
    // EXACTLY the row's own height. It was the height plus 60 — the room
    // the side labels and hand names used to take — and nothing shrank
    // it when those went on 2026-09-14, so each row that appeared
    // shortened the centred column by 60px and moved everything on the
    // table 30px. Twice per reveal: measured 2026-09-16, the title
    // stepping 104 → 134 → 164 as the loser and then the winner landed.
    if (!show) return <div style={{height: CARD_DIMS[cardSize].h}}/>;
    // The OPPONENT / YOU labels that sat above her row and below yours
    // went on 2026-09-14 (Stan), and the hand names under each row
    // (Pair, Straight) went the same evening. Top is hers and bottom is
    // yours on every screen of the game, the papers say whose pile a
    // Scraps row is, the score row underneath still names both sides —
    // and the cards ARE the hand. The names still reach a screen reader
    // through the status line below, which is where they carry
    // information a sighted player reads off the cards.
    const row = (
      <CardRow cards={cards} size={cardSize} isScrap={isScraps} kraft={!isP && isScraps}
        bestIds={isP ? playerBestIds : aiBestIds}
        slap={isWinner} slapAt={0} availW={availW} instant={fb}
        sweepDelays={sweeping ? sweepDelays : null}/>
    );
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
        {row}
      </div>
    );
  };

  // Each side's score: what it shows, what it rolls from and to.
  // The bonus point is a SECOND roll on the same side, after the
  // Scraps point; it is the match-winning roll when the match ends
  // there, and the Scraps roll is otherwise.
  const scoreFor = (isP) => {
    const won = isP ? mineWon : winner === 'ai';
    const swept = isP ? cleanSweep : aiSweep;
    const b = isP ? before.p : before.a, a = isP ? after.p : after.a, bo = isP ? bonus.p : bonus.a;
    if (!won) return { from: b, to: b, tick: false, wave: false, rye: false };
    if (swept && beatOn) return { from: a, to: bo, tick: true, wave: !endsIt, rye: endsIt, instant: fast.beat,
      lead: CS_LEAD };
    return { from: b, to: a, tick: ticked, wave: !(endsIt && !sweepBeat), rye: endsIt && !sweepBeat, instant: fb };
  };
  const sp = scoreFor(true), sa = scoreFor(false);
  // MATCH POINT reads off the post-roll totals, so it appears with the
  // point that created it — and when that point is the CLEAN SWEEP
  // bonus, it waits for the bonus roll too, which waits for the slide.
  const mpP = atMatchPoint(sp.to), mpA = atMatchPoint(sa.to);
  const showMP = ticked && !endsIt && (mpP || mpA);
  const mpFromBeat = beatOn && !(atMatchPoint(after.p) || atMatchPoint(after.a));
  const scoreRow = (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',
      width:'min(100%, 440px)',padding:'0 6px'}}>
      <ScoreRoll label="HER" {...sa} mine={false} align="left" sweepDelay={sd('score-a')}/>
      <ScoreRoll label="YOU" {...sp} mine align="right" sweepDelay={sd('score-p')}/>
    </div>
  );

  // The match screen replaces everything once the sweep has cleared
  // the table. Cards deal on face down, flip in a wave to spell the
  // verdict, then the final score and the two buttons.
  if (matchScreen) {
    const showFinal = step === 'final';
    const fe = fast.end;
    const won = mineWon;
    // On the loss the buttons come first and the score after; on the
    // win the score lands first and the buttons follow it. The buttons
    // sit at the bottom of the viewport either way — the thumb zone on
    // a phone — rather than wherever the centred column ends.
    const btnDelay = won ? 340 : 0;
    const scoreDelay = won ? 120 : 300;
    return (
      <div ref={rootRef} onClick={() => onTap()}
        style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
          padding:'14px 14px clamp(84px,14vh,120px)',cursor:'default'}}>
        <FitBox modeMinW={300}>
          <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',gap:'clamp(12px,2.6vh,22px)'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'clamp(8px,1.6vh,14px)'}}>
              {word.map((row, ri) => (
                <LetterRow key={ri} word={row} size={letterSize} availW={availW}
                  dealAt={dealAt} flipAt={flipAt} instant={fe} rowIndex={ri} pace={pace}
                  cycle={won} cycleAt={cycleAt}/>
              ))}
            </div>
            {/* No plain line under the cards (Stan, 2026-09-18): the loss
                read SHE WINS. on the cards and "She wins." again under
                them. The cards are the verdict; the status line below
                says it for screen readers. */}
            {/* The final score keeps the reveal's geometry — HER on the
                left, YOU on the right, each labelled — rather than a
                winner-first pair the player had to decode. The winner's
                numeral carries the colour. */}
            <div className="stage-fade" style={{display:'flex',flexDirection:'column',alignItems:'center',
              animation: showFinal ? `slideUp ${fe ? 0 : 400}ms ease ${fe ? 0 : scoreDelay}ms both` : undefined,
              opacity: showFinal ? 1 : 0}}>
              {/* Enlarged 2026-09-17 (Stan); it was 14px. */}
              <div style={{fontFamily:F.mono,color:DS.slateLight,fontSize:'clamp(17px,2.4vw,22px)',letterSpacing:'0.28em',marginBottom:8}}>FINAL SCORE</div>
              <div style={{display:'flex',alignItems:'baseline',gap:'clamp(18px,4vw,40px)'}}>
                {[['HER', bonus.a, !won], ['YOU', bonus.p, won]].map(([lbl, n, isWinner]) => (
                  <div key={lbl} style={{display:'flex',alignItems:'baseline',gap:10,
                    flexDirection: lbl === 'YOU' ? 'row-reverse' : 'row'}}>
                    <span style={{fontFamily:F.ui,fontSize:15,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>{lbl}</span>
                    {/* The winner's number pulses, slowly, in its own
                        colour (Stan, 2026-09-17), once it has landed. By
                        size alone: no glow (Stan, 2026-09-18). */}
                    <span className={isWinner ? 'score-pulse' : undefined}
                      style={{fontFamily:F.display,lineHeight:1,fontSize:'clamp(56px,12vw,116px)',letterSpacing:'0.03em',
                      color: isWinner ? (won ? DS.gold : DS.ember) : DS.frost,
                      textShadow: DROP, display:'inline-block', transformOrigin:'50% 70%',
                      animation: isWinner && showFinal ? `scorePulse 2200ms ease-in-out ${fe ? 0 : scoreDelay + 500}ms infinite` : undefined}}>{n}</span>
                  </div>
                ))}
              </div>
              {/* No margin line (WON BY / LOST BY): it went on Stan's
                  call, 2026-09-17, as the NEW BEST MARGIN pill beside it
                  had on 2026-09-14. stats.js still records the best
                  margin; nothing on this screen shows it. */}
            </div>
          </div>
        </FitBox>
        {/* Bottom of the viewport, whatever the column above does. */}
        <div className="stage-fade" onClick={e => e.stopPropagation()} ref={finalBtnsRef}
          style={{position:'absolute',left:0,right:0,bottom:'clamp(18px,4vh,40px)',
            display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',padding:'0 14px',
            animation: showFinal ? `slideUp ${fe ? 0 : 400}ms ease ${fe ? 0 : btnDelay}ms both` : undefined,
            opacity: showFinal ? 1 : 0, pointerEvents: showFinal ? 'auto' : 'none'}}>
          {/* Both green (Stan, 2026-09-14): every filled button in the
              game is voltage now, SHARE included, and NEW GAME lost its
              gold on the win for the same rule. */}
          <Btn onClick={onNewGame}>New Game</Btn>
          <Btn onClick={doShare} disabled={shareState === 'busy'}>
            {shareState === 'copied' ? 'Copied' : shareState === 'failed' ? "Couldn't share" : 'Share'}
          </Btn>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {showFinal ? `${won ? 'You win' : 'She wins'}. Final score: you ${bonus.p}, her ${bonus.a}.` : ''}
          {shareState === 'copied' ? ' Copied to the clipboard.' : ''}
          {shareState === 'failed' ? " Couldn't share from here." : ''}
        </div>
      </div>
    );
  }

  const bandOn = sweeping && !R;
  return (
    <div ref={rootRef} onClick={() => onTap()}
      style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',padding:14,cursor:'pointer'}}>
      {bandOn && (
        <div aria-hidden="true" style={{position:'absolute',top:'-10%',left:0,width:'22vw',minWidth:120,height:'120%',
          zIndex:50,pointerEvents:'none',
          background:`linear-gradient(90deg, ${DS.timberSeam}00 0%, ${DS.timberSeam}80 45%, ${DS.timberSeam}00 100%)`,
          animation:`sweepBand ${SWEEP.band}ms cubic-bezier(.4,0,.6,1) ${SWEEP.bandDelay}ms both`}}/>
      )}
      <FitBox modeMinW={300}>
        <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',alignItems:'center',
          justifyContent:'center',gap:'clamp(8px,1.8vh,16px)',position:'relative'}}>
          {/* A heading, by role: the arched letters are drawn in an SVG
              that screen readers are told to skip, and an aria-label on
              a plain div is not read at all (review, 2026-09-17). */}
          <div data-sweep="text" data-sweep-id="title" className={fadeCls}
            role="heading" aria-level={2} aria-label={title}
            style={{...T.title, animation: textAnim('title', fadeIn(200))}}><ArchedTitle text={title}/></div>

          {side('ai')}

          {/* The verdict, and the CLEAN SWEEP beat that replaces it. In a
              SlideBox, so the cards part for the beat over 200ms rather
              than jumping (Stan, 2026-09-16), and the beat's title waits
              out that slide before its letters rise.
              The resting floor is never shorter than the verdict it
              holds — the larger of the old floor and the verdict's own
              size — so the verdict landing does not nudge the table
              either. */}
          <SlideBox instant={instant || (beatOn && fast.beat)}>
          <div style={{minHeight: beatOn ? undefined : 'max(clamp(44px,6vh,56px), clamp(34px,7vw,56px))',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}}>
            {beatOn ? (
              <>
                <div data-sweep="text" data-sweep-id="cs-title" aria-label="Clean sweep"
                  style={{display:'flex',gap:'0.06em',perspective:'26em',fontFamily:F.title,lineHeight:1,
                    fontSize:'clamp(38px,min(9.5vw,14vh),88px)',color: cleanSweep ? DS.gold : DS.ember,
                    textShadow:DROP,whiteSpace:'pre',
                    animation: textAnim('cs-title', undefined)}}>
                  {/* Your sweep lands on the overshoot; hers on the settle
                      curve. Same letters, same timing, no bounce on bad
                      news — the split every other loss in the game keeps. */}
                  {'CLEAN SWEEP'.split('').map((l, k) => (
                    <span key={k} aria-hidden="true" style={{display:'inline-block',
                      animation: sd('cs-title') != null || fast.beat ? undefined
                        : `letterAppear 0.6s ${cleanSweep ? 'cubic-bezier(.34,1.6,.64,1)' : SETTLE} ${CS_LEAD + k * 55}ms both`}}>{l}</span>
                  ))}
                </div>
                {/* Names the feat as well as the price: a first-timer meets
                    CLEAN SWEEP here before anything has taught it. */}
                <div data-sweep="text" data-sweep-id="cs-line" className={fadeCls}
                  style={{fontFamily:F.display,fontSize:'clamp(15px,2.6vw,24px)',letterSpacing:'0.14em',
                    color: cleanSweep ? DS.gold : DS.ember,whiteSpace:'nowrap',
                    animation: textAnim('cs-line', fadeIn(260, CS_LEAD + 520, fast.beat))}}>
                  ALL THREE HANDS · +1 BONUS POINT
                </div>
              </>
            ) : showVerdict && (
              <div data-sweep="text" data-sweep-id="verdict" className={fadeCls}
                style={{fontFamily:F.display,fontSize:'clamp(34px,7vw,56px)',letterSpacing:'0.04em',lineHeight:1,
                  color:verdictColor,textShadow:DROP,
                  animation: textAnim('verdict', `popIn ${fb ? 0 : 400}ms ${mineWon ? OVER : SETTLE} both`)}}>
                {verdictText}
              </div>
            )}
          </div>
          </SlideBox>

          {side('player')}

          {/* The score row and MATCH POINT share one SlideBox for the same
              reason as the verdict: MATCH POINT arriving, or a winning
              score swapping to its larger Rye size, grows this block, and
              it slides rather than shoving the cards above it. MATCH POINT
              sits inside the box on the column's own gap, so the table is
              spaced exactly as it was when it was a column child. */}
          <SlideBox style={{width:'100%'}} instant={instant || (beatOn ? fast.beat : fb)}>
            <div style={{marginTop:'clamp(2px,1vh,8px)',width:'100%',display:'flex',justifyContent:'center'}}>
              {scoreRow}
            </div>
            {/* MATCH POINT, on the stage rather than in the HUD it covers.
                Colour follows ownership: voltage when the threat is yours,
                ember when hers, frost when both. Never gold — gold is a
                milestone, this is a warning. */}
            {showMP && (
              <div data-sweep="text" data-sweep-id="match-point" className={fadeCls}
                style={{marginTop:'clamp(8px,1.8vh,16px)',
                  fontFamily:F.display,fontSize:'clamp(14px,2.4vw,20px)',letterSpacing:'0.18em',
                  color: mpP && mpA ? DS.frost : mpP ? DS.voltage : DS.ember,textShadow:DROP,
                  animation: textAnim('match-point', mpFromBeat
                    ? fadeIn(260, CS_LEAD + ROLL + 100, fast.beat)
                    : fadeIn(260, ROLL + 100, fb))}}>
                MATCH POINT{mpP && mpA ? ' BOTH WAYS' : ''}
              </div>
            )}
          </SlideBox>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {showVerdict ? `${title}: ${tie ? 'tie' : mineWon ? `you win with ${playerHandName}` : `she wins with ${aiHandName}`}.` : ''}
            {ticked ? ` Score: you ${sp.to}, her ${sa.to}.` : ''}
            {beatOn ? ' Clean sweep: all three hands, plus one bonus point.' : ''}
          </div>
          {namedCta ? (
            // PLAY HAND 2 and the rest — see `namedCta`. Laid out from the first frame
            // and only HIDDEN until the resting frame, so the column is
            // the same height before and after it arrives. `visibility`
            // rather than opacity: a hidden button is out of the tab
            // order and the accessibility tree, the same promise the
            // quiet button keeps with `disabled`.
            // Room under it for its glow and its keyboard focus ring: it
            // is the column's last row, and a table scaled to fit puts
            // the column's bottom on the frame's clipped edge, which cut
            // both off at 1024x662 (review, 2026-09-18).
            // A held Enter on the button itself repeats its click too;
            // cancelling the repeats' keydown cancels those clicks.
            <div ref={ctaRef} onClick={e => e.stopPropagation()}
              onKeyDownCapture={e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}
              className={atRest ? 'stage-fade' : undefined}
              style={{minHeight:MODAL_BTN_MIN,display:'flex',alignItems:'center',paddingBottom:12,
                visibility: atRest ? 'visible' : 'hidden',
                animation: atRest ? `slideUp 340ms ${SETTLE} both` : undefined}}>
              <Btn onClick={(e) => onTap(e && e.detail === 0 ? 'button' : 'pointer')}>{ctaLabel}</Btn>
            </div>
          ) : (
            <div onClick={e => e.stopPropagation()} style={{minHeight:44,display:'flex',alignItems:'center'}}>
              <QuietButton onClick={onTap} buttonRef={quietRef}
                show={atRest && !(endsIt && !sweepBeat)}>{`${verb} anywhere`}</QuietButton>
            </div>
          )}
        </div>
      </FitBox>
    </div>
  );
}
