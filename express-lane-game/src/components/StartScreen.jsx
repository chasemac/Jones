import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { DIFFICULTY_PRESETS } from '../engine/constants';

const EMOJI_OPTIONS = [
  '😎', '🤠', '🥸', '🤓', '😈', '🤑', '🥳', '😏',
  '🦊', '🐸', '🐼', '🦄', '🐉', '🦁', '🐺', '🦋',
  '🤖', '🧙', '🦸', '👾',
];

const DEFAULT_EMOJIS = ['😎', '🤠', '🥸', '🧑‍🚀'];

const DIFFICULTY_DESCRIPTIONS = {
  easy:   { icon: '🌱', flavor: 'Chill grind. Good for learning the ropes.', color: 'border-green-400 bg-green-50', selectedColor: 'border-green-500 bg-green-100 shadow-green-200' },
  normal: { icon: '⚡', flavor: 'The classic experience. Work hard, study harder.', color: 'border-indigo-300 bg-indigo-50', selectedColor: 'border-indigo-500 bg-indigo-100 shadow-indigo-200' },
  hard:   { icon: '🔥', flavor: "Brutal. You need a Master's and a corner office.", color: 'border-red-300 bg-red-50', selectedColor: 'border-red-500 bg-red-100 shadow-red-200' },
};

const HOW_TO_WIN = [
  { icon: '💰', label: 'Wealth',    desc: 'Hit your net worth target' },
  { icon: '😊', label: 'Happiness', desc: 'Stay happy to the end' },
  { icon: '🎓', label: 'Education', desc: 'Earn the right degree' },
  { icon: '🎯', label: 'Career',    desc: 'Build dependability' },
];

const StartScreen = () => {
  const { state, initGame, startGame, resetGame } = useGame();
  const [selectedDifficulty, setSelectedDifficulty] = useState(state.difficulty || 'normal');
  const [playerCount, setPlayerCount] = useState(1);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [playerEmojis, setPlayerEmojis] = useState([...DEFAULT_EMOJIS]);

  const setPlayerEmoji = (playerIndex, emoji) => {
    setPlayerEmojis(prev => prev.map((e, i) => i === playerIndex ? emoji : e));
  };

  if (state.gameStatus !== 'start') return null;

  const hasSave = !!localStorage.getItem('jones_v2_state');

  const handleStart = () => {
    initGame(selectedDifficulty, playerCount, playerEmojis);
    setTimeout(() => startGame(), 0);
  };

  const handleResume = () => {
    startGame();
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center overflow-y-auto z-50 py-2 sm:py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-7 my-auto">

        {/* Title */}
        <div className="text-center mb-4">
          <div className="text-3xl sm:text-4xl mb-1">🏙️</div>
          <h1 className="text-2xl sm:text-4xl font-black text-indigo-700 leading-tight">Life in the Express Lane</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">A satirical life-sim. Beat The Joneses.</p>
        </div>

        {/* Win conditions */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-4">
          {HOW_TO_WIN.map(g => (
            <div key={g.label} className="bg-indigo-50 p-2 sm:p-3 rounded-xl border border-indigo-100 text-center">
              <div className="text-xl sm:text-2xl mb-0.5">{g.icon}</div>
              <div className="font-black text-indigo-800 text-[11px] sm:text-xs leading-tight">{g.label}</div>
              <div className="text-[9px] text-indigo-500 hidden sm:block mt-0.5 leading-tight">{g.desc}</div>
            </div>
          ))}
        </div>

        {/* How to play toggle */}
        <button
          onClick={() => setShowHowToPlay(v => !v)}
          className="w-full text-xs text-slate-500 border border-slate-200 rounded-lg py-1.5 mb-3 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
        >
          <span>{showHowToPlay ? '▼' : '▶'}</span>
          <span>How to Play</span>
        </button>
        {showHowToPlay && (
          <div className="bg-slate-50 rounded-xl p-3 mb-3 text-xs text-slate-600 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-700 mb-1">📋 Quick Start Guide</div>
            <div>🏠 <strong>Leasing Office</strong> — choose your first home</div>
            <div>📚 <strong>Library</strong> — browse job listings and apply</div>
            <div>🍔 <strong>Quick Eats</strong> — buy weekly meals (or starve!)</div>
            <div>💼 <strong>Work</strong> at your job location to earn money</div>
            <div>🎓 <strong>City College</strong> — take courses to advance your career</div>
            <div>🏦 <strong>NeoBank</strong> — save money, earn interest, trade stocks</div>
            <div className="mt-1 text-slate-400">⏱ You have 60 hours/week. When time runs out, the week ends automatically.</div>
          </div>
        )}

        {/* Difficulty selection */}
        <div className="mb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Choose Difficulty</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
              const meta = DIFFICULTY_DESCRIPTIONS[key];
              const isSelected = selectedDifficulty === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all min-h-[44px] active:scale-95 ${isSelected
                    ? `${meta.selectedColor} shadow-md scale-[1.03]`
                    : `${meta.color} hover:scale-[1.01]`
                  }`}
                >
                  <div className="text-xl mb-0.5">{meta.icon}</div>
                  <div className="font-black text-xs">{preset.label}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5 hidden sm:block leading-tight">{meta.flavor}</div>
                  <div className="mt-1.5 space-y-0.5 text-[9px] text-slate-600">
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

        {/* Player count + emoji picker */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Players</div>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 h-12 sm:h-14 rounded-xl border-2 font-black text-base sm:text-lg transition-all active:scale-95 flex flex-col items-center justify-center ${playerCount === n
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <div>{playerEmojis[n - 1]}</div>
                <div className="text-[9px] font-bold text-slate-500">{n}P</div>
              </button>
            ))}
          </div>

          {/* Emoji pickers per player */}
          <div className="space-y-2">
            {Array.from({ length: playerCount }, (_, i) => (
              <div key={i}>
                {playerCount > 1 && (
                  <div className="text-[10px] font-bold text-slate-400 mb-1">Player {i + 1} avatar</div>
                )}
                {playerCount === 1 && (
                  <div className="text-[10px] font-bold text-slate-400 mb-1">Choose your avatar</div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setPlayerEmoji(i, emoji)}
                      className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all active:scale-90 ${
                        playerEmojis[i] === emoji
                          ? 'bg-indigo-100 border-2 border-indigo-500 shadow-sm scale-110'
                          : 'bg-slate-100 border-2 border-transparent hover:border-slate-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleStart}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base sm:text-lg py-3 sm:py-4 rounded-xl shadow-lg transition active:scale-95 min-h-[48px]"
          >
            🚀 New Game — {DIFFICULTY_PRESETS[selectedDifficulty].label}{playerCount > 1 ? ` (${playerCount}P)` : ''}
          </button>

          {hasSave && (
            <button
              onClick={handleResume}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow transition active:scale-95 min-h-[44px]"
            >
              ▶ Resume Saved Game
            </button>
          )}

          {hasSave && (
            <button
              onClick={resetGame}
              className="text-slate-400 hover:text-red-500 text-xs underline py-1"
            >
              Delete Save Data
            </button>
          )}
        </div>

        <p className="mt-4 text-[10px] text-center text-slate-400">
          Inspired by "Jones in the Fast Lane" (Sierra On-Line, 1990) · Keyboard: I=Inventory, G=Goals, L=Log
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
