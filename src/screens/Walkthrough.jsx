// ============================================================
// SCRAPS — First-run storyboard walkthrough
//
// Four static beats, shown ONCE per browser session, between
// PLAY and the difficulty picker. It replaced the old six-panel
// RULES wall and the scripted tutorial hand: both asked a
// first-timer to read (or play) before they had any idea what
// the table looked like.
//
// Deliberately NOT animated. Nothing slides, fades between
// beats, or choreographs itself — the only motion is a slow
// wiggle on the specific cards each beat is talking about
// (`.wt-wiggle`, keyframes in index.html), so the eye lands on
// the thing the sentence names. A beat change is an instant
// swap; there is no transition to sit through and no way to
// out-click the screen.
//
// Every card here is fixed sample data, not a real deal — the
// cards are hand-picked to be legible (one King on each side of
// beat 1, a clean 2-9 / 10-K / Ace split on beat 2; the scoring
// beat has no cards at all since 2026-09-14) and carry no Aces
// except where the Ace itself is the subject.
// ============================================================
import { useEffect, useState } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { PlayingCard } from "../components/cards.jsx";
import { SceneBackdrop } from "../components/backdrop.jsx";
import { TOUCH_MIN, AceTag } from "../components/buttons.jsx";
import { playSelect } from "../audio.js";
import { FitBox, usePointerVerb } from "../ui/viewport.jsx";

// ── Sample cards ─────────────────────────────────────────────
// The id used to be built from rank + suit, which was unique only
// because every sample card had a suit. With suits gone it has to be
// a counter: three kings share a beat on the scoring panel, and three
// cards with the id "wt-K" would collide as React keys AND as FLIP
// registry entries — and they seed the Scraps wear, so identical ids
// would tear three cards identically and give the heap away.
let wtId = 0;
const C = (rank, value) => ({ id: `wt-${rank}-${wtId++}`, rank, value });

// Beat 1 shows ONE card per side, not a five-card hand each. Stan's
// call, 2026-09-13: that beat is about which hand is private and which
// is public, and ten cards on screen invited the reader to start
// reading poker hands instead. The same rank both sides, so the only
// difference left between the two panels is the thing the beat is
// actually about — the card's FACE.
const KING = C('K',13);

const DRAW_TIERS = [
  { cards: [C('2',2), C('5',5), C('7',7), C('9',9)], label: 'DRAW 1 CARD', tone: DS.slateLight },
  { cards: [C('10',10), C('J',11), C('Q',12), C('K',13)], label: 'DRAW 2 CARDS', tone: DS.voltage },
  // frost, not gold. gold is reserved for milestones only — the
  // Clean Sweep and the win screen (it marked the ATTACK tag too,
  // until every button went green on 2026-09-14).
  // Trading an Ace in for three cards is none of those, and the
  // reserved-token rule has drifted here before. The tiers now climb
  // in brightness instead: muted, fern, brightest.
  { cards: [C('A',14)], label: 'DRAW 3 CARDS', tone: DS.frost },
];

// The Ace under the ATTACK tag on the last beat — the tag rides on its
// card in the game, so the storyboard shows it the same way.
const ACE = C('A',14);
const OPP_SCRAPS = [C('2',2), C('3',3), C('4',4), C('5',5), C('6',6)];
// The two cards the Ace takes. Picked off the array BY POSITION, not
// by re-declaring them: ids are a counter now, so `C('5',5).id` would
// mint a third five with an id nothing on the beat is rendering and
// the highlight would silently never match.
const OPP_TARGET_IDS = new Set(OPP_SCRAPS.slice(-2).map(c => c.id));

// ── Small shared pieces ──────────────────────────────────────

