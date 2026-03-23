import React from 'react';
import { effectiveWage } from '../../engine/economyModel';
import { getNextPromotion, getJobLocation } from '../../engine/jobModel';
import { homeEmoji } from '../../engine/boardModel';
import { DIFFICULTY_PRESETS, calculateNetWorth, meetsEducation } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';

const HomeContent = ({ state, actions }) => {
  const { player } = state;
  const relax = player.relaxation ?? 50;
  const isLowRelax = relax <= 20;
  const homeType = player.housing?.homeType;
  const emoji = homeEmoji(player.housing);
  const homeName = homeType === 'luxury_condo' ? 'Luxury Condo' : homeType === 'apartment' ? 'Your Apartment' : "Mom's House";
  const jobLocation = getJobLocation(player.job);
  const isWFH = jobLocation === 'home';
  const requiresLaptopForHomeWork = isWFH && player.job?.requirements?.item === 'laptop';
  const hasLaptop = player.inventory.some(i => i.id === 'laptop');
  const hasHotTub = player.inventory.some(i => i.id === 'hot_tub');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="home" player={player} actions={actions} /></div>
      <div className="space-y-3">
        {(() => {
          const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
          const netWorth = calculateNetWorth(player);
          const allGoalsMet = netWorth >= goals.wealth && player.happiness >= goals.happiness &&
            meetsEducation(player.education, goals.education) && player.dependability >= goals.careerDependability;
          if (!allGoalsMet) return null;
          return (
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-sm p-3 rounded-xl text-center animate-pulse shadow-lg mb-1">
              🏆 ALL GOALS MET! Sleep to win! 🏆
            </div>
          );
        })()}

        <button
          onClick={() => { actions.endWeek(); }}
          className={`w-full text-white font-black py-3.5 rounded-xl shadow-lg text-base flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 min-h-[52px]
            ${player.timeRemaining <= 10 ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'}
          `}
        >
          <div className="flex items-center gap-2">😴 Sleep — End Week
            <span className="text-xs font-normal opacity-75">({player.timeRemaining}h left)</span>
          </div>
          <div className="text-[9px] font-normal opacity-70">
            {(() => {
              const hasFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage' || i.type === 'weekly_coffee');
              const nextHunger = Math.min(100, (player.hunger ?? 0) + (player.housing?.homeType === 'luxury_condo' ? 20 : 25));
              if (!hasFood && nextHunger >= 80)
                return `⚠️ STARVING next week — -20h penalty! Buy food!`;
              if (!hasFood && nextHunger >= 50)
                return `⚠️ No food — hunger hits ${nextHunger}, -10h penalty!`;
              if (!hasFood && player.hunger >= 25)
                return `⚠️ No food bought — hunger will rise to ${nextHunger}`;
              return 'Rent, interest, hunger & happiness resolve at week end';
            })()}
          </div>
        </button>

        <div className={`rounded-xl border-2 p-3 ${homeType === 'luxury_condo' ? 'bg-yellow-50 border-yellow-300' : homeType === 'apartment' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-black text-sm">{homeName}</div>
              <div className="text-[10px] text-slate-500">{player.housing?.title} · ${player.housing?.rent ?? 0}/wk</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
            <span>🔒 {player.housing?.security ?? 'High'} security</span>
            {hasHotTub && <span>🛁 Hot tub</span>}
            {player.job && <span className="text-green-600 font-bold">💰 ~${Math.floor(effectiveWage(player.job.wage, state.economy) * 8)}/shift</span>}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-[10px]">
          <div className="font-bold text-slate-600 mb-1.5 text-xs">📊 This Week at a Glance</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
            <span className="text-slate-500">💰 Cash:</span>
            <span className={`font-bold ${player.money >= 0 ? 'text-green-600' : 'text-red-500'}`}>${Math.round(player.money).toLocaleString()}</span>
            <span className="text-slate-500">💾 Saved:</span>
            <span className="font-bold text-indigo-600">${Math.round(player.savings).toLocaleString()}</span>
            {player.debt > 0 && <><span className="text-slate-500">⚠️ Debt:</span><span className="font-bold text-red-500">-${Math.round(player.debt).toLocaleString()}</span></>}
            <span className="text-slate-500">⏱ Time left:</span>
            <span className={`font-bold ${player.timeRemaining <= 8 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>{player.timeRemaining}h</span>
            <span className="text-slate-500">🍕 Hunger:</span>
            {(() => {
              const hunger = player.hunger ?? 0;
              const hungerInc = player.housing?.homeType === 'luxury_condo' ? 20 : 25;
              const meal = player.inventory.find(i => i.type === 'weekly_meal');
              const coffee = player.inventory.find(i => i.type === 'weekly_coffee');
              const restore = (meal?.weeklyHungerRestore ?? 0) + (coffee?.weeklyHungerRestore ?? 0);
              const nextHunger = Math.max(0, Math.min(100, hunger + hungerInc - restore));
              const hasFood = restore > 0;
              return (
                <span className={`font-bold ${nextHunger >= 80 ? 'text-red-500 animate-pulse' : nextHunger >= 60 ? 'text-orange-500' : 'text-green-600'}`}>
                  {hunger} → {nextHunger} next wk{hasFood ? ' ✅' : nextHunger >= 55 ? ' ⚠️' : ''}
                </span>
              );
            })()}
          </div>
          {(() => {
            const rent = player.housing?.rent ?? 0;
            const weeklyFees = player.inventory.reduce((sum, i) => sum + (i.weeklyFee || 0), 0);
            const debtInterest = player.debt > 0 ? Math.floor(player.debt * 0.05) : 0;
            const savingsInterest = player.savings > 0 ? Math.floor(player.savings * 0.01) : 0;
            const totalOut = rent + weeklyFees + debtInterest;
            const totalIn = savingsInterest;
            return (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                <div className="font-bold text-slate-500 mb-0.5">💸 End-of-Week Forecast</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono">
                  <span className="text-slate-400">🏠 Rent:</span><span className="text-red-500">-${rent}</span>
                  {weeklyFees > 0 && <><span className="text-slate-400">📋 Subs:</span><span className="text-red-500">-${weeklyFees}</span></>}
                  {debtInterest > 0 && <><span className="text-slate-400">💳 Interest:</span><span className="text-red-500">-${debtInterest}</span></>}
                  {savingsInterest > 0 && <><span className="text-slate-400">💾 Interest:</span><span className="text-green-500">+${savingsInterest}</span></>}
                  <span className="text-slate-500 font-bold">Net:</span>
                  <span className={`font-bold ${totalIn - totalOut >= 0 ? 'text-green-600' : 'text-red-500'}`}>{totalIn - totalOut >= 0 ? '+' : ''}${totalIn - totalOut}</span>
                </div>
              </div>
            );
          })()}
        </div>

        <div>
          <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wide mb-1.5">Relax at Home</h3>
          <div className="flex gap-2">
            {[2, 4].map(hrs => (
              <button
                key={hrs}
                onClick={() => actions.rest(hrs)}
                disabled={player.timeRemaining < hrs}
                className={`flex-1 py-2 border-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-40 min-h-[44px]
                  ${isLowRelax ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'}
                `}
              >
                <div className="text-lg">🛁</div>
                <div>Rest {hrs}h</div>
                <div className="text-[9px] opacity-75">+{hrs * 5} relax</div>
              </button>
            ))}
          </div>
          <div className="mt-1 text-[9px] text-slate-400 text-center">
            Relaxation: {relax}/100 {isLowRelax ? '⚠️ Burnout risk!' : ''}
            <span className="ml-1 opacity-60">(-5/wk baseline)</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">
          💻 Work from Home {player.job && <EconomyWageBadge economy={state.economy} />}
        </h3>

        {isWFH && (!requiresLaptopForHomeWork || hasLaptop) && (
          <>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button onClick={actions.partTimeWork} disabled={player.timeRemaining < 4}
                className="p-2 bg-violet-50 border-2 border-violet-200 rounded-xl hover:bg-violet-100 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]">
                <div className="font-bold">⏱ Part (4h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, state.economy) * 4)}</div>
              </button>
              <button onClick={actions.work} disabled={player.timeRemaining < 8}
                className="p-2 bg-violet-100 border-2 border-violet-300 rounded-xl hover:bg-violet-200 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]">
                <div className="font-bold">🖥️ Full (8h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, state.economy) * 8)}</div>
              </button>
            </div>
            <button onClick={actions.workOvertime} disabled={player.timeRemaining < 12}
              className="w-full p-2 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 text-xs transition active:scale-95 mb-1.5 min-h-[44px]">
              <div className="flex justify-between items-center">
                <span className="font-bold">⚡ Overtime (12h · 1.5x)</span>
                <span className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, state.economy) * 12 * 1.5)}</span>
              </div>
              <div className="text-amber-700">-10 happiness · WFH — no commute!</div>
            </button>
            <ExpProgressBar player={player} />
          </>
        )}

        {isWFH && requiresLaptopForHomeWork && !hasLaptop && (
          <div className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic">Need a 💻 Laptop to work remotely from home.</div>
        )}

        {!isWFH && (
          <div className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic">
            {player.job ? `${player.job.title}s report in-person — head to your work location.` : 'Get a remote job to work from home.'}
          </div>
        )}

        {isWFH && (() => {
          const nextJob = getNextPromotion(player);
          if (!nextJob) return null;
          return (
            <button onClick={() => actions.applyForJob(nextJob, true)} className="w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
              🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
            </button>
          );
        })()}
      </div>
    </div>
  );
};

export default HomeContent;
