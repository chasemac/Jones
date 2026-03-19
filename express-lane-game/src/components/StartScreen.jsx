import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { DIFFICULTY_PRESETS } from '../engine/constants';

const DIFFICULTY_DESCRIPTIONS = {
  easy:   { icon: '🌱', flavor: 'Chill grind. Good for learning the ropes.' },
  normal: { icon: '⚡', flavor: 'The classic experience. Work hard, study harder.' },
  hard:   { icon: '🔥', flavor: 'Brutal. You need a Master\'s and a corner office.' },
};

const StartScreen = () => {
  const { state, initGame, startGame, resetGame } = useGame();
  const [selectedDifficulty, setSelectedDifficulty] = useState(state.difficulty || 'normal');
  const [playerCount, setPlayerCount] = useState(1);

  if (state.gameStatus !== 'start') return null;

  const hasSave = !!localStorage.getItem('jones_v2_state');

  const handleStart = () => {
    initGame(selectedDifficulty, playerCount);
    setTimeout(() => startGame(), 0);
  };

  const handleResume = () => {
    startGame();
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center overflow-y-auto z-50 py-2 sm:py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-8 text-center my-auto">

        <h1 className="text-2xl sm:text-5xl font-black mb-1 text-indigo-700 leading-tight">Life in the Express Lane</h1>
        <p className="text-slate-500 mb-3 text-xs sm:text-sm">A satirical life-sim. Beat The Joneses.</p>

        {/* How to win — always 4 columns, compact on mobile */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-left">
          {[
            { icon: '💰', label: 'Wealth',    desc: 'Hit your net worth target' },
            { icon: '😊', label: 'Happiness', desc: 'Keep your spirits up' },
            { icon: '🎓', label: 'Education', desc: 'Earn the right degree' },
            { icon: '🎯', label: 'Career',    desc: 'Build dependability' },
          ].map(g => (
            <div key={g.label} className="bg-indigo-50 p-2 sm:p-3 rounded-lg border border-indigo-100">
              <div className="text-xl sm:text-2xl mb-0.5">{g.icon}</div>
              <div className="font-bold text-indigo-800 text-[11px] sm:text-sm">{g.label}</div>
              <div className="text-[9px] sm:text-xs text-indigo-600 hidden sm:block">{g.desc}</div>
            </div>
          ))}
        </div>

        {/* Difficulty selection */}
        <div className="mb-3">
          <div className="text-xs font-bold text-slate-600 uppercase mb-2">Choose Difficulty</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
              const meta = DIFFICULTY_DESCRIPTIONS[key];
              const isSelected = selectedDifficulty === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={`p-2 sm:p-3 rounded-xl border-2 text-left transition-all ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105'
                    : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="text-xl sm:text-2xl mb-0.5">{meta.icon}</div>
                  <div className="font-black text-xs sm:text-sm">{preset.label}</div>
                  <div className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 hidden sm:block">{meta.flavor}</div>
                  <div className="mt-1 sm:mt-2 space-y-0.5 text-[9px] sm:text-[10px] text-slate-600">
                    <div>💰 ${preset.goals.wealth.toLocaleString()}</div>
                    <div>😊 {preset.goals.happiness}</div>
                    <div>🎓 {preset.goals.education}</div>
                    <div>🎯 {preset.goals.careerDependability} dep</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player count */}
        <div className="mb-3">
          <div className="text-xs font-bold text-slate-600 uppercase mb-2">Players</div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 font-black text-base sm:text-lg transition-all ${playerCount === n
                  ? 'border-indigo-500 bg-indigo-50 scale-110 shadow'
                  : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {['😎','🤠','🥸','🧑‍🚀'][n-1]}
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-500">{n}P</div>
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <button
            onClick={handleStart}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg sm:text-xl py-3 sm:py-4 px-8 sm:px-12 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            New Game — {DIFFICULTY_PRESETS[selectedDifficulty].label} {playerCount > 1 ? `(${playerCount}P)` : ''}
          </button>

          {hasSave && (
            <button
              onClick={handleResume}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-full shadow transition"
            >
              Resume Saved Game
            </button>
          )}

          {hasSave && (
            <button
              onClick={resetGame}
              className="text-slate-400 hover:text-red-500 text-sm underline"
            >
              Delete Save Data
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          A modern satire inspired by "Jones in the Fast Lane" (Sierra On-Line, 1990).
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
