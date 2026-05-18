import React from 'react';
import { calculateDeposit } from '../../engine/constants';
import housingData from '../../data/housing.json';

const LeasingOfficeContent = ({ state, actions, onMoveIn }) => {
  const { player } = state;
  const isFirstVisit = state.week === 1 && !player.hasChosenHousing;
  const [selectedHousing, setSelectedHousing] = React.useState(null);

  return (
    <div className="space-y-3">
      {/* Focused header — no tutorial, just the single thing this panel does. */}
      <div>
        <div className="ds-eyebrow">
          {isFirstVisit ? 'Step 1 · Pick where you live' : 'Change your lease'}
        </div>
        <p className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
          {isFirstVisit
            ? 'Rent comes out of your cash every week. Cheap = more room in the budget. Nicer = happiness and equity.'
            : 'Move costs a security deposit (refunded against your old place).'}
        </p>
      </div>

      {/* Selected housing — confirmation card. */}
      {selectedHousing && (() => {
        const h = selectedHousing;
        const deposit = calculateDeposit(h.rent, player.housing?.rent ?? 0);
        const tierEmoji = h.homeType === 'luxury_condo' ? '🌇' : h.homeType === 'apartment' ? '🏘️' : '🏠';
        return (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(124,92,255,0.06)',
              border: '1px solid rgba(124,92,255,0.35)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{tierEmoji}</span>
              <div>
                <div className="font-display font-bold text-base" style={{ color: 'var(--ink)' }}>{h.title}</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{h.description}</div>
              </div>
            </div>
            <div className="space-y-1 text-[12px] mb-3" style={{ color: 'var(--ink-2)' }}>
              <div className="flex justify-between">
                <span>Weekly rent</span>
                <span className="font-num font-bold">{h.rent === 0 ? 'Free' : `$${h.rent}/wk`}</span>
              </div>
              {deposit > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--debt-ink)' }}>
                  <span>Security deposit</span>
                  <span className="font-num font-bold">−${deposit}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Happiness effect</span>
                <span className="font-num font-bold">
                  {h.happiness > 0 ? `+${h.happiness}/wk` : h.happiness < 0 ? `${h.happiness}/wk` : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Security</span>
                <span className="font-bold">{h.security}</span>
              </div>
              {(h.equityPerWeek || 0) > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--money-ink)' }}>
                  <span>Equity built</span>
                  <span className="font-num font-bold">+${h.equityPerWeek}/wk</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { actions.rentApartment(h); setSelectedHousing(null); onMoveIn?.(); }}
                className="ds-btn ds-btn-primary flex-1"
                style={{ minHeight: 44 }}
              >
                {isFirstVisit ? 'Move in' : 'Sign lease'} {deposit > 0 ? `(−$${deposit})` : ''}
              </button>
              <button onClick={() => setSelectedHousing(null)} className="ds-btn" style={{ minHeight: 44 }}>
                Back
              </button>
            </div>
          </div>
        );
      })()}

      {/* Housing options list. */}
      <div className="space-y-2">
        {housingData.map((h) => {
          const deposit = calculateDeposit(h.rent, player.housing?.rent ?? 0);
          const isCurrent = player.housing?.id === h.id;
          const canAfford = deposit === 0 || player.money >= deposit;
          const tierEmoji = h.homeType === 'luxury_condo' ? '🌇' : h.homeType === 'apartment' ? '🏘️' : '🏠';
          const securityColor =
            h.security === 'High' ? 'var(--money-ink)' :
            h.security === 'Medium' ? '#8A6510' :
            'var(--debt-ink)';
          const isSelected = selectedHousing?.id === h.id;

          let bg = 'var(--surface)';
          let border = 'var(--border)';
          if (isCurrent) { bg = '#F5F0FF'; border = 'var(--accent)'; }
          else if (isSelected) { bg = '#F5F0FF'; border = 'var(--accent)'; }
          else if (!canAfford) { bg = 'var(--surface-2)'; }

          return (
            <button
              key={h.id}
              onClick={() => !isCurrent && canAfford && setSelectedHousing(h)}
              disabled={isCurrent || !canAfford}
              className="w-full p-3 rounded-xl text-sm transition-all active:scale-[0.99] text-left"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                boxShadow: !isCurrent && canAfford ? 'var(--sh-1)' : 'none',
                opacity: !isCurrent && !canAfford ? 0.55 : 1,
                cursor: isCurrent ? 'default' : !canAfford ? 'not-allowed' : 'pointer',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{tierEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--ink)' }}>
                    {h.title}
                    {isCurrent && <span className="ds-pill ds-pill-accent" style={{ padding: '1px 6px', fontSize: 9 }}>Current</span>}
                    {h.happiness > 0 && (
                      <span className="ds-pill ds-pill-warn" style={{ padding: '1px 6px', fontSize: 9 }}>+{h.happiness} 😊/wk</span>
                    )}
                    {(h.equityPerWeek || 0) > 0 && (
                      <span className="ds-pill ds-pill-money" style={{ padding: '1px 6px', fontSize: 9 }}>+${h.equityPerWeek} 🏠/wk</span>
                    )}
                    {!isCurrent && (() => {
                      const currentHappy = player.housing?.happiness ?? 0;
                      const delta = h.happiness - currentHappy;
                      if (delta === 0) return null;
                      const cls = delta > 0 ? 'ds-pill ds-pill-money' : 'ds-pill ds-pill-debt';
                      return <span className={cls} style={{ padding: '1px 6px', fontSize: 9 }}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)} vs now</span>;
                    })()}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{h.description}</div>
                  {h.id === 'moms_basement' && (
                    <div className="text-[10px] mt-0.5 font-semibold" style={{ color: 'var(--debt-ink)' }}>
                      ⚠️ Happiness penalty grows each week
                    </div>
                  )}
                  {deposit > 0 && !isCurrent && (
                    <div className="text-[10px] mt-0.5 font-semibold" style={{ color: canAfford ? '#8A6510' : 'var(--debt-ink)' }}>
                      {canAfford ? `Deposit: $${deposit}` : `Need $${(deposit - player.money).toFixed(0)} more for deposit`}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-num font-bold text-[14px]" style={{ color: 'var(--ink)' }}>
                    {h.rent === 0 ? 'Free' : `$${h.rent}/wk`}
                  </div>
                  {h.rent > 0 && (
                    <div className="text-[9px] font-num" style={{ color: 'var(--muted-2)' }}>${h.rent * 4}/mo</div>
                  )}
                  <div className="text-[10px] font-semibold" style={{ color: securityColor }}>
                    {h.security} security
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Post-move-in hint, only after first selection. Small, supportive, not loud. */}
      {player.hasChosenHousing && (
        <div
          className="mt-3 rounded-xl p-3 text-[12px]"
          style={{
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.25)',
            color: 'var(--ink-2)',
          }}
        >
          <div className="font-display font-bold mb-1" style={{ color: 'var(--ink)' }}>What's next</div>
          <ul className="space-y-0.5 list-disc list-inside" style={{ color: 'var(--ink-2)' }}>
            {!player.job && <li>Visit <strong>Library</strong> to browse jobs and apply</li>}
            {!player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage' || i.type === 'weekly_coffee') && (
              <li>Visit <strong>Quick Eats</strong> for a weekly meal plan</li>
            )}
            <li>Work shifts at your job to earn money</li>
            <li><strong>City College</strong> offers courses to advance your career</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default LeasingOfficeContent;
