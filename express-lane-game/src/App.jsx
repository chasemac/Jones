import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
// Header removed as it is now integrated into the Board HUD
import Board from './components/Board';
import VictoryModal from './components/VictoryModal';
import StartScreen from './components/StartScreen';

const GameLayout = () => {
  const { history } = useGame();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 font-sans flex flex-col items-center justify-center p-4">
      <StartScreen />
      <VictoryModal />
      
      <main className="w-full max-w-6xl relative">
        <Board />
        
        {/* Optional: Event Log as a small overlay or below the board if needed, 
            but for now keeping it minimal as per "Jones" style */}
        {history.length > 0 && (
            <div className="mt-4 bg-slate-800 text-slate-400 p-2 rounded text-xs font-mono h-24 overflow-y-auto border border-slate-700">
                {history.slice().reverse().map((entry, i) => (
                    <div key={i} className="border-b border-slate-700 last:border-0 py-1">
                        &gt; {entry}
                    </div>
                ))}
            </div>
        )}
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
