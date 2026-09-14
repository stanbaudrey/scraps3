// Overlay touch-target bench.
//
// Mounts each modal in the REAL Shell so its buttons can be measured at
// rest, at any viewport, without waiting for a deal to produce the state
// that shows it. tools/responsive-qa.mjs walks a real game, so it only
// reaches a modal the random hand happens to open — which is why the Ace
// explainer's button had never been measured, and why the reveal and win
// screens still have not been. This bench reaches all six on demand.
//
// Dev-server only. Vite's single entry is index.html, so nothing under
// tools/ is ever built into dist/ or served in production.
//
//   npm run dev -- --port 5193 --strictPort
//   open http://localhost:5193/tools/bench/overlay-targets.html?case=reveal
//
// Cases: reveal | cleanSweep | win | lose | aceDrawn | aceCounter
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createDeck } from '../../src/game/engine.js';
import { RevealOverlay, CleanSweepLightbox, WinScreen, LoseScreen,
         AceDrawnLightbox, AceCounterModal } from '../../src/components/overlays.jsx';

const d = createDeck();
const five = (o) => d.slice(o, o + 5);
const ace = d.find(c => c.rank === 'A');

const CASES = {
  reveal:      <RevealOverlay playerCards={five(0)} aiCards={five(5)}
                 playerHandName="Two Pair" aiHandName="Straight" winner="ai"
                 points={2} onDismiss={()=>{}} />,
  cleanSweep:  <CleanSweepLightbox onDone={()=>{}} />,
  win:         <WinScreen playerScore={10} aiScore={6} onNewGame={()=>{}}
                 margin={4} bestMargin={4} isNewRecord={true} />,
  lose:        <LoseScreen playerScore={5} aiScore={10} onNewGame={()=>{}} />,
  aceDrawn:    <AceDrawnLightbox ace={ace} onDismiss={()=>{}} />,
  aceCounter:  <AceCounterModal onCounter={()=>{}} onAllow={()=>{}} playerScraps={five(10)} />,
};

const which = new URLSearchParams(location.search).get('case') || 'reveal';
createRoot(document.getElementById('root')).render(CASES[which]);
