import React from 'react';
import { useGame } from '../context/GameContext';
import { DIFFICULTY_PRESETS } from '../engine/constants';

const VictoryModal = () => {
  const { state, initGame } = useGame();

  if (state.gameStatus === 'playing' || state.gameStatus === 'start') return null;

  const isWin = state.gameStatus === 'won';
  const { week, jones, difficulty } = state;
  const player = state.players?.find(p => p.name === state.winner) ?? state.player;
  const netWorth = player.money + player.savings - player.debt;

  const handlePlayAgain = () => {
    initGame(difficulty, state.playerCount || 1);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">{isWin ? '🏆' : '💀'}</div>
        <h2 className={`text-3xl font-black mb-2 ${isWin ? 'text-green-600' : 'text-red-600'}`}>
          {isWin ? `${player.name} Wins!` : 'Game Over'}
        </h2>
        <p className="text-slate-600 mb-6">
          {isWin
            ? `All four goals achieved on ${DIFFICULTY_PRESETS[difficulty].label} in ${week} weeks!`
            : "Your happiness hit zero. The grind won."}
        </p>
        <div className="bg-slate-100 rounded-xl p-5 mb-6 grid grid-cols-2 gap-3 text-left text-sm">
          <div><div className="text-xs uppercase text-slate-500">Weeks</div><div className="font-bold text-xl">{week}</div></div>
          <div><div className="text-xs uppercase text-slate-500">Net Worth</div><div className={`font-bold text-xl ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>${netWorth.toLocaleString()}</div></div>
          <div><div className="text-xs uppercase text-slate-500">Job</div><div className="font-bold">{player.job?.title || 'Unemployed'}</div></div>
          <div><div className="text-xs uppercase text-slate-500">Education</div><div className="font-bold">{player.education}</div></div>
          <div><div className="text-xs uppercase text-slate-500">The Joneses</div><div className="font-bold text-indigo-600">${jones.netWorth.toLocaleString()}</div></div>
          <div><div className="text-xs uppercase text-slate-500">Happiness</div><div className="font-bold text-yellow-600">{player.happiness}/100</div></div>
        </div>
        <div className="text-sm text-slate-500 mb-5 italic">
          {netWorth > jones.netWorth ? "You beat The Joneses. Incredible." : "Jones is still richer."}
        </div>
        <button onClick={handlePlayAgain} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105">
          Play Again
        </button>
      </div>
    </div>
  );
};

export default VictoryModal;
