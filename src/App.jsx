// ============================================================
// SCRAPS — Root: routes between splash, walkthrough,
// difficulty, and game
//
// The storyboard walkthrough sits between PLAY and the
// difficulty picker, but ONLY on the first game of a session.
// Every later trip through the menu — NEW GAME off the win/lose
// screen included — goes straight to the picker, because by
// then the player has already seen it once and a re-run is
// just an obstacle between them and the next hand.
// ============================================================
import { useState } from "react";
import { SplashScreen, DifficultyPicker } from "./screens/MenuScreens.jsx";
import { Walkthrough } from "./screens/Walkthrough.jsx";
import { GameScreen } from "./screens/GameScreen.jsx";

// "Session" is the browser tab: sessionStorage clears when it
// closes, so a returning player next week gets the storyboard
// again but a mid-session reload does not. Storage-blocked
// browsers (private mode) fall back to the module-level flag,
// which is exactly as good for as long as the page is open.
const SEEN_KEY = 'scraps-walkthrough-seen-v1';
let seenFallback = false;

function hasSeenWalkthrough() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; }
  catch { return seenFallback; }
}
function markWalkthroughSeen() {
  seenFallback = true;
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked — in-memory flag covers this tab */ }
}

export default function App() {
  const [screen,setScreen]=useState('splash');
  const [difficulty,setDifficulty]=useState('easy');
  // key forces a fresh GameScreen (and a fresh game state machine)
  // every time a new game starts
  const [gameKey,setGameKey]=useState(0);

  function handlePlay(){
    setScreen(hasSeenWalkthrough() ? 'difficulty' : 'walkthrough');
  }
  function finishWalkthrough(){
    markWalkthroughSeen();
    setScreen('difficulty');
  }
  function startGame(d){
    setDifficulty(d);
    setGameKey(k=>k+1);
    setScreen('game');
  }

  if(screen==='splash')      return <SplashScreen onStart={handlePlay}/>;
  if(screen==='walkthrough') return <Walkthrough onDone={finishWalkthrough}/>;
  if(screen==='difficulty')  return <DifficultyPicker onChoose={startGame}/>;
  if(screen==='game')        return <GameScreen key={gameKey} difficulty={difficulty} onExit={()=>setScreen('difficulty')}/>;
  return null;
}
