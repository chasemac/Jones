import React from 'react';
import { effectiveWage } from '../../engine/economyModel';
import { getJobLocation } from '../../engine/jobModel';
import { homeEmoji } from '../../engine/boardModel';
import { DIFFICULTY_PRESETS, calculateNetWorth, meetsEducation, getCareerPerk, CAREER_PERKS } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import { SectionTitle } from './_shared';

const HomeContent = ({ state, actions }) => {
  const { player } = state;
  const relax = player.relaxation ?? 50;
  const isLowRelax = relax <= 20;
  const homeType = player.housing?.homeType;
  const emoji = homeEmoji(player.housing);
  const homeName = homeType === 'luxury_condo' ? 'Luxury Condo' : homeType === 'apartment' ? 'Your Apartment' : "Mom's House";
  const jobLocation = getJobLocation(player.job);
  const isWFH = jobLocation === 'home';
  const requiresLaptopForHomeWork = isWFH && player.job?.requirements?.item === 'laptop';
  const hasLaptop = player.inventory.some(i => i.id === 'laptop');
  const hasHotTub = player.inventory.some(i => i.id === 'hot_tub');
  const careerPerk = getCareerPerk(player);
  const savingsRate = player.job?.location === 'neobank' ? (CAREER_PERKS.neobank.savingsRate || 0.015) : 0.015;

  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const allGoalsMet =
    netWorth >= goals.wealth && player.happiness >= goals.happiness &&
    meetsEducation(player.education, goals.education) && player.dependability >= goals.careerDependability;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2">
        <JobsHereCard locationId="home" player={player} actions={actions} />
      </div>

      <div className="space-y-3">
        {allGoalsMet && (
          <div
            className="font-display font-bold text-[13px] p-3 rounded-xl text-center animate-pulse"
            style={{
              background: 'linear-gradient(135deg, var(--warn), #FF6B4A)',
              color: 'var(--ink)',
              boxShadow: 'var(--sh-2)',
            }}
          >
            🏆 All goals met — sleep to win!
          </div>
        )}

        {/* The big end-week CTA */}
        <button
          onClick={() => { actions.endWeek(); }}
          className="w-full ds-btn ds-btn-primary font-display flex flex-col items-center justify-center gap-0.5"
          style={{ minHeight: 56, padding: '12px 16px', fontSize: 15 }}
        >
          <div className="flex items-center gap-2">
            😴 Sleep — end week
            <span className="text-[12px] font-normal" style={{ opacity: 0.8 }}>({player.timeRemaining}h left)</span>
          </div>
          <div className="text-[10px] font-normal" style={{ opacity: 0.85 }}>
            {(() => {
              const hasFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage' || i.type === 'weekly_coffee');
              const nextHunger = Math.min(100, (player.hunger ?? 0) + (player.housing?.homeType === 'luxury_condo' ? 20 : 25));
              if (!hasFood && nextHunger >= 80) return '⚠️ Starving next week — −20h penalty!';
              if (!hasFood && nextHunger >= 50) return `⚠️ No food — hunger hits ${nextHunger}, −10h penalty`;
              if (!hasFood && player.hunger >= 25) return `⚠️ No food bought — hunger will rise to ${nextHunger}`;
              return 'Rent, interest, hunger & happiness resolve at week end';
            })()}
          </div>
        </button>

        {/* Housing identity card */}
        <div
          className="rounded-xl p-3"
          style={{
            background:
              homeType === 'luxury_condo' ? 'rgba(244,184,42,0.1)' :
              homeType === 'apartment' ? 'rgba(59,130,246,0.06)' :
              'var(--surface-2)',
            border: `1px solid ${
              homeType === 'luxury_condo' ? 'rgba(244,184,42,0.35)' :
              homeType === 'apartment' ? 'rgba(59,130,246,0.25)' :
              'var(--border)'
            }`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>{homeName}</div>
              <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{player.housing?.title} · ${player.housing?.rent ?? 0}/wk</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--muted)' }}>
            <span>🔒 {player.housing?.security ?? 'High'} security</span>
            {hasHotTub && <span>🛁 Hot tub</span>}
            {player.job && (
              <span className="font-bold font-num" style={{ color: 'var(--money-ink)' }}>
                💰 ~${Math.floor(effectiveWage(player.job.wage, state.economy) * 8)}/shift
              </span>
            )}
            {(player.housing?.equityPerWeek || 0) > 0 && (
              <span className="font-bold font-num" style={{ color: 'var(--money-ink)' }}>🏠 +${player.housing.equityPerWeek}/wk equity</span>
            )}
            {(player.housingEquity || 0) > 0 && (
              <span className="font-bold font-num" style={{ color: 'var(--money-ink)' }}>📈 ${player.housingEquity} equity</span>
            )}
          </div>
        </div>

        {careerPerk && (
          <div
            className="rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-1.5"
            style={{
              background: 'rgba(16,168,118,0.08)',
              border: '1px solid rgba(16,168,118,0.3)',
              color: 'var(--money-ink)',
            }}
          >
            <span>{careerPerk.icon}</span>
            <span className="font-bold">{careerPerk.label}</span>
            <span>— {careerPerk.desc}</span>
          </div>
        )}

        {/* Week-at-a-glance + forecast */}
        <div
          className="rounded-xl p-2.5 text-[11px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
        >
          <div className="font-display font-bold mb-1.5 text-[12px]" style={{ color: 'var(--ink)' }}>📊 This week at a glance</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-num" style={{ color: 'var(--ink-2)' }}>
            <span style={{ color: 'var(--muted)' }}>💰 Cash</span>
            <span className="font-bold" style={{ color: player.money >= 0 ? 'var(--money-ink)' : 'var(--debt-ink)' }}>
              ${Math.round(player.money).toLocaleString()}
            </span>
            <span style={{ color: 'var(--muted)' }}>💾 Saved</span>
            <span className="font-bold" style={{ color: '#1d4ed8' }}>${Math.round(player.savings).toLocaleString()}</span>
            {(player.housingEquity || 0) > 0 && (
              <>
                <span style={{ color: 'var(--muted)' }}>🏠 Equity</span>
                <span className="font-bold" style={{ color: 'var(--money-ink)' }}>${Math.round(player.housingEquity).toLocaleString()}</span>
              </>
            )}
            {player.debt > 0 && (
              <>
                <span style={{ color: 'var(--muted)' }}>⚠️ Debt</span>
                <span className="font-bold" style={{ color: 'var(--debt-ink)' }}>−${Math.round(player.debt).toLocaleString()}</span>
              </>
            )}
            <span style={{ color: 'var(--muted)' }}>⏱ Time left</span>
            <span className={`font-bold ${player.timeRemaining <= 8 ? 'animate-pulse' : ''}`} style={{ color: player.timeRemaining <= 8 ? 'var(--debt-ink)' : 'var(--ink)' }}>
              {player.timeRemaining}h
            </span>
            <span style={{ color: 'var(--muted)' }}>🍕 Hunger</span>
            {(() => {
              const hunger = player.hunger ?? 0;
              const hungerInc = player.housing?.homeType === 'luxury_condo' ? 20 : 25;
              const meal = player.inventory.find(i => i.type === 'weekly_meal');
              const coffee = player.inventory.find(i => i.type === 'weekly_coffee');
              const hasFridge = player.inventory.some(i => i.id === 'refrigerator' || i.id === 'freezer');
              const hasGroceries = player.inventory.some(i => i.id === 'groceries');
              const groceryRestore = hasFridge && hasGroceries ? 60 : 0;
              const restore = (meal?.weeklyHungerRestore ?? 0) + (coffee?.weeklyHungerRestore ?? 0) + groceryRestore;
              const nextHunger = Math.max(0, Math.min(100, hunger + hungerInc - restore));
              const hasFood = restore > 0;
              const color = nextHunger >= 80 ? 'var(--debt-ink)' : nextHunger >= 60 ? 'var(--warn-ink)' : 'var(--money-ink)';
              return (
                <span className={`font-bold ${nextHunger >= 80 ? 'animate-pulse' : ''}`} style={{ color }}>
                  {hunger} → {nextHunger} next wk{hasFood ? ' ✅' : nextHunger >= 55 ? ' ⚠️' : ''}
                </span>
              );
            })()}
          </div>
          {(() => {
            const rent = player.housing?.rent ?? 0;
            const weeklyFees = player.inventory.reduce((sum, i) => sum + (i.weeklyFee || 0), 0);
            const debtInterest = player.debt > 0 ? Math.floor(player.debt * 0.05) : 0;
            const savingsInterest = player.savings > 0 ? Math.floor(player.savings * savingsRate) : 0;
            const totalOut = rent + weeklyFees + debtInterest;
            const totalIn = savingsInterest;
            return (
              <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="font-display font-bold mb-0.5" style={{ color: 'var(--muted)' }}>💸 End-of-week forecast</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-num">
                  <span style={{ color: 'var(--muted)' }}>🏠 Rent</span>
                  <span style={{ color: 'var(--debt-ink)' }}>−${rent}</span>
                  {weeklyFees > 0 && (<><span style={{ color: 'var(--muted)' }}>📋 Subs</span><span style={{ color: 'var(--debt-ink)' }}>−${weeklyFees}</span></>)}
                  {debtInterest > 0 && (<><span style={{ color: 'var(--muted)' }}>💳 Interest</span><span style={{ color: 'var(--debt-ink)' }}>−${debtInterest}</span></>)}
                  {savingsInterest > 0 && (<><span style={{ color: 'var(--muted)' }}>💾 Interest</span><span style={{ color: 'var(--money-ink)' }}>+${savingsInterest}</span></>)}
                  <span className="font-bold" style={{ color: 'var(--muted)' }}>Net</span>
                  <span className="font-bold" style={{ color: totalIn - totalOut >= 0 ? 'var(--money-ink)' : 'var(--debt-ink)' }}>
                    {totalIn - totalOut >= 0 ? '+' : ''}${totalIn - totalOut}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        <div>
          <div className="ds-eyebrow mb-1.5">Relax at home</div>
          <div className="flex gap-2">
            {[2, 4].map(hrs => (
              <button
                key={hrs}
                onClick={() => actions.rest(hrs)}
                disabled={player.timeRemaining < hrs}
                className="flex-1 py-2 rounded-xl text-[12px] font-display font-bold transition active:scale-[0.99] disabled:opacity-40"
                style={{
                  background: isLowRelax ? 'rgba(228,65,58,0.08)' : 'rgba(16,168,118,0.06)',
                  border: `1px solid ${isLowRelax ? 'rgba(228,65,58,0.3)' : 'rgba(16,168,118,0.3)'}`,
                  color: isLowRelax ? 'var(--debt-ink)' : 'var(--money-ink)',
                  minHeight: 44,
                }}
              >
                <div className="text-lg">🛁</div>
                <div>Rest {hrs}h</div>
                <div className="text-[10px] font-normal" style={{ opacity: 0.75 }}>+{hrs * 5} relax</div>
              </button>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-center" style={{ color: 'var(--muted)' }}>
            Relaxation: {relax}/100 {isLowRelax ? '⚠️ Burnout risk!' : ''}
            <span className="ml-1" style={{ opacity: 0.6 }}>(−5/wk baseline)</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle right={player.job && <EconomyWageBadge economy={state.economy} />}>💻 Work from home</SectionTitle>

        {isWFH && (!requiresLaptopForHomeWork || hasLaptop) && (
          <WorkShiftPanel
            player={player}
            economy={state.economy}
            actions={actions}
            partClass=""
            fullClass=""
            fullLabel="🖥️ Full · 8h"
            overtimeSubtitle="−10 happiness · WFH — no commute"
          />
        )}

        {isWFH && requiresLaptopForHomeWork && !hasLaptop && (
          <div className="text-[12px] p-3 rounded-xl italic" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            Need a 💻 Laptop to work remotely from home.
          </div>
        )}

        {!isWFH && (
          <div className="text-[12px] p-3 rounded-xl italic" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            {player.job ? `${player.job.title}s report in-person — head to your work location.` : 'Get a remote job to work from home.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeContent;
