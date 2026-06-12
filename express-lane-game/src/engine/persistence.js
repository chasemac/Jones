/**
 * @module persistence
 * Save/load helpers: the localStorage key and the save-hydration firewall.
 * Lives in the engine (not GameContext) so corrupted/legacy saves can be
 * unit-tested directly.
 */

import { buildInitialState } from './gameReducer';

export const SAVE_KEY = 'jones_v2_state';

/**
 * Rebuild a full game state from a (possibly partial, legacy, or corrupted)
 * saved object. Unknown fields are discarded by rebuilding from
 * buildInitialState; missing fields fall back to fresh defaults.
 * @param {object|null} saved - Parsed JSON from localStorage.
 * @returns {object|null} A playable state, or null if the save is unusable.
 */
/**
 * Lightweight, display-only summary of a raw save string for the
 * "Welcome back" resume card (audit M8). Never throws; full hydration
 * (with migrations) is hydrateSavedState's job.
 * @param {string|null} raw - Raw JSON string from localStorage, or null.
 * @returns {{week:number, playerCount:number, money:number|null}|null}
 */
export const peekSaveSummary = (raw) => {
  try {
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return null;
    return {
      week: saved.week || 1,
      playerCount: Math.max(1, saved.playerCount || saved.players?.length || 1),
      money: saved.players?.[saved.activePlayerIndex ?? 0]?.money ?? saved.players?.[0]?.money ?? null,
    };
  } catch {
    return null;
  }
};

export const hydrateSavedState = (saved) => {
  if (!saved || typeof saved !== 'object') return null;

  const playerCount = Math.max(1, saved.playerCount || saved.players?.length || 1);
  const playerEmojis = Array.isArray(saved.players) ? saved.players.map(player => player?.emoji) : null;
  const baseState = buildInitialState(saved.difficulty || 'normal', playerCount, playerEmojis);

  const players = baseState.players.map((basePlayer, index) => ({
    ...basePlayer,
    ...(saved.players?.[index] || {}),
    // Migration: `weeksWorked` was renamed to `shiftsWorked` (it always
    // counted shifts, not weeks — audit M11).
    job: saved.players?.[index]?.job
      ? (() => {
          const { weeksWorked, ...job } = saved.players[index].job;
          return { ...job, shiftsWorked: job.shiftsWorked ?? weeksWorked ?? 0 };
        })()
      : basePlayer.job,
    housing: {
      ...basePlayer.housing,
      ...(saved.players?.[index]?.housing || {}),
    },
    portfolio: {
      ...basePlayer.portfolio,
      ...(saved.players?.[index]?.portfolio || {}),
    },
    // Cost-basis migration: older saves tracked only share counts. Without a
    // recorded purchase price we can't know what was paid, so leave the map
    // empty — the UI/reducer fall back to basePrice for those legacy shares.
    stockCostBasis: {
      ...(saved.players?.[index]?.stockCostBasis || {}),
    },
    inventory: Array.isArray(saved.players?.[index]?.inventory) ? saved.players[index].inventory : basePlayer.inventory,
  }));

  return {
    ...baseState,
    ...saved,
    players,
    playerCount,
    history: Array.isArray(saved.history) ? saved.history : baseState.history,
    market: saved.market && typeof saved.market === 'object' ? { ...baseState.market, ...saved.market } : baseState.market,
    jones: {
      ...baseState.jones,
      ...(saved.jones || {}),
    },
    // Preserve unacknowledged event/summary modals across reloads — their
    // financial effects were already applied at week end, and nulling them
    // silently destroyed the only explanation of what happened (audit M9).
    pendingEvent: saved.pendingEvent && typeof saved.pendingEvent === 'object' ? saved.pendingEvent : null,
    weekSummary: saved.weekSummary && typeof saved.weekSummary === 'object' ? saved.weekSummary : null,
    lastJobResult: null,
    awaitingEndWeek: false,
  };
};
