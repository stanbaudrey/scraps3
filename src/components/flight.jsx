// ============================================================
// SCRAPS — Card motion
//
// Every card that moves on this table travels between two
// positions that are MEASURED, never guessed.
//
// The old system computed both ends by hand — "the hand is
// centered, so card i must be at handCenter + i*200" — and then
// removed the real card from state before the ghost launched.
// Neither end matched where the card actually was, so a card
// vanished from one place, a lookalike flew a plausible-ish
// path, and a card faded in somewhere else. That is the
// "disappearing and reappearing" this replaces.
//
// The approach here is FLIP, applied per card:
//
//   1. FIRST — before anything changes, read the real
//      getBoundingClientRect of each card that is about to move.
//      Cards register their DOM node by id (registerCard), so
//      this is the true on-screen box: fan rotation, selection
//      lift and all.
//   2. COMMIT — dispatch the whole state change at once. The
//      card is now really in its destination pile, laid out by
//      the same code that lays out every other card, so the
//      destination needs no prediction either.
//   3. LAST — in a layout effect (after React has written the
//      DOM but before the browser paints) read the destination
//      rect, hide the real card, and hand its box to a ghost.
//   4. PLAY — the ghost animates FIRST → LAST. When it lands it
//      is removed and the real card is unhidden, in the exact
//      pixel the ghost stopped on. No jump, ever.
//
// Because the state commit happens up front, skipping is
// trivial and always safe: drop the ghosts, unhide the cards,
// and the board is already correct.
// ============================================================
import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import { PlayingCard, CARD_DIMS } from "./cards.jsx";
import { TRAIL } from "./throwMotion.js";
import { DS } from "../styles/theme.js";

const DURATION = 620;
export const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};

const centerOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Where an element really is on screen: its centre, and the scale and
// SIGNED angle it is drawn at, every ancestor's transform included. For
// the few effects that have to stand a copy exactly on top of a live
// element that is leaning, like the ATTACK tag inside the hand's wiggle.
export function screenPose(el) {
  const r = el.getBoundingClientRect();
  const m = screenMatrix(el);
  return { x: r.left + r.width / 2, y: r.top + r.height / 2,
    scale: Math.hypot(m.a, m.b) || 1, rot: Math.atan2(m.b, m.a) * 180 / Math.PI };
}
const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// The transform an element actually ends up drawn with, composed all
// the way up the tree — the fan's per-card rotate AND the FitBox scale
// that fits the table to the viewport. getBoundingClientRect flattens
// both into an axis-aligned box and loses the angle; this keeps them.
export function screenMatrix(el) {
  let m = new DOMMatrix();
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const t = getComputedStyle(n).transform;
    // Ancestor transforms apply to the child's coordinates, so each
    // one pre-multiplies what we have accumulated so far.
    if (t && t !== 'none') m = new DOMMatrix(t).multiply(m);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────
// Ghost — one card in flight.
//
// It carries BOTH looks (source and destination) stacked, and
// cross-fades between them mid-flight, so a card leaving the
// hand for the Scraps pile visibly becomes a Scraps card on the
// way instead of switching at either end.
//
// SIZE IS A SCALE, NOT A CROSS-FADE (Stan, 2026-09-14: "when cards
// slide from hand to Scraps, they need to shrink to the Scraps card
// size while en route"). The old version drew each look at its own
// natural size and let the fade do the resizing — a 104px hand card
// with a 60px Scraps card fading in at its centre — so the card never
// shrank, it was replaced by a smaller one inside itself, and the
// larger look was still under it when it landed. Now the ghost's box
// is the SOURCE card's natural box for the whole trip, the
// destination look is pre-scaled to fill that same box, and the one
// transform scale carries the box from the measured source size to
// the measured destination size. The two looks fade across each
// other at identical size, and the card simply gets smaller (or, on
// a deal, bigger) as it travels. A card thrown to the discard from a
// pile is the same size at both ends and stays that size.
//
// The arc is perpendicular to the actual travel direction and
// scales with distance, so a short hop bows gently and a long
// cross-table throw bows more. The old version always arced
// 130px "up", which pushed downward moves through a pointless
// loop.
//
// SCALE is derived from each end's MEASURED box against the
// natural size of the SOURCE card, never from the two boxes
// against each other. Same reasoning as the FLIP rule above,
// applied to size instead of position: the ghost's box is a
// `fromSize` card, so the scale that makes it match the real card
// it left is from.width / (natural width of fromSize) — and the
// scale that lands it on the card it is becoming is
// to.width / (natural width of fromSize), with the destination
// look pre-scaled by natW(fromSize)/natW(toSize) inside the box.
//
// An older `from.width / to.width` compared the two ends to each
// other and drew the source card at it, so a hand→Scraps flight
// (104 → 80) launched a 104px card at 1.3x — 135px, a third
// larger than the card it was supposedly leaving. It also had no
// way to be right once the table itself is scaled to fit the
// viewport: both ends measure k times their natural size, and
// this form lands on k at both ends automatically.
// ─────────────────────────────────────────────────────────────
function Ghost({ flight, onDone }) {
  const { from, to, card, faceDown, fromScrap, toScrap, fromSize, toSize, arc, delay } = flight;
  const elRef = useRef(null);
  const toRef = useRef(null);
  const fromRef = useRef(null);
  const rafRef = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const a = useMemo(() => centerOf(from), []);
  const b = useMemo(() => centerOf(to), []);
  const natW = (sz) => (CARD_DIMS[sz] || CARD_DIMS.small).w;
  // trueW is present when the end was a real card (rotation removed);
  // the fixed piles pass a plain rect, which is unrotated anyway.
  const scale0 = (from.trueW || from.width) / natW(fromSize) || 1;
  // The box is the SOURCE card's natural box throughout (see the
  // header), so the landing scale is the destination's measured width
  // against THAT box — not against the destination card's own natural
  // width. `k` is how much the destination look has to be enlarged to
  // fill the source box; the two multiply out so that at e=1 the
  // destination look is drawn at exactly to.trueW.
  const k = natW(fromSize) / natW(toSize);
  const scale1 = (to.trueW   || to.width)   / natW(fromSize) || 1;
  const rot0 = from.rot || 0;
  const rot1 = to.rot   || 0;

  useEffect(() => {
    if (prefersReducedMotion()) { doneRef.current(); return; }
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Control point: midpoint pushed along the normal of the path.
    const bow = Math.min(110, dist * 0.22) * arc;
    const cp = { x: (a.x + b.x) / 2 + (-dy / dist) * bow,
                 y: (a.y + b.y) / 2 + (dx / dist) * bow };
    let start = 0;
    const step = (now) => {
      if (!start) start = now;
      const el = elRef.current;
      if (!el) return;
      const raw = (now - start - delay) / DURATION;
      const t = Math.max(0, Math.min(raw, 1));
      const e = easeInOut(t);
      const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * cp.x + e * e * b.x;
      const y = (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * cp.y + e * e * b.y;
      const s = scale0 + (scale1 - scale0) * e;
      // Lean out of the angle the card was sitting at and into the
      // angle it lands at, with the arc's flourish laid over the top.
      const rot = rot0 + (rot1 - rot0) * e + arc * 9 * Math.sin(e * Math.PI);
      el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${rot}deg) scale(${s})`;
      if (toRef.current) {
        // Cross-fade the two looks across the middle of the trip. Both
        // fade — the source out as the destination comes in — because
        // they are the same size now and a torn Scraps look on top of
        // an intact hand card would show the hand card's edges through
        // every bite of the tear.
        const mix = Math.max(0, Math.min((e - 0.35) / 0.35, 1));
        toRef.current.style.opacity = String(mix);
        if (fromRef.current) fromRef.current.style.opacity = String(1 - mix);
      }
      if (raw < 1) rafRef.current = requestAnimationFrame(step);
      else doneRef.current();
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const sameLook = fromScrap === toScrap && fromSize === toSize;

  return (
    <div ref={elRef} data-flight={card ? card.id : 'anon'} data-face={faceDown ? 'down' : 'up'} style={{
      position:'fixed', left:0, top:0, zIndex:1000, pointerEvents:'none',
      // '0 0', NOT the default centre. The inner div centres the card
      // on this element's origin, so the origin is the card's centre —
      // but scale/rotate default to pivoting about the element's own
      // box centre, half a card away. That pushed frame one up and to
      // the left of the card it was replacing (measured: 3.4px left,
      // 4.8px up) and put the landing slightly off the real card too.
      // Pivoting about the origin makes both ends exact at any scale.
      transformOrigin:'0 0',
      transform:`translate3d(${a.x}px,${a.y}px,0) rotate(${rot0}deg) scale(${scale0})`,
      willChange:'transform',
    }}>
      <div style={{position:'relative', transform:'translate(-50%,-50%)',
        filter:'drop-shadow(0 12px 26px rgba(0,0,0,.6))'}}>
        <div ref={fromRef}>
          <PlayingCard card={card} faceDown={faceDown} isScrap={fromScrap}
            size={fromSize} liftTransform={false}/>
        </div>
        {!sameLook&&(
          <div ref={toRef} style={{position:'absolute',inset:0,opacity:0,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            {/* Pre-scaled to the source box, so the cross-fade swaps
                two cards of one size and the outer scale alone does
                the shrinking. */}
            <div style={{transform:`scale(${k})`,transformOrigin:'center',flexShrink:0}}>
              <PlayingCard card={card} faceDown={faceDown} isScrap={toScrap}
                size={toSize} liftTransform={false}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MotionGhost — a card on a SCRIPTED path (The Throw, 2026-09-16).
//
// Ghost above flies one bow between two measured boxes. The Ace
// attack needs paths that bow cannot draw: a draw-back and a spinning
// throw, a hold for the hit-stop, a ballistic tumble off the table.
// Those are pure functions of time in throwMotion.js, and this plays
// one: `motion.at(ms)` hands back the pose for that moment and this
// writes it to the DOM, once per frame, with no React render in the
// loop.
//
// Same box rule as Ghost: the element is the `fromSize` card's natural
// box, its origin is the card's centre, and `s` scales that box to
// whatever the motion says, so a pose measured off a real card lands
// on it exactly.
//
// TRAILS are extra copies of the card drawn a few frames behind it at
// falling opacity, shown only while the motion says the card is really
// travelling (`trail`). They render first, so the card itself is on top.
//
// Under reduced motion a scripted flight ends at once, like any other,
// unless it is `rmSafe` — a fade in place, which is what the reduced-
// motion attack uses instead of the throw.
// ─────────────────────────────────────────────────────────────
const poseTransform = (p) =>
  `translate3d(${p.x}px,${p.y}px,0) rotate(${p.rot}deg) scale(${p.s * (p.sx ?? 1)},${p.s})`;
const GHOST_SHADOW = 'drop-shadow(0 12px 26px rgba(0,0,0,.6))';
// A pose may carry `glow`, 0 to 1: her Ace lit in ember while it holds
// the table after winning a counter. Hex alpha, never color-mix: see the
// drop-shadow note in CLAUDE.md's Gotchas.
const ghostFilter = (g) => (g > 0.01
  ? `${GHOST_SHADOW} drop-shadow(0 0 ${(4 + 14 * g).toFixed(1)}px ${DS.ember}${Math.round(Math.min(1, g) * 230).toString(16).padStart(2, '0')})`
  : GHOST_SHADOW);

function MotionGhost({ flight, onDone }) {
  const { motion, card, faceDown, fromScrap, kraft, fromSize, trails, rmSafe, born } = flight;
  const els = useRef([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const p0 = useMemo(() => motion.at(0), []);

  useEffect(() => {
    if (prefersReducedMotion() && !rmSafe) { doneRef.current(); return; }
    let raf = 0;
    const paint = (t) => {
      for (let i = 0; i <= trails; i++) {
        const el = els.current[i];
        if (!el) continue;
        const ti = t - i * TRAIL.lag;
        const p = motion.at(Math.max(0, ti));
        const show = i === 0 || (p.trail && ti > 0);
        el.style.opacity = show ? String((p.o ?? 1) * (TRAIL.alpha[i] ?? 0.1)) : '0';
        if (show) el.style.transform = poseTransform(p);
        if (i === 0 && p.glow !== undefined && el.firstElementChild) {
          el.firstElementChild.style.filter = ghostFilter(p.glow);
        }
      }
    };
    const step = (now) => {
      const t = Math.max(0, now - born);
      paint(Math.min(t, motion.dur));
      if (t < motion.dur) raf = requestAnimationFrame(step);
      else doneRef.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const order = [];
  for (let i = trails; i >= 0; i--) order.push(i);
  return (
    <>{order.map(i => (
      <div key={i} ref={el => { els.current[i] = el; }}
        data-flight={card ? card.id : 'anon'} data-trail={i || undefined} style={{
        position:'fixed', left:0, top:0, zIndex:1000, pointerEvents:'none',
        transformOrigin:'0 0', willChange:'transform, opacity',
        transform: poseTransform(p0),
        opacity: i === 0 ? (p0.o ?? 1) : 0,
      }}>
        <div style={{position:'relative', transform:'translate(-50%,-50%)',
          filter: i === 0 ? GHOST_SHADOW : undefined}}>
          <PlayingCard card={card} faceDown={faceDown} isScrap={fromScrap} kraft={kraft}
            size={fromSize} liftTransform={false}/>
        </div>
      </div>
    ))}</>
  );
}

// ─────────────────────────────────────────────────────────────
// useCardMotion
//
//   registerCard(id, el)  cards call this via ref
//   rectOf(id)            the live box of a rendered card
//   fly(moves)            queue a batch; destinations are
//                         measured in the layout effect below,
//                         so call it in the SAME handler that
//                         dispatches the state change
//   hiddenIds             cards a ghost is currently standing in
//                         for — render them invisible but still
//                         laid out (visibility, never display)
//   animating             true while anything is mid-flight
//   skipAll()             land everything now
//
// A move is { card, fromId|fromRect, toId|toRect, ... }. Ids are
// resolved against the registry; rects are for the fixed piles
// (deck, discard) which are not cards. A move with a `motion`
// (throwMotion.js) is a scripted flight instead and needs neither:
// see MotionGhost.
// ─────────────────────────────────────────────────────────────
export function useCardMotion() {
  const els = useRef(new Map());
  const [flights, setFlights] = useState([]);
  const [queue, setQueue] = useState(null);
  const nextId = useRef(0);

  const registerCard = useCallback((id, el, prevEl) => {
    if (el) { els.current.set(id, el); return; }
    // Only forget the card if the node being unregistered is still
    // the one on file. Otherwise a card that just moved piles would
    // have its fresh registration wiped by the old mount's cleanup.
    if (!prevEl || els.current.get(id) === prevEl) els.current.delete(id);
  }, []);

  const rectOf = useCallback((id) => {
    const el = els.current.get(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    // A card in the fan is ROTATED, and getBoundingClientRect hands
    // back the axis-aligned box AROUND the rotated card — 13% wider
    // than the card really is at the fan's outer angles. Sizing the
    // ghost from that width launched it visibly too big, and drawing
    // it upright snapped it out of the lean it was sitting in. Read
    // the accumulated transform instead: it gives the true scale and
    // the SIGNED angle, so the ghost starts exactly on top of the
    // card the player just toggled. The box's centre is still right
    // either way — rotation about the centre preserves it.
    const m = screenMatrix(el);
    const scale = Math.hypot(m.a, m.b) || 1;
    return Object.assign(r.toJSON(), {
      trueW: el.offsetWidth * scale,
      rot: Math.atan2(m.b, m.a) * 180 / Math.PI,
    });
  }, []);

  const fly = useCallback((moves) => {
    if (!moves || moves.length === 0) return;
    setQueue(q => (q ? [...q, ...moves] : [...moves]));
  }, []);

  // Runs after React writes the DOM, before paint: destinations
  // are final here, which is the whole point of doing it in a
  // LAYOUT effect rather than a normal one.
  useLayoutEffect(() => {
    if (!queue) return;
    const built = [];
    for (const m of queue) {
      // A SCRIPTED flight (The Throw). Its path is a function of time
      // built from rects measured before the commit, so there is no
      // destination to read here. It can hide cards of its own while it
      // flies (`hideIds`): the thrown Ace stands in for the one still in
      // your hand until the hit commits.
      if (m.motion) {
        built.push({
          // Timed from the moment it was launched, not from its first
          // painted frame: GameScreen schedules the impact's sound, ring
          // and commit on timers from that same moment, and a clock that
          // started a frame late put the hit's sound ahead of the Ace.
          // The caller passes its own `born`, stamped where it set those
          // timers; this layout effect runs a render later (6ms on a
          // fast Mac, more on a phone).
          id: nextId.current++, motion: m.motion, born: m.born ?? performance.now(),
          card: m.card ?? null, faceDown: !!m.faceDown, fromScrap: !!m.fromScrap,
          kraft: !!m.kraft, fromSize: m.fromSize || 'small', trails: m.trails || 0,
          rmSafe: !!m.rmSafe, hideIds: m.hideIds || null, hideId: null,
        });
        continue;
      }
      const from = m.fromRect || (m.fromId != null ? rectOf(m.fromId) : null);
      const to   = m.toRect   || (m.toId   != null ? rectOf(m.toId)   : null);
      if (!from || !to) continue;   // element gone: skip, never guess
      built.push({
        id: nextId.current++,
        card: m.card ?? null,
        faceDown: !!m.faceDown,
        fromScrap: !!m.fromScrap, toScrap: !!m.toScrap,
        fromSize: m.fromSize || 'small', toSize: m.toSize || 'small',
        arc: m.arc || 0, delay: m.delay || 0,
        hideId: m.toId != null ? m.toId : null,
        from, to,
      });
    }
    setQueue(null);
    if (built.length) setFlights(prev => [...prev, ...built]);
  }, [queue, rectOf]);

  const land = useCallback((id) => {
    setFlights(prev => prev.filter(f => f.id !== id));
  }, []);

  const skipAll = useCallback(() => {
    setQueue(null);
    setFlights([]);
  }, []);

  const hiddenIds = useMemo(() => {
    const s = new Set();
    for (const f of flights) {
      if (f.hideId != null) s.add(f.hideId);
      if (f.hideIds) for (const id of f.hideIds) s.add(id);
    }
    return s;
  }, [flights]);

  const animating = flights.length > 0 || queue != null;

  // An ELEMENT, not a component. The previous version returned a
  // useCallback component rendered as <FlightsOverlay/>: its
  // function identity changed on every render, so React saw a new
  // component type and unmounted/remounted every card in flight.
  // Each remount restarted that card's animation from zero, which
  // is why cards used to stutter, restart, or hang mid-table
  // whenever anything else moved. Returning the element keeps each
  // Ghost mounted and reconciled by key.
  const flightsOverlay = (
    <>{flights.map(f => f.motion
      ? <MotionGhost key={f.id} flight={f} onDone={() => land(f.id)}/>
      : <Ghost key={f.id} flight={f} onDone={() => land(f.id)}/>)}</>
  );

  return { registerCard, rectOf, fly, hiddenIds, animating, skipAll, flightsOverlay };
}
