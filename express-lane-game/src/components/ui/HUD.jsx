import React, { useState } from 'react';
import { DIFFICULTY_PRESETS, calculateNetWorth } from '../../engine/constants';
import { effectiveWage } from '../../engine/economyModel';
import { hungerEmojiFill } from './hungerUtils';
import stocksData from '../../data/stocks.json';
import { isMuted as getSoundMuted } from '../../utils/sound';

const HUD = ({ state, onOpenInventory, onOpenGoals, onToggleMute }) => {
  const [muted, setMuted] = useState(getSoundMuted());
  const { player, week, economy, players } = state;
  const isMultiplayer = players && players.length > 1;
  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const timePct = (player.timeRemaining / player.maxTime) * 100;
  const isLowTime = player.timeRemaining < 8;

  const economyColor = economy === 'Boom' ? 'text-green-400' : economy === 'Depression' ? 'text-red-400' : 'text-slate-400';
  const economyBg = economy === 'Boom' ? 'bg-green-900/40' : economy === 'Depression' ? 'bg-red-900/40' : '';
  const happinessFace = player.happiness >= 80 ? '😁' : player.happiness >= 60 ? '🙂' : player.happiness >= 40 ? '😐' : player.happiness >= 20 ? '😟' : '😫';
  const happinessBarColor = player.happiness < 20 ? 'bg-red-500' : player.happiness < 50 ? 'bg-orange-400' : player.happiness < 75 ? 'bg-yellow-400' : 'bg-green-500';

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
      <div className={`px-2 md:px-3 pt-2 ${isMultiplayer ? 'pb-[max(0.55rem,env(safe-area-inset-bottom))]' : 'pb-[max(0.65rem,env(safe-area-inset-bottom))]'}`}>
      <div className="mb-1.5 flex gap-1 flex-wrap md:hidden">
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[9px] font-black text-white">🎓 {player.education}</span>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${player.job ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>💼 {player.job ? player.job.title : 'Unemployed'}</span>
        <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-1 text-[9px] font-black text-sky-100">🎯 {player.dependability ?? 50}</span>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${(player.relaxation ?? 50) <= 20 ? 'bg-amber-500/25 text-amber-100' : 'bg-teal-500/20 text-teal-100'}`}>🛁 {player.relaxation ?? 50}</span>
      </div>
      <div className={`flex items-center justify-between gap-1 md:gap-2 ${isMultiplayer ? 'min-h-[4.2rem] md:h-20' : 'min-h-[4.6rem] md:h-24'}`}>
      <div className={`flex flex-col items-center min-w-[44px] md:min-w-[52px] rounded-lg px-1 py-0.5 ${economyBg}`}>
        <div className="text-base md:text-2xl leading-none">📅</div>
        <div className="text-white text-[11px] md:text-xs font-black leading-none">Wk {week}</div>
        <div className={`text-[8px] font-bold ${economyColor} leading-none mt-0.5`}>{economy}{state.economyTimer <= 2 ? ' ⚡' : ''}</div>
      </div>
      <div className="flex flex-col items-center" title={`Happiness: ${player.happiness}/100 (Goal: ${goals.happiness})`}>
        <div className="text-base md:text-2xl leading-none">{happinessFace}</div>
        <div className="w-10 md:w-14 h-2 bg-slate-700 rounded-full mt-0.5 overflow-hidden">
          <div className={`h-full transition-all duration-500 ${happinessBarColor}`} style={{ width: `${player.happiness}%` }} />
        </div>
        <div className={`text-[8px] font-bold ${player.happiness < 25 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>{player.happiness}</div>
      </div>
      {(() => {
        const hunger = player.hunger ?? 0;
        const hungerFace = hunger >= 80 ? '🤤' : hunger >= 60 ? '😮' : hunger >= 40 ? '🍽️' : '😋';
        const hungerBarColor = hunger >= 80 ? 'bg-red-500' : hunger >= 60 ? 'bg-orange-400' : hunger >= 40 ? 'bg-yellow-400' : 'bg-green-500';
        return (
          <div className="flex flex-col items-center" title={`Hunger: ${hunger}/100 (hit 80 → lose 20h next week)`}>
            <div className={`text-base md:text-2xl leading-none ${hunger >= 80 ? 'animate-bounce' : ''}`}>{hungerFace}</div>
            <div className="w-10 md:w-14 h-2 bg-slate-700 rounded-full mt-0.5 overflow-hidden">
              <div className={`h-full transition-all duration-500 ${hungerBarColor}`} style={{ width: `${hunger}%` }} />
            </div>
            <div className={`text-[8px] font-bold ${hunger >= 80 ? 'text-red-400 animate-pulse' : hunger >= 60 ? 'text-orange-400' : 'text-slate-400'}`}>{hunger}</div>
          </div>
        );
      })()}
      <div className="flex-grow flex flex-col gap-0.5 min-w-0">
        <div className="flex justify-between text-[8px] text-slate-400 uppercase font-bold leading-none">
          <span className={isLowTime ? 'text-red-400 animate-pulse font-black' : ''}>
            {isLowTime ? '⚡ LOW TIME' : '⏱ Time'}
          </span>
          <span className={isLowTime ? 'text-red-400 font-black' : ''}>{player.timeRemaining}h / {player.maxTime}h</span>
        </div>
        <div className="h-2.5 md:h-3 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${timePct < 20 ? 'bg-red-500 animate-pulse' : timePct < 40 ? 'bg-orange-400' : 'bg-blue-500'}`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <div className="flex gap-1 md:hidden flex-wrap mt-0.5">
          {player.hunger >= 60 && (
            <span className={`text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ${player.hunger >= 80 ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}>
              🍕{player.hunger >= 80 ? 'STARVING' : player.hunger}
            </span>
          )}
          {(player.relaxation ?? 50) <= 20 && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">🛁 {player.relaxation ?? 50}</span>
          )}
          {player.happiness < 25 && (
            <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">💔 {player.happiness}</span>
          )}
          {!player.job && (
            <span className="bg-slate-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">No Job</span>
          )}
          {player.debt > 0 && (
            <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">💳 ${player.debt}</span>
          )}
        </div>
        <div className="hidden md:contents">
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-400 w-16 shrink-0">🎯 Dep {player.dependability ?? 50}</span>
            <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${player.dependability ?? 50}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-400 w-16 shrink-0">🛁 Relax {player.relaxation ?? 50}</span>
            <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${(player.relaxation ?? 50) < 20 ? 'bg-red-500 animate-pulse' : 'bg-teal-400'}`} style={{ width: `${player.relaxation ?? 50}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[8px] w-16 shrink-0 ${player.hunger >= 80 ? 'text-red-400 font-bold animate-pulse' : player.hunger >= 60 ? 'text-orange-400' : 'text-slate-400'}`}>
              {hungerEmojiFill(player.hunger)} {player.hunger >= 80 ? 'STARVING' : player.hunger >= 60 ? 'Hungry' : ''}
            </span>
            <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${player.hunger >= 80 ? 'bg-red-500 animate-pulse' : player.hunger >= 60 ? 'bg-orange-400' : player.hunger >= 30 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${player.hunger}%` }} />
            </div>
          </div>
          <div className="flex gap-2 text-[8px] flex-wrap items-center">
            <span className="text-slate-400">🎓 {player.education}</span>
            <span className={`${player.job ? 'text-slate-400' : 'text-red-400 animate-pulse font-bold'}`}>
              💼 {player.job ? `${player.job.title} (${player.job.weeksWorked || 0}wk)` : '⚠️ Unemployed — visit Library!'}
            </span>
            {(() => {
              const v = player.inventory?.find(i => i.type === 'vehicle');
              const reqId = player.job?.requirements?.item;
              const worn = reqId ? player.inventory?.find(i => i.id === reqId && i.clothingWear !== undefined) : null;
              return (
                <>
                  {v && <span className="text-slate-400">{v.id === 'car' ? '🚗' : '🚲'}</span>}
                  {worn && worn.clothingWear < 40 && (
                    <span className="text-orange-400 animate-pulse font-bold" title={`${worn.name}: ${worn.clothingWear}% durability left`}>
                      👔{worn.clothingWear}%
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`px-2.5 py-1.5 rounded-2xl border font-mono text-sm sm:text-base min-w-[74px] sm:min-w-[96px] text-right leading-none shadow-inner ${player.money < 0 ? 'text-red-300 border-red-900/60 bg-red-950/40' : 'text-green-300 border-emerald-900/40 bg-black/40'}`}>
          ${Math.round(player.money).toLocaleString()}
        </div>
        {player.savings > 0 && (
          <div className="text-[9px] text-blue-400 text-right leading-none">
            💾 ${Math.round(player.savings).toLocaleString()}
          </div>
        )}
        {player.debt > 0 && (
          <div className="text-[9px] text-red-400 text-right leading-none animate-pulse font-bold">
            ⚠️ -${Math.round(player.debt).toLocaleString()}
          </div>
        )}
        <div className="text-[8px] text-slate-500 text-right hidden sm:block leading-none">
          Net: <span className={netWorth < 0 ? 'text-red-400' : 'text-green-400'}>${Math.round(netWorth).toLocaleString()}</span>
          {(() => {
            const snap = state.weekStartSnapshot?.find(s => s.name === player.name);
            if (!snap) return null;
            const oldNW = (snap.money ?? 0) + (snap.savings ?? 0) - (snap.debt ?? 0);
            const delta = netWorth - oldNW;
            if (Math.abs(delta) < 1) return null;
            return <span className={delta > 0 ? 'text-green-400' : 'text-red-400'}> {delta > 0 ? '▲' : '▼'}</span>;
          })()}
        </div>
        {player.job && (
          <div className="text-[8px] text-slate-400 text-right hidden sm:block leading-none">
            ≈<span className="text-green-400 font-mono">${Math.floor(effectiveWage(player.job.wage, economy) * 8)}/shift</span>
            <span className="text-slate-500 ml-1">· ${Math.floor(effectiveWage(player.job.wage, economy) * 40)}/wk</span>
          </div>
        )}
        {(() => {
          const portfolioVal = stocksData.reduce((sum, s) => sum + (player.portfolio?.[s.symbol] || 0) * (state.market[s.symbol] || 0), 0);
          return portfolioVal > 0 ? (
            <div className="text-[8px] text-indigo-400 text-right hidden sm:block leading-none">
              📈 ${portfolioVal.toLocaleString()}
            </div>
          ) : null;
        })()}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={onOpenInventory}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white min-w-[3rem] h-11 rounded-xl text-sm border border-slate-600 transition flex items-center justify-center gap-1 px-2"
            title="Inventory (I)"
          ><span>🎒</span><span className="hidden sm:inline text-[10px] font-black uppercase tracking-wide">Bag</span></button>
          <button
            onClick={onOpenGoals}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white min-w-[3rem] h-11 rounded-xl text-sm border border-slate-600 transition flex items-center justify-center gap-1 px-2"
            title="Goals (G)"
          ><span>🎯</span><span className="hidden sm:inline text-[10px] font-black uppercase tracking-wide">Goals</span></button>
          <button
            onClick={() => { onToggleMute(); setMuted(m => !m); }}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white min-w-[3rem] h-11 rounded-xl text-sm border border-slate-600 transition flex items-center justify-center gap-1 px-2"
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
          ><span>{muted ? '🔇' : '🔊'}</span><span className="hidden sm:inline text-[10px] font-black uppercase tracking-wide">{muted ? 'Mute' : 'Sound'}</span></button>
        </div>
        <div className="hidden md:block text-[7px] text-slate-600 text-center" title="I=Inventory, G=Goals, L=Log, M=Mute, W=Work (or part-time), E=End Week at home, R=Rest, S=Study, N=Network, Esc=Close">
          ⌨ I G L M W E R S N
        </div>
      </div>
      </div>
      </div>
    </div>
  );
};

export default HUD;
