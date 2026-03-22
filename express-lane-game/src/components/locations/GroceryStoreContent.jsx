import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import itemsData from '../../data/items.json';

const GroceryStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const groceryItem = itemsData.find(i => i.id === 'groceries');
  const hasFridge = player.inventory.some(i => i.id === 'refrigerator');
  const hasFreezer = player.inventory.some(i => i.id === 'freezer');
  const hasStorage = hasFridge || hasFreezer;
  const storedServings = player.inventory.filter(i => i.id === 'groceries').length;
  const maxStorage = hasFreezer ? 4 : hasFridge ? 2 : 1;
  const groceryPrice = adjustedPrice(groceryItem.cost, economy);
  const canBuy = (n) => storedServings + n <= maxStorage && player.money >= groceryPrice * n;

  const slotsOpen = maxStorage - storedServings;
  const bulkOptions = hasStorage
    ? Array.from({ length: slotsOpen }, (_, i) => i + 1).filter(n => player.money >= groceryPrice * n)
    : [1];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="flex flex-col items-center justify-center bg-green-50 rounded-lg p-4">
        <div className="text-7xl mb-2">🛒</div>
        <div className="text-xs font-bold text-green-800 text-center">Fresh Mart</div>
        <div className="text-[10px] text-green-600 mt-1 text-center">Affordable groceries — get a fridge to stock up!</div>
        <div className={`mt-2 text-[10px] font-bold ${player.hunger >= 80 ? 'text-red-600 animate-pulse' : player.hunger >= 50 ? 'text-orange-600' : 'text-green-600'}`}>
          Hunger: {player.hunger}/100 {player.hunger >= 80 ? '⚠️ STARVING' : player.hunger >= 50 ? '⚠️ Hungry' : '✓ OK'}
        </div>
        {!hasStorage && (
          <div className="mt-1 text-[9px] text-amber-600 font-bold text-center">
            💡 Buy a fridge at MegaMart to store more!
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Groceries</h3>
        {/* Storage capacity display */}
        <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-600">
              {hasFreezer ? '🧊 Freezer' : hasFridge ? '❄️ Fridge' : '🛍️ No storage'}
            </span>
            <span className={`font-mono font-bold ${storedServings >= maxStorage ? 'text-green-600' : storedServings > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {storedServings}/{maxStorage} wks stored
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${storedServings >= maxStorage ? 'bg-green-500' : storedServings > 0 ? 'bg-amber-400' : 'bg-slate-300'}`}
              style={{ width: `${maxStorage > 0 ? (storedServings / maxStorage) * 100 : 0}%` }}
            />
          </div>
          {!hasStorage && <div className="mt-1 text-amber-700 font-bold">⚠️ Food spoils at week's end — buy a fridge at MegaMart (stores 2 wks)</div>}
        </div>
        {storedServings >= maxStorage ? (
          <div className="p-2 bg-green-50 border border-green-300 rounded text-xs text-green-800 mb-2 mt-2">
            ✅ Stocked up! ({storedServings}/{maxStorage} weeks stored) — you're set for {storedServings} week{storedServings > 1 ? 's' : ''}!
          </div>
        ) : (
          <div className="space-y-1">
            {bulkOptions.map(n => (
              <button
                key={n}
                onClick={() => {
                  for (let i = 0; i < n; i++) actions.buyItem({ ...groceryItem, cost: groceryPrice });
                }}
                disabled={!canBuy(n)}
                className="w-full flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 text-sm"
              >
                <div>
                  <div className="font-bold">🥦 {n === 1 ? '1 week' : `${n} weeks`} of groceries</div>
                  {n > 1 && <div className="text-[10px] text-green-600">Stock up & save trips!</div>}
                </div>
                <span className="font-mono text-xs">${groceryPrice * n}</span>
              </button>
            ))}
          </div>
        )}
        {hasStorage && (
          <div className="text-[10px] text-green-700 mt-2 space-y-0.5">
            <div>🧊 {hasFreezer ? 'Freezer' : 'Fridge'}: {storedServings}/{maxStorage} weeks stored — auto-eaten each week.</div>
            <div className="text-green-600 font-bold">💰 Groceries: $40/wk vs Quick Eats: $60-80/wk — save ${20}-${40}/wk!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroceryStoreContent;
