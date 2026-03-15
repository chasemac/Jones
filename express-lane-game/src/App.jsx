import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Board from './components/Board';
import VictoryModal from './components/VictoryModal';
import StartScreen from './components/StartScreen';

const GameLayout = () => {
  const { state } = useGame();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <StartScreen />
      <VictoryModal />

      <main className="w-full max-w-5xl">
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
