import { describe, it, expect } from 'vitest';
import { hydrateSavedState, SAVE_KEY } from './persistence';

describe('SAVE_KEY', () => {
  it('is the canonical localStorage key', () => {
    expect(SAVE_KEY).toBe('jones_v2_state');
  });
});

describe('hydrateSavedState', () => {
  it('returns null for unusable saves', () => {
    expect(hydrateSavedState(null)).toBeNull();
    expect(hydrateSavedState('garbage')).toBeNull();
    expect(hydrateSavedState(42)).toBeNull();
  });

  it('rebuilds a playable state from a minimal save', () => {
    const s = hydrateSavedState({ difficulty: 'easy', week: 9, players: [{ name: 'Chase', money: 321 }] });
    expect(s.week).toBe(9);
    expect(s.players[0].money).toBe(321);
    expect(s.players[0].hunger).toBe(0); // missing fields fall back to defaults
    expect(s.players[0].portfolio).toEqual({});
  });

  it('preserves pending event and week summary across reload (audit M9)', () => {
    const saved = {
      players: [{ name: 'P1' }],
      pendingEvent: { title: 'Rent Hike', effectDesc: 'rent +$50/wk', sentiment: 'bad' },
      weekSummary: { week: 7, lines: [] },
    };
    const s = hydrateSavedState(saved);
    expect(s.pendingEvent?.title).toBe('Rent Hike');
    expect(s.weekSummary?.week).toBe(7);
  });

  it('drops malformed pendingEvent/weekSummary instead of crashing', () => {
    const s = hydrateSavedState({ players: [{}], pendingEvent: 'oops', weekSummary: 12 });
    expect(s.pendingEvent).toBeNull();
    expect(s.weekSummary).toBeNull();
  });

  it('migrates legacy job.weeksWorked to shiftsWorked (audit M11)', () => {
    const s = hydrateSavedState({
      players: [{ job: { title: 'Barista', wage: 12, weeksWorked: 6 } }],
    });
    expect(s.players[0].job.shiftsWorked).toBe(6);
    expect(s.players[0].job.weeksWorked).toBeUndefined();
  });

  it('leaves stockCostBasis empty for legacy saves (basePrice fallback)', () => {
    const s = hydrateSavedState({ players: [{ portfolio: { JNES: 10 } }] });
    expect(s.players[0].portfolio.JNES).toBe(10);
    expect(s.players[0].stockCostBasis).toEqual({});
  });

  it('always resets one-shot/transient flags', () => {
    const s = hydrateSavedState({ players: [{}], lastJobResult: { success: true }, awaitingEndWeek: true });
    expect(s.lastJobResult).toBeNull();
    expect(s.awaitingEndWeek).toBe(false);
  });
});
