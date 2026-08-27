// ============================================================
// SCRAPS — HUD: score corners, round progress strip, banners, log
//
// Design-pass notes (July 4):
//  • The redundant round pill in the top bar is gone. Round
//    state lives in ONE place: a slim horizontal strip that
//    sits above the opponent's Scraps.
//  • The strip is informational, so it speaks slate/frost —
//    voltage is reserved for "yours / act now."
//  • The difficulty label rides in the header so screenshots
//    brag for you.
//  • Log text bumped to legible sizes in the lighter slate.
// ============================================================
import { useEffect, useRef } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { IconCheck } from "./icons.jsx";
import { getValidSignals } from "../game/engine.js";

// ─────────────────────────────────────────────────────────────
// RoundProgressIndicator — slim horizontal three-step strip
// ─────────────────────────────────────────────────────────────
export function RoundProgressIndicator({ phase, compact=false }) {
  const h1=['player-turn-1a','ai-turn-1a','player-turn-1b','ai-turn-1b','signal-ai','signal-player','reveal-1','replenish'];
  const h2=['player-turn-2a','ai-turn-2a','player-turn-2b','ai-turn-2b','signal-ai-2','signal-player-2','reveal-2'];
  const sc=['scraps-reveal','round-end'];
  // Point values ride in the label. This strip is the one piece
  // of chrome a player looks at all game, and it was the only
  // place naming the three hands without naming the stakes.
  const steps=[
    {label:'HAND 1',pts:'1PT',active:h1.includes(phase),done:h2.includes(phase)||sc.includes(phase)},
    {label:'HAND 2',pts:'1PT',active:h2.includes(phase),done:sc.includes(phase)},
    {label:'SCRAPS',pts:'2PTS',active:sc.includes(phase),done:false},
  ];
  return (
    <div style={{display:'flex',alignItems:'center',gap:3,
      background:DS.duskMid,border:`1px solid ${DS.slate}33`,
      borderRadius:10,padding:compact?'2px 4px':'4px 6px',maxWidth:'100%'}}>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:compact?4:5,
          padding:compact?'2px 5px':'3px 7px',borderRadius:8,whiteSpace:'nowrap',
          background:s.active?DS.frost+'0e':'transparent',
          border:`1px solid ${s.active?DS.slateLight+'88':DS.slate+'22'}`,
          transition:'all 0.3s'}}>
          <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
            background:s.active?DS.frost:s.done?DS.slate:DS.slate+'33',
            boxShadow:s.active?`0 0 8px ${DS.frost}88`:'none',
            transition:'all 0.3s'}}/>
          <span style={{fontFamily:F.ui,fontSize:compact?12:13,fontWeight:700,
            color:s.active?DS.frost:s.done?DS.slate:DS.slate+'55',
            letterSpacing:'0.04em',transition:'color 0.3s'}}>{s.label}</span>
          <span style={{fontFamily:F.mono,fontSize:10,fontWeight:700,
            color:s.active?DS.slateLight:DS.slate+'55',
            letterSpacing:'0.02em',transition:'color 0.3s'}}>{s.pts}</span>
          {s.done&&<IconCheck size={12} color={DS.slate}/>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Score bars — the table is split by ownership, top and bottom.
//
// Everything the OPPONENT has is on top: their score, their hand,
// their Scraps. Everything YOU have is on the bottom: your score,
// your hand, your Scraps. The scores used to face each other
// across the top bar, which put half your own information at the
// far end of the table from the rest of it.
//
// The match conditions (FIRST TO N, difficulty) sit at the right
// edge rather than the middle: they are reference, not action, so
// they stay out of the centre line where the narrator speaks.
//
// Both bars are `position:relative` with a z-index above the
// table, and a score lifts higher still while it animates. The
// round-end pop scales to 1.9x, which overflows the bar it lives
// in; without this it was painted over by the table beneath and
// the biggest moment in a round was clipped in half.
// ─────────────────────────────────────────────────────────────
const BAR = {
  display:'flex', alignItems:'center', justifyContent:'space-between',
  gap:16, background:DS.dusk, flexShrink:0,
  position:'relative', zIndex:40,
};

function Score({ label, value, color, flash, pulse, align, compact=false }) {
  return (
    <div style={{display:'flex',alignItems:'baseline',gap:compact?7:10,lineHeight:1,
      flexShrink:0,whiteSpace:'nowrap',
      flexDirection:align==='right'?'row-reverse':'row'}}>
      <span style={{fontFamily:F.ui,fontSize:compact?13:17,color:DS.slate,
        letterSpacing:'0.18em',fontWeight:700}}>{label}</span>
      <span style={{
        fontFamily:F.display,fontWeight:700,fontSize:compact?34:60,color,lineHeight:0.9,
        animation:pulse?'roundEndScorePop 1.4s cubic-bezier(.34,1.4,.64,1)'
          :flash?'scorePop 0.5s cubic-bezier(.34,1.8,.64,1)':undefined,
        textShadow:pulse?'0 0 30px currentColor':'none',
        transformOrigin:align==='right'?'right center':'left center',
        // Lifted above both bars and the table only while it moves,
        // so the pop is never clipped by what sits in front of it.
        position:'relative', zIndex:(pulse||flash)?70:1,
        display:'inline-block',
      }}>{value}</span>
    </div>
  );
}

// Top bar — the opponent's score, and the match conditions.
export function OpponentBar({ aiScore, aiFlash, roundEndPulse, difficultyLabel, compact=false }) {
  return (
    <div style={{...BAR, padding:compact?'3px 12px':'6px 22px', gap:compact?8:16,
      borderBottom:`1px solid ${DS.slate}22`}}>
      <Score label="OPP" value={aiScore} color={DS.ember}
        flash={aiFlash} pulse={roundEndPulse} align="left" compact={compact}/>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        {/* The match condition is reference, not action. Stacked, it
            is the first thing to go: the rules panel still carries
            it, and the row it frees goes to the table. */}
        {!compact&&(
          <span style={{fontFamily:F.mono,fontSize:12,color:DS.slate+'88',
            letterSpacing:'0.12em',whiteSpace:'nowrap'}}>FIRST TO {WIN_SCORE} · WIN BY 2</span>
        )}
        {difficultyLabel&&(
          <span style={{fontFamily:F.mono,fontSize:compact?11:13,fontWeight:700,color:DS.slate,
            letterSpacing:'0.18em',background:DS.duskMid,borderRadius:20,
            padding:compact?'2px 10px':'3px 14px',border:`1px solid ${DS.slate}44`,whiteSpace:'nowrap'}}>
            {difficultyLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Bottom bar — the log on the left, your score in the corner.
export function PlayerBar({ playerScore, playerFlash, roundEndPulse, children, compact=false }) {
  return (
    <div style={{...BAR, padding:compact?'2px 10px':'4px 22px 6px',
      gap:compact?8:16, borderTop:`1px solid ${DS.slate}22`}}>
      <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:compact?6:12}}>{children}</div>
      <Score label="YOU" value={playerScore} color={DS.voltage}
        flash={playerFlash} pulse={roundEndPulse} align="right" compact={compact}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NearWinBanner — shown when someone hits WIN_SCORE but needs +2
// ─────────────────────────────────────────────────────────────
export function NearWinBanner({ playerScore, aiScore }) {
  const bothOver = playerScore >= WIN_SCORE && aiScore >= WIN_SCORE;
  const playerOver = playerScore >= WIN_SCORE && aiScore < WIN_SCORE;
  const aiOver = aiScore >= WIN_SCORE && playerScore < WIN_SCORE;
  if(!bothOver && !playerOver && !aiOver) return null;
  let msg;
  if(bothOver) msg=`Both players are at ${WIN_SCORE}+. Win by 2 — keep playing!`;
  else if(playerOver) msg=`You've hit ${WIN_SCORE}! Win by 2 to claim victory.`;
  else msg=`Opponent hit ${WIN_SCORE}. Win by 2 — no letting up!`;
  return (
    <div style={{padding:'5px 16px',background:DS.voltage+'22',
      border:`1px solid ${DS.voltage}66`,textAlign:'center',
      fontFamily:F.ui,fontSize:13,color:DS.voltage,fontWeight:700,
      letterSpacing:'0.06em',flexShrink:0,lineHeight:1.3}}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GameLog — full round-by-round history, opened by tapping the
// bottom bar. Auto-scrolls to the newest line. The log is the
// only record of what the opponent just did — it earns legible
// sizes in the lighter slate.
// ─────────────────────────────────────────────────────────────
export function GameLog({ messages }) {
  const ref=useRef();
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[messages]);
  return (
    <div ref={ref} style={{maxHeight:'min(280px, 40vh)',overflowY:'auto',background:DS.dusk,
      borderTop:`1px solid ${DS.slate}44`,padding:'10px 20px'}}>
      <div style={{fontFamily:F.mono,fontSize:12,color:DS.slate,
        letterSpacing:'0.14em',marginBottom:6}}>GAME LOG</div>
      {messages.map((m,i,arr)=>(
        <div key={i} style={{fontFamily:F.mono,fontSize:15,lineHeight:1.6,
          color:i===arr.length-1?DS.frost:DS.slateLight,
          fontWeight:i===arr.length-1?700:400}}>{m}</div>
      ))}
      {messages.length===0&&(
        <div style={{fontFamily:F.mono,fontSize:14,color:DS.slate}}>No log entries yet.</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SignalLegalityStrip — what a small hand is allowed to be.
//
// A signal is not "any cards you like": engine.isValidSignal
// accepts one exact shape per count (1 anything, 2 a pair, 3
// trips, 4 two pair or quads, 5 a straight or better). Nothing
// on the table ever said so, so a first-timer selecting two
// unmatched cards got a disabled button and no reason.
//
// engine.getValidSignals already computes this set against the
// live hand and had no UI caller until now. Options the hand
// cannot make are struck through, so the strip doubles as the
// explanation for why SIGNAL is disabled.
// ─────────────────────────────────────────────────────────────
const SIGNAL_SHAPES = [
  { n:1, name:'ANY CARD' },
  { n:2, name:'PAIR' },
  { n:3, name:'TRIPS' },
  { n:4, name:'2 PAIR / QUADS' },
  { n:5, name:'STRAIGHT+' },
];

// ─────────────────────────────────────────────────────────────
// GameAnnouncer — the game, spoken.
//
// Everything this table says, it said in colour and position: whose
// turn it is, that a score moved, that an Ace just took two of your
// cards. A player using a screen reader could reach every control
// (Session 8 and the splash-identity pass saw to that) and still have
// no idea what had happened after pressing one.
//
// Two regions, not one, and that is the point. The log answers "what
// just happened" and the hint answers "what do I do now"; sharing a
// single region would mean each new event cancelled the instruction
// mid-sentence. Both are `polite`, so neither interrupts the player.
//
// `aria-atomic` makes the whole region re-read on change rather than
// just the changed words — these are one-sentence regions, so the
// alternative is a screen reader reading a diff aloud.
//
// Known limit, deliberately accepted: during the opponent's turn the
// reducer can append two or three log lines inside a few hundred ms,
// and a polite region announces the value it finds when it gets to it,
// not every value it passed through. The full history is in the log
// panel. Queueing every line instead would put the narration further
// and further behind the board it is describing.
// ─────────────────────────────────────────────────────────────
export function GameAnnouncer({ messages, hint }) {
  const latest = messages.length ? messages[messages.length - 1] : '';
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {latest}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {hint}
      </div>
    </>
  );
}

export function SignalLegalityStrip({ hand, selectedCount=0, compact=false }) {
  const valid = new Set(getValidSignals(hand));
  return (
    <div style={{display:'flex',alignItems:'center',gap:compact?4:6,flexWrap:'wrap',
      justifyContent:'center',background:DS.duskMid,
      border:`1px solid ${DS.slate}33`,borderRadius:10,padding:compact?'4px 7px':'6px 10px'}}>
      <span style={{fontFamily:F.mono,fontSize:11,color:DS.slate,
        letterSpacing:'0.14em',marginRight:2}}>PLAYABLE</span>
      {SIGNAL_SHAPES.map(sh=>{
        const ok=valid.has(sh.n);
        const on=ok&&selectedCount===sh.n;
        return (
          <span key={sh.n} style={{
            fontFamily:F.mono,fontSize:compact?11:12,fontWeight:700,letterSpacing:'0.06em',
            padding:compact?'2px 6px':'3px 8px',borderRadius:6,whiteSpace:'nowrap',
            color:on?DS.ink:ok?DS.voltage:DS.slate+'66',
            background:on?DS.voltage:ok?DS.voltage+'18':'transparent',
            border:`1px solid ${on?DS.voltage:ok?DS.voltage+'55':DS.slate+'22'}`,
            textDecoration:ok?'none':'line-through',
            transition:'all 0.2s'}}>
            {sh.n} {sh.name}
          </span>
        );
      })}
    </div>
  );
}
