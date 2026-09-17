// ============================================================
// SCRAPS — Overlays: the modals, and the Shell they share
//
// The round card, the hand reveal, the Clean Sweep lightbox and the
// win and lose screens lived here until 2026-09-14. They were dusk
// scrims over a hidden table; every one of those moments now plays
// ON the table, in src/components/interstitials.jsx. What is left
// here is the set of modals that ask a question — Ace counter, Ace
// drawn, opponent's Ace, skip turn, quit — plus the rules panel.
// ============================================================
import { useEffect, useRef } from "react";
import { DS, F } from "../styles/theme.js";
import { Btn, AceTag, MODAL_BTN_MIN } from "./buttons.jsx";
import { PlayingCard, cardLabel } from "./cards.jsx";
import { FitBox } from "../ui/viewport.jsx";
import { useViewport } from "../ui/viewport.jsx";
import { IconBolt } from "./icons.jsx";

// ─────────────────────────────────────────────────────────────
// Shell — the frame every full-screen overlay in this file
// shares, and the one place the "never scrolls" rule is applied
// to them.
//
// The six modals below were all the same thing written six
// times: a fixed backdrop, centred, with 24px of padding around
// a max-width card. Centring alone is fine until the card is
// taller than the screen — then half of it is above the top
// edge, unreachable, and on a 375x667 phone that was true of the
// Ace lightbox and the rules panel both.
//
// A column flex parent gives FitBox a definite height to measure
// against (an `align-items:center` row does not — the box would
// be exactly as tall as its content and always "fit"), and
// FitBox scales anything that still comes up too tall.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// useDialogFocus — the keyboard half of a modal.
//
// Every overlay in this file already trapped a POINTER: a fixed
// backdrop covers the table, so nothing behind it can be clicked.
// Focus was never trapped to match. Tab from inside the Ace counter
// modal walked straight out into the hand underneath it — cards that
// are role="button" and reachable — so a keyboard player could tab
// onto controls the modal exists to block, with no way to tell they
// had left the dialog.
//
// Three things, all of them standard and none of them optional:
// move focus in on open, keep Tab inside while it is up, and put
// focus back where it came from on close. The last one is the one
// that gets skipped and the one people notice: without it, dismissing
// a modal drops focus to the top of the document.
// ─────────────────────────────────────────────────────────────
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(active) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const restoreTo = document.activeElement;
    const list = () => Array.from(node.querySelectorAll(FOCUSABLE));
    const first = list()[0];
    (first || node).focus();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const f = list();
      if (!f.length) { e.preventDefault(); node.focus(); return; }
      const at = f.indexOf(document.activeElement);
      if (e.shiftKey && at <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (restoreTo && typeof restoreTo.focus === 'function') restoreTo.focus();
    };
  }, [active]);
  return ref;
}

