// ============================================================
// SCRAPS — Flying card animation system
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// FlyingCard — arc trajectory via quadratic bezier
// arcOffset varies per card so multiple cards fly different paths
// ─────────────────────────────────────────────────────────────
export function FlyingCard({ card, fromRect, toRect, toIsScrap=false, onDone, arcOffset=0 }) {
  const startRef = useRef(null);
  const rafRef   = useRef();
  const elRef    = useRef();
  const DURATION = 750;

  useEffect(() => {
    startRef.current = performance.now();
    // Quadratic bezier control point — arcs above the midpoint, offset per card
    const cpX = (fromRect.x + toRect.x) / 2 + arcOffset * 90;
    const cpY = Math.min(fromRect.y, toRect.y) - 130 - Math.abs(arcOffset) * 50;

    function animate() {
      const el = elRef.current;
      if(!el) return;
      const elapsed = performance.now() - startRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease in-out quad
      // Bezier position
      const x = (1-e)*(1-e)*fromRect.x + 2*(1-e)*e*cpX + e*e*toRect.x;
      const y = (1-e)*(1-e)*fromRect.y + 2*(1-e)*e*cpY + e*e*toRect.y;
      // Rotation and scale during flight
      const rot = arcOffset * 18 * Math.sin(e * Math.PI);
      const scale = 0.88 + 0.18 * Math.sin(e * Math.PI);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.style.transform = `rotate(${rot}deg) scale(${scale})`;
      el.style.opacity = t > 0.88 ? String(1-(t-0.88)*8.3) : '1';
      // Color transition mid-flight for scraps
      if(toIsScrap && e > 0.45) {
        const f = Math.min((e-0.45)/0.55, 1);
        const r1=[245,245,250], r2=[26,26,46];
        const bg = r1.map((v,i)=>Math.round(v+(r2[i]-v)*f));
        el.style.background = `rgb(${bg.join(',')})`;
        el.style.borderColor = card&&(card.suit==='♥'||card.suit==='♦')?'#FF3D5A':'#C8FF00';
      }
      if(t < 1) rafRef.current = requestAnimationFrame(animate);
      else onDone();
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const ink = card?((card.suit==='♥'||card.suit==='♦')?'#FF3D5A':'#1A1A2E'):'#1A1A2E';
  const rk  = card&&card.rank==='10' ? 22 : 26;

  return (
    <div ref={elRef} style={{
      position:'fixed', left:fromRect.x, top:fromRect.y,
      width:fromRect.width, height:fromRect.height,
      zIndex:1000, pointerEvents:'none', borderRadius:10,
      background:'#F5F5FA', border:`6px solid #1A1A2E`,
      display:'flex', flexDirection:'column', justifyContent:'space-between',
      padding:'8px 9px', boxSizing:'border-box',
      boxShadow:'0 12px 40px rgba(0,0,0,.7)', transition:'none',
    }}>
      {card&&(
        <>
          <div style={{display:'flex',alignItems:'center',gap:1}}>
            <span style={{fontFamily:"'Righteous',sans-serif",fontSize:rk,color:ink,lineHeight:1}}>{card.rank}</span>
            <span style={{fontFamily:"'Righteous',sans-serif",fontSize:rk+2,color:ink,lineHeight:1,marginTop:-2}}>{card.suit}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:1,alignSelf:'flex-end',transform:'rotate(180deg)'}}>
            <span style={{fontFamily:"'Righteous',sans-serif",fontSize:rk,color:ink,lineHeight:1}}>{card.rank}</span>
            <span style={{fontFamily:"'Righteous',sans-serif",fontSize:rk+2,color:ink,lineHeight:1,marginTop:-2}}>{card.suit}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// useFlyingCards — manages a queue of in-flight card animations
// ─────────────────────────────────────────────────────────────
export function useFlyingCards() {
  const [flights, setFlights] = useState([]); // [{id,card,fromRect,toRect,toIsScrap}]
  const nextId = useRef(0);

  const launchFlight = useCallback((card, fromRect, toRect, toIsScrap=false, arcOffset=0) => {
    const id = nextId.current++;
    setFlights(prev => [...prev, {id, card, fromRect, toRect, toIsScrap, arcOffset}]);
    return id;
  }, []);

  const removeFlight = useCallback((id) => {
    setFlights(prev => prev.filter(f => f.id !== id));
  }, []);

  const FlightsOverlay = useCallback(() => (
    <>
      {flights.map((f,i) => (
        <FlyingCard key={f.id}
          card={f.card}
          fromRect={f.fromRect}
          toRect={f.toRect}
          toIsScrap={f.toIsScrap}
          arcOffset={f.arcOffset||0}
          onDone={() => removeFlight(f.id)}
        />
      ))}
    </>
  ), [flights, removeFlight]);

  return { launchFlight, FlightsOverlay };
}
