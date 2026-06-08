import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';
import { SectionTitle } from './_shared';

const ProductBtn = ({ item, price, owned, isRecommended, mechanic, onClick, recurring }) => {
  let bg = 'var(--surface)';
  let border = 'var(--border)';
  if (owned) { bg = 'rgba(16,168,118,0.06)'; border = 'rgba(16,168,118,0.3)'; }
  else if (isRecommended) { bg = 'rgba(59,130,246,0.06)'; border = 'rgba(59,130,246,0.35)'; }
  return (
    <button
      onClick={onClick}
      disabled={owned}
      className="w-full flex justify-between items-center p-2.5 rounded-lg mb-1.5 text-[12px] transition active:scale-[0.99]"
      style={{ background: bg, border: `1px solid ${border}`, opacity: owned ? 0.7 : 1, boxShadow: owned ? 'none' : 'var(--sh-1)' }}
    >
      <div className="text-left min-w-0">
        <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>
          {owned ? '✅ ' : isRecommended ? '⭐ ' : ''}{item.name}
        </div>
        <div style={{ color: 'var(--muted)' }}>{item.effect}</div>
        {mechanic && <div className="text-[10px] mt-0.5 font-display font-bold" style={{ color: '#1d4ed8' }}>{mechanic}</div>}
        {recurring && <div className="text-[10px] mt-0.5 font-display font-bold" style={{ color: 'var(--warn-ink)' }}>${recurring}/wk recurring</div>}
      </div>
      <span className="font-num font-bold ml-2 shrink-0" style={{ color: 'var(--ink)' }}>{owned ? 'Owned' : `$${price}`}</span>
    </button>
  );
};

const TechStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTechEmployee = player.job?.location === 'tech_store';
  const perk = CAREER_PERKS.tech_store;
  const electronics = itemsData.filter(i => i.type === 'electronics');
  const mechanicMap = {
    smartphone: '🚗 Unlocks gig delivery · required for Quick Eats gig work',
    laptop: '📚 +2h study bonus per session · required for some remote tech jobs',
    smart_watch: '⏱ −1h travel time + 5 happiness/wk',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2">
        <JobsHereCard locationId="tech_store" player={player} actions={actions} />
      </div>

      {isTechEmployee && (
        <div
          className="sm:col-span-2 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2"
          style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#1d4ed8',
          }}
        >
          <span>{perk.icon}</span>
          <span className="font-bold">{perk.label}:</span>
          <span>{perk.desc}</span>
        </div>
      )}

      <div>
        <SectionTitle>📱 Products</SectionTitle>
        {electronics.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          const isRecommended = item.id === 'smartphone' && !owned;
          return (
            <ProductBtn
              key={item.id}
              item={item}
              price={price}
              owned={owned}
              isRecommended={isRecommended}
              mechanic={mechanicMap[item.id]}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
            />
          );
        })}

        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="ds-eyebrow mb-1.5">📺 Subscriptions</div>
          {itemsData.filter(i => i.type === 'subscription' && i.id !== 'health_insurance').map(item => {
            const owned = player.inventory.some(i => i.id === item.id);
            const price = adjustedPrice(item.cost, economy);
            return (
              <ProductBtn
                key={item.id}
                item={item}
                price={price}
                owned={owned}
                recurring={item.weeklyFee}
                onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              />
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle right={<EconomyWageBadge economy={economy} />}>Tech work</SectionTitle>
        {isTechEmployee ? (
          <WorkShiftPanel
            player={player}
            economy={economy}
            actions={actions}
            partClass=""
            fullClass=""
            fullLabel="💻 Sprint · 8h"
          />
        ) : (
          <div
            className="text-[12px] italic p-2 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            Tech employees work here. See job openings above ↑
          </div>
        )}
      </div>
    </div>
  );
};

export default TechStoreContent;