function Shell({ children, zIndex, background, onClick, pad = 16, style = {},
  dialogLabel = null }) {
  // `dialogLabel` is opt-in, because not every user of this Shell was
  // a dialog: the old round card was a 2-second flash nobody could act
  // on, and announcing it as a modal would have been a lie and a
  // nuisance. Every remaining user asks a question and passes one; the
  // opt-in stays because the reason it existed still holds.
  const dialogRef = useDialogFocus(!!dialogLabel);
  return (
    <div onClick={onClick}
      ref={dialogLabel ? dialogRef : undefined}
      {...(dialogLabel ? { role:'dialog', 'aria-modal':true, 'aria-label':dialogLabel, tabIndex:-1 } : {})}
      style={{position:'fixed',inset:0,zIndex,background,
      display:'flex',flexDirection:'column',padding:pad,...style,
      ...(dialogLabel ? { outline:'none' } : {})}}>
      <FitBox modeMinW={300}>
        <div style={{flex:'1 0 auto',display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center'}}>
          {children}
        </div>
      </FitBox>
    </div>
  );
}

// Easing for overlays that deliver BAD news. The rest of this file
// arrives on cubic-bezier(.34,1.6,.64,1) — an overshoot, which is the
// right feel for a Clean Sweep or a win and the wrong one for "the
// opponent just took two of your cards." That mismatch is the
// bounce-easing finding the static detector kept raising and Session 1's
// critique flagged as a P1: celebratory motion attached to a loss.
// SETTLE is ease-out-quint. Same duration, same distance, no rebound.
export const SETTLE = 'cubic-bezier(.22,1,.36,1)';

// Card padding shrinks with the viewport: 32px of inset around a
// modal is a third of a phone's width.
const CARD_PAD = 'clamp(18px,5vw,32px)';

// RoundInterstitial, RevealOverlay, CleanSweepLightbox, WinScreen and
// LoseScreen sat here until 2026-09-14 — see the header, and
// interstitials.jsx for what replaced them. Recoverable from git at
// the commit before this one.

// ─────────────────────────────────────────────────────────────
// AceDrawnLightbox — first-time-per-game tip, shown the moment an
// Ace lands in the player's hand.
//
// The Play Ace control here is an ILLUSTRATION, not a control: it
// shows the player exactly what they are about to see on the
// table — a green tag sitting on top of an Ace, leaning with it —
// so the real one is recognised on sight rather than discovered.
// It shares one wiggle wrapper with the card for that reason; two
// separate animations would drift apart and break the pairing.
// The only thing to press is OKAY, at the bottom.
// ─────────────────────────────────────────────────────────────
export function AceDrawnLightbox({ ace, onDismiss }) {
  // A short screen (a landscape phone) cannot hold the illustration AND
  // the explanation. The Shell's FitBox would otherwise scale the whole
  // box to ~0.48 to make it fit, which drags the OK button down to 26px
  // — a third of the touch floor. Dropping the decorative card is the
  // cheaper loss than an unpressable button: the words are the point
  // here, and the real Ace is sitting in the hand behind this box.
  const { w, h } = useViewport();
  const roomy = h >= 560;
  // Short screens have no vertical room for the illustration ABOVE the
  // copy, but a short WIDE one has plenty beside it. So the box turns
  // on its side rather than dropping the Ace: illustration left, words
  // right. Only a screen that is short AND narrow loses it, because
  // there the words are the point and an unpressable button is the
  // worse trade.
  const side = !roomy && w >= 620;
  const illo = (
    <div className="live-cue-card"
      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,flexShrink:0,
      animation:'cardWiggle 0.5s ease-in-out infinite alternate'}}>
      <AceTag live={false} width={side ? 92 : 104}/>
      {ace && <PlayingCard card={ace} size={side ? 'small' : 'normal'} liftTransform={false}/>}
    </div>
  );
  return (
    <Shell zIndex={95} background="rgba(20,31,25,.92)" dialogLabel="You drew an Ace">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.gold}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:side?700:480,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.gold}66`,animation:'popIn 0.35s cubic-bezier(.34,1.6,.64,1)'}}>
        <div style={{fontFamily:F.display,fontSize:side?26:32,color:DS.gold,
          letterSpacing:'0.06em',marginBottom:roomy?16:10}}>You've drawn an Ace!</div>
        {/* ROW only when the box has turned on its side. It was a row
            unconditionally, which put the illustration next to the copy
            with a zero gap on a normal desktop and let the Ace's wobble
            run into the text. */}
        <div style={{display:'flex',flexDirection:side?'row':'column',
          alignItems:'center',gap:side?34:0,
          justifyContent:'center',textAlign:side?'left':'center'}}>
          {(roomy || side) && (
            side ? illo : <div style={{display:'flex',justifyContent:'center',marginBottom:18}}>{illo}</div>
          )}
          <div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:roomy?18:15,lineHeight:1.5,marginBottom:10}}>
          You can play your Ace like normal, or use it to{' '}
          <strong style={{color:DS.frost}}>attack</strong> your opponent and
          discard two cards from her Scraps.
        </p>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:roomy?18:15,lineHeight:1.5,marginBottom:10}}>
          If she also has an Ace, she can &ldquo;counter,&rdquo; causing
          both Aces to be discarded and your turn to end.
        </p>
          </div>
        </div>

        <button onClick={onDismiss} style={{
          // Voltage, not gold (Stan, 2026-09-14): every filled button in
          // the game is green now, so the one colour means "push this".
          // The box's gold frame stays — drawing an Ace is a milestone,
          // the button is not.
          background:DS.voltage,color:DS.ink,border:'none',
          padding:'16px 44px',borderRadius:10,cursor:'pointer',
          fontFamily:F.ui,fontWeight:700,fontSize:18,
          letterSpacing:'0.1em',textTransform:'uppercase',
          boxShadow:`0 0 24px ${DS.voltage}88`,
          // Declares more than the 44px floor, for the reason
          // MODAL_BTN_MIN records. Measured at rest 2026-09-14: it
          // renders the full 54 at all six QA viewports, because Shell
          // does not in fact scale this modal on any of them.
          minHeight:MODAL_BTN_MIN, marginTop:12,
        }}>
          Okay
        </button>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// AceCounterModal — prompt player to counter opponent's ace
// ─────────────────────────────────────────────────────────────
// `afterCounter`: this Ace follows one the player just cancelled. She
// had another; say so, because the player has just watched both Aces
// leave the table and a second attack with no acknowledgement reads
// as the game forgetting what happened (Stan, 2026-09-14).
//
// REBUILT 2026-09-16 on Stan's copy: a headline, "She plans to remove
// these cards from your Scraps:", THE TWO CARDS SHE IS AIMING AT, one
// line on what countering does, the buttons. That is a rule change as
// well as a copy one, and worth knowing before touching this: the
// prompt used to show the player's WHOLE pile and keep her two targets
// hidden until after the decision (the counter was blind, by the
// original design). "These cards" can only mean her targets, so the
// player now counters knowing what the Ace would take.
export function AceCounterModal({ onCounter, onAllow, targets, afterCounter = false }) {
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel={afterCounter
      ? 'She had another Ace. Counter it, or let it happen?' : 'She plays an Ace. Counter it, or let it happen?'}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`}}>
        {/* 9vw keeps "SHE PLAYS AN ACE." on one line down to a 320px
            screen; it reaches its full 36 at 400. */}
        <div style={{fontFamily:F.display,fontSize:'clamp(28px,9vw,36px)',color:DS.ember,
          letterSpacing:'0.06em',lineHeight:1.15,marginBottom:12}}>
          {afterCounter ? 'SHE HAD ANOTHER ACE.' : 'SHE PLAYS AN ACE.'}
        </div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.5,marginBottom:16}}>
          She plans to remove these cards from your Scraps:
        </p>
        {/* Torn stock, pale — they are still sitting in YOUR pile. The
            group name carries the ranks, since "these cards" means
            nothing to a screen reader without them. */}
        {targets&&targets.length>0&&(
          <div role="group" aria-label={`Her targets: ${targets.map(cardLabel).join(' and ')}`}
            style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:18}}>
            {targets.map((c,i)=>(
              <div key={c.id} style={{animation:`popIn 0.4s ${SETTLE} ${0.12+i*0.1}s both`}}>
                <PlayingCard card={c} size="normal" isScrap={true} liftTransform={false}/>
              </div>
            ))}
          </div>
        )}
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.5,marginBottom:22}}>
          You can counter with your Ace to cancel her attack, and then both Aces get discarded.
        </p>
        {/* WRAPS. The pair used to sit in a row that could not wrap, 487px
            of buttons on a 313px card at 390 wide, centred, so both ran
            off the screen. Now each takes its share of the row, drops to
            its own full-width line when they no longer fit together, and
            the COUNTER label breaks after the bolt before it overflows. */}
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <Btn onClick={onCounter} grow>
            <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',
              flexWrap:'wrap',columnGap:8,rowGap:2}}>
              Counter <IconBolt size={16}/> Cancel Her Ace
            </span>
          </Btn>
          <Btn variant="ghost" onClick={onAllow} grow>Let It Happen</Btn>
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// OpponentAceReveal — step 2 of the opponent-Ace sequence.
// Shown after the player allows the Ace (or holds no Ace to
// counter with): the two targeted cards are revealed in the
// center of the table. On OK they animate to the discard pile.
// ─────────────────────────────────────────────────────────────
export function OpponentAceReveal({ targets, onOk, afterCounter = false }) {
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel={afterCounter
      ? "She had another Ace. It removed two of your Scraps cards"
      : "She attacks you with an Ace, and removes two cards from your Scraps"}>
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`,animation:`popIn 0.35s ${SETTLE}`}}>
        <div style={{fontFamily:F.display,fontSize:'clamp(26px,7.5vw,32px)',color:DS.ember,
          letterSpacing:'0.06em',marginBottom:16,lineHeight:1.2}}>
          {/* Stan's copy, 2026-09-16, with the verb in bold the way the
              storyboard sets it. Fjalla has no bold weight, so the word
              is also lifted to frost, which is what carries the stress
              on every screen; the synthesised weight only adds to it. */}
          {afterCounter
            ? 'She had another Ace. It removes two cards from your Scraps'
            : <>She <b style={{color:DS.frost}}>attacks</b> you with an Ace, and removes two cards from your Scraps.</>}
        </div>
        <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:24}}>
          {(targets||[]).map((c,i)=>(
            <div key={c.id} style={{animation:`popIn 0.4s ${SETTLE} ${0.15+i*0.12}s both`}}>
              <PlayingCard card={c} size="normal" isScrap={true}/>
            </div>
          ))}
        </div>
        <Btn onClick={onOk}>OK</Btn>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// AiCounterNotice — the AI countered the player's Ace.
// Both Aces are shown cancelled; nothing was removed.
// ─────────────────────────────────────────────────────────────
export function AiCounterNotice({ playerAce, aiAce, onOk, stillArmed = false }) {
  // THE BLACK SCREEN (Stan, 2026-09-14: "sometimes, when I hit DISCARD
  // to attack my opponent's two cards, the screen goes black and I have
  // to reload"). This modal read `cardSize` on the line below and no
  // such variable existed — a ReferenceError thrown from render, which
  // React answers by unmounting the whole tree onto the dusk body. It
  // only fired when the opponent COUNTERED, so it looked intermittent:
  // an attack she let through never opened this modal at all. Nothing
  // in `npm test` renders a component, which is why 53 tests were green
  // over a crash on one of the game's two signature moments.
  const cardSize = 'normal';
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel="Opponent countered your Ace">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.ember}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:560,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.ember}66`,animation:`popIn 0.35s ${SETTLE}`}}>
        <div style={{fontFamily:F.display,fontSize:32,color:DS.ember,
          letterSpacing:'0.06em',marginBottom:16,lineHeight:1.2}}>
          {stillArmed
            ? 'Opponent countered your Ace. Play another Ace or end your turn.'
            : 'Opponent countered your Ace, ending your turn.'}
        </div>
        <div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:18}}>
          {[playerAce,aiAce].filter(Boolean).map((c,i)=>(
            <div key={c.id} style={{position:'relative',
              animation:`popIn 0.4s ${SETTLE} ${0.15+i*0.12}s both`}}>
              <div style={{filter:'saturate(0.4) brightness(0.75)'}}>
                <PlayingCard card={c} size={cardSize} isScrap={false}/>
              </div>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
                justifyContent:'center',fontFamily:F.display,fontSize:52,color:DS.ember,
                textShadow:'0 0 12px rgba(0,0,0,0.8)'}}>✕</div>
            </div>
          ))}
        </div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          {/* The two outcomes are genuinely different moves, so they get
              genuinely different sentences. Holding another Ace does NOT
              return you to a normal turn — the only way to carry on is to
              spend another Ace, which the opponent may counter again. */}
          {stillArmed
            ? 'Both Aces discarded. Nothing removed. Play another Ace or end your turn.'
            : 'Both Aces discarded. Nothing removed. Your turn ends.'}
        </p>
        <Btn onClick={onOk}>{stillArmed ? 'Okay' : 'End Turn'}</Btn>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// SkipTurnModal — shown when the player has no legal trade
