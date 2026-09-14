// ============================================================
// SCRAPS — Card visuals: playing cards, hands, scraps zones,
// deck + discard piles, best-hand badges
//
// Design-pass notes (July 4):
//  • Card backs are NEUTRAL (ink field, slate diamonds). Voltage
//    now means "yours / act now" — it never appears on the
//    opponent's hidden hand.
//  • Cards carry a single, larger index. The rotated bottom
//    index is gone (glyph soup at these sizes).
//  • Each Scraps zone carries its own label + best-hand badge
//    INSIDE its border, so ownership is unambiguous.
//  • The badge under the player's hand is a change-detector:
//    subtle at rest, flashes only when the best hand upgrades.
// ============================================================
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { DS, F } from "../styles/theme.js";
import { playSelect } from "../audio.js";
import { evaluateBestHand } from "../game/engine.js";
import { ACE_TAG_MIN } from "./buttons.jsx";

// ─────────────────────────────────────────────────────────────
// CARD_DIMS — the four card sizes, exported because two other
// modules need the same numbers:
//   • the layout picks a size per band from the viewport mode
//     (src/ui/viewport.jsx) and has to know how wide the result
//     will be before it can lay a fan out;
//   • flight.jsx derives a ghost's start and end scale from a
//     card's MEASURED box against its natural one, which is the
//     only way a flight stays correct when the table is scaled.
//
// `rank` is the BIG NUMERAL's font size, not a corner index — a
// card's face is one numeral and nothing else since 2026-09-13.
// The old values (20/29/37/44, sat beside a suit glyph one point
// larger) are gone rather than reused: they sized a mark meant to
// be read in a 20px corner, and these size a mark meant to fill
// the card. `suit` went with the suits themselves.
// ─────────────────────────────────────────────────────────────
// CARD_DIMS — the four card sizes. `rank`, `gx` and `gy` are all
// DERIVED from Rye's own metrics rather than chosen by eye, and the
// derivation is written out because the failure mode of guessing
// here is silent and rank-specific: it looks perfect on a King and
// clips on the one Queen in the pile.
//
// MEASURED in a real browser against the shipped webfont, at 100px.
// The numbers that bind, none of which is the advance width:
//   Q  inked right edge  0.824em   ← the widest single rank, and it
//                                    overhangs its own advance by
//                                    0.055em on the swash
//   A  inked LEFT edge  −0.034em   ← the one rank that prints to the
//                                    left of its origin
//   7  ascent            0.798em   ← 0.041em taller than every other
//                                    rank, on an ornamental spur
//   Q  descent           0.163em   ← the only real descender
//   10 inked right edge  1.146em   ← condensed, see TEN_SQUEEZE
//
// `gx` is the glyph ORIGIN from the card's outer left edge, set so
// the A's overhang just clears the margin. `gy` is the printed top
// of a normal cap from the outer top edge, set so the 7's spur
// clears BOTH the margin and the deepest bite a tear can take out of
// the top edge (up to 0.039 of card height at full wear). `rank`
// then follows from gx: the largest size at which the Q still lands
// inside the far margin.
export const CARD_DIMS = {
  tiny:  {w:60, h:84,  rank:60, gx:6,  gy:8,  pad:5},
  // `small` is the ONE size that does not take the width-derived
  // maximum (which would be 79), and the reason is the fan rather
  // than the card. `small` is the hand card in the compact layout,
  // and that layout's floor is 7 face-up cards across a 340px rail,
  // which exposes 43px of each 80px card. At 79 the numeral inks
  // right out to the card's far margin, so only 42% of each glyph
  // fell in the exposed band and a full hand came back as a smear:
  // measured, "10 J Q K" read as one shape. At 64 the same band
  // carries 65% of the glyph and leaves 18px of clear paper before
  // the next card's edge — which is most of the gain, because a
  // gutter is what tells two ranks apart.
  // It is still a big numeral: 43% of the card's height, against
  // the 26% of the corner index this replaced.
  small: {w:80, h:112, rank:64, gx:9,  gy:10, pad:7},
  normal:{w:104,h:146, rank:104,gx:11, gy:12, pad:9},
  large: {w:124,h:174, rank:123,gx:13, gy:14, pad:11},
};

// "10" is CONDENSED, never set smaller. Height stays identical
// across all thirteen ranks and only the advance changes — a 10 set
// at 82% (the old corner index) or 62% (a bench) reads as a
// different, smaller kind of card rather than a wider glyph, which
// is the specific thing Stan called out.
//
// 0.70 is a measurement, not a taste call: the 10 inks out to
// 1.146em, and every size above needs k ≤ ~0.72 for it to land
// inside the far margin. It also happens to match apparent width
// well — the 10 comes out at 0.76em of ink against the King's 0.74,
// which is the right relationship for two characters against one.
// It scales from the LEFT, so all thirteen ranks share a starting
// line; from the centre the one rank that most needs the fan's
// exposed band would start furthest into the card.
const TEN_SQUEEZE = 0.70;

// Where Rye's caps actually start inside a `line-height: 1` box.
// At 100px Rye reports fontBoundingBox 99 up / 26 down, so such a
// box carries −12.5px of half-leading and its baseline sits 86.5px
// down; a cap's own ascent is 75.7px, putting its printed top
// 10.8px below the line box. Subtracting exactly that from `gy`
// lands the printed top of the glyph on `gy` at every size.
const RYE_CAP_LEAD = 0.108;

// The border a hand card wears. Absolute positioning is always
// relative to the PADDING box, which sits inside that border, so a
// hand card's anchors are inset by this much less than a Scraps
// card's to put both numerals the same distance from the card's own
// outer edge. Miss it and the two faces print their ranks 6px apart
// and stop reading as one system.
const FACE_BORDER = 6;

// Spoken names. A card is a rank and nothing else now, so a label
// is one word: "king", "nine". Two cards in a pile can share one,
// which is correct — with no suit they are genuinely interchangeable
// and a screen-reader user gains nothing from being told apart.
export function cardLabel(card){
  if(!card) return 'card';
  return card.rank === 'A' ? 'ace' : card.rank === 'K' ? 'king'
    : card.rank === 'Q' ? 'queen' : card.rank === 'J' ? 'jack' : card.rank;
}

