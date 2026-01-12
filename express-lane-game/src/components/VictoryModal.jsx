import React from 'react';
import { useGame } from '../context/GameContext';

const VictoryModal = () => {
  const { gameStatus, player, week, jones } = useGame();

  if (gameStatus === 'playing' || gameStatus === 'start') return null;

  const isWin = gameStatus === 'won';
  const playerNetWorth = player.money + player.savings - player.debt;

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        
        <div className="text-6xl mb-4">
            {isWin ? '🏆' : '💀'}
        </div>
        
        <h2 className={`text-3xl font-bold mb-2 ${isWin ? 'text-green-600' : 'text-red-600'}`}>
            {isWin ? 'Congratulations!' : 'Game Over'}
        </h2>
        
        <p className="text-xl text-slate-600 mb-6">
            {isWin 
                ? "You have achieved the American Dream (sort of)." 
                : "The grind has defeated you."}
        </p>

        <div className="bg-slate-100 rounded-lg p-6 mb-6 grid grid-cols-2 gap-4 text-left">
            <div>
                <div className="text-xs uppercase text-slate-500">Weeks Played</div>
                <div className="font-bold text-xl">{week}</div>
            </div>
            <div>
                <div className="text-xs uppercase text-slate-500">Final Net Worth</div>
                <div className={`font-bold text-xl ${playerNetWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${playerNetWorth}
                </div>
            </div>
            <div>
                <div className="text-xs uppercase text-slate-500">Happiness</div>
                <div className="font-bold text-xl text-yellow-600">{player.happiness}</div>
            </div>
            <div>
                <div className="text-xs uppercase text-slate-500">The Joneses</div>
                <div className="font-bold text-xl text-indigo-600">${jones.netWorth}</div>
            </div>
        </div>

        <div className="text-sm text-slate-500 mb-6 italic">
            {playerNetWorth > jones.netWorth 
                ? "You actually beat The Joneses! Incredible." 
                : "You didn't beat The Joneses, but who can?"}
        </div>

        <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
        >
            Play Again
        </button>

      </div>
    </div>
  );
};

export default VictoryModal;
