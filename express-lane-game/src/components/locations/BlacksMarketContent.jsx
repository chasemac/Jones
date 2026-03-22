import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import itemsData from '../../data/items.json';

const BlacksMarketContent = ({ state, actions, onLotteryResult }) => {
  const { player, economy } = state;
  const concertTicket = itemsData.find(i => i.id === 'concert_ticket');
  const concertPrice = adjustedPrice(concertTicket.cost, economy);
  const [confirmId, setConfirmId] = React.useState(null);

  const pawnMultiplier = economy === 'Boom' ? 0.60 : economy === 'Depression' ? 0.40 : 0.50;
  const pawnLabel = economy === 'Boom' ? '🟢 Boom prices!' : economy === 'Depression' ? '🔴 Low market' : '⚪ Normal rates';

  const UNSELLABLE_TYPES = new Set(['food', 'weekly_meal', 'weekly_coffee', 'food_storage', 'entertainment']);
  const pawnable = player.inventory.filter(item => !UNSELLABLE_TYPES.has(item.type));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
          <h3 className="font-bold text-sm">🕶️ Pawn Shop</h3>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-500">{pawnLabel} ({Math.round(pawnMultiplier * 100)}¢/$)</span>
            {pawnable.length > 0 && (
              <div className="text-[8px] text-green-600 font-bold">Total: ${pawnable.reduce((s, i) => s + Math.floor(i.cost * pawnMultiplier), 0)}</div>
            )}
          </div>
        </div>
        {pawnable.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-xs text-slate-400 italic font-bold">Nothing to pawn</div>
            <div className="text-[10px] text-slate-400 mt-1">{player.inventory.length > 0 ? 'Food & consumables can\'t be pawned.' : 'Buy things first, then sell them here.'}</div>
          </div>
        ) : pawnable.map((item, i) => {
          const pawnValue = Math.floor(item.cost * pawnMultiplier);
          const itemKey = `${item.id}-${i}`;
          return (
            <div key={itemKey} className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-lg mb-1.5 text-xs shadow-sm">
              <div className="min-w-0 mr-2">
                <div className="font-bold truncate">{item.name}</div>
                {item.clothingWear !== undefined && (
                  <div className={`text-[9px] ${item.clothingWear <= 30 ? 'text-red-500' : 'text-slate-400'}`}>{item.clothingWear}% durability</div>
                )}
              </div>
              {confirmId === itemKey ? (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { actions.sellItem(item); setConfirmId(null); }}
                    className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-700 active:scale-95 text-xs min-h-[36px]"
                  >✓ Sell!</button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-300 active:scale-95 min-h-[36px]"
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(itemKey)}
                  className="bg-slate-800 text-white px-2.5 py-1.5 rounded-lg font-bold hover:bg-slate-700 active:scale-95 shrink-0 text-xs min-h-[36px]"
                >
                  ${pawnValue}
                </button>
              )}
            </div>
          );
        })}
        <div className="mt-2 text-[9px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-200 italic space-y-0.5">
          <div>⚠️ Watch out for Wild Willy leaving this area! A suit deters him.</div>
          {economy !== 'Boom' && pawnable.length > 0 && (
            <div className={`font-bold not-italic ${economy === 'Depression' ? 'text-red-500' : 'text-amber-600'}`}>
              {economy === 'Depression' ? '📉 Bad time to sell — wait for Boom!' : '⏳ Boom economy gives 60¢/$ — worth waiting?'}
            </div>
          )}
          {economy === 'Boom' && pawnable.length > 0 && (
            <div className="font-bold not-italic text-green-600">📈 Great time to sell! Boom prices are active.</div>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">🎟️ Entertainment</h3>
        <button
          onClick={() => {
            if (player.money >= 10) {
              const win = Math.random() < 0.05;
              actions.buyItem({ id: `lottery_${Date.now()}`, name: 'Lottery Ticket', cost: 10, type: 'entertainment', happinessBoost: win ? 50 : -2, relaxationBoost: 0 });
              onLotteryResult?.(win);
            }
          }}
          disabled={player.money < 10}
          className="w-full p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl hover:bg-yellow-100 disabled:opacity-50 mb-2 text-sm active:scale-95 transition"
        >
          <div className="flex justify-between items-center">
            <span className="font-bold">🎰 Lottery Ticket</span>
            <span className="font-mono font-black">$10</span>
          </div>
          <div className="text-xs text-yellow-700 mt-0.5">5% jackpot chance: +50 😊 · otherwise -2 😊</div>
        </button>
        <button
          onClick={() => actions.buyItem({ ...concertTicket, cost: concertPrice })}
          disabled={player.money < concertPrice}
          className="w-full p-3 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 disabled:opacity-50 text-sm active:scale-95 transition"
        >
          <div className="flex justify-between items-center">
            <span className="font-bold">🎸 Concert Ticket</span>
            <span className="font-mono font-black">${concertPrice}</span>
          </div>
          <div className="text-xs text-purple-700 mt-0.5">
            +{concertTicket.happinessBoost} Happiness · +{concertTicket.relaxationBoost} Relaxation
            {(player.relaxation ?? 50) <= 30 && <span className="text-red-600 font-bold ml-1">← You need this!</span>}
          </div>
        </button>
        <div className="mt-3 bg-slate-800 rounded-xl p-3 text-xs">
          <div className="text-slate-300 font-bold mb-1">💡 Black's Market Tips</div>
          <div className="text-slate-400 space-y-1">
            <div>• Sell during Boom economy for best prices</div>
            <div>• Concerts instantly boost mood & relaxation</div>
            <div>• Lottery: 5% odds — not a retirement plan</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlacksMarketContent;
