import React from 'react';
import { useGame } from '../context/GameContext';
import { calculateNetWorth, DIFFICULTY_PRESETS, meetsEducation } from '../engine/constants';

const GRADE_MESSAGES_WIN = [
  "Incredible. You crushed it!",
  "You played well — life rewarded you.",
  "Slow and steady, but you got there.",
  "Barely made it — but a win's a win!",
];
const GRADE_MESSAGES_LOSS = [
  "The grind won. Try again.",
  "So close! One more run.",
  "Burned out. It happens to the best of us.",
];

const VictoryModal = () => {
  const { state, initGame, startGame } = useGame();

  if (state.gameStatus === 'playing' || state.gameStatus === 'start') return null;

  const isWin = state.gameStatus === 'won';
  const { week, jones, difficulty } = state;
  const player = state.players?.find(p => p.name === state.winner) ?? state.player;
  const netWorth = calculateNetWorth(player);
  const beatJones = netWorth > (jones?.netWorth ?? 0);

  // Grade by week count (faster = better)
  const gradeIdx = isWin
    ? week <= 20 ? 0 : week <= 35 ? 1 : week <= 50 ? 2 : 3
    : week % GRADE_MESSAGES_LOSS.length;
  const flavorText = isWin ? GRADE_MESSAGES_WIN[gradeIdx] : GRADE_MESSAGES_LOSS[gradeIdx];
  const grade = isWin ? (week <= 20 ? 'S' : week <= 35 ? 'A' : week <= 50 ? 'B' : 'C') : 'F';
  const gradeColor = grade === 'S' ? 'text-yellow-500' : grade === 'A' ? 'text-green-500' : grade === 'B' ? 'text-blue-500' : grade === 'C' ? 'text-slate-500' : 'text-red-500';

  const handlePlayAgain = () => {
    const emojis = state.players?.map(p => p.emoji) || null;
    initGame(difficulty, state.playerCount || 1, emojis);
    setTimeout(() => startGame(), 0);
  };
  const handleNewGame = () => initGame(difficulty, state.playerCount || 1);

  return (
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full text-center overflow-hidden">
        {/* Header band */}
        <div className={`p-6 ${isWin ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
          <div className="text-5xl mb-2">{isWin ? '🏆' : '💀'}</div>
          <h2 className={`text-2xl font-black mb-1 ${isWin ? 'text-white' : 'text-white'}`}>
            {isWin
              ? (state.playerCount === 1 || !state.playerCount ? '🎉 You Win!' : `${player.name} Wins!`)
              : player.happiness <= 0 ? '💔 Burned Out' : '😰 Game Over'}
          </h2>
          <p className={`text-sm ${isWin ? 'text-yellow-900' : 'text-slate-300'}`}>{flavorText}</p>
        </div>

        <div className="p-5">
          {/* Grade + weeks */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs uppercase text-slate-400 font-bold">Grade</div>
              <div className={`text-4xl font-black ${gradeColor}`}>{grade}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase text-slate-400 font-bold">Weeks</div>
              <div className="text-4xl font-black text-slate-700">{week}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase text-slate-400 font-bold">Happy</div>
              <div className="text-4xl font-black text-yellow-500">{player.happiness}</div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-2 text-left text-sm border border-slate-200">
            <div>
              <div className="text-[10px] uppercase text-slate-400">Net Worth</div>
              <div className={`font-bold text-base ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>${netWorth.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Education</div>
              <div className="font-bold text-base">{player.education}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Career</div>
              <div className="font-bold">{player.job?.title || 'Unemployed'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Dependability</div>
              <div className="font-bold">{player.dependability ?? 0}/100</div>
            </div>
          </div>

          {/* Jones comparison */}
          <div className={`text-xs font-bold px-3 py-2 rounded-xl mb-4 ${beatJones ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {beatJones
              ? `✅ You beat The Joneses! ($${netWorth.toLocaleString()} vs $${jones?.netWorth?.toLocaleString()})`
              : `❌ Jones is still richer. ($${jones?.netWorth?.toLocaleString()} vs your $${netWorth.toLocaleString()})`
            }
          </div>

          {!isWin && (() => {
            const goals = DIFFICULTY_PRESETS[difficulty].goals;
            const goalItems = [
              { label: 'Wealth', met: netWorth >= goals.wealth, detail: `$${Math.round(netWorth).toLocaleString()} / $${goals.wealth.toLocaleString()}` },
              { label: 'Happiness', met: player.happiness >= goals.happiness, detail: `${player.happiness} / ${goals.happiness}` },
              { label: 'Education', met: meetsEducation(player.education, goals.education), detail: `${player.education} (need ${goals.education})` },
              { label: 'Career Dep.', met: (player.dependability ?? 0) >= goals.careerDependability, detail: `${player.dependability ?? 0} / ${goals.careerDependability}` },
            ];
            return (
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1.5">Goals at Game Over</div>
                <div className="grid grid-cols-2 gap-1">
                  {goalItems.map(g => (
                    <div key={g.label} className={`text-[10px] p-2 rounded-lg border ${g.met ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                      <div className="font-bold">{g.met ? '✅' : '❌'} {g.label}</div>
                      <div className="opacity-75">{g.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="flex gap-2">
            <button onClick={handlePlayAgain} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95 text-sm min-h-[44px]">
              Play Again
            </button>
            <button onClick={handleNewGame} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition active:scale-95 text-sm min-h-[44px]">
              New Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
