import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';

const TechStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTechEmployee = player.job?.location === 'tech_store';
  const perk = CAREER_PERKS.tech_store;
  const electronics = itemsData.filter(i => i.type === 'electronics');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="tech_store" player={player} actions={actions} /></div>
      {isTechEmployee && (
        <div className="sm:col-span-2 bg-blue-50 border border-blue-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
          <span>{perk.icon}</span>
          <span className="font-bold text-blue-800">{perk.label}:</span>
          <span className="text-blue-700">{perk.desc}</span>
        </div>
      )}
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📱 Products</h3>
        {electronics.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          const isRecommended = item.id === 'smartphone' && !owned && !player.inventory.some(i => i.id === 'smartphone');
          const mechanic = {
            smartphone: '🚗 Unlocks gig delivery (+$60/run) · required for Quick Eats gig work',
            laptop: '📚 +2h study bonus per session · required for some remote tech jobs',
            smart_watch: '⏱ -1h travel time + 5 happiness/wk · stacks with vehicle bonus',
          }[item.id];
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
                {mechanic && <div className="text-blue-600 text-[9px] font-bold mt-0.5">{mechanic}</div>}
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
          <WorkShiftPanel
            player={player}
            economy={economy}
            actions={actions}
            partClass="bg-blue-50 border-blue-200 hover:bg-blue-100"
            fullClass="bg-blue-100 border-blue-300 hover:bg-blue-200"
            fullLabel="💻 Sprint (8h)"
          />
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Tech employees work here. See job openings above ↑</div>
        )}
      </div>
    </div>
  );
};

export default TechStoreContent;
