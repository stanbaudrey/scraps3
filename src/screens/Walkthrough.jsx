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
// hands are hand-picked to be legible (a pair, a trip, a clean
// 2-9 / 10-K / Ace split) and carry no Aces except where the
// Ace itself is the subject.
// ============================================================
import { useEffect, useState } from "react";
import { DS, F, WIN_SCORE } from "../styles/theme.js";
import { PlayingCard } from "../components/cards.jsx";
import { SwirlBg } from "../components/backdrop.jsx";
import { IconBolt } from "../components/icons.jsx";
import { TOUCH_MIN } from "../components/buttons.jsx";
import { playSelect } from "../audio.js";
import { FitBox } from "../ui/viewport.jsx";

// ── Sample cards ─────────────────────────────────────────────
const C = (rank, suit, value) => ({ id: `wt-${rank}${suit}`, rank, suit, value });

const SMALL_HAND = [C('4','♠',4), C('7','♣',7), C('9','♠',9), C('9','♥',9), C('K','♦',13)];
const SCRAPS_HAND = [C('3','♠',3), C('8','♦',8), C('Q','♥',12), C('Q','♠',12), C('Q','♣',12)];

const DRAW_TIERS = [
  { cards: [C('2','♥',2), C('5','♠',5), C('7','♦',7), C('9','♣',9)], label: 'DRAW 1 CARD', tone: DS.slateLight },
  { cards: [C('10','♠',10), C('J','♥',11), C('Q','♣',12), C('K','♦',13)], label: 'DRAW 2 CARDS', tone: DS.voltage },
  { cards: [C('A','♣',14)], label: 'DRAW 3 CARDS', tone: DS.gold },
];

const OPP_SCRAPS = [C('2','♣',2), C('3','♥',3), C('4','♣',4), C('5','♦',5), C('6','♠',6)];
const OPP_TARGET_IDS = new Set([C('5','♦',5).id, C('6','♠',6).id]);

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

function CardRow({ cards, isScrap = false, size = 'small', selectedIds = null, gap = 8, startDelay = 0 }) {
  return (
    <div style={{display:'flex',gap,justifyContent:'center',flexWrap:'wrap'}}>
      {cards.map((c, i) => (
        <Wig key={c.id} delay={startDelay + i * 110}>
          <PlayingCard card={c} size={size} isScrap={isScrap}
            selected={selectedIds ? selectedIds.has(c.id) : false} liftTransform={false}/>
        </Wig>
      ))}
    </div>
  );
}

