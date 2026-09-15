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
// modal in overlays.jsx uses. NOTHING ADVANCES ITSELF except a
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
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { PlayingCard, CARD_DIMS } from "./cards.jsx";
import { TableSurface } from "./backdrop.jsx";
import { FitBox, useViewport } from "../ui/viewport.jsx";
import { useDialogFocus, SETTLE } from "./overlays.jsx";
import { Btn } from "./buttons.jsx";
import {
  playSlap, playHandWon, playHandLost, playRoundWon, playRoundLost,
  playCleanSweep, playGameWon, playGameLost, playDraw, playSelect, playRoundSign,
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
const SLAP = { dur: 280, stagger: 230, land: 250, ease: 'cubic-bezier(.3,1.1,.5,1)' };
const ROLL = 380;                       // the score's old digit out, new digit in
const JUMP = 500;                       // the match-winning score's jump and vibrate
// The sweep: a shadow band crosses first, then each element leaves
// on a delay set by where it is on screen, left to right, so the
// wipe reads as one hand crossing the table. `done` is when the
// last card is off and the scene hands over.
const SWEEP = { band: 1000, bandDelay: 250, first: 300, spread: 700, dur: 620, done: 1700 };
const DEAL = { dur: 380, stagger: 70 };
const FLIP = { dur: 520, stagger: 85 };
// ROUND N: six glyphs at the wordmark's 90ms stagger overrun 1.5s
// once a riffle follows, so the sign uses 55ms. Entrance done by
// ~0.88s, one riffle pass to ~1.26s, at rest by 1.35s — and then it
// WAITS. It advanced itself at 1.35s until 2026-09-14 (Stan: "don't
// automatically progress past the Round X screen").
const SIGN = { stagger: 55, riffleAt: 800, riffleStagger: 25, riffle: 380, lineAt: 650, settle: 1350 };
const SWEEP_EASE = 'cubic-bezier(.5,0,.9,.6)';
// Hard drop, no glow. The verdict, the Clean Sweep title, the winning
// score and the final score all carried a coloured glow text-shadow,
// the last trace of the neon palette; on wood a hard drop is what the
// sign already used, and Stan asked for it everywhere (2026-09-14).
const DROP = '0 3px 0 rgba(0,0,0,.4)';
// Someone is one scoring event from the game. Two short of WIN_SCORE,
// because the Scraps hand pays 2 and is the smallest hand that can end
// a game from here: a player on 8 can be beaten in one reveal, a
// player on 7 cannot. This used to be the HUD's banner; the stage
// covers the HUD exactly when it matters, so it lives here now.
const MATCH_POINT = WIN_SCORE - 2;

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
  const signMP = stage.kind === 'sign' && ((stage.playerScore || 0) >= MATCH_POINT || (stage.aiScore || 0) >= MATCH_POINT);
  const label = stage.kind === 'sign'
    ? `Round ${stage.roundNum}. ${stage.roundNum % 2 === 1 ? 'You go first.' : 'Opponent goes first.'}${signMP ? ' Match point.' : ''}`
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
      role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
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
// RoundSign — ROUND N on the bare wood, in Rye, entering the way the
// splash wordmark does: per-letter letterAppear, then ONE riffle
// pass travelling the row (`signRiffle`, its own keyframe — the
// wordmark's riffle is 62% stillness and cannot be run once). The
// dealer line sits small under it in Fjalla, because who acts first
// is real information and the log is the only other place it lives.
// At rest inside 1.4s, then it holds for a tap, the same contract as
// every reveal: a tap mid-entrance lands it, a tap at rest deals.
// ─────────────────────────────────────────────────────────────
function RoundSign({ roundNum, matchPoint = false, onDone, R, instant }) {
  const letters = `ROUND ${roundNum}`.split('');
  const { at, clear } = useTimeline(1);
  const doneRef = useRef(false);
  const [settled, setSettled] = useState(!!instant);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clear();
    onDone();
  }, [clear, onDone]);
  const tap = useCallback(() => {
    if (settled) { finish(); return; }
    clear();
    setSettled(true);
  }, [settled, finish, clear]);
  useEffect(() => {
    if (!instant) playRoundSign();
    if (!instant) at(SIGN.settle, () => setSettled(true));
  }, []);
  // Once settled the entrances come off: every one of them ends on
  // the resting frame (letterAppear fills `both`, the riffle ends
  // where it began), so dropping them after they finish changes
  // nothing, and dropping them EARLY on a tap lands the sign at once.
  const stop = R || instant || settled;
  return (
    <div onClick={tap}
      style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',gap:'clamp(10px,2.4vh,22px)',
        padding:16,cursor:'pointer'}}>
      <div className="stage-fade" aria-label={`Round ${roundNum}`}
        style={{display:'flex',justifyContent:'center',gap:'0.06em',perspective:'26em',
          fontFamily:F.title,fontSize:'clamp(46px,min(13vw,22vh),132px)',lineHeight:1,
          color:DS.frost,textShadow:'0 3px 0 rgba(0,0,0,.4)',whiteSpace:'pre'}}>
        {letters.map((l, i) => (
          <span key={i} aria-hidden="true" style={{display:'inline-block',willChange:'transform',
            animation: stop ? undefined
              : `letterAppear 0.6s cubic-bezier(.34,1.6,.64,1) ${i * SIGN.stagger}ms both,`
              + ` signRiffle ${SIGN.riffle}ms cubic-bezier(.3,.9,.4,1) ${SIGN.riffleAt + i * SIGN.riffleStagger}ms`}}>
            {l}
          </span>
        ))}
      </div>
      <div className="stage-fade" style={{fontFamily:F.display,fontSize:'clamp(15px,2.6vw,24px)',
        color:DS.slateLight,letterSpacing:'0.18em',
        animation: stop ? undefined : `scrapArrive 0.25s ease ${SIGN.lineAt}ms both`}}>
        {roundNum % 2 === 1 ? 'YOU GO FIRST' : 'OPPONENT GOES FIRST'}
        {matchPoint && <span style={{color:DS.gold}}> · MATCH POINT</span>}
      </div>
      <div style={{position:'absolute',bottom:'clamp(8px,3vh,28px)'}}>
        <QuietButton onClick={tap} style={settled ? {} : {opacity:.55}}>
          {settled ? 'Tap to continue' : 'Skip'}
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
function ScoreRoll({ label, from, to, mine, tick, wave, rye, align, instant, sweepDelay }) {
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
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!tick || instant) return undefined;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), ROLL + 40);
    return () => clearTimeout(t);
  }, [tick, to, instant]);
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
          overflow: rolling ? 'hidden' : 'visible',
          '--glow': glow,
          animation: !tick ? undefined
            : rye ? `scoreJump ${instant ? 0 : JUMP}ms ease-out ${dur}ms both`
            : wave ? `scoreWave 2.2s ease-in-out ${dur + 200}ms infinite` : undefined}}>
        {tick && (
          <span key={`old-${from}`} aria-hidden="true" style={{...numStyle,
            animation:`scoreRollOut ${dur}ms ${ease} both`}}>{from}</span>
        )}
        <span key={`new-${to}-${tick ? 1 : 0}`} style={{...numStyle,
          animation: tick ? `scoreRollIn ${dur}ms ${ease} both` : undefined,
          textShadow: rye ? DROP : undefined}}>
          {tick ? to : from}
        </span>
        {delta > 0 && (
          <span key={`ghost-${to}`} aria-hidden="true" style={{position:'absolute',
            [align === 'right' ? 'right' : 'left']: 0, top:-6,
            fontFamily:F.display,fontSize:22,lineHeight:1,color:glow,
            textShadow:'0 2px 0 rgba(0,0,0,.4)',pointerEvents:'none',
            animation:`scoreGhost ${instant ? 0 : 1100}ms ease-out ${dur}ms both`}}>
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
// than one after the other: serially, OPPONENT / WINS. took 1.2s
// longer to land than YOU WIN, so the loser got the longest ceremony
// in the game. Now a loss lands in the win's time.
const ROW_OFFSET = 120;
// `pace` scales every stagger: 1 for the win, LOSS_PACE for the loss,
// so that a loss — thirteen cards over two rows — lands SOONER than
// the win's six, and NEW GAME is under the thumb first. The loser
// gets the shorter ceremony on purpose.
const LOSS_PACE = 0.5;
function LetterRow({ word, size, availW, dealAt, flipAt, instant, rowIndex = 0, pace = 1 }) {
  const d = CARD_DIMS[size] || CARD_DIMS.small;
  const slots = word.split('');
  const n = slots.length;
  const step = n > 1 ? Math.min(d.w + 10, (availW - d.w) / (n - 1)) : 0;
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
            perspective:800,
            '--dx': `${Math.round(width / 2 - i * step - d.w / 2)}px`,
            '--rot': `${rot.toFixed(1)}deg`,
            animation:`dealOn ${instant ? 0 : DEAL.dur}ms cubic-bezier(.2,.9,.3,1.05) ${dealDelay}ms both`}}>
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
        );
      })}
    </div>
  );
}

