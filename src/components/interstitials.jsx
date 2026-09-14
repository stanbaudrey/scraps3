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
// modal in overlays.jsx uses.
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
import { DS, F } from "../styles/theme.js";
import { PlayingCard, CARD_DIMS } from "./cards.jsx";
import { TableSurface } from "./backdrop.jsx";
import { FitBox, useViewport } from "../ui/viewport.jsx";
import { useDialogFocus, SETTLE } from "./overlays.jsx";
import { Btn } from "./buttons.jsx";
import { IconTrophy } from "./icons.jsx";
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
// ~0.88s, one riffle pass to ~1.26s, advance at 1.35s.
const SIGN = { stagger: 55, riffleAt: 800, riffleStagger: 25, riffle: 380, lineAt: 650, advance: 1350 };
const SWEEP_EASE = 'cubic-bezier(.5,0,.9,.6)';

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
  const label = stage.kind === 'sign' ? `Round ${stage.roundNum}`
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
        ? <RoundSign key={`sign-${stage.roundNum}`} roundNum={stage.roundNum} onDone={onSignDone} R={R} instant={instant}/>
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
function QuietButton({ onClick, children, show = true, style = {} }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }}
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
// Under 1.5s from the first letter moving to the next screen.
// ─────────────────────────────────────────────────────────────
function RoundSign({ roundNum, onDone, R, instant }) {
  const letters = `ROUND ${roundNum}`.split('');
  const { at, clear } = useTimeline(1);
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clear();
    onDone();
  }, [clear, onDone]);
  useEffect(() => {
    if (!instant) playRoundSign();
    if (!instant) at(SIGN.advance, finish);
  }, []);
  const stop = R || instant;
  return (
    <div onClick={finish}
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
      </div>
      <div style={{position:'absolute',bottom:'clamp(8px,3vh,28px)'}}>
        <QuietButton onClick={finish} style={{opacity:.55}}>Skip</QuietButton>
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
          textShadow: rye ? `0 0 26px ${glow}88, 0 3px 0 rgba(0,0,0,.4)` : undefined}}>
          {tick ? to : from}
        </span>
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
function LetterRow({ word, size, availW, dealAt, flipAt, instant, rowIndex = 0 }) {
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
        const dealDelay = instant ? 0 : dealAt + k * DEAL.stagger;
        const flipDelay = instant ? 0 : flipAt + k * FLIP.stagger;
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
                <PlayingCard card={{ id:`letter-${k}`, rank:ch }} rankScale={0.84} size={size} liftTransform={false}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const T = {
  title: {fontFamily:F.display,color:DS.slateLight,letterSpacing:'0.12em',fontSize:'clamp(20px,3.4vw,28px)',lineHeight:1},
  side:  {fontFamily:F.ui,fontSize:15,color:DS.slate,letterSpacing:'0.18em',fontWeight:700,lineHeight:1},
  hand:  {fontFamily:F.display,fontSize:'clamp(20px,3.2vw,26px)',letterSpacing:'0.06em',lineHeight:1.1},
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
const STEPS = ['open','loser','slap','winlabel','verdict','tick','rest',
               'cleanSweep','sweep','deal','flip','final'];
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
        at(slapAt + i * SLAP.stagger + SLAP.land, () => { shake(2); playSlap(); });
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
    if (step !== 'cleanSweep') return;
    if (!fast.beat) playCleanSweep();
    // Title in (letters at 55ms), bonus line, the bonus point rolls
    // in, a hold — then the sweep. If the match ends here the roll
    // is the Rye jump and the hold covers it.
    if (endsIt) at(fast.beat ? 0 : 1100, cueEnd);
    at(fast.beat ? 0 : (endsIt ? 2600 : 2100), runSweep);
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
  const lastK = (word.length - 1) * 10 + word[word.length - 1].length - 1;
  const dealAt = 0;
  const dealEnd = dealAt + lastK * DEAL.stagger + DEAL.dur;
  const flipAt = dealEnd + 160;
  const flipEnd = flipAt + lastK * FLIP.stagger + FLIP.dur;
  useEffect(() => {
    if (step !== 'deal') return;
    if (fast.end) { setStep('final'); return; }
    word.forEach((row, ri) => row.split('').forEach((ch, i) => {
      if (ch === ' ') return;
      const kk = ri * 10 + i;
      if (!R) at(dealAt + kk * DEAL.stagger + DEAL.dur - 40, playDraw);
      if (!R) at(flipAt + kk * FLIP.stagger + FLIP.dur * 0.55, playSelect);
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
      if (endsIt) return;                 // already running on by itself
      if (isScraps) { runSweep(); return; }
      onContinue();
      return;
    }
    if (s === 'cleanSweep') {
      // Skip the beat's hold, not the beat: the bonus point is
      // already on screen, so this goes straight to the sweep.
      clear();
      setFast(f => ({ ...f, beat: true }));
      if (endsIt) cueEnd();
      runSweep();
      return;
    }
    if (s === 'sweep' || s === 'deal' || s === 'flip') {
      if (!endsIt) return;                // the round's sweep is 1.7s and hands off itself
      clear();
      setFast(f => ({ ...f, end: true }));
      setStep('final');
    }
  }, [clear, cueOutcome, sweepBeat, endsIt, isScraps, runSweep, onContinue, cueEnd]);

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
      setTimeout(() => setShareState('idle'), 2200);
    } else setShareState('idle');
  }, [shareState, mineWon, bonus.p, bonus.a, difficulty]);

  // ── Render ─────────────────────────────────────────────────
  const i = idx(step);
  const showLoser   = i >= idx('loser');
  const showSlap    = i >= idx('slap');
  const showWinLbl  = i >= idx('winlabel') || tie;
  const showVerdict = i >= idx('verdict');
  const ticked      = i >= idx('tick') && !tie;
  const atRest      = step === 'rest';
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
    const hidden = isWinner && !showWinLbl;
    const label = (
      <div data-sweep="text" data-sweep-id={`lbl-${who}`} className={fadeCls}
        style={{...T.side, opacity: hidden ? 0 : 1,
          animation: textAnim(`lbl-${who}`, hidden ? undefined : fadeIn(240))}}>
        {isP ? 'YOU' : 'OPPONENT'}
      </div>
    );
    const name = (
      <div data-sweep="text" data-sweep-id={`name-${who}`} className={fadeCls}
        style={{...T.hand, color: isWinner ? (isP ? DS.voltage : DS.ember) : DS.slate,
          opacity: hidden ? 0 : 1,
          animation: textAnim(`name-${who}`, hidden ? undefined : fadeIn(240, 60))}}>
        {isP ? playerHandName : aiHandName}
      </div>
    );
    const row = (
      <CardRow cards={cards} size={cardSize} isScrap={isScraps} kraft={!isP && isScraps}
        bestIds={isP ? playerBestIds : aiBestIds}
        slap={isWinner} slapAt={0} availW={availW} instant={fb}
        sweepDelays={sweeping ? sweepDelays : null}/>
    );
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
        {isP ? <>{row}{name}{label}</> : <>{label}{row}{name}</>}
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
    const total = `${won ? bonus.p : bonus.a}–${won ? bonus.a : bonus.p}`;
    return (
      <div ref={rootRef} onClick={onTap}
        style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',padding:14,cursor:'default'}}>
        <FitBox modeMinW={300}>
          <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',gap:'clamp(12px,2.6vh,22px)'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'clamp(8px,1.6vh,14px)'}}>
              {word.map((row, ri) => (
                <LetterRow key={ri} word={row} size={letterSize} availW={availW}
                  dealAt={dealAt} flipAt={flipAt} instant={fe} rowIndex={ri}/>
              ))}
            </div>
            {!won && (
              <div className="stage-fade" style={{fontFamily:F.display,fontSize:'clamp(22px,4vw,34px)',
                color:DS.ember,letterSpacing:'0.04em',lineHeight:1,
                animation: showFinal ? fadeIn(300, 0, fe) : undefined, opacity: showFinal ? 1 : 0}}>
                Opponent wins.
              </div>
            )}
            <div className="stage-fade" style={{display:'flex',flexDirection:'column',alignItems:'center',
              animation: showFinal ? `slideUp ${fe ? 0 : 400}ms ease ${fe ? 0 : 120}ms both` : undefined,
              opacity: showFinal ? 1 : 0}}>
              <div style={{fontFamily:F.mono,color:DS.slateLight,fontSize:14,letterSpacing:'0.28em',marginBottom:4}}>FINAL SCORE</div>
              <div style={{fontFamily:F.display,color: won ? DS.gold : DS.frost,lineHeight:1,
                fontSize:'clamp(64px,14vw,132px)',letterSpacing:'0.03em',
                textShadow: won ? `0 0 40px ${DS.gold}88` : '0 0 30px rgba(237,227,208,.2)'}}>{total}</div>
              {won && winStats && winStats.margin != null && (
                <div style={{display:'flex',alignItems:'center',gap:14,marginTop:8}}>
                  <span style={{fontFamily:F.mono,fontSize:14,color:DS.slateLight,letterSpacing:'0.14em'}}>WON BY {winStats.margin}</span>
                  {winStats.isNewRecord ? (
                    <span style={{display:'inline-flex',alignItems:'center',gap:8,fontFamily:F.mono,fontSize:14,
                      fontWeight:700,color:DS.gold,letterSpacing:'0.14em',background:DS.gold+'18',
                      border:`1px solid ${DS.gold}88`,borderRadius:20,padding:'4px 14px'}}>
                      <IconTrophy size={15}/> NEW BEST MARGIN
                    </span>
                  ) : winStats.bestMargin > 0 && (
                    <span style={{fontFamily:F.mono,fontSize:14,color:DS.slate,letterSpacing:'0.14em'}}>BEST {winStats.bestMargin}</span>
                  )}
                </div>
              )}
            </div>
            <div className="stage-fade" onClick={e => e.stopPropagation()}
              style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',
                animation: showFinal ? `slideUp ${fe ? 0 : 400}ms ease ${fe ? 0 : 340}ms both` : undefined,
                opacity: showFinal ? 1 : 0, pointerEvents: showFinal ? 'auto' : 'none'}}>
              <Btn variant={won ? 'gold' : 'primary'} onClick={onNewGame}>New Game</Btn>
              <Btn variant="ghost" onClick={doShare} disabled={shareState === 'busy'}>
                {shareState === 'copied' ? 'Copied' : 'Share'}
              </Btn>
            </div>
            <div className="sr-only" role="status" aria-live="polite">
              {showFinal ? `${won ? 'You win' : 'Opponent wins'}. Final score ${total}.` : ''}
              {shareState === 'copied' ? ' Copied to the clipboard.' : ''}
              {shareState === 'failed' ? ' Sharing is not available here.' : ''}
            </div>
          </div>
        </FitBox>
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
                    textShadow:`0 0 30px ${cleanSweep ? DS.gold : DS.ember}66, 0 3px 0 rgba(0,0,0,.4)`,whiteSpace:'pre',
                    animation: textAnim('cs-title', undefined)}}>
                  {'CLEAN SWEEP'.split('').map((l, k) => (
                    <span key={k} aria-hidden="true" style={{display:'inline-block',
                      animation: sd('cs-title') != null || fast.beat ? undefined
                        : `letterAppear 0.6s cubic-bezier(.34,1.6,.64,1) ${k * 55}ms both`}}>{l}</span>
                  ))}
                </div>
                <div data-sweep="text" data-sweep-id="cs-line" className={fadeCls}
                  style={{fontFamily:F.display,fontSize:'clamp(16px,2.8vw,24px)',letterSpacing:'0.16em',
                    color: cleanSweep ? DS.gold : DS.ember,
                    animation: textAnim('cs-line', fadeIn(260, 520, fast.beat))}}>
                  +1 BONUS POINT
                </div>
              </>
            ) : showVerdict && (
              <div data-sweep="text" data-sweep-id="verdict" className={fadeCls}
                style={{fontFamily:F.display,fontSize:'clamp(34px,7vw,56px)',letterSpacing:'0.04em',lineHeight:1,
                  color:verdictColor,textShadow:`0 0 24px ${verdictColor}55, 0 2px 0 rgba(0,0,0,.4)`,
                  animation: textAnim('verdict', `popIn ${fb ? 0 : 400}ms ${mineWon ? OVER : SETTLE} both`)}}>
                {verdictText}
              </div>
            )}
          </div>

          {side('player')}

          <div style={{marginTop:'clamp(2px,1vh,8px)',width:'100%',display:'flex',justifyContent:'center'}}>
            {scoreRow}
          </div>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {showVerdict ? `${title}: ${tie ? 'tie' : mineWon ? `you win with ${playerHandName}` : `opponent wins with ${aiHandName}`}.` : ''}
            {beatOn ? ' Clean sweep, plus one bonus point.' : ''}
          </div>
          <div onClick={e => e.stopPropagation()} style={{minHeight:44,display:'flex',alignItems:'center'}}>
            <QuietButton onClick={onTap} show={atRest && !(endsIt && !sweepBeat)}>Tap to continue</QuietButton>
          </div>
        </div>
      </FitBox>
    </div>
  );
}