// A labelled panel — used for the two hands in beat 1 and the
// three scoring hands in beat 4.
function Panel({ label, labelColor = DS.slate, borderColor = `${DS.slate}44`, children, footer = null }) {
  return (
    <div style={{background:DS.duskMid,border:`2px solid ${borderColor}`,borderRadius:14,
      padding:'16px 20px 18px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <Caption color={labelColor}>{label}</Caption>
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
function BeatHands() {
  return (
    <div style={{display:'flex',gap:26,justifyContent:'center',flexWrap:'wrap'}}>
      <Panel label="Your small hand · private" labelColor={DS.slate} footer="One Pair">
        <CardRow cards={SMALL_HAND}/>
      </Panel>
      <Panel label="Your Scraps hand · everyone sees it" labelColor={DS.voltage}
        borderColor={`${DS.voltage}66`} footer="Three of a Kind">
        <CardRow cards={SCRAPS_HAND} isScrap startDelay={60}/>
      </Panel>
    </div>
  );
}

// ── Beat 2 — what each card is worth to trade in ─────────────
function BeatTrade() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
      {DRAW_TIERS.map((tier, r) => (
        // The row used to be two fixed widths (264 + 190) plus an
        // arrow, which is ~510px and simply does not fit a 375px
        // phone. Both are elastic now: the cards keep their natural
        // width, and the label takes what is left and wraps under
        // them when there is not enough.
        <div key={tier.label} style={{display:'flex',alignItems:'center',gap:14,
          background:DS.duskMid,border:`2px solid ${tier.tone}44`,borderRadius:14,
          padding:'12px 16px',justifyContent:'space-between',flexWrap:'wrap',
          maxWidth:'100%'}}>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {tier.cards.map((c, i) => (
              <Wig key={c.id} delay={r * 140 + i * 110}>
                <PlayingCard card={c} size="tiny" liftTransform={false}/>
              </Wig>
            ))}
          </div>
          <span style={{fontFamily:F.display,fontSize:20,color:DS.slate}}>→</span>
          <span style={{fontFamily:F.display,fontSize:24,color:tier.tone,letterSpacing:'0.06em',
            whiteSpace:'nowrap',flex:'1 1 auto',minWidth:0,textAlign:'right'}}>{tier.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Beat 3 — the Ace play ────────────────────────────────────
// A still frame of the two taps it takes: the PLAY ACE button,
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
      {/* The button, mid-tap */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <Wig>
          <div style={{position:'relative'}}>
            <div style={{background:DS.gold,color:DS.ink,borderRadius:12,
              padding:'18px 32px',fontFamily:F.ui,fontWeight:700,fontSize:20,
              letterSpacing:'0.08em',textTransform:'uppercase',
              boxShadow:`0 0 26px ${DS.gold}88`,
              display:'inline-flex',alignItems:'center',gap:10}}>
              Play Ace <IconBolt size={18}/>
            </div>
            <TapGlyph/>
          </div>
        </Wig>
        <Caption color={DS.gold}>1 · discard your Ace</Caption>
      </div>

      <span style={{fontFamily:F.display,fontSize:26,color:DS.slate}}>→</span>

      {/* The selection modal, mid-choice */}
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
                    <PlayingCard card={c} size="tiny" isScrap liftTransform={false}/>
                  </div>
                );
              }
              return (
                <Wig key={c.id} delay={i * 120}>
                  <div style={{position:'relative'}}>
                    <PlayingCard card={c} size="tiny" isScrap selected liftTransform={false}/>
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
        <Caption color={DS.ember}>2 · mark two — they’re gone</Caption>
      </div>
    </div>
  );
}

// ── Beat 4 — how a round scores ──────────────────────────────
function ScoreSlot({ label, points, cards, isScrap = false, tone, delay }) {
  return (
    <div style={{background:DS.duskMid,border:`2px solid ${tone}55`,borderRadius:14,
      padding:'14px 18px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
      <div style={{display:'flex',gap:6}}>
        {cards.map((c, i) => (
          <Wig key={c.id} delay={delay + i * 110}>
            <PlayingCard card={c} size="tiny" isScrap={isScrap} liftTransform={false}/>
          </Wig>
        ))}
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:F.mono,fontSize:11,letterSpacing:'0.16em',
          color:DS.slate,textTransform:'uppercase'}}>{label}</div>
        <div style={{fontFamily:F.display,fontSize:26,color:tone,letterSpacing:'0.04em'}}>{points}</div>
      </div>
    </div>
  );
}

function BeatScoring() {
  return (
    <div style={{display:'flex',gap:14,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
      <ScoreSlot label="Small hand" points="1 PT" tone={DS.slateLight} delay={0}
        cards={[C('8','♠',8), C('8','♦',8)]}/>
      <ScoreSlot label="Small hand" points="1 PT" tone={DS.slateLight} delay={120}
        cards={[C('J','♣',11), C('J','♥',11)]}/>
      <ScoreSlot label="Scraps hand" points="2 PTS" tone={DS.voltage} delay={240} isScrap
        cards={[C('K','♠',13), C('K','♥',13), C('K','♦',13)]}/>
      <span style={{fontFamily:F.display,fontSize:26,color:DS.slate}}>=</span>
      <div style={{background:`${DS.gold}1F`,border:`2px solid ${DS.gold}`,borderRadius:14,
        padding:'18px 20px',textAlign:'center'}}>
        <div style={{fontFamily:F.mono,fontSize:11,letterSpacing:'0.16em',
          color:DS.gold,textTransform:'uppercase',marginBottom:4}}>Win all three</div>
        <div style={{fontFamily:F.display,fontSize:26,color:DS.gold,letterSpacing:'0.04em'}}>+1 PT</div>
      </div>
    </div>
  );
}

// ── The beats ────────────────────────────────────────────────
const BEATS = [
  {
    copy: (
      <>SCRAPS always has two poker hands running: your <b style={{color:DS.frost}}>small hand</b> (private)
      and your <b style={{color:DS.voltage}}>Scraps hand</b> (visible to everybody).</>
    ),
    visual: <BeatHands/>,
  },
  {
    copy: <>Transfer cards from your small hand into your Scraps to draw fresh cards.</>,
    visual: <BeatTrade/>,
    below: 'Both hands have a 7 card limit.',
  },
  {
    copy: <>Or you can discard an Ace, and select two cards to discard from your opponent’s Scraps.</>,
    visual: <BeatAce/>,
  },
  {
    copy: (
      <>Play two small hands (1 point each) then your best Scraps hand (2 points).
      <b style={{color:DS.frost}}> No flushes.</b> Win all three hands for a bonus point.
      First to {WIN_SCORE}, win by 2.</>
    ),
    visual: <BeatScoring/>,
    cta: 'Let’s Play',
  },
];

// ─────────────────────────────────────────────────────────────
// Walkthrough
// ─────────────────────────────────────────────────────────────
export function Walkthrough({ onDone }) {
  const [i, setI] = useState(0);
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

  // "Tap anywhere" is a pointer instruction on a screen with no other
  // way through, so the same surface listens for keys. Events already
  // heading for a real button are left alone — otherwise Enter on SKIP
  // would fire the button AND advance the beat behind it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (e.key === 'Escape') { skip(); return; }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div onClick={advance} className="app-vh" style={{position:'fixed',inset:0,background:DS.dusk,
      display:'flex',flexDirection:'column',cursor:'pointer',overflow:'hidden',userSelect:'none'}}>
      <SwirlBg/>
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

          <p style={{fontFamily:F.ui,fontSize:'clamp(18px,2.4vw,27px)',lineHeight:1.45,
            fontWeight:500,color:DS.slateLight,textAlign:'center',maxWidth:800}}>
            {beat.copy}
          </p>

          {beat.visual}

          {beat.below && (
            <p style={{fontFamily:F.ui,fontSize:18,fontWeight:600,color:DS.frost,textAlign:'center'}}>
              {beat.below}
            </p>
          )}

          {beat.cta && (
            <button onClick={advance} style={{background:DS.voltage,color:DS.ink,border:'none',
              padding:'17px 46px',borderRadius:12,cursor:'pointer',fontFamily:F.ui,fontWeight:700,
              fontSize:20,minHeight:TOUCH_MIN,letterSpacing:'0.1em',textTransform:'uppercase',
              boxShadow:`0 0 28px ${DS.voltage}88`}}>{beat.cta}</button>
          )}
        </div>
      </FitBox>

      {/* Bottom rail — in the flow, so the beat above is laid out
          against the space actually left over rather than against a
          padding figure that guesses at it. */}
      <div style={{position:'relative',zIndex:2,flexShrink:0,
        background:`linear-gradient(transparent,${DS.dusk} 42%)`,
        padding:'10px 20px 12px',display:'flex',flexDirection:'column',
        alignItems:'center',gap:8,pointerEvents:'none'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {BEATS.map((_, n) => (
            <span key={n} style={{width:n === i ? 26 : 8,height:8,borderRadius:4,
              background:n === i ? DS.voltage : `${DS.slate}55`}}/>
          ))}
        </div>
        {!last && (
          <div style={{fontFamily:F.mono,fontSize:12,letterSpacing:'0.2em',
            color:DS.slate,textTransform:'uppercase'}}>Tap anywhere, or press Enter</div>
        )}
        <button onClick={skip} style={{pointerEvents:'auto',background:'transparent',
          border:`2px solid ${DS.slate}66`,color:DS.slateLight,borderRadius:8,
          padding:'9px 26px',minHeight:TOUCH_MIN,cursor:'pointer',
          fontFamily:F.ui,fontWeight:700,fontSize:14,
          letterSpacing:'0.14em',textTransform:'uppercase'}}>Skip</button>
      </div>
    </div>
  );
}
