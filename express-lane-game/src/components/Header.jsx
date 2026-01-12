import React from 'react';
import { useGame } from '../context/GameContext';

const Header = () => {
  const { player, week, jones } = useGame();

  const playerNetWorth = player.money + player.savings - player.debt;

  return (
    <header className="bg-slate-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col">
            <div className="font-bold text-xl">Life in the Express Lane</div>
            <div className="text-xs text-slate-400">
                Vs. The Joneses: <span className={playerNetWorth >= jones.netWorth ? "text-green-400" : "text-red-400"}>
                    ${playerNetWorth} / ${jones.netWorth}
                </span>
            </div>
        </div>
        
        <div className="flex gap-6 text-sm md:text-base">
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-xs uppercase">Week</span>
            <span className="font-mono text-lg">{week}</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-xs uppercase">Money</span>
            <span className={`font-mono text-lg ${player.money < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${player.money}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-xs uppercase">Time</span>
            <div className="w-24 h-4 bg-slate-700 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(player.timeRemaining / player.maxTime) * 100}%` }}
              />
            </div>
            <span className="text-xs mt-1">{player.timeRemaining}h left</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-xs uppercase">Happiness</span>
            <span className="font-mono text-lg text-yellow-400">{player.happiness}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
