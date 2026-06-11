import React, { useEffect, useRef } from 'react';
import { DIFFICULTY_PRESETS, calculateNetWorth } from '../../engine/constants';
import { calcShiftEarnings } from '../../engine/economyModel';
import stocksData from '../../data/stocks.json';

const Meter = ({ label, value, fillClass, danger = false }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`font-num text-[11px] font-bold ${danger ? 'animate-pulse' : ''}`}
        style={{ color: danger ? 'var(--debt-ink)' : 'var(--ink)' }}>{value}</span>
    </div>
    <div className="ds-meter-bar"><span className={fillClass} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
  </div>
);

const HUD = ({ state, onOpenInventory, onOpenGoals, onToggleMute }) => {
  const { player, week, economy, players, muted } = state;
  const isMultiplayer = players && players.length > 1;
  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const isLowTime = player.timeRemaining < 8;
  const portfolioVal = stocksData.reduce((sum, s) => sum + (player.portfolio?.[s.symbol] || 0) * (state.market[s.symbol] || 0), 0);

  // Snapshot delta for net-worth direction arrow — must use the same shared
  // formula as the live value (incl. housing equity) or equity holders see a
  // permanent phantom gain (audit bug M2).
  const snap = state.weekStartSnapshot?.find(s => s.name === player.name);
  const oldNW = snap ? calculateNetWorth(snap) : null;
  const nwDelta = oldNW != null ? netWorth - oldNW : 0;

  // Publish the HUD's REAL rendered height as --hud-h on :root. The map safe
  // area and the Tips/Jones/Log buttons anchor to this var, so nothing can
  // hide behind the HUD no matter how tall it grows on a phone (audit B3/B4).
  const hudRef = useRef(null);
  useEffect(() => {
    const el = hudRef.current;
    if (!el) return;
    const root = document.documentElement;
    const write = () => root.style.setProperty('--hud-h', `${el.offsetHeight}px`);
    write();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Bag / Goals / Mute — rendered in the desktop right column AND in the
  // mobile second row (audit B2).
  const actionButtons = (
    <div className="flex gap-1.5">
      <button
        onClick={onOpenInventory}
        className="ds-btn"
        title="Inventory (I)"
        style={{ padding: '8px 12px', minHeight: 38 }}
      >
        <span className="text-base">🎒</span>
        <span className="hidden sm:inline text-[11px] font-display">Bag</span>
      </button>
      <button
        onClick={onOpenGoals}
        className="ds-btn"
        title="Goals (G)"
        style={{ padding: '8px 12px', minHeight: 38 }}
      >
        <span className="text-base">🎯</span>
        <span className="hidden sm:inline text-[11px] font-display">Goals</span>
      </button>
      <button
        onClick={onToggleMute}
        className="ds-btn"
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
        style={{ padding: '8px 12px', minHeight: 38 }}
      >
        <span className="text-base">{muted ? '🔇' : '🔊'}</span>
      </button>
    </div>
  );

  return (
    <div
      ref={hudRef}
      className="absolute bottom-0 left-0 right-0 z-30 backdrop-blur"
      style={{
        background: 'rgba(255,255,255,0.92)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -8px 24px rgba(26,24,22,0.08)',
      }}
    >
      {/* Multiplayer turn strip — shows only WHOSE turn it is and overall
          progress, never other players' finances (hot-seat privacy, GDD §15). */}
      {isMultiplayer && (
        <div
          className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-display font-bold"
          style={{ background: 'var(--ink)', color: '#fff', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-base">{player.emoji}</span>
          <span>{player.name}'s turn</span>
          <span style={{ opacity: 0.6 }}>· {(state.activePlayerIndex ?? 0) + 1}/{players.length} · Wk {week}</span>
        </div>
      )}

      <div
        className={`px-3 md:px-4 pt-3 ${isMultiplayer ? 'pb-[max(0.55rem,env(safe-area-inset-bottom))]' : 'pb-[max(0.7rem,env(safe-area-inset-bottom))]'}`}
      >
        {/* Mobile (<md): explicit 2-row grid — row 1 = avatar | cash | time,
            row 2 = needs pills | Bag/Goals/Mute. Desktop (md+): single row
            with the needs grid + right column (audit B2). */}
        <div className={`flex flex-wrap items-stretch gap-x-2 gap-y-1.5 md:gap-3 ${isMultiplayer ? 'md:min-h-[4.6rem]' : 'md:min-h-[5rem]'}`}>

          {/* Player avatar + identity */}
          <div className="flex flex-col items-center justify-center min-w-[58px] md:min-w-[72px] gap-0.5">
            <div
              className="w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-xl md:text-2xl"
              style={{
                background: 'linear-gradient(135deg, #FDEDE7, #FFE4D4)',
                border: '1px solid rgba(255,107,74,0.3)',
              }}
            >
              {player.emoji ?? '🦊'}
            </div>
            <div className="font-display font-bold text-[11px] md:text-xs leading-none" style={{ color: 'var(--ink)' }}>
              {player.name ?? 'You'}
            </div>
            <div className="text-[9px] font-semibold leading-none mt-0.5" style={{ color: 'var(--muted)' }}>
              Wk {week}
            </div>
          </div>

          {/* Cash readout */}
          <div className="flex flex-col justify-center min-w-[96px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Cash</div>
            <div
              className="font-display font-bold text-xl md:text-2xl leading-tight font-num"
              style={{ color: player.money < 0 ? 'var(--debt-ink)' : 'var(--money-ink)' }}
            >
              ${Math.round(player.money).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-num">
              {player.debt > 0 && (
                <span className="ds-pill ds-pill-debt animate-pulse" style={{ padding: '1px 6px', fontSize: 9 }}>
                  💳 ${Math.round(player.debt).toLocaleString()}
                </span>
              )}
              {player.savings > 0 && (
                <span className="ds-pill ds-pill-info" style={{ padding: '1px 6px', fontSize: 9 }}>
                  💾 ${Math.round(player.savings).toLocaleString()}
                </span>
              )}
              {portfolioVal > 0 && (
                <span className="ds-pill ds-pill-accent" style={{ padding: '1px 6px', fontSize: 9 }}>
                  📈 ${portfolioVal.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Time meter — min-width guarantees the bar can never collapse to
              zero on a narrow phone (audit B2); flex-wrap absorbs overflow. */}
          <div className="flex flex-col justify-center flex-1 min-w-[120px] gap-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${isLowTime ? 'animate-pulse' : ''}`}
                style={{ color: isLowTime ? 'var(--debt-ink)' : 'var(--muted)' }}
              >
                {isLowTime ? '⚡ Low time' : '⏱ Time'}
              </span>
              <span
                className="font-num font-bold text-xs"
                style={{ color: isLowTime ? 'var(--debt-ink)' : 'var(--ink)' }}
              >
                {player.timeRemaining}h / {player.maxTime}h
              </span>
            </div>
            <div className="ds-meter-bar">
              <span
                className={isLowTime ? 'ds-fill-time low' : 'ds-fill-time'}
                style={{ width: `${(player.timeRemaining / player.maxTime) * 100}%` }}
              />
            </div>
            {/* Quick needs */}
            <div className="hidden md:grid grid-cols-3 gap-2 mt-1">
              <Meter label="Hunger" value={player.hunger ?? 0} fillClass="ds-fill-hunger" danger={(player.hunger ?? 0) >= 80} />
              <Meter label="Relax" value={player.relaxation ?? 50} fillClass="ds-fill-relax" danger={(player.relaxation ?? 50) <= 20} />
              <Meter label="Happy" value={player.happiness} fillClass="ds-fill-happy" danger={player.happiness < 25} />
            </div>
          </div>

          {/* Desktop right column: identity + actions (hidden on mobile —
              the second HUD row below replaces it; audit B2) */}
          <div className="hidden md:flex flex-col items-end justify-center gap-1.5 shrink-0">
            <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--muted)' }}>
              <span className="font-num font-semibold">🎓 {player.education}</span>
              <span className="font-num font-semibold">
                💼 {player.job ? player.job.title : <span style={{ color: 'var(--debt-ink)' }}>No job</span>}
              </span>
            </div>
            <div className="text-[10px] text-right hidden sm:block" style={{ color: 'var(--muted)' }}>
              Net: <span className="font-num font-bold" style={{ color: netWorth < 0 ? 'var(--debt-ink)' : 'var(--money-ink)' }}>
                ${Math.round(netWorth).toLocaleString()}
              </span>
              {Math.abs(nwDelta) >= 1 && (
                <span className="ml-1" style={{ color: nwDelta > 0 ? 'var(--money-ink)' : 'var(--debt-ink)' }}>
                  {nwDelta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(nwDelta))}
                </span>
              )}
              {player.job && (
                <span className="ml-2 font-num" style={{ color: 'var(--muted)' }}>
                  ≈ ${calcShiftEarnings(player.job.wage, 8, economy)}/shift
                </span>
              )}
            </div>
            {actionButtons}
            <div className="hidden md:block text-[10px] text-right" style={{ color: 'var(--muted)' }}>
              ⌨ I G L M W E R S N · goal {goals?.happiness ?? 80}
            </div>
          </div>

          {/* Mobile row 2: fixed-height needs pills (scroll on overflow, never
              stack) + the Bag/Goals/Mute actions (audit B2). */}
          <div className="flex md:hidden basis-full items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap min-h-[2rem]" style={{ scrollbarWidth: 'none' }}>
              {(player.hunger ?? 0) >= 60 && (
                <span className="ds-pill ds-pill-warn animate-pulse shrink-0" style={{ padding: '2px 7px', fontSize: 10 }}>
                  🍕 Hunger {player.hunger}
                </span>
              )}
              {(player.relaxation ?? 50) <= 20 && (
                <span className="ds-pill ds-pill-warn shrink-0" style={{ padding: '2px 7px', fontSize: 10 }}>🛁 Relax {player.relaxation ?? 50}</span>
              )}
              {player.happiness < 25 && (
                <span className="ds-pill ds-pill-debt animate-pulse shrink-0" style={{ padding: '2px 7px', fontSize: 10 }}>💔 Happy {player.happiness}</span>
              )}
              {!player.job && (
                <span className="ds-pill shrink-0" style={{ padding: '2px 7px', fontSize: 10 }}>No job</span>
              )}
            </div>
            <div className="shrink-0">{actionButtons}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
