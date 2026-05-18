import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { UNSELLABLE_TYPES, ECONOMY_PAWN_MULTIPLIER } from '../../engine/constants';
import itemsData from '../../data/items.json';

const BlacksMarketContent = ({ state, actions, onLotteryResult }) => {
  const { player, economy } = state;
  const concertTicket = itemsData.find(i => i.id === 'concert_ticket');
  const concertPrice = adjustedPrice(concertTicket.cost, economy);
  const [confirmId, setConfirmId] = React.useState(null);

  const pawnMultiplier = ECONOMY_PAWN_MULTIPLIER[economy] ?? 0.50;
  const pawnLabel = economy === 'Boom' ? '🟢 Boom prices!' : economy === 'Depression' ? '🔴 Low market' : '⚪ Normal rates';
  const pawnable = player.inventory.filter(item => !UNSELLABLE_TYPES.has(item.type));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>🕶️ Pawn shop</h3>
          <div className="text-right">
            <span className="text-[10px] font-display font-bold" style={{ color: 'var(--muted)' }}>{pawnLabel} ({Math.round(pawnMultiplier * 100)}¢/$)</span>
            {pawnable.length > 0 && (
              <div className="text-[10px] font-num font-bold" style={{ color: 'var(--money-ink)' }}>
                Total: ${pawnable.reduce((s, i) => s + Math.floor(i.cost * pawnMultiplier), 0)}
              </div>
            )}
          </div>
        </div>

        {pawnable.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-[12px] italic font-display font-bold" style={{ color: 'var(--muted-2)' }}>Nothing to pawn</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--muted-2)' }}>
              {player.inventory.length > 0 ? "Food & consumables can't be pawned." : 'Buy things first, then sell them here.'}
            </div>
          </div>
        ) : pawnable.map((item, i) => {
          const pawnValue = Math.floor(item.cost * pawnMultiplier);
          const itemKey = `${item.id}-${i}`;
          return (
            <div
              key={itemKey}
              className="flex justify-between items-center p-2.5 rounded-lg mb-1.5 text-[12px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
            >
              <div className="min-w-0 mr-2">
                <div className="font-display font-bold truncate" style={{ color: 'var(--ink)' }}>{item.name}</div>
                {item.clothingWear !== undefined && (
                  <div className="text-[10px]" style={{ color: item.clothingWear <= 30 ? 'var(--debt-ink)' : 'var(--muted-2)' }}>
                    {item.clothingWear}% durability
                  </div>
                )}
              </div>
              {confirmId === itemKey ? (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { actions.sellItem(item); setConfirmId(null); }}
                    className="ds-btn"
                    style={{ background: 'var(--debt)', borderColor: 'var(--debt)', color: '#fff', padding: '6px 10px', minHeight: 36, fontSize: 11 }}
                  >
                    ✓ Sell
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="ds-btn"
                    style={{ padding: '6px 10px', minHeight: 36, fontSize: 11 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(itemKey)}
                  className="ds-btn ds-btn-dark shrink-0"
                  style={{ padding: '6px 10px', minHeight: 36, fontSize: 11 }}
                >
                  ${pawnValue}
                </button>
              )}
            </div>
          );
        })}

        <div
          className="mt-2 text-[10px] italic p-2 rounded-lg space-y-0.5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <div>⚠️ Watch out for Wild Willy leaving this area. A suit deters him.</div>
          {economy !== 'Boom' && pawnable.length > 0 && (
            <div className="font-display font-bold not-italic" style={{ color: economy === 'Depression' ? 'var(--debt-ink)' : 'var(--warn-ink)' }}>
              {economy === 'Depression' ? '📉 Bad time to sell — wait for Boom' : '⏳ Boom economy gives 60¢/$ — worth waiting?'}
            </div>
          )}
          {economy === 'Boom' && pawnable.length > 0 && (
            <div className="font-display font-bold not-italic" style={{ color: 'var(--money-ink)' }}>
              📈 Great time to sell! Boom prices active.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>🎟️ Entertainment</h3>
        </div>

        <button
          onClick={() => {
            if (player.money >= 10) {
              const win = Math.random() < 0.05;
              actions.buyItem({
                id: `lottery_${Date.now()}`, name: 'Lottery Ticket', cost: 10, type: 'entertainment',
                happinessBoost: win ? 50 : -2, relaxationBoost: 0,
              });
              onLotteryResult?.(win);
            }
          }}
          disabled={player.money < 10}
          className="w-full p-3 rounded-xl disabled:opacity-50 mb-2 text-[13px] transition active:scale-[0.99] text-left"
          style={{ background: 'rgba(244,184,42,0.08)', border: '1px solid rgba(244,184,42,0.35)' }}
        >
          <div className="flex justify-between items-center">
            <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>🎰 Lottery Ticket</span>
            <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>$10</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--warn-ink)' }}>5% jackpot: +50 😊 · otherwise −2 😊</div>
        </button>

        <button
          onClick={() => actions.buyItem({ ...concertTicket, cost: concertPrice })}
          disabled={player.money < concertPrice}
          className="w-full p-3 rounded-xl disabled:opacity-50 text-[13px] transition active:scale-[0.99] text-left"
          style={{ background: 'rgba(124,92,255,0.06)', border: '1px solid rgba(124,92,255,0.3)' }}
        >
          <div className="flex justify-between items-center">
            <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>🎸 Concert Ticket</span>
            <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>${concertPrice}</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#5b3df5' }}>
            +{concertTicket.happinessBoost} Happiness · +{concertTicket.relaxationBoost} Relaxation
            {(player.relaxation ?? 50) <= 30 && (
              <span className="ml-1 font-bold" style={{ color: 'var(--debt-ink)' }}>← you need this!</span>
            )}
          </div>
        </button>

        <div
          className="mt-3 rounded-xl p-3 text-[11px]"
          style={{ background: 'var(--ink)', color: '#fff' }}
        >
          <div className="font-display font-bold mb-1" style={{ opacity: 0.9 }}>💡 Black's Market tips</div>
          <ul className="space-y-0.5 list-disc list-inside" style={{ opacity: 0.7 }}>
            <li>Sell during Boom economy for best prices</li>
            <li>Concerts instantly boost mood & relaxation</li>
            <li>Lottery: 5% odds — not a retirement plan</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BlacksMarketContent;
