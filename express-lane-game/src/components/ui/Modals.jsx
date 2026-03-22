import React, { useEffect } from 'react';
import { DIFFICULTY_PRESETS, calculateNetWorth, meetsEducation, getEducationProgress } from '../../engine/constants';

export const GoalsModal = ({ state, onClose }) => {
  const { player, difficulty, week, jones } = state;
  const goals = DIFFICULTY_PRESETS[difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const jonesNetWorth = jones?.netWorth ?? 0;
  const beatingJones = netWorth >= jonesNetWorth;

  const items = [
    {
      label: 'Wealth (Net Worth)',
      current: `$${Math.max(0, netWorth).toFixed(0)}`,
      goal: `$${goals.wealth}`,
      pct: Math.min(100, (Math.max(0, netWorth) / goals.wealth) * 100),
      met: netWorth >= goals.wealth,
    },
    {
      label: 'Happiness',
      current: `${player.happiness}`,
      goal: `${goals.happiness}`,
      pct: Math.min(100, (player.happiness / goals.happiness) * 100),
      met: player.happiness >= goals.happiness,
    },
    {
      label: 'Education',
      current: player.education,
      goal: goals.education,
      pct: getEducationProgress(player.education, goals.education),
      met: meetsEducation(player.education, goals.education),
    },
    {
      label: 'Dependability (Career)',
      current: `${player.dependability ?? 50}`,
      goal: `${goals.careerDependability}`,
      pct: Math.min(100, ((player.dependability ?? 50) / goals.careerDependability) * 100),
      met: (player.dependability ?? 50) >= goals.careerDependability,
    },
  ];

  const allMet = items.every(i => i.met);
  const metCount = items.filter(i => i.met).length;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="goals-title" className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 id="goals-title" className="text-xl font-black uppercase flex items-center gap-2">🎯 Goals</h3>
            <div className="text-[10px] text-slate-400">{DIFFICULTY_PRESETS[difficulty].label} · Week {week} · {metCount}/4 complete</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        {allMet ? (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl p-3 text-center text-sm font-bold text-green-700 mb-3 animate-pulse">
            🏆 All goals achieved! Head home and end the week to win!
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div className="flex gap-1">
              {items.map((item, i) => (
                <span key={i} className={`text-base ${item.met ? 'opacity-100' : 'opacity-30'}`}>
                  {['💰','😊','🎓','🎯'][i]}
                </span>
              ))}
            </div>
            <span>Achieve all 4 simultaneously to win.</span>
          </div>
        )}
        <div className="space-y-2.5 overflow-y-auto flex-grow">
          {items.map((item) => (
            <div key={item.label} className={`rounded-xl p-3 border-2 transition-all ${item.met ? 'bg-green-50 border-green-300 shadow-sm' : item.pct > 75 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className={`text-sm font-bold ${item.met ? 'text-green-700' : 'text-slate-700'}`}>
                  {item.met ? '✅' : item.pct > 75 ? '🔵' : '⬜'} {item.label}
                </span>
                <span className={`text-xs font-mono font-bold ${item.met ? 'text-green-600' : item.pct > 75 ? 'text-blue-600' : 'text-slate-500'}`}>{item.current} / {item.goal}</span>
              </div>
              <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${item.met ? 'bg-green-500' : item.pct > 75 ? 'bg-blue-500' : item.pct > 40 ? 'bg-blue-400' : 'bg-slate-300'}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <div className="text-[9px] text-right mt-0.5 font-bold" style={{ color: item.met ? '#16a34a' : item.pct > 75 ? '#3b82f6' : '#94a3b8' }}>
                {item.met ? '✓ COMPLETE' : `${Math.round(item.pct)}% there`}
              </div>
              {!item.met && (
                <div className="text-[9px] text-slate-400 mt-0.5 italic">
                  {item.label.includes('Wealth') && '💡 Work shifts, save at NeoBank, invest in stocks'}
                  {item.label.includes('Happiness') && '💡 Buy entertainment, rest at home, upgrade housing'}
                  {item.label.includes('Education') && '💡 Enroll at City College and study each week'}
                  {item.label.includes('Dependability') && '💡 Work shifts and network at Coffee Shop'}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Jones comparison */}
        <div className={`mt-3 p-2.5 rounded-xl border text-xs ${beatingJones ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="font-bold text-slate-700 mb-1.5">🤑 vs The Joneses</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>💰 Net Worth</span>
              <span className={`font-mono font-black ${beatingJones ? 'text-green-600' : 'text-red-600'}`}>
                {beatingJones ? `+$${(netWorth - jonesNetWorth).toLocaleString()} ahead` : `-$${(jonesNetWorth - netWorth).toLocaleString()} behind`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>😊 Happiness</span>
              <span className={`font-mono font-black ${player.happiness >= (jones?.happiness ?? 0) ? 'text-green-600' : 'text-red-600'}`}>
                {player.happiness} vs {jones?.happiness ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>🎓 Education</span>
              <span className="font-mono font-black text-slate-600">{jones?.education ?? '?'}</span>
            </div>
            <div className="flex justify-between">
              <span>💼 Career</span>
              <span className="font-mono font-bold text-slate-600 text-[9px]">{jones?.jobTitle ?? '?'}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="mt-3 w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl hover:bg-slate-700 transition text-sm active:scale-95 min-h-[44px]">
          Got it
        </button>
      </div>
    </div>
  );
};

export const NotificationModal = ({ title, message, type, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white border-4 rounded-[1.75rem] shadow-2xl p-6 max-w-sm w-full mx-4" style={{ borderColor: type === 'success' ? '#22c55e' : '#ef4444' }} onClick={e => e.stopPropagation()}>
      <div className="text-center text-4xl mb-3">{type === 'success' ? '🎉' : '🚫'}</div>
      <h3 className={`text-xl font-black text-center mb-2 uppercase ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{title}</h3>
      <p className="text-slate-600 text-center text-sm mb-4">{message}</p>
      <button onClick={onClose} className={`w-full text-white font-bold py-2.5 rounded-xl transition active:scale-95 min-h-[44px] ${type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
        {type === 'success' ? '🎉 Nice!' : 'Got it'}
      </button>
    </div>
  </div>
);

const InventorySection = ({ title, items }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">{title}</div>
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg mb-1">
          <div>
            <div className="font-bold text-sm">{item.name}</div>
            <div className="text-xs text-slate-400">{item.effect}</div>
            {item.clothingWear !== undefined && (
              <div className="mt-0.5">
                <div className="flex items-center gap-1">
                  <div className="flex-grow h-1.5 bg-slate-200 rounded-full overflow-hidden w-20">
                    <div
                      className={`h-full rounded-full ${item.clothingWear <= 20 ? 'bg-red-500' : item.clothingWear <= 40 ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${item.clothingWear}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${item.clothingWear <= 20 ? 'text-red-600' : 'text-slate-400'}`}>
                    {item.clothingWear <= 20 ? '⚠️ ' : ''}{item.clothingWear}% durability
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 text-right">
            <div>${item.cost}</div>
            <div className="text-slate-400">resell ${Math.floor(item.cost * 0.5)}</div>
            {item.weeklyFee > 0 && <div className="text-red-400 text-[9px]">-${item.weeklyFee}/wk</div>}
            {item.weeklyHappinessBoost > 0 && <div className="text-green-500 text-[9px]">+{item.weeklyHappinessBoost} 😊/wk</div>}
            {item.studyBonus > 0 && <div className="text-blue-500 text-[9px]">+{item.studyBonus}h study</div>}
            {item.travelBonus > 0 && <div className="text-violet-500 text-[9px]">-{item.travelBonus}h travel</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export const InventoryModal = ({ inventory, onClose }) => {
  const clothing = inventory.filter(i => i.clothingWear !== undefined);
  const electronics = inventory.filter(i => i.type === 'electronics' || i.type === 'subscription');
  const appliances = inventory.filter(i => i.type === 'appliance');
  const studyAids = inventory.filter(i => i.type === 'study_aid');
  const groceries = inventory.filter(i => i.id === 'groceries');
  const other = inventory.filter(i =>
    i.clothingWear === undefined &&
    i.type !== 'electronics' && i.type !== 'subscription' &&
    i.type !== 'appliance' && i.type !== 'study_aid' &&
    i.id !== 'groceries'
  );

  const UNSELLABLE_TYPES = new Set(['food', 'weekly_meal', 'weekly_coffee', 'food_storage', 'entertainment']);
  const totalResaleValue = inventory
    .filter(i => !UNSELLABLE_TYPES.has(i.type))
    .reduce((sum, i) => sum + Math.floor((i.cost || 0) * 0.5), 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="inventory-title" className="bg-white border-4 border-slate-800 rounded-[1.75rem] shadow-2xl p-5 max-w-lg w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 border-b-2 border-slate-200 pb-2">
          <div>
            <h3 id="inventory-title" className="text-xl font-black uppercase flex items-center gap-2">🎒 Inventory</h3>
            <div className="text-[10px] text-slate-400">{inventory.length} item{inventory.length !== 1 ? 's' : ''}{totalResaleValue > 0 ? ` · $${totalResaleValue} resale` : ''}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="flex-grow overflow-y-auto pr-1">
          {inventory.length === 0 ? (
            <div className="text-center text-slate-400 py-8 italic">Your pockets are empty.</div>
          ) : (
            <>
              <InventorySection title="👗 Clothing" items={clothing} />
              {groceries.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">🛒 Stored Food</div>
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <span className="font-bold">{groceries.length} week{groceries.length > 1 ? 's' : ''} of groceries</span>
                    <span className="text-xs text-green-700 ml-2">auto-consumed each week</span>
                  </div>
                </div>
              )}
              <InventorySection title="📱 Electronics & Subs" items={electronics} />
              <InventorySection title="🏠 Appliances" items={appliances} />
              <InventorySection title="📚 Study Aids" items={studyAids} />
              <InventorySection title="📦 Other" items={other} />
            </>
          )}
        </div>
        {(() => {
          const weeklyCosts = inventory.filter(i => i.weeklyFee).reduce((sum, i) => sum + i.weeklyFee, 0);
          const weeklyHappy = inventory.filter(i => i.weeklyHappinessBoost).reduce((sum, i) => sum + i.weeklyHappinessBoost, 0);
          if (weeklyCosts === 0 && weeklyHappy === 0) return null;
          return (
            <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
              <div className="font-bold text-slate-600 mb-0.5">📋 Weekly Effects</div>
              {weeklyCosts > 0 && <div className="text-red-500">Subscriptions: -${weeklyCosts}/wk</div>}
              {weeklyHappy > 0 && <div className="text-green-600">Happiness boost: +{weeklyHappy}/wk</div>}
            </div>
          );
        })()}
        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <span>Sell items at Black's Market</span>
          <div className="flex items-center gap-2">
            {totalResaleValue > 0 && <span className="text-green-600 font-bold">~${totalResaleValue} pawn value</span>}
            <button onClick={onClose} className="text-[9px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold text-slate-600 transition">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HungerWarningModal = ({ warning, onClose }) => {
  const { hunger, penalty, hadSomeFood } = warning;
  const severity = hunger >= 80 ? 'starving' : hunger >= 50 ? 'very hungry' : 'hungry';
  const emoji = hunger >= 80 ? '😵' : hunger >= 50 ? '😫' : '😟';
  const borderColor = hunger >= 80 ? 'border-red-500' : hunger >= 50 ? 'border-orange-400' : 'border-yellow-400';
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className={`bg-white border-4 ${borderColor} rounded-[1.75rem] shadow-2xl p-6 max-w-sm w-full mx-4`}>
        <div className="text-center text-5xl mb-3">{emoji}</div>
        <h3 className="text-xl font-black text-center text-slate-800 mb-1">
          {hadSomeFood ? 'Still Hungry!' : 'You Went Hungry!'}
        </h3>
        <p className="text-slate-600 text-center text-sm mb-4">
          {hadSomeFood
            ? `Snacks helped a little, but you ended the week ${severity} (${hunger}/100). A weekly meal plan covers you properly.`
            : `You didn't buy any food last week. You're ${severity} (${hunger}/100 hunger).`}
        </p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center mb-4">
          <div className="text-2xl font-black text-red-600">-{penalty} hours</div>
          <div className="text-xs text-red-400">
            {hadSomeFood ? 'reduced penalty — snacks helped a bit' : 'deducted from this week\'s time'}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 text-center mb-4">
          {hadSomeFood
            ? 'Buy a weekly plan at Quick Eats or Coffee Shop to avoid the penalty entirely!'
            : 'Visit Quick Eats or Coffee Shop to buy a weekly food plan next week!'}
        </p>
        <button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition text-sm">
          Got it — I'll eat better next week 🍔
        </button>
      </div>
    </div>
  );
};

export const ClothingWarningModal = ({ warning, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="bg-white border-4 border-amber-400 rounded-[1.75rem] shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="text-center text-5xl mb-3">👔</div>
        <h3 className="text-xl font-black text-center text-slate-800 mb-1">Clothing Wore Out!</h3>
        <p className="text-slate-600 text-center text-sm mb-4">
          Your <strong>{warning.itemName}</strong> fell apart — it was required for your job as <strong>{warning.jobTitle}</strong>.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center mb-4">
          <div className="text-lg font-black text-red-600">Job Lost</div>
          <div className="text-xs text-red-400">You need to buy new clothing and reapply</div>
        </div>
        <p className="text-[11px] text-slate-400 text-center mb-4">
          Visit TrendSetters to buy replacement clothing before applying again.
        </p>
        <button onClick={onClose} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition text-sm">
          Got it — time to go shopping
        </button>
      </div>
    </div>
  );
};

export const EventModal = ({ event, onClose }) => {
  const desc = (event.effectDesc || '').toLowerCase();
  const isPositive = desc.includes('+') && !desc.includes('−') && !desc.includes('-');
  const isNegative = desc.includes('−') || (desc.includes('-') && !isPositive);
  const borderColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#f59e0b';
  const headerBg = isPositive ? 'from-green-400 to-emerald-500' : isNegative ? 'from-red-400 to-rose-500' : 'from-yellow-400 to-amber-500';
  const icon = isPositive ? '🎉' : isNegative ? '⚠️' : '📰';
  const effectBg = isPositive ? 'bg-green-50 border-green-200 text-green-800' : isNegative ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-800';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-[1.75rem] shadow-2xl max-w-sm w-full mx-4 overflow-hidden" style={{ borderWidth: 4, borderStyle: 'solid', borderColor }} onClick={e => e.stopPropagation()}>
        <div className={`bg-gradient-to-br ${headerBg} p-4 text-center`}>
          <div className="text-4xl mb-1">{icon}</div>
          <h3 className="text-lg font-black text-white">{event.title}</h3>
        </div>
        <div className="p-5">
          <p className="text-slate-600 text-center text-sm mb-3">{event.description}</p>
          {event.playerName && event.playerName !== 'Player 1' && (
            <div className="text-[10px] text-slate-500 text-center mb-2 bg-slate-50 rounded px-2 py-1">Affects: {event.playerName}</div>
          )}
          {event.effectDesc && (
            <div className={`border rounded-xl px-3 py-2.5 text-center text-sm font-bold mb-4 ${effectBg}`}>
              {event.effectDesc}
            </div>
          )}
          <button onClick={onClose} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl hover:bg-slate-700 transition active:scale-95 min-h-[44px]">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export const FullLogModal = ({ history, onClose }) => {
  const entryColor = (entry) => {
    const e = entry.toLowerCase();
    if (e.includes('hungry') || e.includes('starving') || e.includes('fired') || e.includes('evict') || e.includes('willy') || e.includes('spoiled') || e.includes('lost')) return 'text-red-400';
    if (e.includes('earned') || e.includes('worked') || e.includes('hired') || e.includes('promoted') || e.includes('enrolled') || e.includes('completed') || e.includes('graduated')) return 'text-green-400';
    if (e.includes('bought') || e.includes('moved') || e.includes('paid') || e.includes('sold')) return 'text-blue-400';
    if (e.includes('economy')) return 'text-yellow-400';
    if (e.includes('doctor') || e.includes('exhaustion')) return 'text-amber-400';
    if (e.includes('jones')) return 'text-purple-400';
    if (e.includes('week') && e.includes('rent')) return 'text-slate-400';
    return 'text-slate-300';
  };
  const entryIcon = (entry) => {
    const e = entry.toLowerCase();
    if (e.includes('worked') || e.includes('earned') || e.includes('gig')) return '💰';
    if (e.includes('hired') || e.includes('promoted')) return '🎉';
    if (e.includes('hungry') || e.includes('starving')) return '🍽️';
    if (e.includes('moved') || e.includes('rent')) return '🏠';
    if (e.includes('bought') || e.includes('enrolled')) return '🛒';
    if (e.includes('completed') || e.includes('graduated')) return '🎓';
    if (e.includes('networked')) return '🤝';
    if (e.includes('rested') || e.includes('read')) return '📖';
    if (e.includes('sold')) return '💸';
    if (e.includes('willy')) return '👹';
    if (e.includes('jones')) return '🤑';
    if (e.includes('economy')) return '📊';
    if (e.includes('stock') || e.includes('shares')) return '📈';
    if (e.includes('doctor') || e.includes('exhaustion')) return '🏥';
    return '·';
  };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="log-title" className="bg-slate-900 border-2 border-slate-600 rounded-[1.75rem] shadow-2xl p-4 max-w-xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h3 id="log-title" className="text-white font-black text-base">📋 Event Log</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="text-[9px] text-slate-500 mb-2 uppercase tracking-wide">{history.length} events · newest first</div>
        <div className="flex-grow overflow-y-auto space-y-0.5 pr-1">
          {history.length === 0
            ? <div className="text-slate-500 italic text-xs text-center py-4">No events yet.</div>
            : (() => {
                // Group by week number (entries start with "Week X:")
                const groups = [];
                const groupMap = {};
                history.forEach(entry => {
                  const match = entry.match(/^Week (\d+):/);
                  const weekNum = match ? parseInt(match[1]) : 0;
                  if (!groupMap[weekNum]) {
                    groupMap[weekNum] = { week: weekNum, entries: [] };
                    groups.push(groupMap[weekNum]);
                  }
                  groupMap[weekNum].entries.push(entry);
                });
                // Sort by week descending (newest first, matches history order)
                groups.sort((a, b) => b.week - a.week);
                return groups.map(group => (
                  <div key={group.week} className="mb-2">
                    <div className="text-[9px] font-black uppercase text-slate-500 bg-slate-800 px-2 py-0.5 rounded sticky top-0">
                      Week {group.week}
                    </div>
                    {group.entries.map((entry, i) => {
                      // Strip "Week X: " prefix since it's shown in the header
                      const stripped = entry.replace(/^Week \d+:\s*/, '');
                      return (
                        <div key={i} className={`text-[11px] flex gap-1.5 items-start border-b border-slate-800 last:border-0 py-1 ${entryColor(entry)}`}>
                          <span className="shrink-0 w-4 text-center">{entryIcon(entry)}</span>
                          <span>{stripped}</span>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
        </div>
      </div>
    </div>
  );
};

export const WeekSummaryModal = ({ summary, onClose }) => {
  const [countdown, setCountdown] = React.useState(5);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(c => c - 1), 1000);
    const t = setTimeout(onClose, 5000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="week-summary-title" className="bg-white border-4 border-indigo-500 rounded-[1.75rem] shadow-2xl p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-center text-3xl mb-1">🌙</div>
        <h3 id="week-summary-title" className="text-lg font-black text-center text-indigo-800 mb-0.5">Week {summary.week} Complete!</h3>
        <p className="text-[10px] text-center text-slate-400 mb-3">Auto-closing in {Math.max(0, countdown)}s · tap to dismiss</p>
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-indigo-400 transition-all duration-1000" style={{ width: `${(countdown / 5) * 100}%` }} />
        </div>
        <div className="space-y-2 mb-4">
          {summary.lines.map((p, i) => (
            <div key={i} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold">{p.emoji} {p.name}</span>
                <span className={`text-base font-black ${p.netWorthDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {p.netWorthDelta >= 0 ? '+' : ''}${p.netWorthDelta.toFixed(0)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
                <span className="text-slate-500">💰 <span className="text-slate-700 font-bold">${Math.round(p.money).toLocaleString()}</span></span>
                <span className="text-slate-500">😊 <span className={`font-bold ${p.happiness < 30 ? 'text-red-500' : p.happiness >= 75 ? 'text-green-600' : 'text-slate-700'}`}>{p.happiness}/100</span></span>
                <span className="text-slate-500">🎯 Dep <span className="text-slate-700 font-bold">{p.dependability}</span></span>
                <span className="text-slate-400 truncate">💼 {p.job}</span>
                <span className="text-slate-500">🍕 <span className={`font-bold ${(p.hunger ?? 0) >= 80 ? 'text-red-500' : (p.hunger ?? 0) >= 50 ? 'text-orange-500' : 'text-green-600'}`}>{p.hunger ?? 0}</span></span>
                <span className="text-slate-500">🛁 <span className={`font-bold ${(p.relaxation ?? 50) <= 20 ? 'text-red-500' : 'text-teal-600'}`}>{p.relaxation ?? 50}</span></span>
                <span className="text-slate-500">💵 <span className={`font-bold ${p.netWorth >= 0 ? 'text-green-600' : 'text-red-500'}`}>${Math.round(p.netWorth).toLocaleString()}</span></span>
              </div>
              {p.currentCourse && (
                <div className="text-[9px] text-blue-500 font-bold mt-1">
                  📚 Studying: {p.currentCourse.title} ({Math.round((p.currentCourse.progress / p.currentCourse.totalHours) * 100)}%)
                </div>
              )}
              {p.netWorthDelta > 100 && <div className="text-[9px] text-green-600 font-bold mt-1">🔥 Great week! Big gains!</div>}
              {p.netWorthDelta < -200 && <div className="text-[9px] text-red-500 font-bold mt-1">😰 Rough week — expenses piled up</div>}
              {(p.hunger ?? 0) >= 80 && <div className="text-[9px] text-red-500 font-bold mt-1 animate-pulse">🍽️ Starving! Buy food next week!</div>}
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition text-sm active:scale-95 min-h-[44px]">
          Start Week {summary.week + 1} →
        </button>
      </div>
    </div>
  );
};
