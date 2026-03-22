import { describe, it, expect } from 'vitest';
import { buildPlayer, buildInitialState, gameReducer } from './gameReducer';

describe('buildPlayer', () => {
  it('creates a player with default values', () => {
    const p = buildPlayer(0, 500);
    expect(p.name).toBe('Player 1');
    expect(p.money).toBe(500);
    expect(p.timeRemaining).toBe(60);
    expect(p.education).toBe('High School');
    expect(p.job).toBeNull();
    expect(p.inventory).toEqual([]);
    expect(p.currentLocation).toBe('leasing_office');
  });

  it('uses custom emoji when provided', () => {
    const p = buildPlayer(1, 500, '🦄');
    expect(p.emoji).toBe('🦄');
  });

  it('uses default emoji when none provided', () => {
    const p = buildPlayer(0, 500);
    expect(p.emoji).toBe('😎');
  });

  it('starts at leasing_office with hasChosenHousing false', () => {
    const p = buildPlayer(0, 500);
    expect(p.hasChosenHousing).toBe(false);
    expect(p.currentLocation).toBe('leasing_office');
  });
});

describe('buildInitialState', () => {
  it('creates a valid initial state with defaults', () => {
    const state = buildInitialState();
    expect(state.gameStatus).toBe('start');
    expect(state.difficulty).toBe('normal');
    expect(state.week).toBe(1);
    expect(state.economy).toBe('Normal');
    expect(state.players).toHaveLength(1);
    expect(state.jones).toBeDefined();
    expect(state.market).toBeDefined();
  });

  it('creates correct number of players', () => {
    const state = buildInitialState('normal', 3);
    expect(state.players).toHaveLength(3);
    expect(state.players[0].name).toBe('Player 1');
    expect(state.players[2].name).toBe('Player 3');
  });

  it('applies difficulty preset starting money', () => {
    const easy = buildInitialState('easy');
    const hard = buildInitialState('hard');
    expect(easy.players[0].money).toBeGreaterThan(hard.players[0].money);
  });

  it('initializes stock market', () => {
    const state = buildInitialState();
    expect(Object.keys(state.market).length).toBeGreaterThan(0);
  });

  it('jones starts with more money than players', () => {
    const state = buildInitialState('normal');
    expect(state.jones.money).toBeGreaterThan(state.players[0].money);
  });
});

describe('gameReducer', () => {
  const getPlayingState = () => {
    let state = gameReducer(undefined, { type: 'INIT_GAME', difficulty: 'normal', playerCount: 1 });
    state = gameReducer(state, { type: 'START_GAME' });
    // Give the player housing so they start at home
    return {
      ...state,
      players: state.players.map(p => ({
        ...p,
        hasChosenHousing: true,
        currentLocation: 'home',
        timeRemaining: 60,
      })),
    };
  };

  describe('INIT_GAME', () => {
    it('initializes a new game', () => {
      const state = gameReducer(undefined, { type: 'INIT_GAME', difficulty: 'normal', playerCount: 2 });
      expect(state.gameStatus).toBe('start');
      expect(state.players).toHaveLength(2);
      expect(state.weekStartSnapshot).toHaveLength(2);
    });
  });

  describe('START_GAME', () => {
    it('transitions to playing status', () => {
      let state = gameReducer(undefined, { type: 'INIT_GAME', difficulty: 'normal' });
      state = gameReducer(state, { type: 'START_GAME' });
      expect(state.gameStatus).toBe('playing');
    });
  });

  describe('TRAVEL', () => {
    it('moves player to new location and deducts time', () => {
      const state = getPlayingState();
      const newState = gameReducer(state, { type: 'TRAVEL', locationId: 'neobank' });
      expect(newState.players[0].currentLocation).toBe('neobank');
      expect(newState.players[0].timeRemaining).toBeLessThan(60);
    });

    it('does nothing when traveling to current location', () => {
      const state = getPlayingState();
      const newState = gameReducer(state, { type: 'TRAVEL', locationId: 'home' });
      expect(newState.players[0].timeRemaining).toBe(60);
    });

    it('prevents travel when not enough time', () => {
      const state = {
        ...getPlayingState(),
        players: [{ ...getPlayingState().players[0], timeRemaining: 0 }],
      };
      const newState = gameReducer(state, { type: 'TRAVEL', locationId: 'quick_eats' });
      expect(newState.players[0].currentLocation).toBe('home');
    });
  });

  describe('REST', () => {
    it('increases relaxation and deducts time', () => {
      const state = getPlayingState();
      const ns = gameReducer(state, { type: 'REST' });
      expect(ns.players[0].relaxation).toBeGreaterThan(state.players[0].relaxation);
      expect(ns.players[0].timeRemaining).toBeLessThan(60);
    });
  });

  describe('DISMISS_EVENT', () => {
    it('clears pendingEvent', () => {
      const state = { ...getPlayingState(), pendingEvent: { title: 'Test', description: 'test' } };
      const ns = gameReducer(state, { type: 'DISMISS_EVENT' });
      expect(ns.pendingEvent).toBeNull();
    });
  });

  describe('DISMISS_HUNGER_WARNING', () => {
    it('clears hunger warning from active player', () => {
      const state = getPlayingState();
      state.players[0].hungerWarning = { hunger: 80, penalty: 10 };
      const ns = gameReducer(state, { type: 'DISMISS_HUNGER_WARNING' });
      expect(ns.players[0].hungerWarning).toBeNull();
    });
  });
});
