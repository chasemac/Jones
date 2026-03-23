import React from 'react';
import { adjustedPrice, effectiveWage } from '../../engine/economyModel';
import { getNextPromotion } from '../../engine/jobModel';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';
import itemsData from '../../data/items.json';

const QuickEatsContent = ({ state, actions }) => {
  const { player, economy } = state;
  const hasPhone = player.inventory.some(i => i.id === 'smartphone');
  const weeklyMeals = itemsData.filter(i => i.type === 'weekly_meal');
  const storedMeal = player.inventory.find(i => i.type === 'weekly_meal');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="sm:col-span-2"><JobsHereCard locationId="quick_eats" player={player} actions={actions} /></div>
      {/* Hunger status bar */}
      <div className="sm:col-span-2">
        <div className="flex items-center gap-2 p-2 rounded-xl border bg-orange-50 border-orange-200">
          <span className={`text-lg ${player.hunger >= 80 ? 'animate-bounce' : ''}`}>{player.hunger >= 80 ? '🤤' : player.hunger >= 60 ? '😮' : player.hunger >= 40 ? '🍽️' : '😋'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[9px] font-bold text-slate-600 mb-0.5">
              <span>Hunger</span>
              <span className={player.hunger >= 80 ? 'text-red-600 animate-pulse' : player.hunger >= 60 ? 'text-orange-600' : 'text-green-600'}>
                {player.hunger >= 80 ? '⚠️ STARVING — −20h if unfed!' : player.hunger >= 60 ? '⚠️ Hungry — −10h if unfed' : 'Good'}
              </span>
            </div>
            <div className="h-2 bg-orange-100 rounded-full overflow-hidden border border-orange-200">
              <div className={`h-full rounded-full transition-all duration-500 ${player.hunger >= 80 ? 'bg-red-500 animate-pulse' : player.hunger >= 60 ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${player.hunger}%` }} />
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-500">{player.hunger}/100</span>
        </div>
        {/* Hunger projection for next week */}
        {!storedMeal && (
          <div className="mt-2 text-[9px] text-slate-500 grid grid-cols-2 gap-1">
            {(() => {
              const hungerInc = player.housing?.homeType === 'luxury_condo' ? 20 : 25;
              const withMeal = Math.max(0, Math.min(100, player.hunger + hungerInc - 55));
              const withoutFood = Math.min(100, player.hunger + hungerInc);
              return (<>
                <div className={`p-1.5 rounded border ${withMeal <= 30 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                  <div className="font-bold">With meal plan:</div>
                  <div>{withMeal} hunger next wk</div>
                </div>
                <div className={`p-1.5 rounded border ${withoutFood >= 80 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <div className="font-bold">Without food:</div>
                  <div>{withoutFood} hunger → {withoutFood >= 80 ? '-20h penalty!' : withoutFood >= 50 ? '-10h penalty' : 'OK'}</div>
                </div>
              </>);
            })()}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-orange-200 pb-1 mb-2">🍔 Weekly Meal Plans</h3>
        {storedMeal ? (
          <div className="p-2.5 bg-green-50 border-2 border-green-300 rounded-xl text-xs text-green-800 mb-2 flex items-center gap-2">
            <span className="text-lg">✅</span>
            <div>
              <div className="font-bold">{storedMeal.name} ready!</div>
              <div className="text-green-600">You're covered for this week.</div>
            </div>
          </div>
        ) : (
          <div className={`p-2 rounded-lg border text-xs mb-2 ${player.hunger > 50 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            ⚠️ <strong>No food for this week</strong> — buy a plan below to avoid the hunger penalty!
          </div>
        )}
        <p className="text-[10px] text-slate-400 mb-2">Auto-eaten at week's end. No fridge needed. Reduces hunger by 55.</p>
        {weeklyMeals.map(item => {
          const price = adjustedPrice(item.cost, economy);
          const owned = !!storedMeal;
          const canAfford = player.money >= price;
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              disabled={owned || !canAfford}
              className={`w-full text-left p-2.5 border-2 rounded-xl mb-1.5 text-sm transition active:scale-95 min-h-[44px]
                ${owned ? 'bg-green-50 border-green-200 opacity-60' :
                  canAfford ? 'bg-white border-orange-200 hover:border-orange-400 hover:bg-orange-50' :
                  'bg-slate-50 border-slate-200 opacity-50'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">🍔 {item.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.effect}</div>
                  {!owned && (
                    <div className="text-[9px] text-green-600 font-bold mt-0.5">
                      → {Math.max(0, player.hunger - (item.weeklyHungerRestore ?? 55))} hunger after eating
                    </div>
                  )}
                </div>
                <span className="font-mono font-bold text-sm shrink-0 ml-2">${price}<span className="text-[9px] font-normal text-slate-400">/wk</span></span>
              </div>
            </button>
          );
        })}
        <div className="mt-1 text-[10px] text-slate-400 italic">💡 Fresh Mart groceries save money — need a fridge from MegaMart</div>
      </div>
      <div className="space-y-3">
        {/* Work shift for Quick Eats employees */}
        {player.job?.location === 'quick_eats' && (
          <div>
            <h3 className="font-bold text-sm border-b border-orange-200 pb-1 mb-2">
              💼 Your Shift <EconomyWageBadge economy={economy} />
            </h3>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button
                onClick={actions.partTimeWork}
                disabled={player.timeRemaining < 4}
                className="p-2 bg-orange-50 border-2 border-orange-200 rounded-xl hover:bg-orange-100 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]"
              >
                <div className="font-bold">⏱ Part-Time (4h)</div>
                <div className="font-mono font-black text-green-600 text-sm">+${Math.floor(effectiveWage(player.job.wage, economy) * 4)}</div>
              </button>
              <button
                onClick={actions.work}
                disabled={player.timeRemaining < 8}
                className="p-2 bg-orange-100 border-2 border-orange-300 rounded-xl hover:bg-orange-200 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]"
              >
                <div className="font-bold">🍔 Full Shift (8h)</div>
                <div className="font-mono font-black text-green-600 text-sm">+${Math.floor(effectiveWage(player.job.wage, economy) * 8)}</div>
              </button>
            </div>
            <button
              onClick={actions.workOvertime}
              disabled={player.timeRemaining < 12}
              className="w-full p-2 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 text-xs transition active:scale-95 mb-1.5 min-h-[44px]"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">⚡ Overtime (12h · 1.5x pay)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 12 * 1.5)}</div>
              </div>
              <div className="text-amber-700 mt-0.5">-10 happiness · great for fast cash</div>
            </button>
            <div className="text-[9px] text-orange-600 text-center">{player.job.title} · ${effectiveWage(player.job.wage, economy)}/hr (economy-adjusted)</div>
            <ExpProgressBar player={player} />
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button onClick={() => actions.applyForJob(nextJob, true)} className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
                  🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </div>
        )}

        {/* Gig work section */}
        <div>
          <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">🚗 Gig Work (4hrs)</h3>
          {hasPhone ? (
            <button
              onClick={actions.gigWork}
              disabled={player.timeRemaining < 4}
              className="w-full p-3 bg-green-50 border-2 border-green-300 rounded-xl hover:bg-green-100 disabled:opacity-50 text-sm transition active:scale-95"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">🚗 Delivery Run (4h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(60 * (state.economy === 'Boom' ? 1.3 : state.economy === 'Depression' ? 0.8 : 1.0))}</div>
              </div>
              <div className="text-xs text-green-700 mt-0.5">Economy: {state.economy} · flexible hours</div>
            </button>
          ) : (
            <div className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-bold text-slate-600 mb-1">🚗 Gig Delivery (locked)</div>
              <div className="text-slate-400 mb-2">Earn extra cash between jobs — any time, any week.</div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                <span>📱</span>
                <span className="text-blue-700 text-[10px] font-bold">Buy a Smartphone at Tech Store to unlock</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickEatsContent;