const T = {
  // Rye (Stan, 2026-09-14) — the eighth consumer on theme.js's list.
  // Tracked tighter than the Fjalla it replaced: Rye is a wide face
  // and 0.12em on it read as gapped.
  title: {fontFamily:F.title,color:DS.slateLight,letterSpacing:'0.05em',fontSize:'clamp(22px,3.6vw,30px)',lineHeight:1,textShadow:DROP},
};

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
  const narrow = w < 700;
  const isScraps = which === 'scraps';
  const cardSize = isScraps ? (narrow ? 'tiny' : 'small') : (narrow ? 'small' : 'normal');
  const letterSize = narrow ? 'tiny' : 'small';
  const availW = Math.min(Math.max(w, 300), 900) - 28;
  const tie = winner === 'tie';
  const mineWon = winner === 'player';
  const sweepBeat = cleanSweep || aiSweep;      // the same event, whoever did it

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
  const finalBtnsRef = useRef(null);
  const { at, clear } = useTimeline(R ? 0.3 : 1);
  const cued = useRef({ outcome: !!instant, end: !!instant, sweep: !!instant });
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
    if ((step === 'rest' || step === 'csRest') && quietRef.current && !quietRef.current.disabled) quietRef.current.focus();
    if (step === 'final' && finalBtnsRef.current) {
      const b = finalBtnsRef.current.querySelector('button');
      if (b) b.focus();
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'cleanSweep') return;
    // Her sweep is a LOSS and sounds like one (Stan, 2026-09-14): the
    // round-lost run rather than the ten-bar climb, which is yours.
    if (!fast.beat) (aiSweep ? playRoundLost : playCleanSweep)();
    // Title in (letters at 55ms), bonus line, the bonus point rolls
    // in — then the beat RESTS and waits for a tap; it no longer
    // sweeps itself. If the match ends here the roll is the Rye jump.
    if (endsIt) at(fast.beat ? 0 : 1100, cueEnd);
    at(fast.beat ? 0 : 1500, () => setStep('csRest'));
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
  const word = mineWon ? ['YOU WIN'] : ['OPPONENT', 'WINS.'];
  const pace = mineWon ? 1 : LOSS_PACE;
  const longest = Math.max(...word.map(r => r.length)) - 1;
  const rowsExtra = (word.length - 1) * ROW_OFFSET;
  const dealAt = 0;
  const dealEnd = dealAt + (longest * DEAL.stagger + rowsExtra) * pace + DEAL.dur;
  const flipAt = dealEnd + 160 * pace;
  const flipEnd = flipAt + (longest * FLIP.stagger + rowsExtra) * pace + FLIP.dur;
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
  const onTap = useCallback(() => {
    const s = stepRef.current;
    const i = idx(s);
    if (i < idx('rest')) {
      // Mid-build: land on the resting frame with the score in.
      clear();
      cueOutcome();
      setFast(f => ({ ...f, build: true }));
      setStep('rest');
      return;
    }
    if (s === 'rest') {
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
      // A second tap sweeps.
      clear();
      setFast(f => ({ ...f, beat: true }));
      if (endsIt) cueEnd();
      setStep('csRest');
      return;
    }
    if (s === 'csRest') { runSweep(); return; }
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
  }, [clear, cueOutcome, sweepBeat, endsIt, isScraps, runSweep, onContinue, onSwept, cueEnd]);

  // Keys land on the quiet button through the dialog's focus trap;
  // this catches the case where focus has wandered (a screen reader
  // moving through the cards) so Enter still moves things on.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onTap(); }
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
  const verdictText = tie ? 'TIE' : mineWon ? 'YOU WIN' : 'OPPONENT WINS';
  const verdictColor = tie ? DS.slate : mineWon ? DS.voltage : DS.ember;
  const title = which === 'hand1' ? 'Hand 1' : which === 'hand2' ? 'Hand 2' : 'Scraps';

  const side = (who) => {
    const isP = who === 'player';
    const cards = isP ? playerCards : aiCards;
    const isWinner = !tie && ((isP && mineWon) || (!isP && winner === 'ai'));
    const show = isWinner ? showSlap : showLoser;
    if (!show) return <div style={{height: CARD_DIMS[cardSize].h + 60}}/>;
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
    if (swept && beatOn) return { from: a, to: bo, tick: true, wave: !endsIt, rye: endsIt, instant: fast.beat };
    return { from: b, to: a, tick: ticked, wave: !(endsIt && !sweepBeat), rye: endsIt && !sweepBeat, instant: fb };
  };
  const sp = scoreFor(true), sa = scoreFor(false);
  const scoreRow = (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',
      width:'min(100%, 440px)',padding:'0 6px'}}>
      <ScoreRoll label="OPP" {...sa} mine={false} align="left" sweepDelay={sd('score-a')}/>
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
      <div ref={rootRef} onClick={onTap}
        style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
          padding:'14px 14px clamp(84px,14vh,120px)',cursor:'default'}}>
        <FitBox modeMinW={300}>
          <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',gap:'clamp(12px,2.6vh,22px)'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'clamp(8px,1.6vh,14px)'}}>
              {word.map((row, ri) => (
                <LetterRow key={ri} word={row} size={letterSize} availW={availW}
                  dealAt={dealAt} flipAt={flipAt} instant={fe} rowIndex={ri} pace={pace}/>
              ))}
            </div>
            {!won && (
              <div className="stage-fade" style={{fontFamily:F.display,fontSize:'clamp(22px,4vw,34px)',
                color:DS.ember,letterSpacing:'0.04em',lineHeight:1,
                animation: showFinal ? fadeIn(300, 0, fe) : undefined, opacity: showFinal ? 1 : 0}}>
                Opponent wins.
              </div>
            )}
            {/* The final score keeps the reveal's geometry — OPP on the
                left, YOU on the right, each labelled — rather than a
                winner-first pair the player had to decode. The winner's
                numeral carries the colour. */}
            <div className="stage-fade" style={{display:'flex',flexDirection:'column',alignItems:'center',
              animation: showFinal ? `slideUp ${fe ? 0 : 400}ms ease ${fe ? 0 : scoreDelay}ms both` : undefined,
              opacity: showFinal ? 1 : 0}}>
              <div style={{fontFamily:F.mono,color:DS.slateLight,fontSize:14,letterSpacing:'0.28em',marginBottom:6}}>FINAL SCORE</div>
              <div style={{display:'flex',alignItems:'baseline',gap:'clamp(18px,4vw,40px)'}}>
                {[['OPP', bonus.a, !won], ['YOU', bonus.p, won]].map(([lbl, n, isWinner]) => (
                  <div key={lbl} style={{display:'flex',alignItems:'baseline',gap:10,
                    flexDirection: lbl === 'YOU' ? 'row-reverse' : 'row'}}>
                    <span style={{fontFamily:F.ui,fontSize:15,color:DS.slate,letterSpacing:'0.18em',fontWeight:700}}>{lbl}</span>
                    <span style={{fontFamily:F.display,lineHeight:1,fontSize:'clamp(56px,12vw,116px)',letterSpacing:'0.03em',
                      color: isWinner ? (won ? DS.gold : DS.ember) : DS.frost,
                      textShadow: DROP}}>{n}</span>
                  </div>
                ))}
              </div>
              {/* The margin, both ways. The NEW BEST MARGIN pill that used
                  to sit beside it went on Stan's call (2026-09-14): a
                  rounded, bordered badge with a trophy icon was web-app
                  idiom on a picnic table. stats.js still records the
                  best margin; nothing on this screen shows it. */}
              <div style={{fontFamily:F.mono,fontSize:14,color:DS.slateLight,letterSpacing:'0.14em',marginTop:8}}>
                {won ? `WON BY ${bonus.p - bonus.a}` : `LOST BY ${bonus.a - bonus.p}`}
              </div>
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
          {showFinal ? `${won ? 'You win' : 'Opponent wins'}. Final score: you ${bonus.p}, opponent ${bonus.a}.` : ''}
          {shareState === 'copied' ? ' Copied to the clipboard.' : ''}
          {shareState === 'failed' ? " Couldn't share from here." : ''}
        </div>
      </div>
    );
  }

  const bandOn = sweeping && !R;
  return (
    <div ref={rootRef} onClick={onTap}
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
          <div data-sweep="text" data-sweep-id="title" className={fadeCls}
            style={{...T.title, animation: textAnim('title', fadeIn(200))}}>{title}</div>

          {side('ai')}

          {/* The verdict, and the CLEAN SWEEP beat that replaces it. */}
          <div style={{minHeight: beatOn ? undefined : 'clamp(44px,6vh,56px)',display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',gap:6}}>
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
                        : `letterAppear 0.6s ${cleanSweep ? 'cubic-bezier(.34,1.6,.64,1)' : SETTLE} ${k * 55}ms both`}}>{l}</span>
                  ))}
                </div>
                {/* Names the feat as well as the price: a first-timer meets
                    CLEAN SWEEP here before anything has taught it. */}
                <div data-sweep="text" data-sweep-id="cs-line" className={fadeCls}
                  style={{fontFamily:F.display,fontSize:'clamp(15px,2.6vw,24px)',letterSpacing:'0.14em',
                    color: cleanSweep ? DS.gold : DS.ember,whiteSpace:'nowrap',
                    animation: textAnim('cs-line', fadeIn(260, 520, fast.beat))}}>
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

          {side('player')}

          <div style={{marginTop:'clamp(2px,1vh,8px)',width:'100%',display:'flex',justifyContent:'center'}}>
            {scoreRow}
          </div>
          {/* MATCH POINT, on the stage rather than in the HUD it covers.
              Reads off the post-roll totals, so it appears with the
              point that created it. Colour follows ownership: voltage
              when the threat is yours, ember when hers, frost when both.
              Never gold — gold is a milestone, this is a warning. */}
          {ticked && !endsIt && (sp.to >= MATCH_POINT || sa.to >= MATCH_POINT) && (() => {
            const p = sp.to >= MATCH_POINT, a = sa.to >= MATCH_POINT;
            const tone = p && a ? DS.frost : p ? DS.voltage : DS.ember;
            return (
              <div data-sweep="text" data-sweep-id="match-point" className={fadeCls}
                style={{fontFamily:F.display,fontSize:'clamp(14px,2.4vw,20px)',letterSpacing:'0.18em',
                  color:tone,textShadow:DROP,
                  animation: textAnim('match-point', fadeIn(260, ROLL + 100, fb))}}>
                MATCH POINT{p && a ? ' BOTH WAYS' : ''}
              </div>
            );
          })()}

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {showVerdict ? `${title}: ${tie ? 'tie' : mineWon ? `you win with ${playerHandName}` : `opponent wins with ${aiHandName}`}.` : ''}
            {ticked ? ` Score: you ${sp.to}, opponent ${sa.to}.` : ''}
            {beatOn ? ' Clean sweep: all three hands, plus one bonus point.' : ''}
          </div>
          <div onClick={e => e.stopPropagation()} style={{minHeight:44,display:'flex',alignItems:'center'}}>
            <QuietButton onClick={onTap} buttonRef={quietRef}
              show={atRest && !(endsIt && !sweepBeat)}>Tap to continue</QuietButton>
          </div>
        </div>
      </FitBox>
    </div>
  );
}
