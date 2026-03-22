import React from 'react';
import { adjustedPrice, effectiveWage } from '../../engine/economyModel';
import { getNextPromotion } from '../../engine/jobModel';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';
import itemsData from '../../data/items.json';

const TechStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTechEmployee = player.job?.location === 'tech_store';
  const electronics = itemsData.filter(i => i.type === 'electronics');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="tech_store" player={player} actions={actions} /></div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📱 Products</h3>
        {electronics.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          const isRecommended = item.id === 'smartphone' && !owned && !player.inventory.some(i => i.id === 'smartphone');
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned || player.money < price}
              className={`w-full flex justify-between items-center p-2.5 border-2 rounded-lg mb-1.5 text-xs transition active:scale-[0.99]
                ${owned ? 'bg-green-50 border-green-200 opacity-70' :
                  isRecommended ? 'bg-blue-50 border-blue-300 hover:border-blue-400' :
                  'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50'}`}
            >
              <div className="text-left">
                <div className="font-bold">{owned ? '✅ ' : isRecommended ? '⭐ ' : ''}{item.name}</div>
                <div className="text-slate-400">{item.effect}</div>
                {isRecommended && <div className="text-blue-600 text-[9px] font-bold mt-0.5">Unlocks gig work at Quick Eats!</div>}
              </div>
              <span className="font-mono font-bold">{owned ? 'Owned' : `$${price}`}</span>
            </button>
          );
        })}
        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">📺 Subscriptions</div>
          {itemsData.filter(i => i.type === 'subscription' && i.id !== 'health_insurance').map(item => {
            const owned = player.inventory.some(i => i.id === item.id);
            const price = adjustedPrice(item.cost, economy);
            return (
              <button
                key={item.id}
                onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
                disabled={owned || player.money < price}
                className={`w-full flex justify-between items-center p-2.5 border-2 rounded-lg mb-1.5 text-xs transition active:scale-[0.99]
                  ${owned ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50'}`}
              >
                <div className="text-left">
                  <div className="font-bold">{owned ? '✅ ' : ''}{item.name}</div>
                  <div className="text-slate-400">{item.effect}</div>
                  {item.weeklyFee && <div className="text-amber-600 text-[9px] font-bold mt-0.5">${item.weeklyFee}/wk recurring</div>}
                </div>
                <span className="font-mono font-bold">{owned ? 'Owned' : `$${price}`}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Tech Work <EconomyWageBadge economy={economy} /></h3>
        {isTechEmployee ? (
          <>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button onClick={actions.partTimeWork} disabled={player.timeRemaining < 4}
                className="p-2 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 disabled:opacity-50 text-xs transition active:scale-95">
                <div className="font-bold">⏱ Part (4h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 4)}</div>
              </button>
              <button onClick={actions.work} disabled={player.timeRemaining < 8}
                className="p-2 bg-blue-100 border-2 border-blue-300 rounded-xl hover:bg-blue-200 disabled:opacity-50 text-xs transition active:scale-95">
                <div className="font-bold">💻 Sprint (8h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 8)}</div>
              </button>
            </div>
            <button onClick={actions.workOvertime} disabled={player.timeRemaining < 12}
              className="w-full p-2 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 text-xs transition active:scale-95 mb-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold">⚡ Crunch (12h · 1.5x)</span>
                <span className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 12 * 1.5)}</span>
              </div>
              <div className="text-amber-700">-10 happiness</div>
            </button>
            <ExpProgressBar player={player} />
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button onClick={() => actions.applyForJob(nextJob, true)} className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded hover:bg-green-200 text-xs font-bold text-green-800">
                  🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Tech employees work here. See job openings above ↑</div>
        )}
      </div>
    </div>
  );
};

export default TechStoreContent;
