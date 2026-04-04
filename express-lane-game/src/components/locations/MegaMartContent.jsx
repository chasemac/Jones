import React from 'react';
import { adjustedPrice, effectiveWage } from '../../engine/economyModel';
import { getNextPromotion } from '../../engine/jobModel';
import { CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';
import itemsData from '../../data/items.json';

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
      <div className="sm:col-span-2"><JobsHereCard locationId="megamart" player={player} actions={actions} /></div>
      {isRetailEmployee && (
        <div className="sm:col-span-2 bg-red-50 border border-red-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
          <span>{perk.icon}</span>
          <span className="font-bold text-red-800">{perk.label}:</span>
          <span className="text-red-700">{perk.desc}</span>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-bold text-sm border-b border-red-200 pb-1 mb-2">🏠 Your Home Setup</h3>
        <div className={`p-2.5 rounded-lg border text-xs ${hasStorage ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold">{hasStorage ? (hasFreezer ? '🧊 Chest Freezer' : '❄️ Refrigerator') : '❌ No Food Storage'}</span>
            {hasStorage ? <span className="text-green-600 font-bold">✅</span> : <span className="text-amber-600 text-[9px]">buy one!</span>}
          </div>
          {hasStorage
            ? <div className="text-slate-500 mt-0.5">{hasFreezer ? 'Stores 4 weeks of groceries' : 'Stores 2 weeks of groceries'}</div>
            : <div className="text-amber-700 mt-0.5">Without a fridge, food spoils at week's end</div>}
        </div>
        <div className={`p-2.5 rounded-lg border text-xs ${hasHotTub ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold">{hasHotTub ? '🛁 Hot Tub' : '❌ No Hot Tub'}</span>
            {hasHotTub ? <span className="text-green-600 font-bold">✅</span> : <span className="text-slate-400 text-[9px]">luxury</span>}
          </div>
          <div className="text-slate-500 mt-0.5">{hasHotTub ? '+3 Relaxation/week automatically' : 'Prevents exhaustion burnout'}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100 mt-2">
          <div className="text-xs font-bold text-red-800 mb-1">💡 Shopping Tips</div>
          <div className="text-[10px] text-red-700 space-y-1">
            <div>• Fridge → buy groceries in bulk at Fresh Mart</div>
            <div>• Freezer → stock 4 weeks of food at once</div>
            <div>• Hot Tub → auto-relaxation, avoid burnout</div>
          </div>
        </div>
      </div>
      <div>
        {isRetailEmployee && (
          <div className="mb-3">
            <h3 className="font-bold text-sm border-b border-red-200 pb-1 mb-2">🏪 Staff Only <EconomyWageBadge economy={economy} /></h3>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button onClick={actions.partTimeWork} disabled={player.timeRemaining < 4}
                className="p-2 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]">
                <div className="font-bold">⏱ Part (4h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 4)}</div>
              </button>
              <button onClick={actions.work} disabled={player.timeRemaining < 8}
                className="p-2 bg-red-100 border-2 border-red-300 rounded-xl hover:bg-red-200 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]">
                <div className="font-bold">🛒 Full (8h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 8)}</div>
              </button>
            </div>
            <button onClick={actions.workOvertime} disabled={player.timeRemaining < 12}
              className="w-full p-2 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 text-xs transition active:scale-95 mb-1.5 min-h-[44px]">
              <div className="flex justify-between items-center">
                <span className="font-bold">⚡ Overtime (12h · 1.5x)</span>
                <span className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, economy) * 12 * 1.5)}</span>
              </div>
              <div className="text-amber-700">-10 happiness</div>
            </button>
            <ExpProgressBar player={player} />
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button onClick={() => actions.applyForJob(nextJob, true)} className="w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
                  🆙 Promote → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </div>
        )}
        <h3 className="font-bold text-sm border-b border-red-200 pb-1 mb-2">🛒 Appliances{isRetailEmployee ? <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded ml-1 font-normal">25% staff discount!</span> : ''}</h3>
        {appliances.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const basePrice = adjustedPrice(item.cost, economy);
          const price = isRetailEmployee ? Math.floor(basePrice * (1 - perk.applianceDiscount)) : basePrice;
          const upgrading = item.id === 'freezer' && hasFridge;
          const isRecommended = !hasStorage && (item.id === 'refrigerator');
          const mechanic =
            item.id === 'refrigerator' ? 'Lets you store groceries from Fresh Mart — buy in bulk & save' :
            item.id === 'freezer' ? 'Stores up to 4 weeks of groceries at once — best bulk savings' :
            item.id === 'hot_tub' ? 'Auto-restores +3 Relaxation/week — prevents exhaustion doctor visits' :
            null;
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className={`w-full text-left p-2.5 border rounded-lg mb-1.5 text-xs transition
                ${owned ? 'bg-green-50 border-green-200 opacity-70' :
                  isRecommended ? 'bg-amber-50 border-amber-300 hover:border-red-400 hover:bg-red-50' :
                  'bg-white border-slate-200 hover:border-red-400 hover:bg-red-50'}`}
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-bold">
                  {owned ? '✅ ' : isRecommended ? '⭐ ' : ''}{item.name}
                  {upgrading ? <span className="text-amber-600 font-normal"> (upgrade)</span> : ''}
                </span>
                <span className="font-mono font-bold">{owned ? 'Owned' : `$${price}`}</span>
              </div>
              <div className="text-slate-400">{item.effect}</div>
              {mechanic && <div className="text-blue-600 text-[9px] mt-0.5 font-medium">💡 {mechanic}</div>}
              {isRecommended && !owned && <div className="text-amber-600 font-bold text-[9px] mt-0.5">Recommended first purchase!</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MegaMartContent;
