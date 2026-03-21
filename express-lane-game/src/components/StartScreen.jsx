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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.28),transparent_24%),linear-gradient(180deg,#082f49_0%,#0f172a_42%,#111827_100%)] px-4 py-3 sm:py-6">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-10 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="absolute right-[10%] top-24 h-32 w-32 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>
      <div className="relative mx-auto my-auto w-full max-w-2xl rounded-[2rem] border border-white/15 bg-white/92 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur sm:p-7">

        {/* Title */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700 shadow-sm">
            <span>Satirical Life Sim</span>
            <span className="opacity-40">•</span>
            <span>Mobile Ready</span>
          </div>
          <div className="text-4xl sm:text-5xl mb-1">🏙️</div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-[0.95]">Life in the Express Lane</h1>
          <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-md mx-auto">Outwork the city, outlearn the grind, and finally beat The Joneses at their own game.</p>
        </div>

        {hasSave && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left shadow-sm">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Save Found</div>
              <div className="text-sm text-emerald-900">Jump back into your last run or start fresh with a new setup.</div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-emerald-700 shadow-sm">Ready</div>
          </div>
        )}

        {/* Win conditions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {HOW_TO_WIN.map(g => (
            <div key={g.label} className="bg-gradient-to-b from-indigo-50 to-white p-3 rounded-2xl border border-indigo-100 text-center shadow-sm">
              <div className="text-xl sm:text-2xl mb-0.5">{g.icon}</div>
              <div className="font-black text-indigo-900 text-[11px] sm:text-xs leading-tight">{g.label}</div>
              <div className="text-[9px] text-indigo-500 mt-1 leading-tight">{g.desc}</div>
            </div>
          ))}
        </div>

        {/* How to play toggle */}
        <button
          onClick={() => setShowHowToPlay(v => !v)}
          className="w-full text-xs text-slate-500 border border-slate-200 rounded-xl py-2 mb-3 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>{showHowToPlay ? '▼' : '▶'}</span>
          <span>How to Play</span>
        </button>
        {showHowToPlay && (
          <div className="bg-slate-50 rounded-2xl p-3.5 mb-3 text-xs text-slate-600 border border-slate-200 space-y-1.5 shadow-inner">
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
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Choose Difficulty</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
              const meta = DIFFICULTY_DESCRIPTIONS[key];
              const isSelected = selectedDifficulty === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all min-h-[48px] active:scale-95 ${isSelected
                    ? `${meta.selectedColor} shadow-lg scale-[1.03]`
                    : `${meta.color} hover:scale-[1.01] shadow-sm`
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
        <div className="mb-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Players</div>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 h-14 sm:h-16 rounded-2xl border-2 font-black text-base sm:text-lg transition-all active:scale-95 flex flex-col items-center justify-center ${playerCount === n
                  ? 'border-indigo-500 bg-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-400'
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
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 shadow-sm ${
                        playerEmojis[i] === emoji
                          ? 'bg-indigo-100 border-2 border-indigo-500 scale-110'
                          : 'bg-white border-2 border-transparent hover:border-slate-300'
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
        <div className="sticky bottom-0 -mx-4 sm:-mx-7 mt-2 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-7">
          <div className="mb-2 text-[10px] text-center font-semibold uppercase tracking-[0.18em] text-slate-400">Ready To Roll</div>
          <div className="flex flex-col gap-2">
          <button
            onClick={handleStart}
            className="bg-[linear-gradient(135deg,#4f46e5,#2563eb)] hover:brightness-110 text-white font-black text-base sm:text-lg py-3.5 sm:py-4 rounded-2xl shadow-[0_16px_35px_rgba(79,70,229,0.35)] transition active:scale-95 min-h-[52px]"
          >
            🚀 New Game — {DIFFICULTY_PRESETS[selectedDifficulty].label}{playerCount > 1 ? ` (${playerCount}P)` : ''}
          </button>

          {hasSave && (
            <button
              onClick={handleResume}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl shadow transition active:scale-95 min-h-[48px]"
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
        </div>

        <p className="mt-4 text-[10px] text-center text-slate-400">
          Inspired by "Jones in the Fast Lane" (Sierra On-Line, 1990) · Keyboard: I=Inventory, G=Goals, L=Log, M=Mute
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
