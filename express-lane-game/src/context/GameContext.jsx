/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { gameReducer, buildInitialState } from '../engine/gameReducer';
import { SAVE_KEY, hydrateSavedState } from '../engine/persistence';
import { playSound, toggleMute, isMuted } from '../utils/sound';

const GameContext = createContext();
export const useGame = () => useContext(GameContext);

// ─── Persistence helpers ──────────────────────────────────────────────────────
// (SAVE_KEY + hydrateSavedState live in engine/persistence.js so they can be
// unit-tested and shared with StartScreen.)

const loadSavedState = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return hydrateSavedState(JSON.parse(raw));
  } catch { /* ignore */ }
  return null;
};

const saveState = (state) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const GameProvider = ({ children }) => {
  const [muted, setMutedState] = React.useState(isMuted);
  const [state, dispatch] = useReducer(
    gameReducer,
    null,
    () => {
      const saved = loadSavedState();
      // Always show start screen, but restore saved data if available
      // (incl. any pending event/week-summary modal — see hydrateSavedState)
      return saved ? { ...saved, gameStatus: 'start' } : buildInitialState('normal');
    }
  );

  // Persist state on every change (except while on start screen) — debounced 500ms
  const saveTimer = React.useRef(null);
  useEffect(() => {
    if (state.gameStatus === 'start') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

  // ── Sound side-effects ──────────────────────────────────────────────────────
  const prevWeek = React.useRef(state.week);
  useEffect(() => {
    if (state.week !== prevWeek.current) {
      playSound('turn');
      setTimeout(() => playSound('home'), 600);
      prevWeek.current = state.week;
    }
  }, [state.week]);

  // Victory sound
  const prevStatus = React.useRef(state.gameStatus);
  useEffect(() => {
    if (state.gameStatus === 'won' && prevStatus.current !== 'won') {
      setTimeout(() => playSound('victory'), 300);
    }
    prevStatus.current = state.gameStatus;
  }, [state.gameStatus]);

  // ── Action creators (stable refs via useCallback not needed — tiny wrappers) ─
  const actions = {
    initGame: (difficulty, playerCount, playerEmojis) => dispatch({ type: 'INIT_GAME', difficulty, playerCount: playerCount || 1, playerEmojis }),
    startGame: () => dispatch({ type: 'START_GAME' }),
    resetGame: () => {
      localStorage.removeItem(SAVE_KEY);
      dispatch({ type: 'INIT_GAME', difficulty: 'normal' });
    },
    travel: (locationId) => { playSound('move'); dispatch({ type: 'TRAVEL', locationId }); },
    work: () => { playSound('coin'); dispatch({ type: 'WORK' }); },
    workOvertime: () => { playSound('coin'); dispatch({ type: 'WORK', overtime: true }); },
    partTimeWork: () => { playSound('coin'); dispatch({ type: 'PART_TIME_WORK' }); },
    gigWork: () => { playSound('coin'); dispatch({ type: 'GIG_WORK' }); },
    network: () => dispatch({ type: 'NETWORK' }),
    applyForJob: (job, isPromotion = false) => dispatch({ type: 'APPLY_FOR_JOB', job, isPromotion }),
    rest: (hours = 2) => dispatch({ type: 'REST', hours }),
    readBook: (book) => dispatch({ type: 'READ_BOOK', book }),
    buyItem: (item) => { playSound('coin'); dispatch({ type: 'BUY_ITEM', item }); },
    sellItem: (item) => dispatch({ type: 'SELL_ITEM', item }),
    enroll: (course) => { playSound('success'); dispatch({ type: 'ENROLL', course }); },
    study: () => dispatch({ type: 'STUDY' }),
    rentApartment: (housing) => dispatch({ type: 'RENT_APARTMENT', housing }),
    bankTransaction: (transactionType, amount) => dispatch({ type: 'BANK_TRANSACTION', transactionType, amount }),
    buyStock: (symbol, quantity) => { playSound('coin'); dispatch({ type: 'BUY_STOCK', symbol, quantity }); },
    sellStock: (symbol, quantity) => dispatch({ type: 'SELL_STOCK', symbol, quantity }),
    sellStockAll: (symbol) => dispatch({ type: 'SELL_STOCK_ALL', symbol }),
    rideHome: () => { playSound('move'); dispatch({ type: 'RIDE_HOME' }); },
    endWeek: () => dispatch({ type: 'END_WEEK' }),
    dismissEvent: () => dispatch({ type: 'DISMISS_EVENT' }),
    dismissWeekSummary: () => dispatch({ type: 'DISMISS_WEEK_SUMMARY' }),
    dismissHungerWarning: () => dispatch({ type: 'DISMISS_HUNGER_WARNING' }),
    dismissClothingWarning: () => dispatch({ type: 'DISMISS_CLOTHING_WARNING' }),
    toggleMute: () => { setMutedState(toggleMute()); },
    getMuted: () => muted,
  };

  // Derived helpers consumed by UI
  const activePlayer = state.players?.[state.activePlayerIndex] ?? state.players?.[0];
  const enrichedState = { ...state, player: activePlayer, muted };

  const value = { state: enrichedState, dispatch, ...actions };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
