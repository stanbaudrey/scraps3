// The Ace attack bench (The Throw, 2026-09-16).
//
// Mounts the REAL GameScreen with a rigged deal, so the attack can be
// driven end to end in a real browser on demand. A shuffle will not put
// an Ace in your hand, a pile worth hitting in hers and, for her counter,
// an Ace in her hand plus a reason to spend it — the card redesign's
// "play an Ace strike end to end" went unmet across twenty-eight
// scripted deals for exactly that reason.
//
// Dev-server only. Vite's single entry is index.html, so nothing under
// tools/ is ever built into dist/ or served in production.
//
//   open http://localhost:5193/tools/bench/attack.html?case=lands
//
// Cases:
//   lands     your Ace, her Scraps 4 · 9 · K (high card, so she never counters)
//   counter   her Ace too, and her Scraps two pair (K K 9 9): she counters
//   counter2  as counter, with a second Ace in your hand (the turn stays live)
//   her       SHE attacks: your Scraps a full house (K K K 9 9), an Ace in
//             her hand and one in yours, so on hard she goes for your pile
//             on her first turn and you can counter it (2026-09-17)
//   her2      as her, with a second Ace in her hand: after your counter she
//             comes straight back with it, and you have none left
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createDeck } from '../../src/game/engine.js';
import { GameScreen } from '../../src/screens/GameScreen.jsx';

const params = new URLSearchParams(location.search);
const which = params.get('case') || 'lands';

function rigFor(name) {
  const pool = createDeck();
  const take = (rank) => {
    const i = pool.findIndex(c => c.rank === rank);
    return pool.splice(i, 1)[0];
  };
  const scraps = (cards) => cards.map(c => ({ ...c, turnAdded: 0, eligibleForDiscard: true }));
  if (name === 'her' || name === 'her2') {
    const playerHand = [take('A'), take('4'), take('7'), take('10'), take('Q')];
    const aiHand = [take('A'), name === 'her2' ? take('A') : take('3'), take('6'), take('8'), take('J')];
    const aiScraps = scraps([take('2'), take('5')]);
    const playerScraps = scraps([take('K'), take('K'), take('K'), take('9'), take('9')]);
    return { deal: () => ({ deck: pool.slice(), playerHand, aiHand, playerScraps, aiScraps }) };
  }
  const counter = name !== 'lands';
  const playerHand = [take('A'), take('4'), take('7'), take('10'), name === 'counter2' ? take('A') : take('Q')];
  const aiHand = [counter ? take('A') : take('3'), take('6'), take('8'), take('J'), take('5')];
  const aiScraps = scraps(counter ? [take('K'), take('K'), take('9'), take('9')] : [take('4'), take('9'), take('K')]);
  const playerScraps = scraps([take('2'), take('Q')]);
  return { deal: () => ({ deck: pool.slice(), playerHand, aiHand, playerScraps, aiScraps }) };
}

const rig = rigFor(which);
window.__benchCase = which;
createRoot(document.getElementById('root')).render(
  <GameScreen difficulty="hard" rig={rig} onExit={() => {}}/>
);
