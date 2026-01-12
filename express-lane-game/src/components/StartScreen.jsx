import React from 'react';
import { useGame } from '../context/GameContext';

const StartScreen = () => {
  const { gameStatus, startGame, resetGame } = useGame();

  if (gameStatus !== 'start') return null;

  return (
    <div className="fixed inset-0 bg-slate-900 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        
        <h1 className="text-5xl font-bold mb-4 text-indigo-700">Life in the Express Lane</h1>
        <p className="text-xl text-slate-600 mb-8">
            Can you survive the gig economy, pay your rent, and beat The Joneses?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <div className="text-2xl mb-2">🍔</div>
                <h3 className="font-bold text-orange-800">Work & Survive</h3>
                <p className="text-sm text-orange-700">Balance your time between gig work, eating, and sleeping. Don't burn out.</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="text-2xl mb-2">🎓</div>
                <h3 className="font-bold text-blue-800">Learn & Earn</h3>
                <p className="text-sm text-blue-700">Enroll in classes to unlock better careers. From Barista to CEO.</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="font-bold text-green-800">Invest & Win</h3>
                <p className="text-sm text-green-700">Save money, manage debt, and build a Net Worth of $10,000 to win.</p>
            </div>
        </div>

        <div className="flex flex-col gap-4">
            <button 
                onClick={startGame}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
            >
                {localStorage.getItem('jones_week') ? 'Resume Game' : 'Start Game'}
            </button>
            
            {localStorage.getItem('jones_week') && (
                <button 
                    onClick={resetGame}
                    className="text-slate-400 hover:text-red-500 text-sm underline"
                >
                    Reset Save Data
                </button>
            )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
            A modern satire inspired by "Jones in the Fast Lane".
        </p>

      </div>
    </div>
  );
};

export default StartScreen;
