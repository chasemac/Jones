import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';
import { SectionTitle } from './_shared';

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
      <div className="sm:col-span-2">
        <JobsHereCard locationId="coffee_shop" player={player} actions={actions} />
      </div>

      {isServiceEmployee && (
        <div
          className="sm:col-span-2 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2"
          style={{
            background: 'rgba(244,184,42,0.12)',
            border: '1px solid rgba(244,184,42,0.4)',
            color: 'var(--warn-ink)',
          }}
        >
          <span>{perk.icon}</span>
          <span className="font-bold">{perk.label}:</span>
          <span>{perk.desc}</span>
        </div>
      )}

      <div>
        <SectionTitle>☕ Weekly plans</SectionTitle>
        <p className="text-[10px] mb-2" style={{ color: 'var(--muted)' }}>
          Covers your coffee for the whole week — auto-applied at week's end. Reduces hunger by 12.
        </p>
        {storedCoffee && (
          <div
            className="p-2 rounded-lg text-[12px] mb-2"
            style={{
              background: 'rgba(244,184,42,0.12)',
              border: '1px solid rgba(244,184,42,0.4)',
              color: 'var(--warn-ink)',
            }}
          >
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
              className="w-full flex justify-between items-start p-2 rounded-lg disabled:opacity-50 mb-1 text-sm transition active:scale-[0.99]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
            >
              <div className="text-left">
                <div className="font-display font-bold text-[12px]" style={{ color: 'var(--ink)' }}>☕ {item.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{item.effect}</div>
              </div>
              <span className="font-num font-bold text-[12px] ml-2 shrink-0" style={{ color: 'var(--ink)' }}>${price}/wk</span>
            </button>
          );
        })}

        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold text-[12px] mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Quick bites <span className="text-[10px] font-normal" style={{ color: 'var(--muted-2)' }}>· instant</span>
          </h3>
          <button
            onClick={() => actions.buyItem({ id: 'espresso', name: 'Espresso', cost: espressoPrice, type: 'food', hungerRestore: 10, happinessBoost: 8, timeToEat: 0.5 })}
            disabled={player.money < espressoPrice}
            className="w-full flex justify-between items-center p-2 rounded-lg disabled:opacity-50 mb-1 text-[12px] transition active:scale-[0.99]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
          >
            <div>
              <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>☕ Espresso</span>
              <span className="ml-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>+8😊 · −10🍽️</span>
            </div>
            <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>${espressoPrice}</span>
          </button>
          <button
            onClick={() => actions.buyItem({ id: 'pastry', name: 'Croissant', cost: pastryPrice, type: 'food', hungerRestore: 20, happinessBoost: 6, timeToEat: 0.5 })}
            disabled={player.money < pastryPrice}
            className="w-full flex justify-between items-center p-2 rounded-lg disabled:opacity-50 text-[12px] transition active:scale-[0.99]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
          >
            <div>
              <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>🥐 Croissant</span>
              <span className="ml-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>+6😊 · −20🍽️</span>
            </div>
            <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>${pastryPrice}</span>
          </button>
        </div>
      </div>

      <div>
        <SectionTitle right={<EconomyWageBadge economy={economy} />}>Staff only</SectionTitle>
        {isServiceEmployee ? (
          <WorkShiftPanel
            player={player}
            economy={economy}
            actions={actions}
            partClass=""
            fullClass=""
            fullLabel="☕ Full · 8h"
          />
        ) : (
          <div className="text-[11px] italic p-3 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
            <div className="font-display font-bold mb-1" style={{ color: 'var(--ink-2)' }}>👔 Staff area</div>
            Apply for a service job at the Library to work here.
          </div>
        )}

        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-display font-bold text-[12px]" style={{ color: 'var(--ink-2)' }}>🤝 Networking</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-num" style={{ color: 'var(--muted)' }}>Dep {player.dependability ?? 50}</span>
              <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${player.dependability ?? 50}%`, background: 'var(--info)' }} />
              </div>
            </div>
          </div>
          <button
            onClick={actions.network}
            disabled={player.timeRemaining < 1}
            className="w-full p-2.5 rounded-xl disabled:opacity-50 text-[12px] transition active:scale-[0.99] text-left"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', minHeight: 44 }}
          >
            <div className="flex justify-between items-center">
              <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>🤝 Meet &amp; greet · 1h</div>
              <div className="font-num font-bold text-[11px]" style={{ color: '#1d4ed8' }}>
                +{(() => { const dep = player.dependability ?? 50; const base = player.job ? 4 : 3; return dep >= 90 ? 1 : dep >= 70 ? Math.max(1, Math.floor(base / 2)) : base; })()} dep · +2 😊
              </div>
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--muted)' }}>
              Higher dep = lower job rejection rate
              {(player.dependability ?? 50) >= 70 ? ' · strong network!' : (player.dependability ?? 50) >= 40 ? ' · keep going' : ' · start building'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoffeeShopContent;
