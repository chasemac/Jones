import { describe, it, expect } from 'vitest';
import { buildInitialState, gameReducer } from './gameReducer';
import { rideFare, gigEarnings } from './constants';

// Build a fresh "playing" state with `n` players.
const playing = (n = 1) => {
  const s = buildInitialState('normal', n);
  return { ...s, gameStatus: 'playing' };
};
const active = (s) => s.players[s.activePlayerIndex];

describe('GIG_WORK', () => {
  it('requires a smartphone', () => {
    const s = playing();
    const out = gameReducer(s, { type: 'GIG_WORK' });
    expect(active(out).money).toBe(active(s).money); // no earnings
    expect(out.history[0]).toMatch(/need a smartphone/i);
  });
  it('pays the economy-scaled gig rate and costs 4h', () => {
    let s = playing();
    s.players[0].inventory = [{ id: 'smartphone', name: 'Smartphone', type: 'electronics' }];
    const out = gameReducer(s, { type: 'GIG_WORK' });
    expect(active(out).money).toBe(1000 + gigEarnings(s.economy));
    expect(active(out).timeRemaining).toBe(60 - 4);
    expect(active(out).happiness).toBe(52);
  });
});

describe('RIDE_HOME', () => {
  it('charges the shared ride fare, strands the turn, and dents stats', () => {
    let s = playing();
    s.players[0].hasChosenHousing = true;
    s.players[0].currentLocation = 'coffee_shop';
    const out = gameReducer(s, { type: 'RIDE_HOME' });
    const fare = rideFare('coffee_shop', 'home');
    expect(active(out).money).toBe(1000 - fare);
    expect(active(out).currentLocation).toBe('home');
    expect(active(out).timeRemaining).toBe(0);
    expect(out.awaitingEndWeek).toBe(true);
    expect(active(out).dependability).toBe(47);
    expect(active(out).happiness).toBe(48);
  });
});

describe('BANK_TRANSACTION', () => {
  it('deposits cash into savings', () => {
    const out = gameReducer(playing(), { type: 'BANK_TRANSACTION', transactionType: 'deposit', amount: 200 });
    expect(active(out).money).toBe(800);
    expect(active(out).savings).toBe(200);
  });
  it('enforces the $5000 debt cap on borrowing', () => {
    let s = playing();
    s.players[0].debt = 4800;
    const out = gameReducer(s, { type: 'BANK_TRANSACTION', transactionType: 'borrow', amount: 500 });
    expect(active(out).debt).toBe(4800); // denied
    expect(out.lastJobResult.success).toBe(false);
  });
  it('repays debt and grants the debt-free happiness bonus', () => {
    let s = playing();
    s.players[0].debt = 100;
    const out = gameReducer(s, { type: 'BANK_TRANSACTION', transactionType: 'repay', amount: 100 });
    expect(active(out).debt).toBe(0);
    expect(active(out).happiness).toBe(55); // 50 + 5
  });
});

describe('BUY_STOCK / SELL_STOCK', () => {
  it('round-trips shares and cash', () => {
    let s = playing();
    const sym = Object.keys(s.market)[0];
    const price = s.market[sym];
    let out = gameReducer(s, { type: 'BUY_STOCK', symbol: sym, quantity: 2 });
    expect(active(out).portfolio[sym]).toBe(2);
    expect(active(out).money).toBe(1000 - price * 2);
    out = gameReducer(out, { type: 'SELL_STOCK', symbol: sym, quantity: 1 });
    expect(active(out).portfolio[sym]).toBe(1);
  });
});

describe('RENT_APARTMENT', () => {
  it('blocks an upgrade the player cannot afford the deposit for', () => {
    let s = playing();
    s.players[0].money = 100;
    const out = gameReducer(s, { type: 'RENT_APARTMENT', housing: { id: 'luxury_condo', title: 'Luxury Condo', rent: 1200 } });
    expect(active(out).hasChosenHousing).toBe(false);
    expect(out.history[0]).toMatch(/can't afford/i);
  });
});

describe('END_WEEK multiplayer turn order', () => {
  it('hands off between players, then processes the week once all are done', () => {
    let s = playing(2);
    // Player 1 ends turn → hand off to player 2, same week
    let out = gameReducer(s, { type: 'END_WEEK' });
    expect(out.week).toBe(1);
    expect(out.activePlayerIndex).toBe(1);
    expect(out.players[0].weekDone).toBe(true);
    // Player 2 ends turn → week processes and resets
    out = gameReducer(out, { type: 'END_WEEK' });
    expect(out.week).toBe(2);
    expect(out.activePlayerIndex).toBe(0);
    expect(out.players.every(p => !p.weekDone)).toBe(true);
    expect(out.weekSummary).toBeTruthy();
  });
});

describe('DISMISS_WEEK_SUMMARY / DISMISS_CLOTHING_WARNING', () => {
  it('clears the week summary and snapshots a new baseline', () => {
    let s = playing();
    s.weekSummary = { week: 1, lines: [] };
    const out = gameReducer(s, { type: 'DISMISS_WEEK_SUMMARY' });
    expect(out.weekSummary).toBeNull();
    expect(out.weekStartSnapshot).toHaveLength(1);
  });
  it('clears one clothing warning at a time', () => {
    let s = playing(2);
    s.players[0].clothingWarning = { itemName: 'Suit', jobTitle: 'X', playerName: 'Player 1' };
    s.players[1].clothingWarning = { itemName: 'Suit', jobTitle: 'Y', playerName: 'Player 2' };
    const out = gameReducer(s, { type: 'DISMISS_CLOTHING_WARNING' });
    const remaining = out.players.filter(p => p.clothingWarning).length;
    expect(remaining).toBe(1);
  });
});