// Wiggle wrapper. The stagger keeps a row from moving as one
// rigid block; the class (not an inline animation) is what the
// reduced-motion rule in index.html can switch off.
function Wig({ delay = 0, children, style = {} }) {
  return <div className="wt-wiggle" style={{ animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

function Caption({ children, color = DS.slate }) {
  return (
    <div style={{fontFamily:F.mono,fontSize:12,letterSpacing:'0.18em',
      color,textTransform:'uppercase',marginBottom:10,textAlign:'center'}}>{children}</div>
  );
}

function CardRow({ cards, isScrap = false, size = 'small', selectedIds = null, gap = 8, startDelay = 0, kraft = false }) {
  return (
    <div style={{display:'flex',gap,justifyContent:'center',flexWrap:'wrap'}}>
      {cards.map((c, i) => (
        <Wig key={c.id} delay={startDelay + i * 110}>
          <PlayingCard card={c} size={size} isScrap={isScrap} kraft={kraft}
            selected={selectedIds ? selectedIds.has(c.id) : false} liftTransform={false}/>
        </Wig>
      ))}
    </div>
  );
}

// A labelled panel — used for the two cards in beat 1 and the
// three scoring hands in the scoring beat.
function Panel({ label, labelColor = DS.slate, borderColor = `${DS.slate}44`, children, footer = null }) {
  return (
    <div style={{background:DS.duskMid,border:`2px solid ${borderColor}`,borderRadius:14,
      padding:'16px 20px 18px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      {label && <Caption color={labelColor}>{label}</Caption>}
      {children}
      {footer && (
        <div style={{fontFamily:F.display,fontSize:20,color:labelColor,letterSpacing:'0.06em'}}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ── Beat 1 — the two hands ───────────────────────────────────
// The naming sits ABOVE each hand in body type rather than in a mono
// caption inside the panel. The sentence was doing the work twice —
// once across the top of the beat and once as a label on each box —
// so the label carries it and the top line is gone. The hand names
// ("One Pair", "Three of a Kind") went with them: this beat is about
// which hand is private and which is public, and a poker ranking on
// each box invites the reader to work out the ranking instead.
function HandIntro({ children }) {
  return (
    <div style={{fontFamily:F.ui,fontSize:'clamp(15px,2.2vw,19px)',lineHeight:1.4,
      color:DS.slateLight,textAlign:'center',maxWidth:280,marginBottom:2}}>
      {children}
    </div>
  );
}

function BeatHands() {
  return (
    // `flex-end`, not `flex-start`: the two intro lines are different
    // lengths and the Scraps one wraps to two lines on a narrower
    // window, which pushed its whole column — card included — down
    // by a line. Aligning the columns by their BOTTOMS keeps both
    // cards on one level and lets the taller caption grow upward
    // instead, which is the direction with space in it.
    // EQUAL columns (Stan, 2026-09-14: "the two King cards are pushing
    // slightly to the left of center"). Each column used to be as wide
    // as its own caption, and "Scraps (visible to opponent)" is about
    // twice the width of "Hand (private)", so the two cards sat at the
    // centres of two unequal boxes and the PAIR landed ~30px left of
    // the screen's axis. Both columns share the row equally now, so
    // the cards are symmetric about the centre whatever the captions
    // measure; the wider caption wraps upward, which is the direction
    // `flex-end` already gives it room in.
    <div style={{display:'flex',gap:26,justifyContent:'center',alignItems:'flex-end',flexWrap:'wrap',
      width:'100%',maxWidth:620}}>
      <div style={{flex:'1 1 0',minWidth:150,maxWidth:290,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
        <HandIntro><b style={{color:DS.frost}}>Hand</b> (private)</HandIntro>
        <Panel labelColor={DS.slate}>
          <CardRow cards={[KING]} size="normal"/>
        </Panel>
      </div>
      <div style={{flex:'1 1 0',minWidth:150,maxWidth:290,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
        <HandIntro><b style={{color:DS.voltage}}>Scraps</b> (visible to opponent)</HandIntro>
        <Panel labelColor={DS.voltage} borderColor={`${DS.voltage}66`}>
          {/* The SAME card as the panel beside it, which is now the
              whole of beat 1: one King on crisp cream, one King torn
              and stained. Material is the only difference between a
              card in your hand and a card in your Scraps, so the beat
              that introduces the two hands can simply show it. */}
          <CardRow cards={[KING]} size="normal" isScrap startDelay={60}/>
        </Panel>
      </div>
    </div>
  );
}

// ── Beat 2 — what each card is worth to scrap ────────────────
function BeatTrade() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
      {DRAW_TIERS.map((tier, r) => (
        // The row used to be two fixed widths (264 + 190) plus an
        // arrow, which is ~510px and simply does not fit a 375px
        // phone. Both are elastic now: the cards keep their natural
        // width, and the label takes what is left and wraps under
        // them when there is not enough.
        // The arrow between the cards and the label is gone (Stan,
        // 2026-09-13). It was the reason these rows broke badly at his
        // width: cards + arrow + "DRAW 2 CARDS" needs ~446px, a 375px
        // phone has ~343px of row, and the label wrapped mid-phrase
        // with the arrow stranded beside it. Without it the row is one
        // flex line that CENTRES and wraps as a unit — cards and label
        // side by side wherever they fit, cards over label where they
        // do not, and never a broken label either way.
        <div key={tier.label} style={{display:'flex',alignItems:'center',gap:14,
          background:DS.duskMid,border:`2px solid ${tier.tone}44`,borderRadius:14,
          padding:'12px 16px',justifyContent:'center',flexWrap:'wrap',
          maxWidth:'100%'}}>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {tier.cards.map((c, i) => (
              <Wig key={c.id} delay={r * 140 + i * 110}>
                <PlayingCard card={c} size="tiny" liftTransform={false}/>
              </Wig>
            ))}
          </div>
          <span style={{fontFamily:F.display,fontSize:24,color:tier.tone,letterSpacing:'0.06em',
            whiteSpace:'nowrap',textAlign:'center'}}>{tier.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Beat 4 — the Ace play ────────────────────────────────────
// A still frame of the two taps it takes: the ATTACK tag on an Ace,
// then two cards toggled in the opponent's Scraps.
function TapGlyph({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{position:'absolute',right:-24,bottom:-26,filter:'drop-shadow(0 3px 6px rgba(0,0,0,.75))'}}>
      <circle cx="8" cy="8" r="9" fill="none" stroke={DS.frost} strokeWidth="1.2" opacity="0.5"/>
      <path d="M6 3.5 L6 16 L9 13 L11.2 17.6 L13.6 16.4 L11.4 12 L15.4 11.6 Z"
        fill={DS.frost} stroke={DS.ink} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function BeatAce() {
  return (
    <div style={{display:'flex',gap:30,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
      {/* The button, mid-tap. It is the game's own ATTACK tag on an Ace
          (Stan, 2026-09-14: "shape the button to look more like the
          in-game ATTACK button, including the new green colour" — and
          no lightning bolt). The tag is one card wide and sits on top
          of the card it would spend, exactly as it does in the hand,
          so the reader meets the real control here and recognises it
          on the table rather than a gold pill that resembled nothing
          in the game. `live={false}` renders it inert and hidden from
          assistive tech, the same way the drawn-Ace box shows it. */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <Wig>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
            <div style={{position:'relative'}}>
              <AceTag live={false} width={104}/>
              <TapGlyph/>
            </div>
            <PlayingCard card={ACE} size="normal" liftTransform={false}/>
          </div>
        </Wig>
      </div>

      {/* The selection modal, mid-choice. The arrow that used to sit
          between the button and the pile is gone (Stan, 2026-09-13):
          the two objects are a cause and its effect and they read that
          way side by side, and the arrow was the widest thing on the
          beat's centre line on a phone. */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <div style={{background:DS.duskMid,border:`2px solid ${DS.ember}88`,borderRadius:14,
          padding:'14px 12px',boxShadow:`0 0 26px ${DS.ember}33`,maxWidth:'100%'}}>
          <Caption color={DS.ember}>Opponent’s Scraps</Caption>
          {/* Five tiny cards plus the panel's own padding is the
              widest thing on any beat; at gap 7 and 18px padding it
              came to 364px, nine past what a 375px phone can show. */}
          <div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'flex-end'}}>
            {OPP_SCRAPS.map((c, i) => {
              const hit = OPP_TARGET_IDS.has(c.id);
              if (!hit) {
                return (
                  <div key={c.id} style={{opacity:0.4}}>
                    <PlayingCard card={c} size="tiny" isScrap kraft liftTransform={false}/>
                  </div>
                );
              }
              return (
                <Wig key={c.id} delay={i * 120}>
                  <div style={{position:'relative'}}>
                    <PlayingCard card={c} size="tiny" isScrap selected kraft liftTransform={false}/>
                    <span style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',
                      background:DS.ember,color:DS.ink,borderRadius:11,width:22,height:22,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontFamily:F.ui,fontWeight:700,fontSize:14,
                      boxShadow:`0 0 12px ${DS.ember}99`}}>✕</span>
                  </div>
                </Wig>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Beat 3 — how a round scores ──────────────────────────────
// Three boxes and nothing else (Stan, 2026-09-14: "remove the cards,
// keep the boxes"). Each used to carry a sample pair or trip, which
// put six more poker hands on a beat whose only point is the three
// numbers. A point value is a label now, not a hand.
function ScoreSlot({ label, points, tone }) {
  return (
    <div style={{background:DS.duskMid,border:`2px solid ${tone}55`,borderRadius:14,
      padding:'16px 22px 18px',minWidth:124,display:'flex',flexDirection:'column',
      alignItems:'center',gap:6}}>
      <div style={{fontFamily:F.mono,fontSize:12,letterSpacing:'0.16em',
        color:DS.slate,textTransform:'uppercase'}}>{label}</div>
      <div style={{fontFamily:F.display,fontSize:30,color:tone,letterSpacing:'0.04em',lineHeight:1}}>{points}</div>
    </div>
  );
}

function BeatScoring() {
  return (
    <div style={{display:'flex',gap:14,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
      <ScoreSlot label="Hand" points="1 PT" tone={DS.slateLight}/>
      <ScoreSlot label="Hand" points="1 PT" tone={DS.slateLight}/>
      <ScoreSlot label="Scraps" points="2 PTS" tone={DS.voltage}/>
    </div>
  );
}

// ── The beats ────────────────────────────────────────────────
//
// ORDER, reset 2026-09-13 on Stan's call: mechanics, then the flow of
// play, then the scoring, and the Ace LAST. It used to sit third, in
// the middle of the explanation, where it read as one more rule to
// absorb. At the end it is the surprise the game turns on, and it is
// the last thing a reader is holding when they hit LET'S PLAY.
const BEATS = [
  {
    // The one beat with a title over it. Rye is the wordmark face and
    // this is the only other place it appears — the storyboard is the
    // splash's continuation, and the title says so without repeating
    // the wordmark itself.
    title: 'How to play',
    copy: <>SCRAPS always has two poker hands running:</>,
    visual: <BeatHands/>,
  },
  {
    // The break before "Draw fresh cards." is desktop-only (`.wt-br`,
    // hidden under 700px in index.html): on a phone the first sentence
    // already wraps and a forced break would strand a third line.
    copy: <>Scrap cards from your hand into your Scraps pile.<br className="wt-br"/> Draw fresh cards.</>,
    visual: <BeatTrade/>,
    below: 'Both hands have a 7 card limit.',
  },
  {
    copy: <>Play two hands, then your best Scraps.</>,
    visual: <BeatScoring/>,
    // "Play to 10" moved off the top line and under the boxes, in
    // bold, with the bonus beside it (Stan, 2026-09-14). The Clean
    // Sweep is named on the table when it happens; here it is just
    // the arithmetic.
    below: <>Win all three for a bonus +1. <b style={{color:DS.frost}}>Play to {WIN_SCORE}.</b></>,
  },
  {
    // voltage, not gold: the ATTACK tag is green now and the word
    // should match the control it names. "from your hand" is Stan's
    // (2026-09-16): the tag rides on an Ace in the HAND, and an Ace
    // sitting in a Scraps pile cannot attack.
    copy: <>Aces can <b style={{color:DS.voltage}}>attack</b> from your hand. Discard two cards from opponent’s Scraps.</>,
    visual: <BeatAce/>,
    cta: 'Let’s Play',
  },
];

// Exported so the difficulty picker's BACK can name the beat it
// returns to without hard-coding a 3.
export const BEAT_COUNT = BEATS.length;
export const LAST_BEAT = BEATS.length - 1;

// The bottom rail's floor, and the look of its Back and Skip buttons.
// Exported because the difficulty picker's BACK sits at EXACTLY this
// height, so the button does not jump between the storyboard's last beat
// and the screen it leads to (Stan, 2026-09-16). The rail's button row
// is TOUCH_MIN tall and sits RAIL_BOTTOM above the viewport's bottom
// edge; change either here and both screens move together.
export const RAIL_BOTTOM = 12;
export const railBtnStyle = {
  background:'transparent',border:`2px solid ${DS.slate}66`,color:DS.slateLight,borderRadius:8,
  padding:'9px 20px',minHeight:TOUCH_MIN,
  fontFamily:F.ui,fontWeight:700,fontSize:14,letterSpacing:'0.14em',textTransform:'uppercase',
};

// ─────────────────────────────────────────────────────────────
// Walkthrough
// ─────────────────────────────────────────────────────────────
// `asReference` runs the same storyboard as the in-game rules, opened
// from the `?` on the table rather than before a first game. Added
// 2026-08-30, when the separate RulesModal was retired: that modal was
// a six-item text wall that truncated on a phone at item 4, cutting off
// the no-flushes house rule — so a first-timer could lose to a rule the
// game had never shown them. (That rule is itself gone now: suits came
// off the cards on 2026-09-13, so a flush cannot be dealt.) There is no
// reason to maintain a second, worse explanation of the rules beside
// this one. RulesModal was finally DELETED on 2026-09-14: it had gone
// on being tree-shaken out of every build since it lost its importer,
// and it held the only copy of the privacy notice, which is why that
// notice stopped shipping at all. The notice is /privacy now, linked
// from the footer below.
// "Tap" on a touch screen, "Click" under a mouse (Stan, 2026-09-14
// evening: "don't say Tap anywhere on desktop"). The verb comes from
// usePointerVerb (src/ui/viewport.jsx), the one place every screen reads
// it since 2026-09-16; a laptop with a trackpad is a fine pointer and
// gets Click.
//
// The same answer decides the footer's second clause, because a phone
// has no Enter to press and the rail was advertising one (Stan,
// 2026-09-15: "there is no enter on mobile; just say TAP ANYWHERE"). The
// keydown listener below is NOT gated on this — a hardware keyboard
// paired with a tablet still works. We only stop promising a key that
// screen has no way to show.

export function Walkthrough({ onDone, asReference = false, startAt = 0 }) {
  // `startAt` is for the difficulty picker's BACK, which returns the
  // reader to the LAST beat rather than the first — they have already
  // read the whole thing and want the page they just left.
  const [i, setI] = useState(startAt);
  const verb = usePointerVerb();
  const keys = verb === 'Click';
  const beat = BEATS[i];
  const last = i === BEATS.length - 1;

  // Tapping the backdrop advances; on the last beat it does what
  // LET'S PLAY does, so a reader who never notices the button is
  // not stuck on a dead screen.
  function advance() {
    playSelect();
    if (last) onDone();
    else setI(n => n + 1);
  }

  function skip(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    playSelect();
    onDone();
  }

  // The backdrop advances on any click, so BACK has to stop its own
  // event reaching it — otherwise a click would step back and
  // forward in the same gesture and look like nothing happened.
  function back(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (i === 0) return;
    playSelect();
    setI(n => n - 1);
  }

  // "Tap anywhere" is a pointer instruction on a screen with no other
  // way through, so the same surface listens for keys. Events already
  // heading for a real button are left alone — otherwise Enter on SKIP
  // would fire the button AND advance the beat behind it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (e.key === 'Escape') { skip(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    // zIndex matters when this runs as the in-game rules: the table's
    // own fixed bottom bar carries a z-index of its own, so without one
    // here the bar painted straight through the storyboard and, where
    // the two collided, swallowed the clicks meant for CLOSE. Harmless
    // as a standalone screen, where nothing else is on the page.
    <div onClick={advance} className="app-vh" style={{position:'fixed',inset:0,background:DS.dusk,
      zIndex:100,
      display:'flex',flexDirection:'column',cursor:'pointer',overflow:'hidden',userSelect:'none'}}>
      <SceneBackdrop/>
      <h1 className="sr-only">SCRAPS — how to play</h1>
      {/* Each beat replaces the last in place, so the step count is a
          change a screen reader has to be told about rather than shown. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`Step ${i + 1} of ${BEATS.length}.`}
      </div>

      {/* Beat body. It used to scroll on a short screen and eat
          130px of padding to clear a pinned rail; now the rail is
          in the flow below and FitBox scales a beat that will not
          fit, so a storyboard about how the game works is never
          itself something to scroll through. */}
      <FitBox modeMinW={340} style={{zIndex:1,padding:'16px 10px 0'}}>
        <div style={{flex:'1 0 auto',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:'clamp(14px,3vh,26px)'}}>

          {beat.title && (
            <div style={{fontFamily:F.title,
              fontSize:'clamp(28px,min(7vw,6vh),56px)',lineHeight:1.05,
              color:DS.frost,textAlign:'center',
              textShadow:'0 3px 0 rgba(0,0,0,.4)',
              marginBottom:'clamp(-6px,-1vh,0px)'}}>
              {beat.title}
            </div>
          )}

          <p style={{fontFamily:F.ui,fontSize:'clamp(18px,2.4vw,27px)',lineHeight:1.45,
            fontWeight:500,color:DS.slateLight,textAlign:'center',maxWidth:800}}>
            {beat.copy}
          </p>

          {beat.visual}

          {/* The same type as the top copy (Stan, 2026-09-14 evening): it
              was 18px/600 in frost, a caption's weight and colour under
              a body line, and read as a different voice. */}
          {beat.below && (
            <p style={{fontFamily:F.ui,fontSize:'clamp(18px,2.4vw,27px)',lineHeight:1.45,
              fontWeight:500,color:DS.slateLight,textAlign:'center',maxWidth:800}}>
              {beat.below}
            </p>
          )}

          {beat.cta && (
            <button onClick={advance} style={{background:DS.voltage,color:DS.ink,border:'none',
              padding:'17px 46px',borderRadius:12,cursor:'pointer',fontFamily:F.ui,fontWeight:700,
              fontSize:20,minHeight:TOUCH_MIN,letterSpacing:'0.1em',textTransform:'uppercase',
              boxShadow:`0 0 28px ${DS.voltage}88`}}>{asReference && last ? 'Back to game' : beat.cta}</button>
          )}
        </div>
      </FitBox>

      {/* Bottom rail — in the flow, so the beat above is laid out
          against the space actually left over rather than against a
          padding figure that guesses at it. */}
      <div style={{position:'relative',zIndex:2,flexShrink:0,
        background:`linear-gradient(transparent,${DS.dusk} 42%)`,
        padding:`10px 20px ${RAIL_BOTTOM}px`,display:'flex',flexDirection:'column',
        alignItems:'center',gap:8,pointerEvents:'none'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {BEATS.map((_, n) => (
            <span key={n} style={{width:n === i ? 26 : 8,height:8,borderRadius:4,
              background:n === i ? DS.voltage : `${DS.slate}55`}}/>
          ))}
        </div>
        {!last && (
          <div style={{fontFamily:F.mono,fontSize:12,letterSpacing:'0.2em',
            color:DS.slate,textTransform:'uppercase'}}>{verb} anywhere{keys ? ', or press Enter' : ''}</div>
        )}
        {last && (
          <div style={{fontFamily:F.mono,fontSize:12,letterSpacing:'0.2em',
            color:DS.slate,textTransform:'uppercase'}}>{verb} anywhere {asReference ? 'to close' : 'to begin'}</div>
        )}
        {/* BACK is always rendered, merely invisible on the first
            beat, so SKIP does not jump sideways the moment a reader
            leaves beat one. */}
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={back} disabled={i === 0} aria-label="Previous step"
            style={{...railBtnStyle,pointerEvents:'auto',
              cursor:i === 0 ? 'default' : 'pointer',
              visibility:i === 0 ? 'hidden' : 'visible'}}>Back</button>
          <button onClick={skip} style={{pointerEvents:'auto',background:'transparent',
            border:`2px solid ${DS.slate}66`,color:DS.slateLight,borderRadius:8,
            padding:'9px 26px',minHeight:TOUCH_MIN,cursor:'pointer',
            fontFamily:F.ui,fontWeight:700,fontSize:14,
            letterSpacing:'0.14em',textTransform:'uppercase'}}>{asReference ? 'Close' : 'Skip'}</button>
          {/* The privacy notice. It rides in THIS row rather than on a
              line of its own so it costs the footer no height at all —
              the row is already TOUCH_MIN tall for Back and Skip, and a
              landscape phone has no 44px to spare below them. Quieter
              than its neighbours on purpose: no border, mono, slate.

              A new tab, not a navigation. This same footer is what the
              ? disc on the table opens mid-match, and /privacy is a
              real static page outside the app, so following it in place
              would throw away a game in progress. */}
          <a href="/privacy" target="_blank" rel="noopener noreferrer"
            style={{pointerEvents:'auto',display:'inline-flex',alignItems:'center',
              minHeight:TOUCH_MIN,padding:'9px 12px',color:DS.slate,
              fontFamily:F.mono,fontSize:12,letterSpacing:'0.14em',
              textTransform:'uppercase',textDecoration:'none'}}>Privacy</a>
        </div>
      </div>
    </div>
  );
}
