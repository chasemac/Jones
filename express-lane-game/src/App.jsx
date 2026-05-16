import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Board from './components/Board';
import VictoryModal from './components/VictoryModal';
import StartScreen from './components/StartScreen';

const GameLayout = () => {
  useGame();

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden flex flex-col lg:items-center lg:justify-center lg:p-6"
      style={{
        background:
          'radial-gradient(ellipse 60% 40% at 50% 0%, #EAE2D1 0%, transparent 60%),' +
          'linear-gradient(180deg, #F2EBDC 0%, #E8E1D3 100%)',
      }}
    >
      <StartScreen />
      <VictoryModal />

      <main
        className="relative z-10 w-full lg:max-w-6xl flex-1 lg:flex-none flex flex-col px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]"
        style={{ color: 'var(--ink)' }}
      >
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
