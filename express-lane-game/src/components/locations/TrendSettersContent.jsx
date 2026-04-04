import React from 'react';
import { adjustedPrice, effectiveWage } from '../../engine/economyModel';
import { getNextPromotion } from '../../engine/jobModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';
import itemsData from '../../data/items.json';

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
      <div className="sm:col-span-2"><JobsHereCard locationId="trendsetters" player={player} actions={actions} /></div>
      {isTrendsettersEmployee && (
        <div className="sm:col-span-2 bg-pink-50 border border-pink-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
          <span>{perk.icon}</span>
          <span className="font-bold text-pink-800">{perk.label}:</span>
          <span className="text-pink-700">{perk.desc}</span>
        </div>
      )}
      {isTrendsettersEmployee && (
        <div className="sm:col-span-2">
          <h3 className="font-bold text-sm border-b border-pink-300 pb-1 mb-2">👗 Staff Shift <EconomyWageBadge economy={economy} /></h3>
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <button
              onClick={actions.partTimeWork}
              disabled={player.timeRemaining < 4}
              className="p-2 bg-pink-50 border-2 border-pink-200 rounded-xl hover:bg-pink-100 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]"
            >
              <div className="font-bold">⏱ Part (4h)</div>
              <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 4)}</div>
            </button>
            <button
              onClick={actions.work}
              disabled={player.timeRemaining < 8}
              className="p-2 bg-pink-100 border-2 border-pink-300 rounded-xl hover:bg-pink-200 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]"
            >
              <div className="font-bold">👕 Full (8h)</div>
              <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 8)}</div>
            </button>
          </div>
          <button
            onClick={actions.workOvertime}
            disabled={player.timeRemaining < 12}
            className="w-full p-2 bg-pink-50 border border-pink-300 rounded-xl hover:bg-pink-100 disabled:opacity-50 text-xs transition active:scale-95 mb-1.5 min-h-[44px]"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">⚡ Overtime (12h · 1.5x)</span>
              <span className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 12 * 1.5)}</span>
            </div>
            <div className="text-pink-700">-10 happiness</div>
          </button>
          <ExpProgressBar player={player} />
          {(() => {
            const nextJob = getNextPromotion(player);
            if (!nextJob) return null;
            return (
              <button
                onClick={() => actions.applyForJob(nextJob, true)}
                className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95"
              >
                🆙 Promote → {nextJob.title} (${nextJob.wage}/hr)
              </button>
            );
          })()}
        </div>
      )}
      {hasWornClothing && (
        <div className="sm:col-span-2 bg-amber-50 border-2 border-amber-300 rounded-xl p-2.5 flex items-start gap-2 text-xs">
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <div className="font-bold text-amber-800">Clothing wearing out!</div>
            <div className="text-amber-700">
              {wornItems.filter(c => c.clothingWear !== undefined && c.clothingWear < 60).map(c => (
                <span key={c.id} className={`inline-block mr-2 ${c.clothingWear < 30 ? 'text-red-600 font-bold' : 'text-amber-600'}`}>
                  {c.name}: {c.clothingWear}%{c.clothingWear < 30 ? ' 🚨' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div>
        <h3 className="font-bold text-sm border-b border-pink-200 pb-1 mb-2">👗 Clothing{isTrendsettersEmployee ? <span className="text-[9px] bg-pink-100 text-pink-600 px-1 rounded ml-1 font-normal">20% staff discount!</span> : ''}</h3>
        {clothing.map(item => {
          const owned = player.inventory.find(i => i.id === item.id);
          const basePrice = adjustedPrice(item.cost, economy);
          const price = isTrendsettersEmployee ? Math.floor(basePrice * (1 - perk.clothingDiscount)) : basePrice;
          const wear = owned?.clothingWear;
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              className={`w-full text-left p-2.5 border rounded-lg mb-1.5 text-xs transition hover:scale-[1.01] active:scale-[0.99]
                ${owned ? (wear < 30 ? 'bg-red-50 border-red-300' : wear < 60 ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200') : 'bg-white border-slate-200 hover:border-pink-400'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold">{item.name}</span>
                <span className="font-mono font-bold text-slate-700">${price}</span>
              </div>
              {owned && wear !== undefined ? (
                <div>
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className={wear < 30 ? 'text-red-600 font-bold' : wear < 60 ? 'text-amber-600' : 'text-green-600'}>
                      {wear < 30 ? '⚠️ Needs replacing!' : wear < 60 ? 'Getting worn' : 'Good condition'}
                    </span>
                    <span className="text-slate-400">{wear}% · ~{Math.ceil(wear / 7)} wks left</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${wear < 30 ? 'bg-red-500' : wear < 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${wear}%` }} />
                  </div>
                  <div className="text-[9px] text-pink-600 mt-1 font-bold">🔄 Replace — ${price}</div>
                </div>
              ) : (
                <div className="text-[9px] text-slate-400">{item.effect}</div>
              )}
            </button>
          );
        })}
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-pink-200 pb-1 mb-2">🚗 Vehicles{isTrendsettersEmployee ? <span className="text-[9px] bg-pink-100 text-pink-600 px-1 rounded ml-1 font-normal">20% off!</span> : ''}</h3>
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
              className="w-full text-left p-2.5 border rounded-lg mb-1.5 text-xs transition hover:border-pink-400 hover:bg-pink-50 disabled:opacity-60"
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-bold">{item.name} {hasVehicle && !owned ? <span className="text-amber-600 font-normal">(upgrade)</span> : ''}</span>
                <span className="font-mono font-bold">{owned ? '✅' : `$${price}`}</span>
              </div>
              <div className="text-[9px] text-slate-400">{item.effect}</div>
            </button>
          );
        })}
        <div className="mt-3 bg-pink-50 rounded-xl p-3 border border-pink-200">
          <div className="text-xs font-bold text-pink-800 mb-1">💡 Style Tips</div>
          <div className="text-[10px] text-pink-700 space-y-1">
            <div>• Some jobs require specific attire</div>
            <div>• Clothes wear out ~7%/week — replace before 0%!</div>
            <div>• Losing clothing = losing your job</div>
            {player.job?.requirements?.item && (() => {
              const reqItem = player.inventory.find(i => i.id === player.job.requirements.item);
              const wear = reqItem?.clothingWear;
              return (
                <div className={`font-bold mt-1 ${!reqItem ? 'text-red-600' : wear < 30 ? 'text-red-600' : 'text-pink-900'}`}>
                  Your job ({player.job.title}) requires: {player.job.requirements.item.replace(/_/g, ' ')}
                  {!reqItem && ' ⚠️ You don\'t have this!'}
                  {reqItem && wear < 30 && ` ⚠️ ${wear}% — replace soon or lose your job!`}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendSettersContent;
