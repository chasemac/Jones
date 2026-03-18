import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Board from './components/Board';
import VictoryModal from './components/VictoryModal';
import StartScreen from './components/StartScreen';

const GameLayout = () => {
  const { state } = useGame();

  return (
    <div className="h-[100dvh] bg-slate-900 flex flex-col lg:items-center lg:justify-center lg:p-4 overflow-hidden">
      <StartScreen />
      <VictoryModal />

      <main className="w-full lg:max-w-5xl flex-1 lg:flex-none flex flex-col">
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
