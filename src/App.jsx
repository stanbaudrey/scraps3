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
import { Walkthrough, LAST_BEAT } from "./screens/Walkthrough.jsx";
import { GameScreen } from "./screens/GameScreen.jsx";
import { playHandWon } from "./audio.js";

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
  // Which beat the storyboard opens on. 0 on the way in; the LAST beat
  // when the difficulty picker's BACK sends a reader there, because
  // they have already read it and want the page they just left rather
  // than the start of a four-screen re-run.
  const [walkStart,setWalkStart]=useState(0);

  // PLAY is the only button on the splash and was silent until
  // 2026-09-13, when Stan asked for the hand-won cue on the way
  // into the storyboard. It fires on EVERY press, not only the
  // first-run one: the walkthrough is skipped on later trips, and
  // a button that sounds different depending on a hidden session
  // flag is worse than one that does not.
  //
  // It doubles as the gesture that unlocks audio. Browsers suspend
  // a context created before a user interacts, so this is the
  // first cue that can actually be heard, and everything after it
  // inherits a running context.
  function handlePlay(){
    playHandWon();
    setScreen(hasSeenWalkthrough() ? 'difficulty' : 'walkthrough');
  }
  function finishWalkthrough(){
    markWalkthroughSeen();
    setScreen('difficulty');
  }
  // BACK on the difficulty picker. It re-opens the storyboard on its
  // final beat, whose own LET'S PLAY / tap-anywhere brings the reader
  // straight back here.
  function backToRules(){
    setWalkStart(LAST_BEAT);
    setScreen('walkthrough');
  }
  function startGame(d){
    setWalkStart(0);
    setDifficulty(d);
    setGameKey(k=>k+1);
    setScreen('game');
  }

  if(screen==='splash')      return <SplashScreen onStart={handlePlay}/>;
  if(screen==='walkthrough') return <Walkthrough onDone={finishWalkthrough} startAt={walkStart}/>;
  if(screen==='difficulty')  return <DifficultyPicker onChoose={startGame} onBack={backToRules}/>;
  if(screen==='game')        return <GameScreen key={gameKey} difficulty={difficulty} onExit={()=>setScreen('difficulty')}/>;
  return null;
}
