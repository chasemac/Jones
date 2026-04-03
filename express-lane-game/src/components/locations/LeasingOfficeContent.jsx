import React from 'react';
import { calculateDeposit } from '../../engine/constants';
import housingData from '../../data/housing.json';

const LeasingOfficeContent = ({ state, actions, onMoveIn }) => {
  const { player } = state;
  const isFirstVisit = state.week === 1 && !player.hasChosenHousing;
  const [selectedHousing, setSelectedHousing] = React.useState(null);
  return (
    <div className="space-y-3">
      {isFirstVisit && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-3 sm:p-4 mb-1">
          <div className="font-black text-sm sm:text-base text-indigo-900 mb-1">👋 Welcome to Life in the Express Lane!</div>
          <p className="text-xs text-indigo-700 mb-2 sm:mb-3">First things first — choose a place to live. Your rent comes out each week, so pick what you can afford.</p>
          <ul className="text-xs text-indigo-700 space-y-0.5 sm:space-y-1 list-disc list-inside mb-1 sm:mb-2">
            <li>📚 <strong>Library</strong> — browse companies &amp; apply for jobs</li>
            <li>🍔 <strong>Quick Eats</strong> — buy weekly meals so you don't starve</li>
            <li>☕ <strong>Coffee Shop</strong> — weekly coffee plans &amp; work shifts</li>
            <li>🏠 <strong>Home</strong> — sleep, rest, and work from home</li>
          </ul>
          <div className="text-[10px] text-indigo-500 space-y-0.5">
            <div>🍕 Hunger grows +25/week. Hit 80 = lose 20hrs next week!</div>
            <div className="hidden sm:block">⌨️ Keyboard: W=work, E=end week, R=rest, S=study, I=inventory</div>
          </div>
        </div>
      )}

      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {isFirstVisit ? '🏠 Choose your home to begin:' : '🔄 Change Your Lease'}
      </div>

      {selectedHousing && (() => {
        const h = selectedHousing;
        const deposit = calculateDeposit(h.rent, player.housing?.rent ?? 0);
        const tierEmoji = h.homeType === 'luxury_condo' ? '🌇' : h.homeType === 'apartment' ? '🏘️' : '🏠';
        return (
          <div className="bg-purple-50 border-2 border-purple-400 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{tierEmoji}</span>
              <div>
                <div className="font-black text-base">{h.title}</div>
                <div className="text-xs text-slate-500">{h.description}</div>
              </div>
            </div>
            <div className="space-y-1 text-xs mb-3">
              <div className="flex justify-between"><span>Weekly rent:</span><span className="font-mono font-bold">{h.rent === 0 ? 'Free' : `$${h.rent}/wk`}</span></div>
              {deposit > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Security deposit:</span><span className="font-mono">-${deposit}</span></div>}
              <div className="flex justify-between"><span>Happiness effect:</span><span className="font-bold">{h.happiness > 0 ? `+${h.happiness}/wk` : h.happiness < 0 ? `${h.happiness}/wk` : 'None'}</span></div>
              <div className="flex justify-between"><span>Security:</span><span className="font-bold">{h.security}</span></div>
              {(h.equityPerWeek || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Equity built:</span><span className="font-bold">+${h.equityPerWeek}/wk</span></div>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { actions.rentApartment(h); setSelectedHousing(null); onMoveIn?.(); }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-95 min-h-[44px]"
              >
                {isFirstVisit ? 'Move In' : 'Sign Lease'} {deposit > 0 ? `(-$${deposit})` : ''}
              </button>
              <button
                onClick={() => setSelectedHousing(null)}
                className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition active:scale-95 min-h-[44px]"
              >
                Back
              </button>
            </div>
          </div>
        );
      })()}

      <div className="space-y-2">
        {housingData.map((h) => {
          const deposit = calculateDeposit(h.rent, player.housing?.rent ?? 0);
          const isCurrent = player.housing?.id === h.id;
          const canAfford = deposit === 0 || player.money >= deposit;
          const tierEmoji = h.homeType === 'luxury_condo' ? '🌇' : h.homeType === 'apartment' ? '🏘️' : '🏠';
          const securityColor = h.security === 'High' ? 'text-green-600' : h.security === 'Medium' ? 'text-amber-600' : 'text-red-500';
          const isSelected = selectedHousing?.id === h.id;
          return (
            <button
              key={h.id}
              onClick={() => !isCurrent && canAfford && setSelectedHousing(h)}
              disabled={isCurrent || !canAfford}
              className={`w-full p-3 border-2 rounded-xl text-sm transition-all active:scale-[0.99]
                ${isCurrent ? 'bg-purple-100 border-purple-400 cursor-default' :
                  isSelected ? 'bg-purple-50 border-purple-400 shadow-md' :
                  !canAfford ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' :
                  'hover:bg-purple-50 border-slate-200 hover:border-purple-400 hover:shadow-md'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{tierEmoji}</span>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    {h.title}
                    {isCurrent && <span className="text-[9px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full font-black">CURRENT</span>}
                    {h.happiness > 0 && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">+{h.happiness} 😊/wk</span>}
                    {(h.equityPerWeek || 0) > 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded">+${h.equityPerWeek} 🏠/wk</span>}
                    {!isCurrent && (() => {
                      const currentHappy = player.housing?.happiness ?? 0;
                      const delta = h.happiness - currentHappy;
                      if (delta === 0) return null;
                      return <span className={`text-[9px] px-1 rounded ${delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)} vs now</span>;
                    })()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{h.description}</div>
                  {h.id === 'moms_basement' && <div className="text-[10px] text-red-400 mt-0.5 font-bold">⚠️ Happiness penalty grows each week!</div>}
                  {deposit > 0 && !isCurrent && (
                    <div className={`text-[10px] mt-0.5 font-bold ${canAfford ? 'text-orange-600' : 'text-red-600'}`}>
                      {canAfford ? `Deposit: $${deposit}` : `Need $${(deposit - player.money).toFixed(0)} more for deposit`}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm">{h.rent === 0 ? '🆓 Free' : `$${h.rent}/wk`}</div>
                  {h.rent > 0 && <div className="text-[8px] text-slate-400 font-mono">${h.rent * 4}/mo</div>}
                  <div className={`text-[10px] font-bold ${securityColor}`}>{h.security} security</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {player.hasChosenHousing && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
          <div className="font-bold text-blue-800 mb-1.5">✅ Home sweet home! What's next?</div>
          <div className="space-y-1 text-blue-700">
            {!player.job && <div>📚 Visit the <strong>Library</strong> to browse job listings and apply</div>}
            {!player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage' || i.type === 'weekly_coffee') && <div>🍔 Visit <strong>Quick Eats</strong> to buy a weekly meal plan</div>}
            <div>💰 Work shifts at your job to earn money</div>
            <div>🎓 City College offers courses to advance your career</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeasingOfficeContent;
