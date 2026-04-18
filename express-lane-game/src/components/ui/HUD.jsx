import React, { useState } from 'react';
import { DIFFICULTY_PRESETS, calculateNetWorth } from '../../engine/constants';
import { effectiveWage } from '../../engine/economyModel';
import stocksData from '../../data/stocks.json';
import { isMuted } from '../../utils/sound';

const StatBar = ({ label, value, color, critical }) => (
  <div className="flex items-center gap-2">
    <span className={`w-20 shrink-0 text-[9px] font-bold leading-none ${critical ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
      {label} <span className="text-white">{value}</span>
    </span>
    <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  </div>
);

const HUD = ({ state, onOpenInventory, onOpenGoals, onToggleMute }) => {
  const [muted, setMuted] = useState(isMuted);
  const [showStats, setShowStats] = useState(false);
  const { player, week, economy, players } = state;
  const isMultiplayer = players && players.length > 1;
  const netWorth = calculateNetWorth(player);
  const timePct = (player.timeRemaining / player.maxTime) * 100;
  const isLowTime = player.timeRemaining < 8;
  const hunger = player.hunger ?? 0;
  const relaxation = player.relaxation ?? 50;
  const dependability = player.dependability ?? 50;

  const economyColor = economy === 'Boom' ? 'text-green-400' : economy === 'Depression' ? 'text-red-400' : 'text-slate-400';
  const economyBg = economy === 'Boom' ? 'bg-green-900/40' : economy === 'Depression' ? 'bg-red-900/40' : '';

  const happinessFace = player.happiness >= 80 ? '😁' : player.happiness >= 60 ? '🙂' : player.happiness >= 40 ? '😐' : player.happiness >= 20 ? '😟' : '😫';
  const happinessBarColor = player.happiness < 20 ? 'bg-red-500' : player.happiness < 50 ? 'bg-orange-400' : player.happiness < 75 ? 'bg-yellow-400' : 'bg-green-500';
  const hungerFace = hunger >= 80 ? '🤤' : hunger >= 60 ? '😮' : hunger >= 40 ? '🍽️' : '😋';
  const hungerBarColor = hunger >= 80 ? 'bg-red-500 animate-pulse' : hunger >= 60 ? 'bg-orange-400' : hunger >= 40 ? 'bg-yellow-400' : 'bg-green-500';
  const relaxBarColor = relaxation <= 20 ? 'bg-red-500 animate-pulse' : 'bg-teal-400';

  const portfolioVal = stocksData.reduce((sum, s) => sum + (player.portfolio?.[s.symbol] || 0) * (state.market[s.symbol] || 0), 0);
  const hasCritical = player.happiness < 25 || hunger >= 80 || relaxation <= 20 || player.debt > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] shadow-[0_-12px_30px_rgba(2,6,23,0.5)] backdrop-blur">
      {isMultiplayer && (
        <div className="flex border-b border-slate-700 overflow-x-auto">
          {players.map((p, i) => {
            const isActive = i === state.activePlayerIndex;
            const pNetWorth = calculateNetWorth(p);
            return (
              <div key={p.name} className={`flex items-center gap-1 px-2 py-1 text-[9px] font-bold shrink-0 border-r border-slate-700 ${isActive ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                <span>{p.emoji}</span>
                <span>{p.name}</span>
                {isActive && <span className="text-yellow-400">◀</span>}
                <span className={`font-mono ${pNetWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>${Math.round(pNetWorth).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expandable stats drawer — appears above main row */}
      {showStats && (
        <div className="px-3 py-2.5 border-b border-white/10 bg-slate-950/95 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <StatBar label="😊 Happiness" value={player.happiness} color={happinessBarColor} critical={player.happiness < 25} />
          <StatBar label="🍕 Hunger" value={hunger} color={hungerBarColor} critical={hunger >= 80} />
          <StatBar label="🎯 Dep" value={dependability} color="bg-blue-400" />
          <StatBar label="🛁 Relax" value={relaxation} color={relaxBarColor} critical={relaxation <= 20} />
          <div className="col-span-2 pt-1.5 mt-0.5 border-t border-white/10 space-y-0.5 text-[9px]">
            <div className="flex gap-3 flex-wrap text-slate-400">
              <span>🎓 {player.education}</span>
              <span className={!player.job ? 'text-red-400 font-bold' : ''}>
                💼 {player.job ? `${player.job.title} (${player.job.weeksWorked || 0}wk)` : '⚠️ No job — visit 📚 Library'}
              </span>
              {(() => { const v = player.inventory?.find(i => i.type === 'vehicle'); return v ? <span>{v.id === 'car' ? '🚗' : '🚲'}</span> : null; })()}
            </div>
            <div className="flex gap-3 flex-wrap text-slate-400">
              <span>Net: <span className={netWorth >= 0 ? 'text-green-400' : 'text-red-400'}>${Math.round(netWorth).toLocaleString()}</span></span>
              {player.savings > 0 && <span className="text-blue-400">💾 ${Math.round(player.savings).toLocaleString()}</span>}
              {player.debt > 0 && <span className="text-red-400 font-bold animate-pulse">💳 −${Math.round(player.debt).toLocaleString()}</span>}
              {player.job && (
                <span>≈<span className="text-green-400">${Math.floor(effectiveWage(player.job.wage, economy) * 8)}/shift</span>
                  <span className="text-slate-600 ml-1">· ${Math.floor(effectiveWage(player.job.wage, economy) * 40)}/wk</span>
                </span>
              )}
              {portfolioVal > 0 && <span className="text-indigo-400">📈 ${portfolioVal.toLocaleString()}</span>}
              {(() => {
                const snap = state.weekStartSnapshot?.find(s => s.name === player.name);
                if (!snap) return null;
                const oldNW = (snap.money ?? 0) + (snap.savings ?? 0) - (snap.debt ?? 0);
                const delta = netWorth - oldNW;
                if (Math.abs(delta) < 1) return null;
                return <span className={delta > 0 ? 'text-green-400' : 'text-red-400'}>{delta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta)).toLocaleString()} this wk</span>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Main slim HUD row */}
      <div className={`px-2 md:px-3 flex items-center gap-2 ${isMultiplayer ? 'py-1.5' : 'py-2'} pb-[max(0.5rem,env(safe-area-inset-bottom))]`}>

        {/* Week + Economy badge */}
        <div className={`shrink-0 flex flex-col items-center min-w-[36px] rounded-lg px-1.5 py-0.5 ${economyBg}`}>
          <div className="text-white text-[10px] font-black leading-none">Wk {week}</div>
          <div className={`text-[8px] font-bold leading-none mt-0.5 ${economyColor}`}>{economy}{state.economyTimer <= 2 ? ' ⚡' : ''}</div>
        </div>

        {/* Status faces — tappable to open stats */}
        <button
          onClick={() => setShowStats(s => !s)}
          className="shrink-0 flex gap-0.5 text-lg leading-none focus:outline-none"
          title="View all stats"
          aria-label="Toggle stats panel"
        >
          <span className={player.happiness < 25 ? 'animate-pulse' : ''}>{happinessFace}</span>
          <span className={hunger >= 80 ? 'animate-bounce' : ''}>{hungerFace}</span>
        </button>

        {/* Time bar — primary resource, flex-grow */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between text-[8px] font-bold leading-none mb-0.5">
            <span className={isLowTime ? 'text-red-400 animate-pulse font-black' : 'text-slate-400'}>
              {isLowTime ? '⚡ ' : '⏱ '}{player.timeRemaining}h
            </span>
            <span className="text-slate-600">{player.maxTime}h</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${timePct < 20 ? 'bg-red-500 animate-pulse' : timePct < 40 ? 'bg-orange-400' : 'bg-blue-500'}`}
              style={{ width: `${timePct}%` }}
            />
          </div>
        </div>

        {/* Money — primary value */}
        <div className={`shrink-0 px-2.5 py-1.5 rounded-2xl border font-mono text-sm min-w-[74px] text-right leading-none shadow-inner ${player.money < 0 ? 'text-red-300 border-red-900/60 bg-red-950/40' : 'text-green-300 border-emerald-900/40 bg-black/40'}`}>
          ${Math.round(player.money).toLocaleString()}
        </div>

        {/* Stats toggle */}
        <button
          onClick={() => setShowStats(s => !s)}
          className={`shrink-0 h-9 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide transition border flex items-center gap-1 relative ${showStats ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'}`}
          title="Show all stats"
        >
          <span>Stats</span>
          <span className="text-[8px]">{showStats ? '▾' : '›'}</span>
          {!showStats && hasCritical && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-slate-900" />
          )}
        </button>

        {/* Action buttons */}
        <div className="shrink-0 flex gap-1">
          <button
            onClick={onOpenInventory}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white w-9 h-9 rounded-xl text-sm border border-slate-600 transition flex items-center justify-center"
            title="Inventory (I)"
          >🎒</button>
          <button
            onClick={onOpenGoals}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white w-9 h-9 rounded-xl text-sm border border-slate-600 transition flex items-center justify-center"
            title="Goals (G)"
          >🎯</button>
          <button
            onClick={() => { onToggleMute(); setMuted(m => !m); }}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white w-9 h-9 rounded-xl text-sm border border-slate-600 transition flex items-center justify-center"
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
          >{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>
    </div>
  );
};

export default HUD;
