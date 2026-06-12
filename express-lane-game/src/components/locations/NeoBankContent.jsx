import React from 'react';
import { adjustedPrice, calcShiftEarnings } from '../../engine/economyModel';
import { MAX_DEBT, DEBT_INTEREST_RATE } from '../../engine/constants';
import { getNextPromotion } from '../../engine/jobModel';
import { DIFFICULTY_PRESETS, calculateNetWorth, CAREER_PERKS, BASE_SAVINGS_RATE } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';
import itemsData from '../../data/items.json';
import stocksData from '../../data/stocks.json';
import { SectionTitle } from './_shared';

const AmountBtn = ({ amt, onClick, disabled, tone = 'neutral' }) => {
  const palette = tone === 'money'
    ? { bg: 'var(--surface)', border: 'rgba(16,168,118,0.3)', color: 'var(--money-ink)' }
    : tone === 'debt'
      ? { bg: 'var(--surface)', border: 'rgba(228,65,58,0.3)', color: 'var(--debt-ink)' }
      : { bg: 'var(--surface)', border: 'rgba(99,102,241,0.3)', color: '#1d4ed8' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md py-1 text-[11px] font-display font-bold disabled:opacity-40 transition"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color, minHeight: 36 }}
    >
      ${amt}
    </button>
  );
};

