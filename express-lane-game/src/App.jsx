import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Board from './components/Board';
import VictoryModal from './components/VictoryModal';
import StartScreen from './components/StartScreen';

const GameLayout = () => {
  useGame();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#082f49_0%,#0f172a_38%,#111827_100%)] flex flex-col lg:items-center lg:justify-center lg:p-4">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-24 top-[-6rem] h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute right-[-4rem] top-12 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.65))]" />
      </div>
      <StartScreen />
      <VictoryModal />

      <main className="relative z-10 w-full lg:max-w-6xl flex-1 lg:flex-none flex flex-col px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
        <Board />
      </main>
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <GameLayout />
    </GameProvider>
  );
}

export default App;
