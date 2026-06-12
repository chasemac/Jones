import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { forecastHunger } from '../../engine/weekEndModel';
import { CAREER_PERKS, gigEarnings } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import itemsData from '../../data/items.json';
import { SectionTitle } from './_shared';

const QuickEatsContent = ({ state, actions }) => {
  const { player, economy } = state;
  const perk = CAREER_PERKS.quick_eats;
  const hasPhone = player.inventory.some(i => i.id === 'smartphone');
  const weeklyMeals = itemsData.filter(i => i.type === 'weekly_meal');
  const storedMeal = player.inventory.find(i => i.type === 'weekly_meal');
  const hungerEmoji = player.hunger >= 80 ? '🤤' : player.hunger >= 60 ? '😮' : player.hunger >= 40 ? '🍽️' : '😋';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="sm:col-span-2">
        <JobsHereCard locationId="quick_eats" player={player} actions={actions} />
      </div>

      {player.job?.location === 'quick_eats' && (
        <div
          className="sm:col-span-2 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2"
          style={{
            background: 'rgba(255,107,74,0.1)',
            border: '1px solid rgba(255,107,74,0.3)',
            color: 'var(--brand-ink)',
          }}
        >
          <span>{perk.icon}</span>
          <span className="font-bold">{perk.label}:</span>
          <span>{perk.desc}</span>
        </div>
      )}

      {/* Hunger status */}
      <div className="sm:col-span-2">
        <div
          className="flex items-center gap-2 p-2 rounded-xl"
          style={{
            background: player.hunger >= 60 ? 'rgba(228,65,58,0.06)' : 'var(--surface-2)',
            border: `1px solid ${player.hunger >= 60 ? 'rgba(228,65,58,0.25)' : 'var(--border)'}`,
          }}
        >
          <span className={`text-lg ${player.hunger >= 80 ? 'animate-bounce' : ''}`}>{hungerEmoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-semibold mb-0.5">
              <span style={{ color: 'var(--muted)' }}>Hunger</span>
              <span
                style={{
                  color:
                    player.hunger >= 80 ? 'var(--debt-ink)' :
                    player.hunger >= 60 ? 'var(--warn-ink)' :
                    'var(--money-ink)',
                }}
                className={player.hunger >= 80 ? 'animate-pulse' : ''}
              >
                {player.hunger >= 80 ? '⚠️ STARVING — −20h if unfed' : player.hunger >= 60 ? '⚠️ Hungry — −10h if unfed' : 'Good'}
              </span>
            </div>
            <div className="ds-meter-bar" style={{ height: 7 }}>
              <span className="ds-fill-hunger" style={{ width: `${player.hunger}%` }} />
            </div>
          </div>
          <span className="text-[10px] font-num font-bold" style={{ color: 'var(--muted)' }}>{player.hunger}/100</span>
        </div>

        {/* Next-week projection */}
        {!storedMeal && (
          <div className="mt-2 text-[10px] grid grid-cols-2 gap-1.5">
            {(() => {
              const hungerInc = forecastHunger(player) - (player.hunger ?? 0);
              const withMeal = Math.max(0, Math.min(100, player.hunger + hungerInc - 55));
              const withoutFood = Math.min(100, player.hunger + hungerInc);
              return (
                <>
                  <div
                    className="p-1.5 rounded-lg"
                    style={{
                      background: withMeal <= 30 ? 'rgba(16,168,118,0.08)' : 'rgba(244,184,42,0.1)',
                      border: `1px solid ${withMeal <= 30 ? 'rgba(16,168,118,0.3)' : 'rgba(244,184,42,0.3)'}`,
                      color: withMeal <= 30 ? 'var(--money-ink)' : 'var(--warn-ink)',
                    }}
                  >
                    <div className="font-display font-bold">With meal plan</div>
                    <div>{withMeal} hunger next wk</div>
                  </div>
                  <div
                    className="p-1.5 rounded-lg"
                    style={{
                      background: withoutFood >= 80 ? 'rgba(228,65,58,0.08)' : 'var(--surface-2)',
                      border: `1px solid ${withoutFood >= 80 ? 'rgba(228,65,58,0.3)' : 'var(--border)'}`,
                      color: withoutFood >= 80 ? 'var(--debt-ink)' : 'var(--ink-2)',
                    }}
                  >
                    <div className="font-display font-bold">Without food</div>
                    <div>{withoutFood} → {withoutFood >= 80 ? '−20h penalty' : withoutFood >= 50 ? '−10h penalty' : 'OK'}</div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>🍔 Weekly meal plans</SectionTitle>
        {storedMeal ? (
          <div
            className="p-2.5 rounded-xl text-[12px] mb-2 flex items-center gap-2"
            style={{
              background: 'rgba(16,168,118,0.08)',
              border: '1px solid rgba(16,168,118,0.35)',
              color: 'var(--money-ink)',
            }}
          >
            <span className="text-lg">✅</span>
            <div>
              <div className="font-display font-bold">{storedMeal.name} ready!</div>
              <div>You're covered for this week.</div>
            </div>
          </div>
        ) : (
          <div
            className="p-2 rounded-lg text-[12px] mb-2"
            style={{
              background: player.hunger > 50 ? 'rgba(228,65,58,0.08)' : 'rgba(244,184,42,0.12)',
              border: `1px solid ${player.hunger > 50 ? 'rgba(228,65,58,0.3)' : 'rgba(244,184,42,0.4)'}`,
              color: player.hunger > 50 ? 'var(--debt-ink)' : 'var(--warn-ink)',
            }}
          >
            ⚠️ <strong>No food for this week</strong> — buy a plan below to avoid the hunger penalty.
          </div>
        )}
        <p className="text-[10px] mb-2" style={{ color: 'var(--muted)' }}>
          Auto-eaten at week's end. No fridge needed. Reduces hunger by 55.
        </p>
        {weeklyMeals.map(item => {
          const price = adjustedPrice(item.cost, economy);
          const owned = !!storedMeal;
          const canAfford = player.money >= price;
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              disabled={owned || !canAfford}
              className="w-full text-left p-2.5 rounded-xl mb-1.5 text-[13px] transition active:scale-[0.99]"
              style={{
                background: owned ? 'rgba(16,168,118,0.06)' : 'var(--surface)',
                border: `1px solid ${owned ? 'rgba(16,168,118,0.3)' : 'var(--border)'}`,
                boxShadow: owned || !canAfford ? 'none' : 'var(--sh-1)',
                opacity: owned ? 0.6 : !canAfford ? 0.5 : 1,
                minHeight: 44,
              }}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>🍔 {item.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{item.effect}</div>
                  {!owned && (
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--money-ink)' }}>
                      → {Math.max(0, player.hunger - (item.weeklyHungerRestore ?? 55))} hunger after eating
                    </div>
                  )}
                </div>
                <span className="font-num font-bold text-[14px] shrink-0 ml-2" style={{ color: 'var(--ink)' }}>
                  ${price}<span className="text-[10px] font-normal" style={{ color: 'var(--muted-2)' }}>/wk</span>
                </span>
              </div>
            </button>
          );
        })}
        <div className="mt-1 text-[10px] italic" style={{ color: 'var(--muted-2)' }}>
          💡 Fresh Mart groceries save money — needs a fridge from MegaMart
        </div>
      </div>

      <div className="space-y-3">
        {player.job?.location === 'quick_eats' && (
          <div>
            <SectionTitle right={<EconomyWageBadge economy={economy} />}>💼 Your shift</SectionTitle>
            <WorkShiftPanel
              player={player}
              economy={economy}
              actions={actions}
              partClass=""
              fullClass=""
              partLabel="⏱ Part-time · 4h"
              fullLabel="🍔 Full shift · 8h"
              overtimeSubtitle="−10 happiness · great for fast cash"
            />
          </div>
        )}

        <div>
          <SectionTitle>🚗 Gig work · 4h</SectionTitle>
          {hasPhone ? (
            <button
              onClick={actions.gigWork}
              disabled={player.timeRemaining < 4}
              className="w-full p-3 rounded-xl disabled:opacity-50 text-[13px] transition active:scale-[0.99] text-left"
              style={{
                background: 'rgba(16,168,118,0.06)',
                border: '1px solid rgba(16,168,118,0.35)',
                boxShadow: 'var(--sh-1)',
              }}
            >
              <div className="flex justify-between items-center">
                <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>🚗 Delivery run · 4h</div>
                <div className="font-num font-bold" style={{ color: 'var(--money-ink)' }}>
                  +${gigEarnings(state.economy)}
                </div>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--money-ink)' }}>Economy: {state.economy} · flexible hours</div>
            </button>
          ) : (
            <div
              className="text-[12px] p-3 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="font-display font-bold mb-1" style={{ color: 'var(--ink-2)' }}>🚗 Gig delivery · locked</div>
              <div className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>Earn extra cash between jobs — any time, any week.</div>
              <div
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}
              >
                <span>📱</span>
                <span className="text-[10px] font-bold" style={{ color: '#1d4ed8' }}>Buy a Smartphone at Tech Store to unlock</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickEatsContent;
