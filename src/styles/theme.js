// ============================================================
// SCRAPS — Design tokens, global styles, shared keyframes
// ============================================================

export const DS = {
  ink:       '#1A1A2E',
  frost:     '#F5F5FA',
  ember:     '#FF3D5A',
  voltage:   '#C8FF00',
  slate:     '#8A8FA8',
  dusk:      '#1C1C28',
  duskLight: '#24243a',
  duskMid:   '#2a2a40',
  slateLight:'#c8cce0',
  inkLight:  '#2e2e4a',
};
export const F = {
  display: "'Bebas Neue', sans-serif",
  card:    "'Righteous', sans-serif",
  ui:      "'Space Grotesk', sans-serif",
  mono:    "'Space Mono', monospace",
};
export const WIN_SCORE = 11;

// ── Inject hover CSS into document.head ONCE, before any React render ──
// This runs at module evaluation time, not inside React's render cycle.
// That's why it's instant — no hydration delay, no style recalculation on render.
(function injectGlobalStyles() {
  if(typeof document === 'undefined') return;
  const id = 'scraps-global-hover';
  if(document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
    .menu-opt {
      cursor: pointer;
      border: 2px solid #8A8FA844;
      border-radius: 10px;
      padding: 20px 24px;
      background: transparent;
    }
    .menu-opt:hover {
      border-color: #C8FF00 !important;
      background: #C8FF0018 !important;
      box-shadow: 0 0 24px #C8FF0066 !important;
    }
    .diff-opt {
      cursor: pointer;
      border: 2px solid #8A8FA844;
      border-radius: 10px;
      padding: 18px 22px;
      background: transparent;
    }
    .diff-opt:hover {
      border-color: #C8FF00 !important;
      background: #C8FF0018 !important;
      box-shadow: 0 0 24px #C8FF0066 !important;
    }
  `;
  document.head.appendChild(el);
})();

// ── Shared keyframes + base styles for the game screen ──────
export const GS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${DS.dusk}}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${DS.slate}44}
  @keyframes glow{0%,100%{opacity:.45}50%{opacity:1}}
  @keyframes pulse{0%,100%{opacity:.65}50%{opacity:1}}
  @keyframes zonePulse{0%,100%{box-shadow:0 0 0 3px ${DS.voltage}44,0 0 16px ${DS.voltage}33}50%{box-shadow:0 0 0 5px ${DS.voltage}99,0 0 30px ${DS.voltage}66}}
  @keyframes fullScrapPop{from{opacity:0;transform:scale(.3) translateY(40px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes cardWiggle{0%{transform:rotate(-4deg) scale(1.04)}100%{transform:rotate(4deg) scale(1.06)}}
  @keyframes waveUp{0%{transform:translateY(0)}40%{transform:translateY(-22px)}80%{transform:translateY(2px)}100%{transform:translateY(0)}}
  @keyframes cardFadeIn{0%{opacity:0.1;transform:translateY(-12px) scale(0.92)}60%{opacity:0.9}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes scorePop{0%{transform:scale(1)}40%{transform:scale(1.5)}70%{transform:scale(0.95)}100%{transform:scale(1)}}
  @keyframes badgeFlash{0%{transform:scale(1)}30%{transform:scale(1.12)}60%{transform:scale(0.97)}100%{transform:scale(1)}}
  @keyframes cardShake{0%{transform:translateX(-4px) rotate(-2deg)}50%{transform:translateX(4px) rotate(2deg)}100%{transform:translateX(-4px) rotate(-2deg)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
  @keyframes letterAppear{from{opacity:0;transform:translateY(44px) scale(.65) rotate(-4deg)}to{opacity:1;transform:translateY(0) scale(1) rotate(0deg)}}
  @keyframes letterBounce{0%,100%{transform:translateY(0)}35%{transform:translateY(-14px)}65%{transform:translateY(-4px)}}
  @keyframes suitsBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
`;
