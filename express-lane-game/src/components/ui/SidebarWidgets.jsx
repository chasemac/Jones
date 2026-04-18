import React, { useState } from 'react';
import { calculateNetWorth, meetsEducation } from '../../engine/constants';
import { getNextPromotion, getJobLocation } from '../../engine/jobModel';
import { LOCATIONS_CONFIG } from '../../engine/boardModel';

export const RingTips = ({ player, week }) => {
  const [open, setOpen] = useState(false);

  const alerts = [];
  const requiredItemId = player.job?.requirements?.item;
  if (requiredItemId) {
    const worn = player.inventory.find(i => i.id === requiredItemId && i.clothingWear !== undefined);
    if (worn && worn.clothingWear < 40) {
      alerts.push({ emoji: '⚠️', text: `${worn.name} is at ${worn.clothingWear}% — replace it at TrendSetters soon!` });
    }
  }
  const promoJob = getNextPromotion(player);
  if (promoJob) {
    const workLocId = getJobLocation(player.job);
    const loc = LOCATIONS_CONFIG[workLocId];
    alerts.push({ emoji: '🆙', text: `Promotion ready! Go to ${loc?.label ?? 'work'} to become ${promoJob.title}` });
  }
  if (player.hunger >= 80) {
    alerts.push({ emoji: '🍽️', text: 'STARVING! -20hrs next week. Eat at Quick Eats immediately!' });
  }
  if ((player.relaxation ?? 50) <= 10) {
    alerts.push({ emoji: '😴', text: 'Exhaustion risk! Rest at home or buy a Concert Ticket soon.' });
  }
  if (player.happiness < 20) {
    alerts.push({ emoji: '💔', text: 'Happiness critical — near game over! Buy something fun.' });
  }

  // Keep critical no-job and hunger alerts active after week 5
  if (!player.job && week > 5) {
    alerts.push({ emoji: '📚', text: 'No job! Visit the Library to browse listings and get hired' });
  }
  const hasFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage' || i.type === 'weekly_coffee');
  if (!hasFood && player.hunger >= 40 && week > 5) {
    alerts.push({ emoji: '🍔', text: "No food! Visit Quick Eats or Coffee Shop before week ends" });
  }

  const tutorialTips = [];
  if (week <= 5) {
    if (!player.hasChosenHousing) {
      tutorialTips.push({ emoji: '🏠', text: 'Go to Leasing Office and pick a place to live first' });
    }
    if (!player.job) {
      tutorialTips.push({ emoji: '📚', text: 'Visit the Library to browse jobs and get hired' });
    }
    const hasFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage');
    if (!hasFood) {
      tutorialTips.push({ emoji: '🍔', text: "Visit Quick Eats and grab a week's worth of meals" });
    }
    if (player.job && player.timeRemaining >= 8) {
      const workLocId = getJobLocation(player.job);
      const loc = LOCATIONS_CONFIG[workLocId];
      tutorialTips.push({ emoji: loc?.emoji ?? '💼', text: `Head to ${loc?.label ?? 'your workplace'} and work a shift` });
    }
    if (player.money >= 200 && !player.job) {
      tutorialTips.push({ emoji: '🏦', text: 'Deposit cash at NeoBank to earn 1% interest per week' });
    }
  }

  const tips = [...alerts, ...tutorialTips];
  if (tips.length === 0) return null;

  return (
    <>
      {open && (
        <div className="absolute bottom-20 sm:bottom-32 left-0 right-0 sm:left-auto sm:right-4 sm:w-60 bg-amber-50/95 backdrop-blur border-t-2 sm:border-2 border-amber-300 sm:rounded-2xl p-3 shadow-xl z-40 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-black uppercase text-amber-600">💡 What to do next</div>
            <button onClick={() => setOpen(false)} className="text-amber-500 hover:text-amber-800 text-lg leading-none font-bold px-1">×</button>
          </div>
          <div className="space-y-2">
            {tips.slice(0, 3).map((tip, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <span className="text-sm leading-tight">{tip.emoji}</span>
                <span className="text-[10px] text-slate-600 leading-tight">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className={`absolute bottom-[3.75rem] sm:bottom-20 right-[4.75rem] h-11 rounded-full flex items-center justify-center z-10 shadow-lg transition-colors gap-1 border-2 px-3 ${open ? 'bg-amber-300 border-amber-500' : 'bg-amber-400/90 border-amber-500 hover:bg-amber-300'}`}
        title="Hints"
      >
        <span className="text-lg leading-none">💡</span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-900">Tips</span>
        {!open && tips.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {tips.length}
          </span>
        )}
      </button>
    </>
  );
};

export const JonesSidebar = ({ jones, player }) => {
  const [open, setOpen] = useState(false);
  const playerNetWorth = calculateNetWorth(player);

  return (
    <>
      {open && (
        <div className="absolute bottom-20 sm:bottom-32 left-0 right-0 sm:left-auto sm:right-[15rem] sm:w-60 bg-white/95 backdrop-blur border-t-2 sm:border-2 border-red-300 sm:rounded-2xl p-3 shadow-xl z-40 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🤑</div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">The Joneses</div>
                <div className="text-xs font-bold">{jones.jobTitle}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none font-bold px-1">×</button>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">💰 Net Worth</span>
              <span className={`font-mono font-bold ${playerNetWorth >= jones.netWorth ? 'text-green-600' : 'text-red-500'}`}>${jones.netWorth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">😊 Happiness</span>
              <span className={`font-mono font-bold ${player.happiness >= jones.happiness ? 'text-green-600' : 'text-red-500'}`}>{jones.happiness}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">🎓 Education</span>
              <span className="font-mono font-bold text-slate-600">{jones.education}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">You vs Jones</div>
            <div className="text-[9px] space-y-0.5">
              <div>{playerNetWorth >= jones.netWorth ? '✅' : '❌'} Wealth: {playerNetWorth >= jones.netWorth ? 'Ahead!' : `$${(jones.netWorth - playerNetWorth).toFixed(0)} behind`}</div>
              <div>{player.happiness >= jones.happiness ? '✅' : '❌'} Happiness: {player.happiness >= jones.happiness ? 'Ahead!' : `${jones.happiness - player.happiness} pts behind`}</div>
              <div>{meetsEducation(player.education, jones.education) ? '✅' : '❌'} Education: {meetsEducation(player.education, jones.education) ? 'Ahead!' : `Jones has ${jones.education}`}</div>
            </div>
            {playerNetWorth >= jones.netWorth && player.happiness >= jones.happiness && meetsEducation(player.education, jones.education) && (
              <div className="text-[9px] text-green-600 font-bold mt-1 text-center">🏆 Beating the Joneses!</div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className={`absolute bottom-[3.75rem] sm:bottom-20 right-[9.5rem] h-11 border-2 rounded-full flex items-center justify-center z-10 shadow-lg transition-colors gap-1 px-3 ${open ? 'bg-red-200 border-red-400' : 'bg-slate-900/90 border-slate-700 hover:border-slate-400'}`}
        title="The Joneses"
      >
        <span className="text-lg leading-none">🤑</span>
        <span className={`text-[10px] font-black uppercase tracking-wide ${open ? 'text-red-900' : 'text-white'}`}>Jones</span>
      </button>
    </>
  );
};

export const NotificationFeed = ({ history, onOpenLog }) => {
  const [lastViewedCount, setLastViewedCount] = useState(() => {
    try { return parseInt(localStorage.getItem('jones_log_viewed') || '0', 10); } catch { return 0; }
  });

  const unread = Math.max(0, history.length - lastViewedCount);

  const handleOpen = () => {
    setLastViewedCount(history.length);
    try { localStorage.setItem('jones_log_viewed', String(history.length)); } catch { /* */ }
    onOpenLog();
  };

  return (
    <button
      className="absolute bottom-[3.75rem] sm:bottom-20 right-4 h-11 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700 flex items-center justify-center z-10 hover:border-slate-400 transition-colors shadow-lg gap-1 px-3"
      onClick={handleOpen}
      title="Open event log"
    >
      <span className="text-lg leading-none">🔔</span>
      <span className="text-[10px] font-black uppercase tracking-wide text-white">Log</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
          {Math.min(unread, 99)}
        </span>
      )}
    </button>
  );
};
