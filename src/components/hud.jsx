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

// ─────────────────────────────────────────────────────────────
// RoundProgressIndicator — slim horizontal three-step strip
// ─────────────────────────────────────────────────────────────
export function RoundProgressIndicator({ phase, compact=false }) {
  const h1=['player-turn-1a','ai-turn-1a','player-turn-1b','ai-turn-1b','signal-ai','signal-player','reveal-1','replenish'];
  const h2=['player-turn-2a','ai-turn-2a','player-turn-2b','ai-turn-2b','signal-ai-2','signal-player-2','reveal-2'];
  const sc=['scraps-reveal','round-end'];
  // Point values used to ride in the label (1PT / 1PT / 2PTS). Dropped
  // 2026-09-13 at Stan's request: the strip's job is WHERE YOU ARE in
  // the round, and the stakes are stated in the storyboard and again on
  // every reveal. Three extra mono numerals on the one piece of chrome
  // that is on screen all game bought nothing a player did not already
  // know by their second round.
  const steps=[
    {label:'HAND 1',active:h1.includes(phase),done:h2.includes(phase)||sc.includes(phase)},
    {label:'HAND 2',active:h2.includes(phase),done:sc.includes(phase)},
    {label:'SCRAPS',active:sc.includes(phase),done:false},
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
        // 60 -> 44 (34 -> 26 compact). The score was the loudest
        // object on the table and changes maybe six times a game,
        // while the hand and the trade action matter every turn. It
        // is still the biggest number in its bar; it just stopped
        // outranking the thing you are actually doing. Also gives
        // ~16px of height per bar back to the table.
        fontFamily:F.display,fontSize:compact?26:44,color,lineHeight:0.9,
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
            letterSpacing:'0.12em',whiteSpace:'nowrap'}}>FIRST TO {WIN_SCORE}</span>
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
// MatchPointBanner — someone is one scoring event from the game.
//
// This used to be NearWinBanner, and it said "you've hit 10, win by
// 2". Dropping the win-by-2 clause on 2026-09-13 made that state
// unreachable: the game now ends the instant a score touches
// WIN_SCORE, so a banner about play CONTINUING past it could never
// render again. The tension beat it existed for is real, so it moved
// two points earlier instead of being deleted.
//
// MATCH_POINT is WIN_SCORE - 2, because 2 is what the Scraps hand
// pays and the smallest hand that can end a game from here. A player
// on 8 can be beaten in one reveal; a player on 7 cannot.
//
// Colour follows ownership, the same rule as everything else on this
// table: voltage when the threat is yours, ember when it is hers,
// frost when it belongs to both of you. Never gold — gold is a
// milestone token, and this is a warning.
// ─────────────────────────────────────────────────────────────
const MATCH_POINT = WIN_SCORE - 2;

export function NearWinBanner({ playerScore, aiScore }) {
  const playerUp = playerScore >= MATCH_POINT;
  const aiUp = aiScore >= MATCH_POINT;
  if(!playerUp && !aiUp) return null;
  let msg, tone;
  if(playerUp && aiUp) {
    msg = `Match point both ways. The next hand can end it.`;
    tone = DS.frost;
  } else if(playerUp) {
    msg = `Match point. One hand takes you to ${WIN_SCORE}.`;
    tone = DS.voltage;
  } else {
    msg = `Match point to her. One hand and it's over.`;
    tone = DS.ember;
  }
  return (
    <div style={{padding:'5px 16px',background:tone+'22',
      border:`1px solid ${tone}66`,textAlign:'center',
      fontFamily:F.ui,fontSize:13,color:tone,fontWeight:700,
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

// SignalLegalityStrip used to live here: five mono pills naming the
// legal signal shapes (1 ANY CARD, 2 PAIR, 3 TRIPS, 4 2 PAIR / QUADS,
// 5 STRAIGHT+), struck through wherever the live hand could not make
// one. It existed because a first-timer who selected two unmatched
// cards got a disabled button and no reason.
//
// Removed 2026-09-13 (Stan). The button answers that question itself
// now: SELECT HAND is inert until the selection is legal and then
// becomes the hand's own name — A THREE, TWO PAIR, FULL HOUSE — which
// is the same information about the hand the player actually has, in
// the place they are already looking, and one object instead of six.
// engine.getValidSignals is still exported and still has the AI as a
// caller; it simply has no UI one again.

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
