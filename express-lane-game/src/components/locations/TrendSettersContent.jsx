import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';

const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
    <h3 className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>{children}</h3>
    {right}
  </div>
);

const TrendSettersContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTrendsettersEmployee = player.job?.location === 'trendsetters';
  const perk = CAREER_PERKS.trendsetters;
  const clothing = itemsData.filter(i => i.type === 'clothing');
  const ownedClothing = clothing.filter(c => player.inventory.find(i => i.id === c.id));
  const wornItems = ownedClothing.map(c => ({ ...c, ...player.inventory.find(i => i.id === c.id) }));
  const hasWornClothing = wornItems.some(c => c.clothingWear !== undefined && c.clothingWear < 60);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2">
        <JobsHereCard locationId="trendsetters" player={player} actions={actions} />
      </div>

      {isTrendsettersEmployee && (
        <div
          className="sm:col-span-2 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2"
          style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.3)', color: '#9d174d' }}
        >
          <span>{perk.icon}</span>
          <span className="font-bold">{perk.label}:</span>
          <span>{perk.desc}</span>
        </div>
      )}

      {isTrendsettersEmployee && (
        <div className="sm:col-span-2">
          <SectionTitle right={<EconomyWageBadge economy={economy} />}>👗 Staff shift</SectionTitle>
          <WorkShiftPanel
            player={player} economy={economy} actions={actions}
            partClass="" fullClass="" overtimeClass="" overtimeTextClass=""
            fullLabel="👕 Full · 8h"
          />
        </div>
      )}

      {hasWornClothing && (
        <div
          className="sm:col-span-2 rounded-xl p-2.5 flex items-start gap-2 text-[12px]"
          style={{ background: 'rgba(244,184,42,0.1)', border: '1px solid rgba(244,184,42,0.4)' }}
        >
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <div className="font-display font-bold" style={{ color: 'var(--warn-ink)' }}>Clothing wearing out!</div>
            <div className="mt-0.5" style={{ color: 'var(--ink-2)' }}>
              {wornItems.filter(c => c.clothingWear !== undefined && c.clothingWear < 60).map(c => (
                <span
                  key={c.id}
                  className="inline-block mr-2 font-display"
                  style={{ color: c.clothingWear < 30 ? 'var(--debt-ink)' : 'var(--warn-ink)', fontWeight: c.clothingWear < 30 ? 700 : 600 }}
                >
                  {c.name}: {c.clothingWear}%{c.clothingWear < 30 ? ' 🚨' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionTitle
          right={isTrendsettersEmployee && (
            <span className="ds-pill" style={{ padding: '1px 6px', fontSize: 9, background: 'rgba(236,72,153,0.1)', color: '#9d174d', borderColor: 'rgba(236,72,153,0.3)' }}>
              20% staff discount
            </span>
          )}
        >
          👗 Clothing
        </SectionTitle>
        {clothing.map(item => {
          const owned = player.inventory.find(i => i.id === item.id);
          const basePrice = adjustedPrice(item.cost, economy);
          const price = isTrendsettersEmployee ? Math.floor(basePrice * (1 - perk.clothingDiscount)) : basePrice;
          const wear = owned?.clothingWear;

          let bg = 'var(--surface)';
          let border = 'var(--border)';
          if (owned) {
            if (wear < 30) { bg = 'rgba(228,65,58,0.06)'; border = 'rgba(228,65,58,0.3)'; }
            else if (wear < 60) { bg = 'rgba(244,184,42,0.08)'; border = 'rgba(244,184,42,0.35)'; }
            else { bg = 'rgba(16,168,118,0.06)'; border = 'rgba(16,168,118,0.3)'; }
          }

          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              className="w-full text-left p-2.5 rounded-lg mb-1.5 text-[12px] transition active:scale-[0.99]"
              style={{ background: bg, border: `1px solid ${border}`, boxShadow: 'var(--sh-1)' }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>{item.name}</span>
                <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>${price}</span>
              </div>
              {owned && wear !== undefined ? (
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span
                      className="font-display font-bold"
                      style={{ color: wear < 30 ? 'var(--debt-ink)' : wear < 60 ? 'var(--warn-ink)' : 'var(--money-ink)' }}
                    >
                      {wear < 30 ? '⚠️ Needs replacing!' : wear < 60 ? 'Getting worn' : 'Good condition'}
                    </span>
                    <span style={{ color: 'var(--muted-2)' }}>{wear}% · ~{Math.ceil(wear / 7)} wks left</span>
                  </div>
                  <div className="ds-meter-bar" style={{ height: 6 }}>
                    <span style={{ width: `${wear}%`, background: wear < 30 ? 'var(--debt)' : wear < 60 ? 'var(--warn)' : 'var(--money)' }} />
                  </div>
                  <div className="text-[10px] mt-1 font-display font-bold" style={{ color: '#9d174d' }}>🔄 Replace — ${price}</div>
                </div>
              ) : (
                <div style={{ color: 'var(--muted)' }}>{item.effect}</div>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <SectionTitle
          right={isTrendsettersEmployee && (
            <span className="ds-pill" style={{ padding: '1px 6px', fontSize: 9, background: 'rgba(236,72,153,0.1)', color: '#9d174d', borderColor: 'rgba(236,72,153,0.3)' }}>
              20% off
            </span>
          )}
        >
          🚗 Vehicles
        </SectionTitle>
        {itemsData.filter(i => i.type === 'vehicle').map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const hasVehicle = player.inventory.some(i => i.type === 'vehicle');
          const basePrice = adjustedPrice(item.cost, economy);
          const price = isTrendsettersEmployee ? Math.floor(basePrice * (1 - perk.clothingDiscount)) : basePrice;
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full text-left p-2.5 rounded-lg mb-1.5 text-[12px] transition active:scale-[0.99] disabled:opacity-60"
              style={{
                background: owned ? 'rgba(16,168,118,0.06)' : 'var(--surface)',
                border: `1px solid ${owned ? 'rgba(16,168,118,0.3)' : 'var(--border)'}`,
                boxShadow: owned ? 'none' : 'var(--sh-1)',
              }}
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>
                  {item.name}
                  {hasVehicle && !owned && <span className="ml-1 font-normal" style={{ color: 'var(--warn-ink)' }}>(upgrade)</span>}
                </span>
                <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>{owned ? '✅' : `$${price}`}</span>
              </div>
              <div style={{ color: 'var(--muted)' }}>{item.effect}</div>
            </button>
          );
        })}

        <div
          className="mt-3 rounded-xl p-3"
          style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.25)' }}
        >
          <div className="text-[12px] font-display font-bold mb-1" style={{ color: '#9d174d' }}>💡 Style tips</div>
          <ul className="text-[10px] list-disc list-inside space-y-0.5" style={{ color: 'var(--ink-2)' }}>
            <li>Some jobs require specific attire</li>
            <li>Clothes wear out ~7%/week — replace before 0%</li>
            <li>Losing clothing = losing your job</li>
            {player.job?.requirements?.item && (() => {
              const reqItem = player.inventory.find(i => i.id === player.job.requirements.item);
              const wear = reqItem?.clothingWear;
              const danger = !reqItem || (wear !== undefined && wear < 30);
              return (
                <li
                  className="font-display font-bold mt-1"
                  style={{ color: danger ? 'var(--debt-ink)' : '#9d174d' }}
                >
                  Your job ({player.job.title}) requires: {player.job.requirements.item.replace(/_/g, ' ')}
                  {!reqItem && ' ⚠️ Missing!'}
                  {reqItem && wear < 30 && ` ⚠️ ${wear}% — replace soon!`}
                </li>
              );
            })()}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrendSettersContent;