// ─────────────────────────────────────────────────────────────
// WEAR — what makes a Scraps pile read as a heap of torn paper
// rather than a neat row of cards.
//
// ONE SEEDED SCALAR PER CARD DRIVES EVERYTHING. That is the whole
// design and it is easy to get wrong in a way that looks fine in
// code: ten independent randoms at equal strength average out
// across seven cards, and the pile comes back reading as uniformly
// scruffy — texture, not objects. One varying dimension, skewed so
// most cards sit mid-range and a minority are wrecked, is what
// makes them read as individual pieces of paper.
//
// PURE FUNCTION OF CARD ID, memoised, and that is load-bearing for
// motion rather than for looks. Card flight is FLIP: the state
// change commits first, then a ghost is measured from the real
// card's box at both ends. A card that re-rolled its own tear or
// lean between renders would shimmer at rest and, worse, change
// shape mid-flight while a ghost was standing in for it.
//
// ROTATION IS DECOUPLED FROM WEAR and capped low. An earlier bench
// scaled it with wear up to ±11.5°, which was fine under a small
// corner index and collides badly with a numeral that fills the
// card. The tear and the stains carry the character now; the lean
// only has to break the row.
// ─────────────────────────────────────────────────────────────
const ROT_MAX = 4;

function rand(seed){
  let s = (seed >>> 0) || 0x9E3779B9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

// Card ids are integers in a real deal and strings in the
// storyboard's sample hands, so both have to hash.
function hashId(id){
  if (typeof id === 'number') return (id * 7919) >>> 0;
  const str = String(id);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const LOOKS = new Map();

function scrapLook(id, aspect){
  const key = `${id}|${aspect.toFixed(2)}`;
  const hit = LOOKS.get(key);
  if (hit) return hit;

  const r = rand(hashId(id));
  r();                          // discard: xorshift's first draw correlates with the seed
  const wear = Math.pow(r(), 0.68);   // 0..1, skewed low

  // ── the torn outline ──────────────────────────────────────
  // Every point bites INWARD only. A clip-path cannot paint
  // outside the box anyway, and an outward jitter would just
  // clamp — which reads as a straight edge with nicks in it.
  // Percentages are of width on x and height on y, so the x
  // amplitude is divided by the aspect to bite equal pixels on
  // all four sides.
  const bx = 1.3 + 4.2 * wear;
  const by = bx / aspect;
  const N = 5;
  const pt = [];
  const at = (x,y) => pt.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  // A corner comes clean off above the threshold. Always a BOTTOM
  // corner: the numeral is anchored top-left and the fan and the
  // pile both expose a card's left band, so a bottom corner is the
  // one piece of a card that can go missing without costing a rank.
  const cut  = wear > 0.72 ? 13 + 13 * r() : 0;
  const cutL = r() < 0.5;

  for (let i = 0; i <= N; i++) at((i/N)*100, r()*by);            // top, L→R
  for (let i = 1; i <  N; i++) at(100 - r()*bx, (i/N)*100);      // right, T→B
  if (cut && !cutL) {                                            // bottom-right torn off
    at(100 - r()*bx, 100 - cut/aspect);
    at(100 - cut,    100 - r()*by);
  }
  for (let i = 1; i <  N; i++) at(100 - (i/N)*100, 100 - r()*by);// bottom, R→L
  if (cut && cutL) {                                             // bottom-left torn off
    at(cut,    100 - r()*by);
    at(r()*bx, 100 - cut/aspect);
  }
  for (let i = 1; i <  N; i++) at(r()*bx, 100 - (i/N)*100);      // left, B→T

  // ── what is printed on the paper ──────────────────────────
  // All of it goes into ONE element's background-image stack
  // rather than a layer of divs per card: a pile is 7 cards and
  // a table holds two piles, so 14 cards × 8 layers is 112 DOM
  // nodes that never change and never need to exist.
  const px = [];
  // Stains — soft, irregular, brown. Count and size both climb.
  const stains = 1 + Math.round(wear * 3);
  for (let i = 0; i < stains; i++){
    const x = 8 + r() * 84, y = 8 + r() * 84;
    const rw = (10 + r() * 26) * (0.55 + wear * 0.75);
    const rh = rw * (0.62 + r() * 0.7);
    const a  = (0.05 + r() * 0.09) * (0.45 + wear);
    px.push(`radial-gradient(ellipse ${rw.toFixed(0)}% ${rh.toFixed(0)}% at ${x.toFixed(0)}% ${y.toFixed(0)}%, `
      + `rgba(96,62,30,${a.toFixed(3)}) 0%, rgba(96,62,30,${(a*0.55).toFixed(3)}) 46%, rgba(96,62,30,0) 74%)`);
  }
  // Foxing — the small rust specks old paper gets. Tiny, many.
  const specks = 2 + Math.round(wear * 7);
  for (let i = 0; i < specks; i++){
    const x = 5 + r() * 90, y = 5 + r() * 90;
    const rad = (0.9 + r() * 1.6).toFixed(2);
    const a = (0.14 + r() * 0.26) * (0.4 + wear);
    px.push(`radial-gradient(circle ${rad}px at ${x.toFixed(0)}% ${y.toFixed(0)}%, `
      + `rgba(112,58,24,${a.toFixed(3)}) 0%, rgba(112,58,24,0) 100%)`);
  }
  // One crease, with a lit side and a shadowed side. Two hairlines
  // 1px apart is the whole trick: paper that has been folded
  // catches light on the near face of the fold and loses it on the
  // far one, and a single grey line reads as a scratch instead.
  const cAng = (r() * 130 - 65).toFixed(0);
  const cPos = (28 + r() * 44).toFixed(0);
  const cA   = (0.10 + wear * 0.18).toFixed(3);
  px.push(`linear-gradient(${cAng}deg, rgba(0,0,0,0) calc(${cPos}% - 1px), `
    + `rgba(255,252,242,${(cA*1.5).toFixed(3)}) ${cPos}%, `
    + `rgba(74,46,20,${cA}) calc(${cPos}% + 1px), rgba(0,0,0,0) calc(${cPos}% + 2px))`);
  // Overall grubbiness of the stock itself, darkening from the
  // bottom where a card sitting in a pile collects the most.
  px.push(`linear-gradient(168deg, rgba(74,46,20,0) 40%, rgba(74,46,20,${(0.04 + wear*0.11).toFixed(3)}) 100%)`);

  const look = {
    wear,
    rot:   (r() * 2 - 1) * ROT_MAX,
    clip:  `polygon(${pt.join(',')})`,
    paint: px.join(','),
    // Edge grime. An INSET box-shadow is the right tool on a
    // clipped element and the only kind that is: it is painted
    // inside the box and then clipped with everything else,
    // whereas an outer box-shadow ignores clip-path entirely and
    // draws the rectangle the card no longer is.
    grime: `inset 0 0 ${(4 + wear*9).toFixed(0)}px rgba(64,38,14,${(0.10 + wear*0.20).toFixed(3)}),`
         + `inset 0 0 ${(1.5 + wear*2).toFixed(1)}px rgba(48,28,10,${(0.14 + wear*0.22).toFixed(3)})`,
    inkFade: 1 - wear * 0.24,
    inkRot:  (r() * 2 - 1) * (0.6 + wear * 1.4),
  };
  LOOKS.set(key, look);
  return look;
}
// Enter and Space are what a native button responds to; anything acting
// like a button has to answer both or it is a button in appearance only.
export function buttonKeys(fn){
  return (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
}

export function sortByValue(cards){ return [...cards].sort((a,b)=>a.value-b.value); }

// ─────────────────────────────────────────────────────────────
// CardBackSVG — NEUTRAL back: a quiet dusk ridgeline scene.
// Three soft, hand-drawn hill layers recede into a warm haze,
// with a low ember glow standing in for the sun. Deliberately
// quiet so the player's own hand and the action zone stay the
// brightest things on the table — no framing device, no crest.
// Uses ember (not gold) and slate (not voltage) on purpose: this
// renders on every face-down card regardless of owner, including
// the opponent's hand, and gold/voltage are reserved tokens
// ("milestone only" and "yours / act now") that must never appear
// on a neutral, owner-agnostic surface.
// ─────────────────────────────────────────────────────────────
// CardFaceRidge — the mountains, printed faintly on the FACE.
//
// Added 2026-08-30. The ridge illustration already existed and was
// good, but it lived only on CardBackSVG — which you see on the
// opponent's hidden hand, the deck and the discard, and never on a
// card you are holding. So the game's one piece of real identity art
// was on the surfaces the player looks at least. This puts the same
// range across the bottom of every card you hold.
//
// Faint on purpose: it is GROUND under the rank, never a signal. The
// rank and pip must stay the loudest thing on a card, and the printed
// red measures 5.20:1 on frost, which is not a number to spend on
// decoration. Same path language as the back so the two read as one
// world, redrawn shallower because a card face is mostly empty at the
// bottom and the fan overlaps the left edge of every card but one.
function CardFaceRidge({ w, h }) {
  return (
    <svg width={w} height={h} viewBox="0 0 120 178" preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{position:'absolute',left:0,right:0,bottom:0,width:'100%',height:'100%',
        pointerEvents:'none',zIndex:0}}>
      <path d="M0,132 C18,118 36,126 58,110 C80,94 98,118 120,104 L120,178 L0,178 Z"
        fill={DS.canopy} opacity="0.085"/>
      <path d="M0,150 C20,134 42,144 64,124 C84,106 102,132 120,120 L120,178 L0,178 Z"
        fill={DS.canopy} opacity="0.115"/>
    </svg>
  );
}

export function CardBackSVG({ w, h }) {
  return (
    <svg width={w} height={h} viewBox="0 0 120 178" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{position:'absolute',inset:0,borderRadius:12,display:'block'}}>
      <rect width="120" height="178" fill={DS.dusk}/>
      {/* low sun / moon glow — brighter, more saturated */}
      <circle cx="60" cy="46" r="22" fill={DS.ember} opacity="0.20"/>
      <circle cx="60" cy="46" r="11" fill={DS.ember} opacity="0.42"/>
      {/* a few stars for extra texture */}
      <circle cx="22" cy="22" r="1.4" fill={DS.frost} opacity="0.4"/>
      <circle cx="96" cy="16" r="1.1" fill={DS.frost} opacity="0.32"/>
      <circle cx="80" cy="34" r="1" fill={DS.frost} opacity="0.28"/>
      {/* back ridge — furthest, saturated canopy */}
      <path d="M0,118 C18,100 38,112 60,96 C82,80 100,106 120,90 L120,178 L0,178 Z"
        fill={DS.canopy} opacity="0.45"/>
      {/* mid ridge */}
      <path d="M0,140 C16,120 36,134 58,116 C80,98 98,128 120,112 L120,178 L0,178 Z"
        fill={DS.canopy} opacity="0.72"/>
      {/* near ridge — darkest, fully opaque */}
      <path d="M0,160 C20,138 44,152 66,130 C86,110 102,140 120,126 L120,178 L0,178 Z"
        fill={DS.ink}/>
      {/* winding river, brighter ember */}
      <path d="M0,172 C24,166 30,176 52,170 C74,164 82,174 120,168"
        fill="none" stroke={DS.ember} strokeWidth="1.8" opacity="0.4" strokeLinecap="round"/>
      {/* pronounced frame so backs stand out against each other and the table —
          slate, matching PlayingCard's own face-down border, not a single extra ring */}
      <rect x="3" y="3" width="114" height="172" rx="9" fill="none"
        stroke={DS.slate} strokeWidth="2.5" opacity="0.7"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// PlayingCard — one big numeral, and two materials.
//
// TWO FACES, TOLD APART BY MATERIAL ALONE. A card in your hand is
// crisp `frost` cream with a heavy ink edge and square corners. The
// moment it lands in a Scraps pile it is torn, stained, creased and
// leaning on weathered stock. Nothing else marks the difference: no
// suit, no corner notch, no colour coding, no second ink. That is
// the point of the redesign rather than a simplification of it —
// the old dark Scraps card read as the more expensive object of the
// two, which inverted what the game is about.
//
// THE NUMERAL IS LEFT-ANCHORED, and that is arithmetic, not taste.
// Cards overlap on both surfaces and card i's exposed band is
// 0 → step. A CENTRED glyph of width g survives only while
// g ≤ 2·step − W, which at the fan's floor (MIN_EXPOSED.up = 0.34)
// has no solution at any size. Anchored left at the padding it
// survives every step the layout can produce.
//
// The counter-intuitive half, worth keeping in mind before anyone
// "fixes" a squeezed fan: GOING BIG MAKES THE SQUEEZE MORE ROBUST,
// not less. A left-anchored numeral at full card height is still
// identifiable from its left third, because that third carries the
// full height and the most distinctive part of the glyph. Shrinking
// it back down is what recreates the problem.
// ─────────────────────────────────────────────────────────────
export function PlayingCard({ card, faceDown=false, isScrap=false, selected=false,
  selectable=false, dimmed=false, onClick, size='normal', kraft=false,
  extraStyle={}, wiggle=false, shake=false, fading=false, fadingIn=false, liftTransform=true,
  registerEl=null, hidden=false }) {

  // The motion system measures this node to build a card's real
  // flight path, and hides it (visibility, so LAYOUT SURVIVES —
  // display:none would collapse the fan and move every sibling)
  // while a ghost is standing in for it mid-flight.
  //
  // LAYOUT effect, not a passive one, and deliberately so. A card
  // moving hand → Scraps unmounts under one parent and mounts
  // under another; the motion hook measures destinations in its
  // own layout effect, and layout effects run child-first, so
  // registering here is the only way the new node exists in the
  // registry in time to be measured. The unregister also passes
  // its node so a late cleanup from the OLD mount cannot delete
  // the NEW mount's entry.
  const selfRef = useRef(null);
  useLayoutEffect(() => {
    if (!registerEl || !card) return;
    const el = selfRef.current;
    registerEl(card.id, el);
    return () => registerEl(card.id, null, el);
  }, [registerEl, card && card.id]);

  const d=CARD_DIMS[size]||CARD_DIMS.normal;
  const ink=DS.ink;
  // Height is IDENTICAL for all thirteen ranks and only the advance
  // width changes: a "10" is condensed horizontally rather than set
  // smaller. Scaling two-character ranks down (the old .82, and a
  // bench's .62) is the thing Stan called out — it makes the 10
  // visibly shorter than every other card in the pile, which reads
  // as a different kind of card rather than a wider glyph.
  //
  // The origin is LEFT, not centre. With origin centre a condensed
  // 10 pulls its own left edge inward by half the saved width, so
  // the one rank that most needs the exposed band starts further
  // into the card than every other rank. Left origin puts all
  // thirteen on the same starting line.
  const isTwoDigit=card&&card.rank==='10';

  let bg,border,shadow,clip,paint,grime,glyphStyle;
  if(faceDown){
    bg='transparent';
    // Pronounced outline: neighboring face-down cards need a real edge
    // to read as separate objects, not a merged silhouette.
    border=`4px solid ${DS.slate}`;
    shadow='0 4px 14px rgba(0,0,0,.55)';
  } else if(isScrap){
    const look=scrapLook(card?card.id:0, d.h/d.w);
    bg=kraft?DS.stockKraft:DS.stockPale;
    border='none';
    clip=look.clip;
    paint=look.paint;
    grime=look.grime;
    glyphStyle={opacity:look.inkFade,
      transform:`rotate(${look.inkRot.toFixed(2)}deg)${isTwoDigit?` scaleX(${TEN_SQUEEZE})`:''}`};
    // NO box-shadow on a torn card: box-shadow ignores clip-path and
    // draws the rectangle the card has stopped being. The contact
    // shadow is a `drop-shadow` filter below, which follows the
    // clipped silhouette — and it is kept TIGHT on purpose. A pile
    // gets ONE pooled shadow under the whole heap (see
    // HorizontalScrapsZone); per-card drop shadows at the old
    // `0 4px 18px` made seven scraps read as seven cards hovering
    // over the table rather than one heap lying on it.
    shadow='none';
  } else {
    bg=DS.frost;
    border=selected?`6px solid ${DS.voltage}`:`6px solid ${DS.ink}`;
    // A LIT LEADING EDGE, and it is legibility work rather than
    // decoration. Cards in a fan overlap left to right, so at the
    // seam you read: this card's near-black rank, then the next
    // card's near-black 6px border, then its frost face. Two blacks
    // with nothing between them, so a clipped rank appeared to run
    // on into its neighbour — measured at the stacked layout's floor,
    // where 7 cards expose 54% of each other and "10 J Q K" came
    // back as one smear. A hairline of frost down the left edge
    // separates the two blacks and reads as light catching the edge
    // of a card lying on another, which is what it is.
    const litEdge = `-1.5px 0 0 ${DS.frost}A6`;
    shadow=selected?`${litEdge},0 0 0 3px ${DS.voltage}66,0 -18px 28px ${DS.voltage}44`
                   :`${litEdge},0 4px 18px rgba(0,0,0,.45)`;
    glyphStyle=isTwoDigit?{transform:`scaleX(${TEN_SQUEEZE})`}:undefined;
  }

  const animName = shake?'cardShake':wiggle?'cardWiggle':undefined;
  // One filter string, because a second `filter` declaration replaces
  // the first rather than adding to it. Order matters: the tint runs
  // before the shadows so a dimmed card's shadow is not also greyed.
  const filters=[];
  if(dimmed) filters.push('grayscale(1)','brightness(0.5)');
  if(isScrap){
    // Offset LEFT, which is the physically correct answer for this
    // heap and not a style choice: cards are laid left to right and
    // each one covers the RIGHT side of the one before it, so a
    // shadow thrown leftward falls on the card underneath and draws
    // the seam between them. A centred shadow separates two cards
    // vertically and two overlapping ranks not at all — which is
    // what a full pile needs most, since a 7-card pile exposes only
    // ~72% of each card and the ink of neighbouring ranks comes
    // within a few pixels of touching.
    filters.push('drop-shadow(-2px 2px 2px rgba(0,0,0,.45))','drop-shadow(0 3px 4px rgba(0,0,0,.3))');
    // Selection on a torn card cannot be a border — a border follows
    // the box, and the box is not the shape any more. A voltage
    // drop-shadow traces the real tear, which is the same language
    // the zone cue speaks.
    if(selected) filters.push(`drop-shadow(0 0 1px ${DS.voltage})`,`drop-shadow(0 0 7px ${DS.voltage})`);
  }

  return (
    <div ref={selfRef} onClick={onClick} data-card-id={card?card.id:undefined}
      // `live-cue-*` marks motion that is the ONLY carrier of a state, so
      // the reduced-motion block in index.html can hand it a static
      // substitute instead of simply deleting the signal. See the comment
      // above that block.
      className={animName === 'cardWiggle' ? 'live-cue-card'
        : animName === 'cardShake' ? 'live-cue-busy' : undefined}
      style={{
      visibility:hidden?'hidden':'visible',
      width:d.w,height:d.h,
      // A torn card has no radius to round: the clip path IS its
      // outline, and a border-radius under it only rounds corners
      // the tear may already have taken off.
      borderRadius:isScrap&&!faceDown?0:12,
      clipPath:clip,
      background:faceDown?'transparent':bg,
      backgroundImage:paint,
      border,boxShadow:grime||shadow,
      transform:selected?(liftTransform?'translateY(-22px) scale(1.07)':'none'):'none',
      transition:'transform 0.44s cubic-bezier(.34,1.4,.64,1),box-shadow 0.4s,border-color 0.3s,opacity 0.6s',
      // Cards are fully opaque. `dimmed` (an ineligible card in discard
      // mode) used to drop to 0.28 alpha, which let the table show
      // through the card and made it read as a hole rather than a
      // card that cannot be picked. It desaturates and darkens
      // instead, so the signal survives without any transparency.
      // `fading`/`fadingIn` stay: those are the FLIP flight and the
      // deal, transient by definition rather than a resting state.
      opacity:fading?0:fadingIn?0.15:1,
      filter:filters.length?filters.join(' '):undefined,
      animation:fadingIn?'cardFadeIn 0.5s ease forwards':animName?`${animName} 0.5s ease-in-out infinite alternate`:undefined,

      display:'block',
      padding:0,
      position:'relative',overflow:'hidden',
      flexShrink:0,userSelect:'none',
      cursor:(selectable||onClick)?'pointer':'default',
      boxSizing:'border-box',
      ...extraStyle,
    }}>
      {faceDown&&<CardBackSVG w={d.w} h={d.h}/>}
      {/* The ridge survives on the HAND card and goes from the Scraps
          card. It is the game's one piece of identity art on a
          player-facing surface, and with the splash losing its four
          suit glyphs in the same pass, stripping it here would have
          taken the last identity mark off every screen the player
          actually looks at. On a scrap the tear and the stains carry
          all the character the card needs, and a printed illustration
          under them reads as clutter. It sits in the bottom third at
          ~10% opacity, clear of a numeral anchored to the top. */}
      {!faceDown&&!isScrap&&card&&<CardFaceRidge w={d.w} h={d.h}/>}
      {!faceDown&&card&&(
        <div style={{position:'absolute',
          left:d.gx-(isScrap?0:FACE_BORDER),
          top:d.gy-(isScrap?0:FACE_BORDER)-d.rank*RYE_CAP_LEAD,
          lineHeight:1,zIndex:1,pointerEvents:'none'}}>
          <span style={{display:'inline-block',transformOrigin:'left center',
            fontFamily:F.card,fontWeight:400,fontSize:d.rank,color:ink,
            lineHeight:1,whiteSpace:'nowrap',...glyphStyle}}>{card.rank}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GlowPulse — "act on THIS pile".
//
// It is now the only thing saying which pile you are meant to act
// on, because the 2px ownership border that used to say it went
// with the box. That makes it load-bearing for the Ace strike:
// without it the strike is a choice between two piles with nothing
// marking either.
//
// IT NO LONGER DRAWS A RING, and that is the whole reason this
// component was reworked rather than left alone. It used to pulse
// `box-shadow: 0 0 0 3px` → `0 0 0 5px`, which traced the edge of
// whatever it wrapped. Wrapped around a panel that read as a lit
// panel; wrapped around an invisible div holding a heap of torn
// paper it would trace a glowing rounded rectangle in empty space,
// putting back the exact frame the redesign removes.
//
// So it is a `drop-shadow` FILTER instead. A filter on a parent
// operates on the rendered alpha of everything inside it, and
// everything inside it is the cards — so the glow hugs the real
// torn silhouettes, in the gaps between cards included. One
// animated element for the whole pile rather than a filter per
// card, which matters at seven cards a pile and two piles a table.
//
// The colour travels as a custom property because the keyframes
// are shared and the two piles glow in different tokens: voltage
// for yours, ember for hers.
//
// WHAT MUST NOT GO INSIDE IT: anything that is not a card. The
// pooled contact shadow under the pile is deliberately a sibling,
// not a child — a soft dark blob inside this element would be part
// of the alpha the filter traces, and the glow would go back to
// being a fuzzy rectangle by a different route.
// ─────────────────────────────────────────────────────────────
export function GlowPulse({ active, color=DS.voltage, children, style:extStyle={} }) {
  return (
    <div className={active ? 'live-cue-zone' : undefined}
      style={{'--glow':color,
      filter:active?`drop-shadow(0 0 3px ${color}) drop-shadow(0 0 10px ${color}aa)`:undefined,
      animation:active?'zoneGlow 1.6s ease-in-out infinite':'none',
      ...extStyle}}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FannedHand
// ─────────────────────────────────────────────────────────────
// How far a selected (or opponent-signalled) card lifts out of the
// fan, as a share of the card's height. It was a flat 28px, which
// is a fifth of a full-size card and a THIRD of a tiny one — the
// compact layout paid for a lift nobody asked for on the one row
// that could least afford the height.
const LIFT_RATIO = 0.19;
// A hand carrying the Play Ace tag has to clear it: the tag is a
// real touch target now (it used to be a 39px cursor target) plus
// the 5px it floats above the card. One reservation for both
// layouts, so an orientation change does not move the fan under the
// player's thumb — which is also why this tracks ACE_TAG_MIN rather
// than either touch constant, the tag having stopped varying with
// the layout when it got a floor of its own.
const SLOT_ROOM = ACE_TAG_MIN + 5;
// A card never shows less of itself than this fraction of its
// width, however tight the fan gets: below it the rank in the
// top-left corner starts disappearing under the next card and the
// fan stops being readable at all.
//
// A FACE-DOWN fan has no rank to protect. All it has to say is how
// many cards are there, so it is allowed to close up far tighter —
// which is what lets the opponent's seven-card hand share a row
// with the deck and discard on a 375px screen.
const MIN_EXPOSED = { up: 0.34, down: 0.13 };

export function FannedHand({ cards, selectedIds=new Set(), tradeSelectedIds=new Set(),
  onCardClick, faceDown=false, selectable=false,
  wiggleIds=new Set(), activeWiggle=false, aiSignaledIds=new Set(),
  shakeIds=new Set(), fadingIds=new Set(), fadingInIds=new Set(), waveIds=new Set(),
  registerEl=null, hiddenIds=new Set(), cardSlot=null,
  size='normal', maxWidth=null }) {

  const sorted=faceDown?cards:sortByValue(cards);
  const count=sorted.length;
  const d=CARD_DIMS[size]||CARD_DIMS.normal;
  const W=d.w;
  // Step between neighbouring cards. The open-hand default is the
  // old `spread*2`, restated as the distance it always was; when a
  // maxWidth is given the fan closes up to honour it, never past
  // MIN_EXPOSED.
  const openStep=Math.min(84,Math.max(44,480/Math.max(count,1)))*(W/104);
  const room=maxWidth!=null&&count>1?(maxWidth-W)/(count-1):Infinity;
  const step=Math.max(W*(faceDown?MIN_EXPOSED.down:MIN_EXPOSED.up),Math.min(openStep,room));
  // The container used to be `count*step + W` wide, which is a full
  // card-and-a-bit wider than the fan it holds — the outermost card
  // sits at (count-1)/2 steps from centre, not count/2. That dead
  // margin on both sides is most of why the table needed a
  // horizontal scrollbar below ~900px.
  const span=(count-1)*step+W;
  const lift=Math.round(d.h*LIFT_RATIO);
  const head=faceDown?lift+4:Math.max(lift+4,SLOT_ROOM);
  // Cards fan DOWNWARD as well (ty below), so the box owes them a
  // little floor too.
  const foot=Math.ceil(Math.max(0,(count-1)/2)*3)+6;

  return (
    <div style={{padding:0}}>
      <div style={{position:'relative',height:d.h+head+foot,
        width:Math.max(span,W),
        display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
        {count===0&&(
          <div style={{border:`2px dashed ${DS.slate}44`,borderRadius:12,width:W,height:d.h,
            display:'flex',alignItems:'center',justifyContent:'center',
            color:DS.slate+'66',fontSize:16,fontFamily:F.mono}}>empty</div>
        )}
        {sorted.map((card,i)=>{
          const offset=count===1?0:(i-(count-1)/2);
          const rot=offset*(count<=3?4:2.8);
          const tx=offset*step;
          const ty=Math.abs(offset)*3;
          const isSel=selectedIds.has(card.id);
          const isTradeSel=tradeSelectedIds.has(card.id);
          // Only a card the player can actually act on becomes a stop
          // on the tab order; the opponent's face-down fan must not be.
          const interactive = !faceDown && selectable && !!onCardClick;
          const isAiSig=aiSignaledIds.has(card.id);
          const doWiggle=wiggleIds.has(card.id)||(activeWiggle&&!isSel&&!faceDown);
          // Slot width is the card's exposed share of the fan, not the
          // full card width: two Aces sitting next to each other would
          // otherwise overlap their tags by the fan's overlap amount.
          const slotW=Math.min(W,Math.round(step));
          const slot=cardSlot?cardSlot(card,slotW):null;
          // A slot (today: the Play Ace button) has to move with its
          // card, wiggle included. So when one is present the wiggle
          // moves up to a wrapper around BOTH, and the card itself
          // stops wiggling — otherwise the two would lean out of sync.
          const body=(
            <PlayingCard card={card} faceDown={faceDown} isScrap={false} size={size}
              selected={isSel} selectable={selectable&&!faceDown} liftTransform={false}
              registerEl={registerEl} hidden={hiddenIds.has(card.id)}
              fadingIn={fadingInIds&&fadingInIds.has(card.id)}
              wiggle={doWiggle&&!slot}
              shake={shakeIds.has(card.id)}
              fading={fadingIds.has(card.id)}
              extraStyle={isTradeSel?{border:`6px solid ${DS.voltage}`,
                boxShadow:`0 0 0 3px ${DS.voltage}55`}:{}}
            />
          );
          return (
            <div key={card.id}
              {...(interactive ? {
                role:'button', tabIndex:0,
                'aria-pressed': isSel,
                'aria-label': `${cardLabel(card)}${isSel ? ', selected' : ''}`,
                onKeyDown: buttonKeys(() => onCardClick(card)),
              } : {})}
              style={{
              position:'absolute',bottom:foot,left:'50%',
              transform:isSel||isAiSig
                ?`translateX(calc(-50% + ${tx}px)) translateY(${ty-lift}px) rotate(${rot}deg)`
                :`translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg)`,
              transition:'all 0.56s cubic-bezier(.34,1.2,.64,1)',
              zIndex:slot?count+5:i,
            }} onClick={()=>onCardClick&&onCardClick(card)}>
              {/* The ruffle animates `transform`, and so does THIS card's
                  fan placement — `translateX(calc(-50% + tx))` is what
                  puts it in its slot. A running animation's transform
                  REPLACES the element's own for its whole duration, so
                  running the ruffle on the positioned wrapper stripped
                  each card's translateX in turn and dropped it at
                  `left:50%`, on top of its neighbours. Left to right,
                  card after card, which read as the hand blinking out
                  and back. The old `waveUp` had the same flaw.
                  So the animation lives on an INNER element with no
                  placement of its own, and the two transforms compose
                  instead of one overwriting the other. */}
              <div style={{animation: waveIds.has(card.id)
                ? 'cardRuffle 0.34s cubic-bezier(.33,.9,.4,1)' : undefined}}>
                {slot?(
                  <div className={doWiggle ? 'live-cue-card' : undefined}
                    style={{position:'relative',
                    animation:doWiggle?'cardWiggle 0.5s ease-in-out infinite alternate':undefined}}>
                    <div style={{position:'absolute',bottom:'100%',left:0,width:'100%',
                      marginBottom:5,display:'flex',justifyContent:'center'}}>{slot}</div>
                    {body}
                  </div>
                ):body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// DeckPile and DiscardPile used to live here — two labelled card
// stacks that gave the dealing wave and every discard a physical
// origin on the table. Both were removed on 2026-09-13 (Stan's call):
// neither was something a player ever acted on, and between them they
// cost the wide layout a gutter column and the stacked layout a row.
//
// Nothing replaces them as COMPONENTS. The flights they anchored are
// anchored by computed off-viewport rects instead — see deckAnchor and
// discardAnchor in GameScreen.jsx — so cards deal in over the dealer's
// edge of the screen and thrown-away cards spin off the left one.
// Deleted rather than left unreferenced so that a later pass does not
// find two ready-made piles and put the furniture back by accident.

// ─────────────────────────────────────────────────────────────
// Best-hand evaluation + upgrade-flash hook (shared by the
// zone badges and the under-hand change-detector). Flashes
// ONLY when the hand category upgrades (Pair → Trips, etc.) —
// never on a downgrade or a same-category reshuffle.
// ─────────────────────────────────────────────────────────────
function useBestHand(cards) {
  const best = cards.length > 0 ? evaluateBestHand(cards) : null;
  const prevRank = useRef(null);
  const [flash, setFlash] = useState(false);
  const rank = best ? best.rank : null;
  useEffect(() => {
    if (rank == null) { prevRank.current = null; return; }
    if (prevRank.current != null && rank > prevRank.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      prevRank.current = rank;
      return () => clearTimeout(t);
    }
    prevRank.current = rank;
  }, [rank]);
  return { best, flash };
}

// Compact badge that lives INSIDE a Scraps zone header. Owner
// determines the color story: player = voltage by strength,
// opponent = ember when threatening, slate otherwise.
function ZoneBadge({ cards, owner, fontSize=13 }) {
  const { best, flash } = useBestHand(cards);
  // `emberHover`, not `ember`, and not for a hover reason: this badge is
  // 13px on the zone's inkLight fill, where plain ember measures 4.27:1 —
  // just under AA for text this size. emberHover is the same hue one step
  // brighter and measures 5.24:1. Both owners use it, since the player's
  // own badge turns ember at rank 5 too.
  let col;
  if (!best) col = DS.slate + '55';
  else if (owner === 'player') col = best.rank>=7?DS.voltage:best.rank>=5?DS.emberHover:best.rank>=3?DS.slateLight:DS.slate;
  else col = best.rank>=5?DS.emberHover:DS.slate;
  return (
    <span style={{
      fontFamily:F.mono,fontSize:fontSize,fontWeight:700,color:col,
      letterSpacing:'0.08em',whiteSpace:'nowrap',
      overflow:'hidden',textOverflow:'ellipsis',display:'inline-block',maxWidth:'100%',
      verticalAlign:'bottom',
      textShadow:flash?`0 0 14px ${col}`:'none',
      animation:flash?'badgeFlash 0.6s ease':'none',
      transition:'color 0.3s, text-shadow 0.3s'}}>
      {/* The `▸` that used to lead this badge is gone (Stan,
          2026-09-13). It pointed at nothing — the badge sits under or
          beside its own pile and the border already says which — and a
          glyph on a label that is nowrap and ellipsised was spending
          width the hand name needed. */}
      {best?best.name.toUpperCase():''}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// HandUpgradeBadge — under the player's hand. Subtle at rest;
// turns voltage and flashes only when the best hand upgrades,
// so it works as feedback instead of wallpaper.
// ─────────────────────────────────────────────────────────────
export function HandUpgradeBadge({ cards, fontSize=15 }) {
  const { best, flash } = useBestHand(cards);
  return (
    <div style={{
      fontFamily:F.mono,fontSize:fontSize,fontWeight:700,
      color:flash?DS.voltage:DS.slate,
      letterSpacing:'0.1em',textAlign:'center',
      minHeight:fontSize+6,padding:'2px 14px',borderRadius:8,
      background:flash?DS.voltage+'14':'transparent',
      boxShadow:flash?`0 0 20px ${DS.voltage}66`:'none',
      animation:flash?'badgeFlash 0.6s ease':'none',
      transition:'color 0.35s, box-shadow 0.35s, background 0.35s'}}>
      {best?best.name.toUpperCase():''}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HorizontalScrapsZone — a heap of torn paper lying on the table.
//
// THE BOX IS GONE: the `inkLight` fill, the 2px ownership border,
// the 12px radius, the padding and the header row all went on
// 2026-09-13. Cards lie directly on the timber. What the border
// used to do is now split three ways — ownership moved to the
// caption below and to the paper stock itself, and "act here"
// moved to GlowPulse, which had to stop drawing a rectangle for
// exactly the same reason (see its own header).
//
// HEAP APPEARANCE, SORTED ORDER. Those pull against each other and
// Stan resolved it in favour of sorting: `sortByValue` stays. The
// pile reads as a heap because the container, the even spacing, the
// zero rotation and the single uniform material are gone — not
// because the order is scrambled.
// ─────────────────────────────────────────────────────────────
// The pooled shadow's fixed box, sized for a FULL pile so the blob is
// only ever scaled DOWN — a gradient stretched past its natural size
// bands, and a pile is capped at 7 cards, so 7 is the honest maximum.
const SHADOW_BASE = (cardW) => cardW * 7 + 16;

export function HorizontalScrapsZone({ cards, label, selectable=false, selectedIds=new Set(),
  onCardClick, discardMode=false, isOpponent=false, glowZone=false,
  registerEl=null, hiddenIds=new Set(),
  size='small', width=340, fill=false }) {

  const sorted = sortByValue(cards);
  const labelCol = discardMode ? DS.voltage : isOpponent ? DS.ember : DS.voltage;
  const glowColor = isOpponent ? DS.ember : DS.voltage;
  const count = sorted.length;
  const d = CARD_DIMS[size] || CARD_DIMS.small;
  const cardW = d.w, cardH = d.h;
  const oneRowCaption = fill;
  const fs = fill && size === 'tiny' ? 11 : 13;

  // ── The re-sort, which is two motions that must not look alike ──
  // A card lands, the pile re-sorts, and the cards already there
  // slide sideways to make room. If both moved on the same curve
  // the arrival would be invisible inside the shuffle, so:
  //   • the ARRIVING card drops in with a settle — a small rotation
  //     overshoot and a few pixels of bounce. It is being thrown.
  //   • the DISPLACED cards slide on a longer, gentler, non-springy
  //     curve with no rotation change, nearest card first. They are
  //     being tidied.
  // The stagger is what sells "tidied" over "everything snapped at
  // once", and it is measured from the arriving card's slot.
  //
  // ARRIVAL IS KEYED ON BECOMING VISIBLE, not on entering the array.
  // A card flying in from the hand is in this pile's `cards` for the
  // whole flight while `hiddenIds` holds it invisible and a ghost
  // stands in. Keyed on the array, the settle would run and finish
  // under the ghost and the card would simply appear.
  const visKey = sorted.filter(c => !hiddenIds.has(c.id)).map(c => c.id).join(',');
  const prevVis = useRef(null);
  const [arrived, setArrived] = useState(null);
  useEffect(() => {
    const now = visKey ? visKey.split(',') : [];
    const before = prevVis.current;
    prevVis.current = now;
    if (before === null) return;                       // first paint deals in, it does not re-sort
    const fresh = now.filter(id => !before.includes(id));
    if (!fresh.length) return;
    setArrived(new Set(fresh));
    const t = setTimeout(() => setArrived(null), 700);
    return () => clearTimeout(t);
  }, [visKey]);
  const arrivedAt = arrived
    ? sorted.findIndex(c => arrived.has(String(c.id)) || arrived.has(c.id))
    : -1;

  // Fan overlap: compress as cards grow so the pile always fits.
  // The 20px that used to be the container's padding is kept as
  // breathing room, because a leaning card overhangs its own slot
  // and nothing may paint outside the viewport.
  const maxContainerW = width - 20;
  const naturalW = count * cardW;
  const overlap = count <= 1 ? 0 : Math.max(0, (naturalW - maxContainerW) / (count - 1));
  const step = cardW - overlap;
  const innerW = fill
    ? maxContainerW
    : Math.max(Math.min(cardW * 3, maxContainerW), Math.min(naturalW, maxContainerW));
  const lift = Math.round(cardH * 0.16);
  const pileW = count ? (count - 1) * step + cardW : cardW;
  // Room above for the select lift and for a leaning card's top
  // corner; room below for the same lean and the pooled shadow.
  const padTop = size === 'tiny' ? 6 : 8;
  const frameH = cardH + padTop + (size === 'tiny' ? 10 : 14);

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
      <div style={{position:'relative',width:innerW + 20,maxWidth:'100%',height:frameH,
        display:'flex',justifyContent:'center'}}>
        {/* ONE pooled contact shadow for the whole heap, and a
            SIBLING of GlowPulse rather than a child — a soft dark
            blob inside the glow's filter would be traced by it and
            turn the cue back into a fuzzy rectangle. Paper lying on
            a table has one shadow under the stack, not a lit drop
            shadow per card; the per-card shadows that survive are
            1px contact shadows, enough to separate two overlapping
            edges and nothing more. */}
        {count > 0 && (
          // It grows and shrinks by SCALE, not by width. The shadow has
          // to keep pace with the pile's own re-sort, which means it
          // animates every time a card lands — and `transition: width`
          // is a layout property, so that would run layout on every
          // frame of a 420ms curve, twice a table. A fixed box centred
          // by margin and scaled about its own middle is compositor-only
          // and lands in exactly the same place. `left:50%` plus a
          // negative margin rather than `translateX(-50%)`, because a
          // percentage translate resolves against the UNSCALED border
          // box and would drift the blob sideways as it scaled.
          <div aria-hidden="true" style={{position:'absolute',
            left:'50%',marginLeft:-(SHADOW_BASE(cardW) / 2),
            top:padTop + Math.round(cardH * 0.52),
            width:SHADOW_BASE(cardW),height:Math.round(cardH * 0.46),
            background:`radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.26) 46%, rgba(0,0,0,0) 74%)`,
            filter:'blur(5px)',pointerEvents:'none',zIndex:0,
            transformOrigin:'center',
            transform:`scaleX(${((pileW + 16) / SHADOW_BASE(cardW)).toFixed(4)})`,
            transition:'transform 0.42s cubic-bezier(.4,0,.2,1)'}}/>
        )}
        <GlowPulse active={glowZone} color={glowColor}
          style={{position:'relative',zIndex:1,width:'100%',height:'100%'}}>
          <div style={{position:'relative',width:'100%',height:'100%'}}>
            {count === 0 && (
              <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
                top:padTop,width:cardW,height:cardH,borderRadius:8,
                border:`2px dashed ${DS.slate}33`,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:DS.slate+'44',fontSize:13,fontFamily:F.mono}}>—</div>
            )}
            {sorted.map((card,i) => {
              // The zone used to treat every card as clickable whenever
              // the zone was selectable, while GameScreen's click handler
              // silently dropped cards with eligibleForDiscard false. The
              // two disagreed, so a locked card looked live and did
              // nothing on click. The flag decides both now, and locked
              // cards render dimmed.
              const isElig = selectable && card.eligibleForDiscard !== false;
              const isSel = selectedIds.has(card.id);
              const look = scrapLook(card.id, cardH / cardW);
              const isArrival = arrivedAt >= 0 && i === arrivedAt;
              // Nearest card to the arrival moves first. Capped, so a
              // seven-card pile does not take half a second to settle.
              const slideDelay = arrivedAt < 0 ? 0
                : Math.min(Math.abs(i - arrivedAt) * 60, 180);
              return (
                // A toggled card lifts STRAIGHT UP and keeps its own
                // place in the stack. It used to jump to the top of the
                // z-order and scale up, which threw it over the cards to
                // its right and hid whatever they showed. The pile reads
                // as a pile, so relative depth has to survive the toggle;
                // the vertical lift alone is what marks the selection.
                <div key={card.id} style={{
                  position:'absolute',
                  left: Math.round((innerW + 20 - pileW) / 2) + i * step,
                  top: padTop,
                  // The lean rides on this wrapper together with the
                  // placement, so the two compose in one transform
                  // instead of one replacing the other.
                  transform: `translateY(${isSel ? -lift : 0}px) rotate(${look.rot.toFixed(2)}deg)`,
                  transition:'transform 0.22s cubic-bezier(.34,1.2,.64,1), '
                    + 'left 0.42s cubic-bezier(.4,0,.2,1)',
                  transitionDelay:`0s, ${slideDelay}ms`,
                  zIndex: i,
                }}
                  {...(isElig && onCardClick ? {
                    role:'button', tabIndex:0,
                    'aria-pressed': isSel,
                    'aria-label': `${cardLabel(card)}${isSel ? ', selected' : ''}`,
                    onKeyDown: buttonKeys(() => { playSelect(); onCardClick(card); }),
                  } : {})}
                  onClick={()=>{ if(isElig){ playSelect(); onCardClick&&onCardClick(card); }}}>
                  {/* The settle animates `transform` and so does the
                      wrapper above, which owns this card's slot and its
                      lean. A running animation's transform REPLACES the
                      element's own for its whole duration, so running
                      the settle on the positioned wrapper would drop
                      every arriving card at left:0 with no lean for
                      0.62s. Same trap the opponent's ruffle hit in
                      FannedHand; same fix, an inner element with no
                      placement of its own. */}
                  <div className={isArrival ? 'scrap-settle' : undefined}>
                    <PlayingCard card={card} size={size} isScrap={true}
                      kraft={isOpponent}
                      selectable={isElig} selected={isSel} liftTransform={false}
                      registerEl={registerEl} hidden={hiddenIds.has(card.id)}
                      dimmed={selectable&&!isElig}/>
                  </div>
                </div>
              );
            })}
          </div>
        </GlowPulse>
      </div>
      {/* The caption is everything the header row and the border used
          to carry, set quiet. Ownership is the label's colour at 0.82
          alpha rather than a 2px rule around a panel, which is as loud
          as it needs to be once the two piles are also printed on two
          different papers.

          Side by side the two lines stack, because a 340px zone cannot
          hold "YOUR SCRAPS 5/7" and "FOUR OF A KIND" on one row —
          measured overflow was 61px on THREE OF A KIND. Stacked, the
          zone is the full width of the screen and the type is a notch
          smaller, so the pair shares one row and buys back a whole
          row per zone on the screen with the least height to spare. */}
      <div style={{display:'flex',flexDirection:oneRowCaption?'row':'column',
        alignItems:'center',justifyContent:'center',gap:oneRowCaption?8:1,
        marginTop:3,maxWidth:'100%',padding:'0 6px',minWidth:0}}>
        <span style={{fontFamily:F.mono,fontSize:fs,fontWeight:500,
          color:labelCol,opacity:0.82,
          letterSpacing:'0.14em',textTransform:'uppercase',whiteSpace:'nowrap',flexShrink:0}}>
          {label} <span style={{color:DS.slate,fontWeight:400}}>{cards.length}/7</span>
        </span>
        <span style={{minWidth:0,overflow:'hidden',
          ...(oneRowCaption?{flex:1,textAlign:'right'}:{minHeight:19})}}>
          <ZoneBadge cards={cards} owner={isOpponent?'opponent':'player'} fontSize={oneRowCaption?fs:15}/>
        </span>
      </div>
    </div>
  );
}
