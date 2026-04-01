import React from 'react';
import { adjustedPrice, effectiveWage } from '../../engine/economyModel';
import { getNextPromotion } from '../../engine/jobModel';
import { DIFFICULTY_PRESETS, calculateNetWorth } from '../../engine/constants';
import JobsHereCard from '../ui/JobsHereCard';
import { EconomyWageBadge, ExpProgressBar } from '../ui/GameWidgets';
import itemsData from '../../data/items.json';
import stocksData from '../../data/stocks.json';

const NeoBankContent = ({ state, actions }) => {
  const { player } = state;
  const [customRepay, setCustomRepay] = React.useState('');
  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const wealthPct = Math.min(100, Math.max(0, (netWorth / goals.wealth) * 100));
  const AMOUNTS = [50, 100, 250, 500];
  const isBankEmployee = player.job?.location === 'neobank';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="neobank" player={player} actions={actions} /></div>
      <div className="space-y-3">
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1">Banking</h3>
        <div className="bg-slate-50 rounded p-2 border border-slate-200">
          <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
            <span>🎯 Wealth Goal</span>
            <span className={netWorth >= goals.wealth ? 'text-green-600 font-bold' : ''}>${Math.max(0, netWorth).toLocaleString()} / ${goals.wealth.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${netWorth >= goals.wealth ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${wealthPct}%` }} />
          </div>
        </div>
        <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
          <div className="text-xs font-bold text-indigo-700 mb-1">Savings (1.5%/wk)</div>
          <div className="text-2xl font-mono">${player.savings.toLocaleString()}</div>
          {player.savings > 0 ? (
            <div>
              <div className="text-[10px] text-green-600 font-semibold">+${Math.round(player.savings * 0.015).toLocaleString()} next week</div>
              <div className="text-[9px] text-indigo-400 mb-2">≈ ${Math.round(player.savings * Math.pow(1.015, 52) - player.savings).toLocaleString()} interest in 52 wks</div>
            </div>
          ) : (
            <div className="text-[10px] text-indigo-400 mb-2 italic">Deposit to earn 1.5%/wk — Jones banks his surplus every week!</div>
          )}
          <div className="text-[9px] text-indigo-500 mb-1 font-semibold uppercase tracking-wide">Deposit</div>
          <div className="grid grid-cols-4 gap-1 mb-1">
            {AMOUNTS.map(amt => (
              <button key={amt} onClick={() => actions.bankTransaction('deposit', amt)}
                disabled={player.money < amt}
                className="bg-white border border-indigo-200 rounded py-1 text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-40 transition min-h-[36px]">
                ${amt}
              </button>
            ))}
          </div>
          {player.money > 0 && (
            <div className="flex gap-1 mb-2">
              <button onClick={() => actions.bankTransaction('deposit', Math.floor(player.money / 2))}
                disabled={player.money < 2}
                className="flex-1 bg-indigo-400 text-white text-[10px] font-bold py-1.5 rounded hover:bg-indigo-500 disabled:opacity-40 transition">
                50% (${Math.floor(player.money / 2).toLocaleString()})
              </button>
              <button onClick={() => actions.bankTransaction('deposit', Math.floor(player.money))}
                className="flex-1 bg-indigo-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-indigo-700 transition">
                💰 All (${Math.floor(player.money).toLocaleString()})
              </button>
            </div>
          )}
          <div className="text-[9px] text-indigo-500 mb-1 font-semibold uppercase tracking-wide">Withdraw</div>
          <div className="grid grid-cols-4 gap-1 mb-1">
            {AMOUNTS.map(amt => (
              <button key={amt} onClick={() => actions.bankTransaction('withdraw', amt)}
                disabled={player.savings < amt}
                className="bg-white border border-indigo-200 rounded py-1 text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-40 transition min-h-[36px]">
                ${amt}
              </button>
            ))}
          </div>
          {player.savings > 0 && (
            <button onClick={() => actions.bankTransaction('withdraw', Math.floor(player.savings))}
              className="w-full bg-indigo-100 text-indigo-700 text-[10px] font-bold py-1.5 rounded hover:bg-indigo-200 transition">
              Withdraw All (${Math.floor(player.savings).toLocaleString()})
            </button>
          )}
        </div>
        <div className="bg-red-50 p-3 rounded border border-red-100">
          <div className="text-xs font-bold text-red-700 mb-1">Debt (5%/wk interest)</div>
          <div className={`text-2xl font-mono mb-2 ${player.debt > 0 ? 'text-red-600' : 'text-slate-400'}`}>${player.debt.toLocaleString()}</div>
          {player.debt > 0 && (
            <>
              <div className="text-[9px] text-red-500 mb-1 font-semibold uppercase tracking-wide">Repay</div>
              <div className="grid grid-cols-4 gap-1 mb-1">
                {AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => actions.bankTransaction('repay', amt)}
                    disabled={player.money < amt || player.debt === 0}
                    className="bg-white border border-red-200 rounded py-1 text-[10px] font-bold hover:bg-red-100 disabled:opacity-40 transition min-h-[36px]">
                    ${amt}
                  </button>
                ))}
              </div>
              <button onClick={() => actions.bankTransaction('repay', player.debt)}
                disabled={player.money < player.debt}
                className="w-full bg-red-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-red-700 disabled:opacity-40 transition">
                Repay All (${player.debt.toLocaleString()})
              </button>
              {/* Custom repayment amount */}
              <div className="flex gap-1 mt-1">
                <input
                  type="number"
                  min="1"
                  max={Math.min(player.money, player.debt)}
                  value={customRepay}
                  onChange={e => setCustomRepay(e.target.value)}
                  placeholder="Custom $"
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-indigo-400"
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
                  className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-red-700 disabled:opacity-40 transition"
                >
                  Pay
                </button>
              </div>
            </>
          )}
          <div className="text-[9px] text-red-500 mb-1 font-semibold uppercase tracking-wide mt-2">Borrow</div>
          <div className="grid grid-cols-4 gap-1">
            {AMOUNTS.map(amt => (
              <button key={amt} onClick={() => actions.bankTransaction('borrow', amt)}
                disabled={player.debt + amt > 5000}
                className="bg-white border border-red-200 rounded py-1 text-[10px] font-bold hover:bg-red-100 disabled:opacity-40 transition min-h-[36px]">
                ${amt}
              </button>
            ))}
          </div>
          <div className="text-[9px] text-red-400 mt-1">⚠️ Max $5,000 debt. 5%/wk interest!</div>
          {player.debt > 0 && (
            <div className="text-[9px] text-red-500 mt-0.5 font-bold space-y-0.5">
              <div>Costing you: ${Math.round(player.debt * 0.05).toLocaleString()}/wk in interest</div>
              <div className="text-red-400 font-normal">In 10 weeks your ${player.debt.toLocaleString()} becomes ${Math.round(player.debt * Math.pow(1.05, 10)).toLocaleString()}</div>
            </div>
          )}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-200">
          <h3 className="font-bold text-xs mb-2 text-slate-600">🛡️ Insurance</h3>
          {itemsData.filter(i => i.id === 'health_insurance').map(item => {
            const owned = player.inventory.some(i => i.id === item.id);
            const price = adjustedPrice(item.cost, state.economy);
            return (
              <button
                key={item.id}
                onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
                disabled={owned}
                className="w-full flex justify-between items-center p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-60 text-xs"
              >
                <div className="text-left">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-slate-400">{item.effect}</div>
                </div>
                <span className="font-mono">{owned ? '✅' : `$${price}`}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        {isBankEmployee && (
          <div className="mb-3">
            <h3 className="font-bold text-sm border-b border-indigo-200 pb-1 mb-2">🏦 Staff Only <EconomyWageBadge economy={state.economy} /></h3>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button onClick={actions.partTimeWork} disabled={player.timeRemaining < 4}
                className="p-2 bg-indigo-50 border-2 border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]">
                <div className="font-bold">⏱ Part (4h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, state.economy) * 4)}</div>
              </button>
              <button onClick={actions.work} disabled={player.timeRemaining < 8}
                className="p-2 bg-indigo-100 border-2 border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px]">
                <div className="font-bold">💼 Full (8h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, state.economy) * 8)}</div>
              </button>
            </div>
            <button onClick={actions.workOvertime} disabled={player.timeRemaining < 12}
              className="w-full p-2 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 text-xs transition active:scale-95 mb-1.5 min-h-[44px]">
              <div className="flex justify-between items-center">
                <span className="font-bold">⚡ Overtime (12h · 1.5x)</span>
                <span className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(player.job.wage, state.economy) * 12 * 1.5)}</span>
              </div>
              <div className="text-amber-700">-10 happiness</div>
            </button>
            <ExpProgressBar player={player} />
            {(() => { const nj = getNextPromotion(player); return nj ? <button onClick={() => actions.applyForJob(nj, true)} className="w-full p-2 bg-green-100 border border-green-300 rounded text-xs font-bold text-green-800 hover:bg-green-200">🆙 Promote → {nj.title}</button> : null; })()}
          </div>
        )}
        <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
          <h3 className="font-bold text-sm">📈 Stocks</h3>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${state.economy === 'Boom' ? 'bg-green-100 text-green-700' : state.economy === 'Depression' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            {state.economy} · {state.economyTimer}wk{state.economyTimer <= 2 ? ' ⚡' : ''}
          </span>
        </div>
        {(() => {
          const total = stocksData.reduce((sum, stock) => {
            const owned = player.portfolio?.[stock.symbol] || 0;
            return sum + owned * (state.market[stock.symbol] || 0);
          }, 0);
          if (total === 0) return null;
          return (
            <div className="bg-indigo-50 px-2 py-1 rounded text-xs mb-2 flex justify-between">
              <span className="text-indigo-600 font-bold">Portfolio Value</span>
              <span className="font-mono font-bold text-indigo-700">${total.toLocaleString()}</span>
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
              <div key={stock.symbol} className={`bg-white p-2 rounded border text-xs ${isUp ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex justify-between mb-1">
                  <div>
                    <span className="font-bold">{stock.symbol}</span>
                    <span className="text-slate-400 ml-1 text-[9px]">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>{isUp ? '▲' : '▼'}{Math.abs(pctChange)}%</span>
                    <span className={`font-mono font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>${currentPrice}</span>
                  </div>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full transition-all duration-500 ${isUp ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, barPct - 50) * 2}%`, minWidth: isUp ? '1px' : '0' }} />
                </div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>×{owned} shares</span>
                  <div className="flex items-center gap-1.5">
                    {owned > 0 && (() => {
                      const costBasis = owned * stock.basePrice;
                      const pl = ownedValue - costBasis;
                      const plPct = Math.round((pl / costBasis) * 100);
                      return (
                        <span className={`text-[9px] font-bold px-1 rounded ${pl >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                          {pl >= 0 ? '+' : ''}{plPct}% P/L
                        </span>
                      );
                    })()}
                    <span className={ownedValue > 0 ? 'font-bold text-indigo-600' : ''}>{ownedValue > 0 ? `$${ownedValue}` : 'none held'}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => actions.buyStock(stock.symbol, 1)} disabled={player.money < currentPrice} className="flex-1 bg-green-100 text-green-800 py-1.5 rounded hover:bg-green-200 disabled:opacity-40 text-xs font-bold active:scale-95 transition min-h-[36px]" title={`Buy 1 share for $${currentPrice}`}>Buy 1</button>
                  <button onClick={() => actions.buyStock(stock.symbol, 5)} disabled={player.money < currentPrice * 5} className="flex-1 bg-green-100 text-green-800 py-1.5 rounded hover:bg-green-200 disabled:opacity-40 text-xs font-bold active:scale-95 transition min-h-[36px]" title={`Buy 5 shares for $${currentPrice * 5}`}>×5</button>
                  <button onClick={() => actions.buyStock(stock.symbol, 10)} disabled={player.money < currentPrice * 10} className="flex-1 bg-green-200 text-green-900 py-1.5 rounded hover:bg-green-300 disabled:opacity-40 text-xs font-bold active:scale-95 transition min-h-[36px]" title={`Buy 10 shares for $${currentPrice * 10}`}>×10</button>
                  <button onClick={() => actions.sellStock(stock.symbol, 1)} disabled={owned < 1} className="flex-1 bg-red-100 text-red-800 py-1.5 rounded hover:bg-red-200 disabled:opacity-40 text-xs font-bold active:scale-95 transition min-h-[36px]">Sell 1</button>
                  <button onClick={() => actions.sellStockAll(stock.symbol)} disabled={owned < 1} className="flex-1 bg-red-200 text-red-900 py-1.5 rounded hover:bg-red-300 disabled:opacity-40 text-xs font-bold active:scale-95 transition min-h-[36px]" title={`Sell all ${owned} shares for $${owned * currentPrice}`}>All</button>
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
