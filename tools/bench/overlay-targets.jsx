// Overlay touch-target bench.
//
// Mounts each modal in the REAL Shell so its buttons can be measured at
// rest, at any viewport, without waiting for a deal to produce the state
// that shows it. tools/responsive-qa.mjs walks a real game, so it only
// reaches a modal the random hand happens to open — which is why the Ace
// explainer's button had never been measured, and why the reveal and win
// screens still had not been. This bench reaches every one on demand.
//
// The five interstitial cases mount the real `TableStage` with
// `instant`, which lands every scene on its resting frame with no
// choreography — the frame a thumb actually meets. Add `&live=1` to
// run the choreography instead (the verification script does, to
// screenshot the beats without playing a match to reach them).
//
// Dev-server only. Vite's single entry is index.html, so nothing under
// tools/ is ever built into dist/ or served in production.
//
//   npm run dev -- --port 5193 --strictPort
//   open http://localhost:5193/tools/bench/overlay-targets.html?case=reveal
//
// Cases: reveal | scraps | matchWin | matchLoss | sweepWin | sweepLoss | tie | sign
//        | signMP | mp9 | mp8
//        | aceDrawn | aceCounter | aceCounter2 | aiCounterNotice | oppAceReveal | oppAceReveal2
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createDeck } from '../../src/game/engine.js';
import { AceDrawnLightbox, AceCounterModal, AiCounterNotice, OpponentAceReveal } from '../../src/components/overlays.jsx';
import { TableStage } from '../../src/components/interstitials.jsx';

const d = createDeck();
const five = (o) => d.slice(o, o + 5);
const ace = d.find(c => c.rank === 'A');
const noop = () => {};
// Records which way out a scene took, for a script to read back:
// window.__calls lists 'continue', 'swept', 'signDone' and 'newGame' in
// the order they fired. The reveal's PLAY HAND 2 (2026-09-16) is only
// checkable this way — a tap on the wood at rest must NOT continue.
const called = (name) => () => { (window.__calls = window.__calls || []).push(name); };

const reveal = (over) => ({
  kind: 'reveal', key: 'bench', which: 'hand1',
  playerCards: five(0), aiCards: five(5),
  playerHandName: 'Two Pair', aiHandName: 'Straight',
  winner: 'ai', pts: 1, before: { p: 3, a: 4 }, ...over,
});

const params = new URLSearchParams(location.search);
const live = params.get('live') === '1';
const stage = (s) => (
  <TableStage stage={s} cardH={146} tableAnchorRef={{ current: null }} instant={!live}
    onSignDone={called('signDone')} onContinue={called('continue')} onSwept={called('swept')}
    onNewGame={called('newGame')}
    difficulty="hard" winStats={{ margin: 4, bestMargin: 4, isNewRecord: true }}/>
);

const CASES = {
  reveal:     stage(reveal()),
  // Hand 2, which rests on BACK TO THE TABLE since 2026-09-17.
  hand2:      stage(reveal({ which: 'hand2' })),
  scraps:     stage(reveal({ which: 'scraps', playerCards: d.slice(10, 17), aiCards: d.slice(20, 27),
                winner: 'player', pts: 2, cleanSweep: true })),
  // A plain Scraps result, the round going on: rests on NEXT ROUND
  // (2026-09-18). `scraps` above is a Clean Sweep and rests on CONTINUE.
  scrapsPlain: stage(reveal({ which: 'scraps', playerCards: d.slice(10, 17), aiCards: d.slice(20, 27),
                winner: 'player', pts: 2 })),
  matchWin:   stage(reveal({ which: 'hand2', winner: 'player', before: { p: 9, a: 6 }, endsIt: true })),
  matchLoss:  stage(reveal({ which: 'scraps', winner: 'ai', pts: 2, before: { p: 5, a: 8 }, endsIt: true,
                playerCards: d.slice(10, 17), aiCards: d.slice(20, 27) })),
  sweepWin:   stage(reveal({ which: 'scraps', winner: 'player', pts: 2, before: { p: 8, a: 6 }, endsIt: true,
                cleanSweep: true, playerCards: d.slice(10, 17), aiCards: d.slice(20, 27) })),
  tie:        stage(reveal({ winner: 'tie', pts: 0 })),
  // Her Clean Sweep: the beat that sounds like a loss and holds for a
  // tap (2026-09-14). `&live=1` to watch it hold.
  sweepLoss:  stage(reveal({ which: 'scraps', winner: 'ai', pts: 2, before: { p: 2, a: 4 },
                aiSweep: true, playerCards: d.slice(10, 17), aiCards: d.slice(20, 27) })),
  // `&round=N` picks the number (a "10" is drawn condensed).
  sign:       stage({ kind: 'sign', roundNum: Number(params.get('round')) || 2 }),
  // MATCH POINT is exactly 9 since 2026-09-16. `signMP` has her on 9 and
  // must say it; `mp9` rolls you onto 9 and must say it; `mp8` rolls you
  // onto 8 and must NOT (the old rule, 8 or more, did).
  signMP:     stage({ kind: 'sign', roundNum: 3, playerScore: 6, aiScore: 9 }),
  mp9:        stage(reveal({ winner: 'player', before: { p: 8, a: 4 } })),
  mp8:        stage(reveal({ winner: 'player', before: { p: 7, a: 4 } })),
  aceDrawn:   <AceDrawnLightbox ace={ace} onDismiss={noop} />,
  aceCounter: <AceCounterModal onCounter={noop} onAllow={noop} targets={d.slice(12, 14)} />,
  // The re-counter prompt, and the two modals that follow an Ace. The
  // AI-countered notice is here because it CRASHED the game until
  // 2026-09-14 (an undeclared variable in render) and nothing else
  // ever mounted it outside a live match.
  aceCounter2: <AceCounterModal onCounter={noop} onAllow={noop} targets={d.slice(12, 14)} afterCounter />,
  aiCounterNotice: <AiCounterNotice playerAce={ace} aiAce={{ ...ace, id: 'bench-ace-2' }} onOk={noop} />,
  oppAceReveal: <OpponentAceReveal targets={d.slice(12, 14)} onOk={noop} />,
  oppAceReveal2: <OpponentAceReveal targets={d.slice(12, 14)} onOk={noop} afterCounter />,
};

const which = params.get('case') || 'reveal';
// Mount once the game's stylesheet is in (see the html): a scene that
// mounts before its keyframes exist starts its entrances with nothing
// to run and lands at rest with no choreography to measure.
const mount = () => createRoot(document.getElementById('root')).render(CASES[which]);
if (document.querySelector('style')) mount();
else document.addEventListener('bench-styles-ready', mount, { once: true });
