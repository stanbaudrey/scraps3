// ============================================================
// SCRAPS — Viewport size, layout mode, and the fit-to-viewport
// scaler.
//
// The rule this file exists to enforce: THE GAME NEVER SCROLLS.
// Not on a phone, not on a 1280x720 laptop, not in landscape.
// Sessions 1 and the forest reskin both left interim scroll
// fallbacks (`overflow:auto` on the game root, `overflowX:auto`
// on the Scraps band) as deliberate safety nets. Those are gone;
// this is what replaces them.
//
// Two mechanisms, in this order:
//
//   1. REFLOW — `layoutMode()` picks between the side-by-side
//      table (hand centred, Scraps beside it) and a stacked one
//      (hand above its own Scraps). Card sizes, fan spread and
//      bar chrome all follow from the mode. This is the part
//      that keeps things LEGIBLE: a phone gets smaller cards
//      laid out differently, not the desktop table shrunk.
//
//   2. FIT — <FitBox> measures what the chosen layout actually
//      wants and scales it down if it still doesn't fit. This is
//      the part that makes "never scrolls" a GUARANTEE rather
//      than a hope: hand sizes, hint length and button wrapping
//      all vary at runtime, so no amount of hand-tuned CSS can
//      promise a fit for every board state.
//
// In practice (2) is a small correction — around 0.95 on a
// 1280x720 laptop, 1.0 on a modern phone, ~0.75 on a 375x667
// iPhone SE, which is the shortest screen worth supporting.
// ============================================================
import { useState, useRef, useLayoutEffect, useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────
// useViewport — window size + pointer coarseness, as ONE
// subscription shared by every caller rather than a resize
// listener per component.
//
// The snapshot object is cached and only replaced when a value
// actually changes; useSyncExternalStore compares by identity
// and a fresh object every call would loop forever.
// ─────────────────────────────────────────────────────────────
const listeners = new Set();

function read() {
  const w = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const h = typeof window === 'undefined' ? 800  : window.innerHeight;
  let coarse = false;
  try { coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches; } catch { /* older browser: assume a mouse */ }
  return { w, h, coarse };
}

let snapshot = read();

function refresh() {
  const next = read();
  if (next.w === snapshot.w && next.h === snapshot.h && next.coarse === snapshot.coarse) return;
  snapshot = next;
  for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  if (listeners.size === 1) {
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    // visualViewport fires where `resize` does not: the iOS URL bar
    // collapsing changes innerHeight without a resize event in some
    // versions, and that is exactly the moment the table would clip.
    if (window.visualViewport) window.visualViewport.addEventListener('resize', refresh);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', refresh);
    }
  };
}

const SERVER_SNAPSHOT = { w: 1280, h: 800, coarse: false };

export function useViewport() {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}

// ─────────────────────────────────────────────────────────────
// layoutMode — 'wide' (hand centred, Scraps beside it) or
// 'stack' (hand above its own Scraps, full width).
//
// The two modes trade the same space in opposite directions:
// side-by-side is width-hungry and height-thrifty, stacked is
// the reverse. So the choice is not "is this a phone" — it is
// "which axis is scarce here". A landscape phone is only ~390px
// tall and gets the WIDE layout for that reason, even though it
// is unambiguously a phone.
// ─────────────────────────────────────────────────────────────
export const WIDE_MIN_W  = 1000;  // side-by-side needs about this much
export const SHORT_MAX_H = 560;   // below this, height is the scarce axis

export function layoutMode({ w, h }) {
  if (w >= WIDE_MIN_W) return 'wide';
  if (h <= SHORT_MAX_H && w >= 640) return 'wide';
  return 'stack';
}

// The width each mode is laid out at when the real viewport is
// narrower than it can honestly hold. Below these the content is
// scaled rather than squeezed further, because past this point
// squeezing costs legibility faster than scaling does.
export const MODE_MIN_W = { wide: 1000, stack: 360 };