// ─────────────────────────────────────────────────────────────
// QuitConfirmModal — leaving a match in progress.
//
// Behind a confirm because quitting forfeits a match that can run
// several minutes, and the control sits in the same bar as the rules
// and sound buttons, which are both harmless. It uses the same Shell
// as every other blocking overlay, so it inherits the focus trap.
export function QuitConfirmModal({ onQuit, onCancel }) {
  return (
    <Shell zIndex={96} background="rgba(20,31,25,.92)" dialogLabel="Quit this match?">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.slate}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:520,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.slate}44`}}>
        <div style={{fontFamily:F.display,fontSize:34,color:DS.frost,
          letterSpacing:'0.06em',marginBottom:14}}>QUIT THIS MATCH?</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          The current match ends and this round's score is lost. Your win/loss
          record is only updated for matches played to a finish.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          {/* ONE green thing per screen (Stan's rule, 2026-09-14: "the
              player should learn that the GREEN thing is what they
              should push"). Quitting is the way out, not the thing to
              push, so it is the ghost here rather than a second fill. */}
          <Btn onClick={onCancel}>Keep Playing</Btn>
          <Btn variant="ghost" onClick={onQuit}>Quit to Menu</Btn>
        </div>
      </div>
    </Shell>
  );
}

export function SkipTurnModal({ onOk }) {
  return (
    <Shell zIndex={90} background="rgba(20,31,25,.92)" dialogLabel="No legal trades — your turn is skipped">
      <div style={{background:DS.duskMid,border:`3px solid ${DS.slate}`,
        borderRadius:16,padding:CARD_PAD,maxWidth:520,width:'100%',textAlign:'center',
        boxShadow:`0 0 40px ${DS.slate}44`}}>
        <div style={{fontFamily:F.display,fontSize:34,color:DS.frost,
          letterSpacing:'0.06em',marginBottom:14}}>NO LEGAL TRADES</div>
        <p style={{fontFamily:F.ui,color:DS.slateLight,fontSize:17,lineHeight:1.6,marginBottom:24}}>
          Every card in your hand draws more than you have room for. Even the
          cheapest trade would put you over 7, and you have no Ace to play
          instead, so your turn is skipped.
        </p>
        <Btn onClick={onOk}>OK</Btn>
      </div>
    </Shell>
  );
}