const NeoBankContent = ({ state, actions }) => {
  const { player } = state;
  const perk = CAREER_PERKS.neobank;
  const [customRepay, setCustomRepay] = React.useState('');
  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const wealthPct = Math.min(100, Math.max(0, (netWorth / goals.wealth) * 100));
  const AMOUNTS = [50, 100, 250, 500];
  const isBankEmployee = player.job?.location === 'neobank';
  const savingsRate = isBankEmployee ? perk.savingsRate : BASE_SAVINGS_RATE;
  const ratePct = (savingsRate * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2">
        <JobsHereCard locationId="neobank" player={player} actions={actions} />
      </div>

      {isBankEmployee && (
        <div
          className="sm:col-span-2 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#1d4ed8',
          }}
        >
          <span>{perk.icon}</span>
          <span className="font-bold">{perk.label}:</span>
          <span>{perk.desc}</span>
        </div>
      )}

      {/* LEFT: Banking */}
      <div className="space-y-3">
        <SectionTitle>Banking</SectionTitle>

        {/* Wealth goal progress */}
        <div
          className="rounded-lg p-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
        >
          <div className="flex justify-between text-[10px] mb-0.5">
            <span style={{ color: 'var(--muted)' }}>🎯 Wealth goal</span>
            <span className="font-num font-bold" style={{ color: netWorth >= goals.wealth ? 'var(--money-ink)' : 'var(--ink)' }}>
              ${Math.max(0, netWorth).toLocaleString()} / ${goals.wealth.toLocaleString()}
            </span>
          </div>
          <div className="ds-meter-bar" style={{ height: 7 }}>
            <span style={{ width: `${wealthPct}%`, background: netWorth >= goals.wealth ? 'var(--money)' : 'var(--info)' }} />
          </div>
        </div>

        {/* Savings card */}
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <div className="text-[12px] font-display font-bold mb-1" style={{ color: '#1d4ed8' }}>
            Savings · {ratePct}%/wk
            {isBankEmployee && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--money-ink)' }}>Insider rate!</span>}
          </div>
          <div className="text-2xl font-num font-bold" style={{ color: 'var(--ink)' }}>${player.savings.toLocaleString()}</div>
          {player.savings > 0 ? (
            <div className="mb-2">
              <div className="text-[10px] font-semibold" style={{ color: 'var(--money-ink)' }}>
                +${Math.round(player.savings * savingsRate).toLocaleString()} next week
              </div>
              <div className="text-[10px]" style={{ color: 'var(--muted-2)' }}>
                ≈ ${Math.round(player.savings * Math.pow(1 + savingsRate, 52) - player.savings).toLocaleString()} interest in 52 wks
              </div>
            </div>
          ) : (
            <div className="text-[10px] mb-2 italic" style={{ color: 'var(--muted)' }}>
              Deposit to earn {ratePct}%/wk — Jones banks his surplus every week.
            </div>
          )}

          <div className="ds-eyebrow mb-1">Deposit</div>
          <div className="grid grid-cols-4 gap-1 mb-1">
            {AMOUNTS.map(amt => (
              <AmountBtn key={amt} amt={amt} onClick={() => actions.bankTransaction('deposit', amt)} disabled={player.money < amt} tone="info" />
            ))}
          </div>
          {player.money > 0 && (
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => actions.bankTransaction('deposit', Math.floor(player.money / 2))}
                disabled={player.money < 2}
                className="flex-1 ds-btn"
                style={{ minHeight: 36, padding: '6px 10px', fontSize: 11 }}
              >
                50% (${Math.floor(player.money / 2).toLocaleString()})
              </button>
              <button
                onClick={() => actions.bankTransaction('deposit', Math.floor(player.money))}
                className="flex-1 ds-btn ds-btn-dark"
                style={{ minHeight: 36, padding: '6px 10px', fontSize: 11 }}
              >
                💰 All (${Math.floor(player.money).toLocaleString()})
              </button>
            </div>
          )}

          <div className="ds-eyebrow mb-1">Withdraw</div>
          <div className="grid grid-cols-4 gap-1 mb-1">
            {AMOUNTS.map(amt => (
              <AmountBtn key={amt} amt={amt} onClick={() => actions.bankTransaction('withdraw', amt)} disabled={player.savings < amt} tone="info" />
            ))}
          </div>
          {player.savings > 0 && (
            <button
              onClick={() => actions.bankTransaction('withdraw', Math.floor(player.savings))}
              className="w-full ds-btn"
              style={{ minHeight: 36, padding: '6px 10px', fontSize: 11 }}
            >
              Withdraw all (${Math.floor(player.savings).toLocaleString()})
            </button>
          )}
        </div>

        {/* Debt card */}
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(228,65,58,0.05)', border: '1px solid rgba(228,65,58,0.25)' }}
        >
          <div className="text-[12px] font-display font-bold mb-1" style={{ color: 'var(--debt-ink)' }}>Debt · 5%/wk interest</div>
          <div className="text-2xl font-num font-bold mb-2" style={{ color: player.debt > 0 ? 'var(--debt-ink)' : 'var(--muted-2)' }}>
            ${player.debt.toLocaleString()}
          </div>

          {player.debt > 0 && (
            <>
              <div className="ds-eyebrow mb-1">Repay</div>
              <div className="grid grid-cols-4 gap-1 mb-1">
                {AMOUNTS.map(amt => (
                  <AmountBtn key={amt} amt={amt} onClick={() => actions.bankTransaction('repay', amt)} disabled={player.money < amt} tone="debt" />
                ))}
              </div>
              <button
                onClick={() => actions.bankTransaction('repay', player.debt)}
                disabled={player.money < player.debt}
                className="w-full ds-btn"
                style={{
                  minHeight: 36, padding: '6px 10px', fontSize: 11,
                  background: 'var(--debt)', borderColor: 'var(--debt)', color: '#fff',
                }}
              >
                Repay all (${player.debt.toLocaleString()})
              </button>
              <div className="flex gap-1 mt-1">
                <input
                  type="number" min="1" max={Math.min(player.money, player.debt)}
                  value={customRepay} onChange={e => setCustomRepay(e.target.value)}
                  placeholder="Custom $"
                  className="flex-1 rounded-md px-2 py-1 text-[11px] font-num focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
                <button
                  onClick={() => {
                    const parsed = parseInt(customRepay, 10);
                    if (!isNaN(parsed) && parsed > 0 && parsed <= Math.min(player.money, player.debt)) {
                      actions.bankTransaction('repay', parsed);
                      setCustomRepay('');
                    }
                  }}
                  disabled={(() => { const p = parseInt(customRepay, 10); return isNaN(p) || p <= 0 || p > Math.min(player.money, player.debt); })()}
                  className="ds-btn"
                  style={{
                    minHeight: 36, padding: '6px 10px', fontSize: 11,
                    background: 'var(--debt)', borderColor: 'var(--debt)', color: '#fff',
                  }}
                >
                  Pay
                </button>
              </div>
            </>
          )}

          <div className="ds-eyebrow mt-2 mb-1">Borrow</div>
          <div className="grid grid-cols-4 gap-1">
            {AMOUNTS.map(amt => (
              <AmountBtn key={amt} amt={amt} onClick={() => actions.bankTransaction('borrow', amt)} disabled={player.debt + amt > MAX_DEBT} tone="debt" />
            ))}
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--debt-ink)' }}>⚠️ Max ${MAX_DEBT.toLocaleString()} debt · {DEBT_INTEREST_RATE * 100}%/wk interest</div>
          {player.debt > 0 && (
            <div className="text-[10px] mt-0.5 font-bold space-y-0.5">
              <div style={{ color: 'var(--debt-ink)' }}>
                Costing you: ${Math.round(player.debt * DEBT_INTEREST_RATE).toLocaleString()}/wk
              </div>
              <div className="font-normal" style={{ color: 'var(--debt-ink)', opacity: 0.7 }}>
                In 10 weeks your ${player.debt.toLocaleString()} becomes ${Math.round(player.debt * Math.pow(1 + DEBT_INTEREST_RATE, 10)).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Insurance */}
        <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold text-[12px] mb-2" style={{ color: 'var(--ink-2)' }}>🛡️ Insurance</h3>
          {itemsData.filter(i => i.id === 'health_insurance').map(item => {
            const owned = player.inventory.some(i => i.id === item.id);
            const price = adjustedPrice(item.cost, state.economy);
            return (
              <button
                key={item.id}
                onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
                disabled={owned}
                className="w-full flex justify-between items-center p-2 rounded-lg text-[12px] transition active:scale-[0.99]"
                style={{
                  background: 'rgba(59,130,246,0.06)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  opacity: owned ? 0.6 : 1,
                }}
              >
                <div className="text-left">
                  <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>{item.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{item.effect}</div>
                </div>
                <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>{owned ? '✅' : `$${price}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Staff + Stocks */}
      <div>
        {isBankEmployee && (
          <div className="mb-3">
            <SectionTitle right={<EconomyWageBadge economy={state.economy} />}>🏦 Staff only</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button
                onClick={actions.partTimeWork} disabled={player.timeRemaining < 4}
                className="ds-btn flex-col gap-0"
                style={{ minHeight: 50, padding: '8px 10px' }}
              >
                <div className="font-display font-bold text-[12px]" style={{ color: 'var(--ink)' }}>⏱ Part · 4h</div>
                <div className="font-num font-bold text-[12px]" style={{ color: 'var(--money-ink)' }}>+${calcShiftEarnings(player.job.wage, 4, state.economy)}</div>
              </button>
              <button
                onClick={actions.work} disabled={player.timeRemaining < 8}
                className="ds-btn ds-btn-dark flex-col gap-0"
                style={{ minHeight: 50, padding: '8px 10px' }}
              >
                <div className="font-display font-bold text-[12px]">💼 Full · 8h</div>
                <div className="font-num font-bold text-[12px]" style={{ color: '#86efac' }}>+${calcShiftEarnings(player.job.wage, 8, state.economy)}</div>
              </button>
            </div>
            <button
              onClick={actions.workOvertime} disabled={player.timeRemaining < 12}
              className="w-full ds-btn ds-btn-warn mb-1.5"
              style={{ minHeight: 44, padding: '8px 10px' }}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-display font-bold text-[12px]">⚡ Overtime · 12h · 1.5×</span>
                <span className="font-num font-bold text-[12px]" style={{ color: 'var(--money-ink)' }}>+${calcShiftEarnings(player.job.wage * 1.5, 12, state.economy)}</span>
              </div>
            </button>
            <ExpProgressBar player={player} />
            {(() => {
              const nj = getNextPromotion(player);
              return nj ? (
                <button onClick={() => actions.applyForJob(nj, true)} className="w-full ds-btn ds-btn-money mt-1" style={{ padding: '8px 10px', fontSize: 12 }}>
                  🆙 Promote → {nj.title}
                </button>
              ) : null;
            })()}
          </div>
        )}

        <SectionTitle
          right={
            <span
              className="ds-pill font-display"
              style={{
                background: state.economy === 'Boom' ? 'rgba(16,168,118,0.12)' : state.economy === 'Depression' ? 'rgba(228,65,58,0.1)' : 'var(--surface-2)',
                color: state.economy === 'Boom' ? 'var(--money-ink)' : state.economy === 'Depression' ? 'var(--debt-ink)' : 'var(--muted)',
                borderColor: state.economy === 'Boom' ? 'rgba(16,168,118,0.3)' : state.economy === 'Depression' ? 'rgba(228,65,58,0.3)' : 'var(--border)',
                fontSize: 10,
              }}
            >
              {state.economy} · {state.economyTimer}wk{state.economyTimer <= 2 ? ' ⚡' : ''}
            </span>
          }
        >
          📈 Stocks
        </SectionTitle>

        {(() => {
          const total = stocksData.reduce((sum, stock) => {
            const owned = player.portfolio?.[stock.symbol] || 0;
            return sum + owned * (state.market[stock.symbol] || 0);
          }, 0);
          if (total === 0) return null;
          return (
            <div
              className="px-2 py-1 rounded text-[12px] mb-2 flex justify-between"
              style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.25)' }}
            >
              <span className="font-display font-bold" style={{ color: '#5b3df5' }}>Portfolio value</span>
              <span className="font-num font-bold" style={{ color: '#5b3df5' }}>${total.toLocaleString()}</span>
            </div>
          );
        })()}

        <div className="space-y-2 max-h-52 sm:max-h-72 overflow-y-auto pr-1">
          {stocksData.map(stock => {
            const currentPrice = state.market[stock.symbol];
            const owned = player.portfolio?.[stock.symbol] || 0;
            const isUp = currentPrice >= stock.basePrice;
            const pctChange = Math.round(((currentPrice - stock.basePrice) / stock.basePrice) * 100);
            const ownedValue = owned * currentPrice;
            const barPct = Math.min(150, Math.max(50, (currentPrice / stock.basePrice) * 100));
            return (
              <div
                key={stock.symbol}
                className="p-2 rounded-lg text-[12px]"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isUp ? 'rgba(16,168,118,0.3)' : 'rgba(228,65,58,0.3)'}`,
                  boxShadow: 'var(--sh-1)',
                }}
              >
                <div className="flex justify-between mb-1">
                  <div className="min-w-0">
                    <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>{stock.symbol}</span>
                    <span className="ml-1.5 text-[10px]" style={{ color: 'var(--muted-2)' }}>{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-num font-bold" style={{ color: isUp ? 'var(--money-ink)' : 'var(--debt-ink)' }}>
                      {isUp ? '▲' : '▼'}{Math.abs(pctChange)}%
                    </span>
                    <span className="font-num font-bold" style={{ color: isUp ? 'var(--money-ink)' : 'var(--debt-ink)' }}>${currentPrice}</span>
                  </div>
                </div>
                <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: 'var(--surface-2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, barPct - 50) * 2}%`,
                      minWidth: isUp ? '1px' : '0',
                      background: isUp ? 'var(--money)' : 'var(--debt)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>
                  <span>×{owned} shares</span>
                  <div className="flex items-center gap-1.5">
                    {owned > 0 && (() => {
                      // P/L vs what the player actually paid (audit M3);
                      // basePrice only as a legacy-save fallback.
                      const costBasis = player.stockCostBasis?.[stock.symbol] ?? owned * stock.basePrice;
                      const pl = ownedValue - costBasis;
                      const plPct = costBasis > 0 ? Math.round((pl / costBasis) * 100) : 0;
                      return (
                        <span
                          className="text-[10px] font-num font-bold px-1 rounded"
                          style={{
                            color: pl >= 0 ? 'var(--money-ink)' : 'var(--debt-ink)',
                            background: pl >= 0 ? 'rgba(16,168,118,0.1)' : 'rgba(228,65,58,0.08)',
                          }}
                        >
                          {pl >= 0 ? '+' : ''}{plPct}% P/L
                        </span>
                      );
                    })()}
                    <span className="font-num" style={{ color: ownedValue > 0 ? '#5b3df5' : 'var(--muted-2)', fontWeight: ownedValue > 0 ? 700 : 400 }}>
                      {ownedValue > 0 ? `$${ownedValue}` : 'none held'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: 'Buy', qty: 1 },
                    { label: '×5', qty: 5 },
                    { label: '×10', qty: 10 },
                  ].map(b => (
                    <button
                      key={b.label}
                      onClick={() => actions.buyStock(stock.symbol, b.qty)}
                      disabled={player.money < currentPrice * b.qty}
                      className="rounded font-display font-bold text-[11px] disabled:opacity-40 transition py-1.5"
                      style={{ background: 'rgba(16,168,118,0.1)', color: 'var(--money-ink)', minHeight: 36 }}
                    >
                      {b.label}
                    </button>
                  ))}
                  <button
                    onClick={() => actions.sellStock(stock.symbol, 1)} disabled={owned < 1}
                    className="rounded font-display font-bold text-[11px] disabled:opacity-40 transition py-1.5"
                    style={{ background: 'rgba(228,65,58,0.08)', color: 'var(--debt-ink)', minHeight: 36 }}
                  >
                    Sell 1
                  </button>
                  <button
                    onClick={() => actions.sellStockAll(stock.symbol)} disabled={owned < 1}
                    className="rounded font-display font-bold text-[11px] disabled:opacity-40 transition py-1.5"
                    style={{ background: 'rgba(228,65,58,0.18)', color: 'var(--debt-ink)', minHeight: 36 }}
                  >
                    All
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NeoBankContent;