// ─────────────────────────────────────────────────────────────
// FitBox — lays its children out at a definite width, measures
// what they came to, and scales them to fit the box it is in.
//
// Why a definite width and not `width:100%`: the scale factor
// depends on the content's height, the content's height depends
// on the width it wraps at, and if the width followed the scale
// that loop never settles. Laying out at `max(available, modeMin)`
// breaks the cycle — the layout width is decided before any
// scaling, so one measure pass is always enough.
//
// offsetWidth/offsetHeight are read, not getBoundingClientRect:
// they are pre-transform, so they report the size the content
// WANTS rather than the size we are currently rendering it at.
// Reading the post-transform box here would feed the scale back
// into itself.
//
// Card motion is unaffected: useCardMotion measures real
// on-screen rects, which are post-transform and therefore
// already correct, and the ghosts derive their own scale from
// those same rects (see flight.jsx).
// ─────────────────────────────────────────────────────────────
// `backdrop` paints behind the scaled content and is NOT scaled with
// it — it fills the outer box, so the table surface always reaches the
// edges of the viewport no matter how far the table itself is scaled
// down. Anything that should shrink with the cards belongs in
// `children` instead.
export function FitBox({ children, backdrop = null, modeMinW = 360, min = 0.3, max = 1, style = {} }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const contentRef = useRef(null);
  const [fit, setFit] = useState({ k: 1, w: modeMinW });
  const fitRef = useRef(fit);
  fitRef.current = fit;

  useLayoutEffect(() => {
    const outer = outerRef.current, inner = innerRef.current, content = contentRef.current;
    if (!outer || !inner || !content) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const availW = outer.clientWidth, availH = outer.clientHeight;
      if (!availW || !availH) return;
      const layoutW = Math.max(availW, modeMinW);
      // The CONTENT wrapper is what gets measured, not `inner`.
      // `inner` is min-height:100% so a table with room to spare
      // fills the box and spreads out (which is what the desktop
      // table has always done) — but that also means its own box
      // never changes size, so a ResizeObserver on it never fires
      // and the scale would be frozen at whatever the first frame
      // saw. The content wrapper is flex:1 0 auto: it fills the box
      // when the content is short, and GROWS past it when the
      // content is tall, which is both the honest number and an
      // observable change.
      const naturalH = content.offsetHeight;
      if (!naturalH) return;
      const k = Math.max(min, Math.min(max, availW / layoutW, availH / naturalH));
      const cur = fitRef.current;
      if (cur.w !== layoutW || Math.abs(cur.k - k) > 0.002) setFit({ k, w: layoutW });
    };

    // Coalesce to one measurement per frame: observing both boxes
    // means a single resize delivers two callbacks.
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const ro = new ResizeObserver(schedule);
    ro.observe(outer);
    ro.observe(content);
    measure();
    return () => { ro.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [modeMinW, min, max]);

  return (
    <div ref={outerRef} style={{
      position:'relative', flex:1, minWidth:0, minHeight:0,
      overflow:'hidden',
      display:'flex', justifyContent:'center',
      ...style,
    }}>
      {backdrop}
      {/* The scaled box. It is at least as tall as the space it is
          given, so children can still distribute themselves into
          spare height; anything past that overflows and is scaled
          away. Origin is the top edge, because a fit is computed
          from the top down — centring the origin would push the
          overflow half above the box, where it clips instead of
          shrinking. */}
      <div ref={innerRef} style={{
        width: fit.w, flexShrink:0, minHeight:'100%',
        position:'relative', zIndex:1,
        display:'flex', flexDirection:'column',
        transform: fit.k === 1 ? undefined : `scale(${fit.k})`,
        transformOrigin: 'center top',
      }}>
        <div ref={contentRef} style={{flex:'1 0 auto',display:'flex',flexDirection:'column'}}>
          {children}
        </div>
      </div>
    </div>
  );
}
