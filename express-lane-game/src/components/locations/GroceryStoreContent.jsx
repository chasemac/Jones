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

  const hungerColor = player.hunger >= 80 ? 'var(--debt-ink)' : player.hunger >= 50 ? 'var(--warn-ink)' : 'var(--money-ink)';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div
        className="flex flex-col items-center justify-center rounded-xl p-4"
        style={{ background: 'rgba(16,168,118,0.06)', border: '1px solid rgba(16,168,118,0.25)' }}
      >
        <div className="text-7xl mb-2">🛒</div>
        <div className="font-display font-bold text-[13px] text-center" style={{ color: 'var(--money-ink)' }}>Fresh Mart</div>
        <div className="text-[10px] mt-1 text-center" style={{ color: 'var(--ink-2)' }}>Affordable groceries — get a fridge to stock up.</div>
        <div className={`mt-2 text-[11px] font-display font-bold ${player.hunger >= 80 ? 'animate-pulse' : ''}`} style={{ color: hungerColor }}>
          Hunger: {player.hunger}/100 {player.hunger >= 80 ? '⚠️ STARVING' : player.hunger >= 50 ? '⚠️ Hungry' : '✓ OK'}
        </div>
        {!hasStorage && (
          <div className="mt-1 text-[10px] font-display font-bold text-center" style={{ color: 'var(--warn-ink)' }}>
            💡 Buy a fridge at MegaMart to store more
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>Groceries</h3>
        </div>

        <div
          className="mb-2 p-2 rounded-lg text-[11px]"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-display font-bold" style={{ color: 'var(--ink-2)' }}>
              {hasFreezer ? '🧊 Freezer' : hasFridge ? '❄️ Fridge' : '🛍️ No storage'}
            </span>
            <span
              className="font-num font-bold"
              style={{ color: storedServings >= maxStorage ? 'var(--money-ink)' : storedServings > 0 ? 'var(--warn-ink)' : 'var(--muted-2)' }}
            >
              {storedServings}/{maxStorage} wks stored
            </span>
          </div>
          <div className="ds-meter-bar">
            <span
              style={{
                width: `${maxStorage > 0 ? (storedServings / maxStorage) * 100 : 0}%`,
                background: storedServings >= maxStorage ? 'var(--money)' : storedServings > 0 ? 'var(--warn)' : 'var(--muted-2)',
              }}
            />
          </div>
          {!hasStorage && (
            <div className="mt-1 font-bold" style={{ color: 'var(--warn-ink)' }}>
              ⚠️ Food spoils at week's end — buy a fridge at MegaMart (stores 2 wks)
            </div>
          )}
        </div>

        {storedServings >= maxStorage ? (
          <div
            className="p-2 rounded-lg text-[12px] mb-2"
            style={{ background: 'rgba(16,168,118,0.08)', border: '1px solid rgba(16,168,118,0.3)', color: 'var(--money-ink)' }}
          >
            ✅ Stocked up! ({storedServings}/{maxStorage} weeks) — you're set for {storedServings} week{storedServings > 1 ? 's' : ''}.
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
                className="w-full flex justify-between items-center p-2 rounded-lg disabled:opacity-50 text-[13px] transition active:scale-[0.99]"
                style={{
                  background: 'rgba(16,168,118,0.06)',
                  border: '1px solid rgba(16,168,118,0.3)',
                  minHeight: 44,
                }}
              >
                <div className="text-left">
                  <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>🥦 {n === 1 ? '1 week' : `${n} weeks`} of groceries</div>
                  {n > 1 && <div className="text-[10px]" style={{ color: 'var(--money-ink)' }}>Stock up & save trips</div>}
                </div>
                <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>${groceryPrice * n}</span>
              </button>
            ))}
          </div>
        )}

        {hasStorage && (
          <div className="text-[10px] mt-2 space-y-0.5" style={{ color: 'var(--money-ink)' }}>
            <div>🧊 {hasFreezer ? 'Freezer' : 'Fridge'}: {storedServings}/{maxStorage} weeks — auto-eaten each week.</div>
            <div className="font-bold">💰 Groceries $40/wk vs Quick Eats $60–80/wk — save $20–$40/wk.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroceryStoreContent;
