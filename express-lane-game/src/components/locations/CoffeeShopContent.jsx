import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';

const CoffeeShopContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isServiceEmployee = player.job?.location === 'coffee_shop';
  const perk = CAREER_PERKS.coffee_shop;
  const espressoPrice = adjustedPrice(5, economy);
  const pastryPrice = adjustedPrice(8, economy);
  const coffeeWeeklyPlans = itemsData.filter(i => i.type === 'weekly_coffee');
  const storedCoffee = player.inventory.find(i => i.type === 'weekly_coffee');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="coffee_shop" player={player} actions={actions} /></div>
      {isServiceEmployee && (
        <div className="sm:col-span-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
          <span>{perk.icon}</span>
          <span className="font-bold text-amber-800">{perk.label}:</span>
          <span className="text-amber-700">{perk.desc}</span>
        </div>
      )}
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">☕ Weekly Plans</h3>
        <p className="text-[10px] text-slate-500 mb-2">Covers your coffee for the whole week — auto-applied at week's end. Reduces hunger by 12.</p>
        {storedCoffee && (
          <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-800 mb-2">
            ✅ <strong>{storedCoffee.name}</strong> ready for this week.
          </div>
        )}
        {coffeeWeeklyPlans.map(item => {
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              disabled={!!storedCoffee || player.money < price}
              className="w-full flex justify-between items-start p-2 bg-white border rounded hover:bg-amber-50 disabled:opacity-50 mb-1 text-sm"
            >
              <div className="text-left">
                <div className="font-medium">☕ {item.name}</div>
                <div className="text-[10px] text-slate-500">{item.effect}</div>
              </div>
              <span className="font-mono text-xs ml-2 shrink-0">${price}/wk</span>
            </button>
          );
        })}
        <div className="mt-3 border-t border-slate-200 pt-2">
          <h3 className="font-bold text-xs text-slate-600 mb-1">Quick Bites <span className="text-[9px] text-slate-400 font-normal">(instant effect)</span></h3>
          <button
            onClick={() => actions.buyItem({ id: 'espresso', name: 'Espresso', cost: espressoPrice, type: 'food', hungerRestore: 10, happinessBoost: 8, timeToEat: 0.5 })}
            disabled={player.money < espressoPrice}
            className="w-full flex justify-between items-center p-2 bg-white border-2 border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 mb-1 text-xs transition active:scale-[0.99]"
          >
            <div>
              <span className="font-bold">☕ Espresso</span>
              <span className="text-slate-400 ml-1">(+8😊, -10🍽️)</span>
            </div>
            <span className="font-mono font-bold">${espressoPrice}</span>
          </button>
          <button
            onClick={() => actions.buyItem({ id: 'pastry', name: 'Croissant', cost: pastryPrice, type: 'food', hungerRestore: 20, happinessBoost: 6, timeToEat: 0.5 })}
            disabled={player.money < pastryPrice}
            className="w-full flex justify-between items-center p-2 bg-white border-2 border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 text-xs transition active:scale-[0.99]"
          >
            <div>
              <span className="font-bold">🥐 Croissant</span>
              <span className="text-slate-400 ml-1">(+6😊, -20🍽️)</span>
            </div>
            <span className="font-mono font-bold">${pastryPrice}</span>
          </button>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Staff Only <EconomyWageBadge economy={economy} /></h3>
        {isServiceEmployee ? (
          <WorkShiftPanel
            player={player}
            economy={economy}
            actions={actions}
            partClass="bg-amber-50 border-amber-200 hover:bg-amber-100"
            fullClass="bg-amber-100 border-amber-300 hover:bg-amber-200"
            fullLabel="☕ Full (8h)"
          />
        ) : (
          <div className="text-xs italic text-slate-400 p-3 bg-slate-100 rounded-lg">
            <div className="font-bold text-slate-500 mb-1">👔 Staff Area</div>
            Apply for a service job at the Library to work here.
          </div>
        )}
        <div className="mt-3 border-t border-slate-200 pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-bold text-xs text-slate-600">🤝 Networking</h3>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-400">Dep: {player.dependability ?? 50}</span>
              <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${player.dependability ?? 50}%` }} />
              </div>
            </div>
          </div>
          <button
            onClick={actions.network}
            disabled={player.timeRemaining < 1}
            className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]"
          >
            <div className="flex justify-between items-center">
              <div className="font-bold">🤝 Meet & Greet (1h)</div>
              <div className="text-blue-700 font-bold text-xs">+{(() => { const dep = player.dependability ?? 50; const base = player.job ? 4 : 3; return dep >= 90 ? 1 : dep >= 70 ? Math.max(1, Math.floor(base / 2)) : base; })()} dep, +2 😊</div>
            </div>
            <div className="text-slate-500 mt-0.5">
              Higher dep = lower job rejection rate
              {(player.dependability ?? 50) >= 70 ? ' ✓ Strong network!' : (player.dependability ?? 50) >= 40 ? ' — keep going' : ' — start building!'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoffeeShopContent;
