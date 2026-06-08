import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';
import { SectionTitle } from './_shared';

const StatusCard = ({ ok, title, subtitleOk, subtitleMiss, badgeMiss = 'buy one!' }) => (
  <div
    className="p-2.5 rounded-lg text-[12px]"
    style={{
      background: ok ? 'rgba(16,168,118,0.06)' : 'rgba(244,184,42,0.08)',
      border: `1px solid ${ok ? 'rgba(16,168,118,0.3)' : 'rgba(244,184,42,0.3)'}`,
    }}
  >
    <div className="flex justify-between items-center">
      <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>{title}</span>
      {ok
        ? <span className="font-bold" style={{ color: 'var(--money-ink)' }}>✅</span>
        : <span className="text-[10px] font-bold" style={{ color: 'var(--warn-ink)' }}>{badgeMiss}</span>}
    </div>
    <div className="mt-0.5" style={{ color: ok ? 'var(--money-ink)' : 'var(--warn-ink)' }}>
      {ok ? subtitleOk : subtitleMiss}
    </div>
  </div>
);

const MegaMartContent = ({ state, actions }) => {
  const { player, economy } = state;
  const perk = CAREER_PERKS.megamart;
  const appliances = itemsData.filter(i => i.type === 'appliance');
  const hasFridge = player.inventory.some(i => i.id === 'refrigerator');
  const hasFreezer = player.inventory.some(i => i.id === 'freezer');
  const hasHotTub = player.inventory.some(i => i.id === 'hot_tub');
  const hasStorage = hasFridge || hasFreezer;
  const isRetailEmployee = player.job?.location === 'megamart';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="sm:col-span-2">
        <JobsHereCard locationId="megamart" player={player} actions={actions} />
      </div>

      {isRetailEmployee && (
        <div
          className="sm:col-span-2 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2"
          style={{
            background: 'rgba(228,65,58,0.08)',
            border: '1px solid rgba(228,65,58,0.3)',
            color: 'var(--debt-ink)',
          }}
        >
          <span>{perk.icon}</span>
          <span className="font-bold">{perk.label}:</span>
          <span>{perk.desc}</span>
        </div>
      )}

      <div className="space-y-2">
        <SectionTitle>🏠 Your home setup</SectionTitle>
        <StatusCard
          ok={hasStorage}
          title={hasStorage ? (hasFreezer ? '🧊 Chest freezer' : '❄️ Refrigerator') : '❌ No food storage'}
          subtitleOk={hasFreezer ? 'Stores 4 weeks of groceries' : 'Stores 2 weeks of groceries'}
          subtitleMiss="Without a fridge, food spoils at week's end"
        />
        <StatusCard
          ok={hasHotTub}
          title={hasHotTub ? '🛁 Hot tub' : '❌ No hot tub'}
          subtitleOk="+3 Relaxation/week automatically"
          subtitleMiss="Prevents exhaustion burnout"
          badgeMiss="luxury"
        />

        <div
          className="rounded-xl p-3 mt-2 text-[11px]"
          style={{ background: 'rgba(228,65,58,0.04)', border: '1px solid rgba(228,65,58,0.18)', color: 'var(--debt-ink)' }}
        >
          <div className="font-display font-bold mb-1">💡 Shopping tips</div>
          <ul className="space-y-0.5 list-disc list-inside" style={{ color: 'var(--ink-2)' }}>
            <li>Fridge → buy groceries in bulk at Fresh Mart</li>
            <li>Freezer → stock 4 weeks of food at once</li>
            <li>Hot Tub → auto-relaxation, avoid burnout</li>
          </ul>
        </div>
      </div>

      <div>
        {isRetailEmployee && (
          <div className="mb-3">
            <SectionTitle right={<EconomyWageBadge economy={economy} />}>🏪 Staff only</SectionTitle>
            <WorkShiftPanel
              player={player}
              economy={economy}
              actions={actions}
              partClass=""
              fullClass=""
              fullLabel="🛒 Full · 8h"
            />
          </div>
        )}

        <SectionTitle
          right={isRetailEmployee && (
            <span className="ds-pill ds-pill-debt" style={{ padding: '1px 6px', fontSize: 9 }}>25% staff discount</span>
          )}
        >
          🛒 Appliances
        </SectionTitle>

        {appliances.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const basePrice = adjustedPrice(item.cost, economy);
          const price = isRetailEmployee ? Math.floor(basePrice * (1 - perk.applianceDiscount)) : basePrice;
          const upgrading = item.id === 'freezer' && hasFridge;
          const isRecommended = !hasStorage && (item.id === 'refrigerator');
          const mechanic =
            item.id === 'refrigerator' ? 'Lets you store groceries from Fresh Mart — buy in bulk & save' :
            item.id === 'freezer' ? 'Stores up to 4 weeks of groceries — best bulk savings' :
            item.id === 'hot_tub' ? 'Auto-restores +3 Relaxation/week — prevents exhaustion' :
            null;

          let bg = 'var(--surface)';
          let border = 'var(--border)';
          if (owned) { bg = 'rgba(16,168,118,0.06)'; border = 'rgba(16,168,118,0.3)'; }
          else if (isRecommended) { bg = 'rgba(244,184,42,0.1)'; border = 'rgba(244,184,42,0.35)'; }

          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full text-left p-2.5 rounded-lg mb-1.5 text-[12px] transition active:scale-[0.99]"
              style={{ background: bg, border: `1px solid ${border}`, opacity: owned ? 0.7 : 1, boxShadow: owned ? 'none' : 'var(--sh-1)' }}
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>
                  {owned ? '✅ ' : isRecommended ? '⭐ ' : ''}{item.name}
                  {upgrading && <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--warn-ink)' }}>(upgrade)</span>}
                </span>
                <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>{owned ? 'Owned' : `$${price}`}</span>
              </div>
              <div style={{ color: 'var(--muted)' }}>{item.effect}</div>
              {mechanic && <div className="text-[10px] mt-0.5" style={{ color: '#1d4ed8' }}>💡 {mechanic}</div>}
              {isRecommended && !owned && (
                <div className="font-display font-bold text-[10px] mt-0.5" style={{ color: 'var(--warn-ink)' }}>Recommended first purchase</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MegaMartContent;
