// ============================================================
// SCRAPS — Tiny consistent SVG icon set (replaces all emoji)
// Every icon: 24x24 viewBox, tinted via the `color` prop
// (defaults to currentColor so it inherits button text color).
// ============================================================

function Svg({ size, color, children, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0, color, ...style }}>
      {children}
    </svg>
  );
}

// Lightning bolt — Ace actions
export function IconBolt({ size=18, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M13 2 4.5 13.5h6L9 22l10.5-12.5h-6.7L13 2z" fill="currentColor"/>
    </Svg>
  );
}

// Trophy — Full Scrap / wins
export function IconTrophy({ size=18, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M7 3h10v2h4v2.5A4.5 4.5 0 0 1 16.5 12h-.35A5.5 5.5 0 0 1 13 15.77V19h3.5v2h-9v-2H11v-3.23A5.5 5.5 0 0 1 7.85 12H7.5A4.5 4.5 0 0 1 3 7.5V5h4V3zm-4 4v.5A2.5 2.5 0 0 0 5.5 10H7V7H3zm18 0h-4v3h1.5A2.5 2.5 0 0 0 21 7.5V7z"
        fill="currentColor" fillRule="evenodd"/>
    </Svg>
  );
}

// Chevron — collapsible panels (rotate via `up`)
export function IconChevron({ size=14, color='currentColor', up=false, style }) {
  return (
    <Svg size={size} color={color} style={{ transform:up?'rotate(180deg)':'none', transition:'transform 0.2s', ...style }}>
      <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// Check — completed steps
export function IconCheck({ size=14, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// Two overlapping cards — decks / the game itself
export function IconCards({ size=18, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <rect x="3" y="5" width="11" height="15" rx="2" fill="none"
        stroke="currentColor" strokeWidth="2" transform="rotate(-8 8.5 12.5)"/>
      <rect x="10" y="4" width="11" height="15" rx="2" fill="none"
        stroke="currentColor" strokeWidth="2" transform="rotate(8 15.5 11.5)"/>
    </Svg>
  );
}

// Fanned three cards — hands
export function IconFan({ size=18, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <rect x="8.5" y="4" width="8" height="12" rx="1.5" fill="none"
        stroke="currentColor" strokeWidth="2" transform="rotate(-18 12.5 10) translate(-4 2)"/>
      <rect x="8.5" y="4" width="8" height="12" rx="1.5" fill="none"
        stroke="currentColor" strokeWidth="2" transform="rotate(18 12.5 10) translate(4 2)"/>
      <rect x="8" y="3" width="8" height="12" rx="1.5" fill="#1C1C28"
        stroke="currentColor" strokeWidth="2"/>
    </Svg>
  );
}

// Circular arrows — trading / cycling cards
export function IconCycle({ size=18, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M20 12a8 8 0 0 1-14.9 4" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M4 12a8 8 0 0 1 14.9-4" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M3 12l2.2 4.6L9.5 14z" fill="currentColor"/>
      <path d="M21 12l-2.2-4.6L14.5 10z" fill="currentColor"/>
    </Svg>
  );
}

// Spade — the Scraps poker hand
export function IconSpade({ size=18, color='currentColor', style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M12 2C9.2 5.8 4 8.8 4 12.8a3.9 3.9 0 0 0 6.9 2.5c-.2 1.9-1 3.6-2.4 4.7h7c-1.4-1.1-2.2-2.8-2.4-4.7a3.9 3.9 0 0 0 6.9-2.5C20 8.8 14.8 5.8 12 2z"
        fill="currentColor"/>
    </Svg>
  );
}
