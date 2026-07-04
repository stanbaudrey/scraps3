// ============================================================
// SCRAPS — Root: routes between splash, difficulty, and game
// ============================================================
import { useState } from "react";
import { SplashScreen, DifficultyPicker } from "./screens/MenuScreens.jsx";
import { GameScreen } from "./screens/GameScreen.jsx";

export default function App() {
  const [screen,setScreen]=useState('splash');
  const [mode,setMode]=useState(null);
  const [difficulty,setDifficulty]=useState('easy');
  // key forces a fresh GameScreen (and a fresh game state machine)
  // every time a new game starts
  const [gameKey,setGameKey]=useState(0);
  function handleStart(choice){
    if(choice==='tutorial'){setMode('tutorial');setGameKey(k=>k+1);setScreen('game');}
    else setScreen('difficulty');
  }
  if(screen==='splash')     return <SplashScreen onStart={handleStart}/>;
  if(screen==='difficulty') return <DifficultyPicker onChoose={d=>{setDifficulty(d);setMode('jump');setGameKey(k=>k+1);setScreen('game');}} onBack={()=>setScreen('splash')}/>;
  if(screen==='game')       return <GameScreen key={gameKey} mode={mode} difficulty={difficulty} onExit={(dest)=>setScreen(dest==='difficulty'?'difficulty':'splash')}/>;
  return null;
}
