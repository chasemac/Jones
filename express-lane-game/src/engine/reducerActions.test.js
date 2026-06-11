import { describe, it, expect } from 'vitest';
import { buildInitialState, gameReducer } from './gameReducer';
import { rideFare, gigEarnings } from './constants';
import { adjustedPrice, effectiveItemPrice, calcShiftEarnings } from './economyModel';

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

// ── Audit regression tests (B1, M1) ──────────────────────────────────────────
// B1: employee discount was applied in BOTH the shop component and BUY_ITEM,
// double-discounting staff purchases. The reducer is now the single authority:
// components dispatch the economy-adjusted (undiscounted) cost.
describe('BUY_ITEM employee discount (audit B1)', () => {
  const dispatchBuy = (s, item) =>
    // Components dispatch the economy-adjusted cost, never pre-discounted.
    gameReducer(s, { type: 'BUY_ITEM', item: { ...item, cost: adjustedPrice(item.cost, s.economy) } });

  it('charges TrendSetters staff exactly the displayed 20%-off price (applied once)', () => {
    let s = { ...buildInitialState('normal', 1), gameStatus: 'playing', economy: 'Boom' };
    s.players[0].job = { title: 'Sales Associate', wage: 12, location: 'trendsetters', type: 'service' };
    const item = { id: 'business_casual', name: 'Business Casual', type: 'clothing', cost: 200 };
    const displayed = effectiveItemPrice(item, 'Boom', s.players[0]); // 200→280→224
    expect(displayed).toBe(224);
    const out = dispatchBuy(s, item);
    expect(s.players[0].money - out.players[0].money).toBe(displayed); // pays what the shelf says
  });

  it('charges MegaMart staff exactly the displayed 25%-off appliance price', () => {
    let s = { ...buildInitialState('normal', 1), gameStatus: 'playing' };
    s.players[0].job = { title: 'Stocker', wage: 11, location: 'megamart', type: 'service' };
    const item = { id: 'refrigerator', name: 'Refrigerator', type: 'appliance', cost: 400 };
    const displayed = effectiveItemPrice(item, 'Normal', s.players[0]); // 400 * 0.75 = 300
    expect(displayed).toBe(300);
    const out = dispatchBuy(s, item);
    expect(s.players[0].money - out.players[0].money).toBe(displayed);
  });

  it('charges non-staff the full economy-adjusted price', () => {
    let s = { ...buildInitialState('normal', 1), gameStatus: 'playing', economy: 'Boom' };
    const item = { id: 'business_casual', name: 'Business Casual', type: 'clothing', cost: 200 };
    const out = dispatchBuy(s, item);
    expect(s.players[0].money - out.players[0].money).toBe(280); // no discount
  });
});

// M1: shift-pay previews used floor(round(wage·mult)·hours) while the reducer
// paid floor(wage·hours·mult). Previews now call calcShiftEarnings directly —
// this locks the reducer to that same function.
describe('WORK pay matches calcShiftEarnings preview (audit M1)', () => {
  const workState = (economy) => {
    const s = { ...buildInitialState('normal', 1), gameStatus: 'playing', economy };
    s.players[0].job = { title: 'Cashier', wage: 12, location: 'megamart', type: 'service', shiftsWorked: 0 };
    return s;
  };

  it.each(['Depression', 'Normal', 'Boom'])('full 8h shift in %s', (economy) => {
    const s = workState(economy);
    const out = gameReducer(s, { type: 'WORK', hours: 8 });
    expect(out.players[0].money - s.players[0].money).toBe(calcShiftEarnings(12, 8, economy));
  });

  it('overtime pays calcShiftEarnings(wage·1.5, 12) — the preview formula', () => {
    const s = workState('Boom');
    const out = gameReducer(s, { type: 'WORK', overtime: true });
    expect(out.players[0].money - s.players[0].money).toBe(calcShiftEarnings(12 * 1.5, 12, 'Boom'));
  });

  it('part-time pays calcShiftEarnings(wage, 4)', () => {
    const s = workState('Depression');
    const out = gameReducer(s, { type: 'PART_TIME_WORK' });
    expect(out.players[0].money - s.players[0].money).toBe(calcShiftEarnings(12, 4, 'Depression'));
  });
});

// M3: stock P/L was computed against basePrice, not what the player paid.
describe('stock cost basis (audit M3)', () => {
  const buy = (s, symbol, quantity) => gameReducer(s, { type: 'BUY_STOCK', symbol, quantity });

  it('records what was paid on buy', () => {
    let s = playing();
    const sym = Object.keys(s.market)[0];
    s = { ...s, market: { ...s.market, [sym]: 120 } };
    const out = buy(s, sym, 3);
    expect(active(out).stockCostBasis[sym]).toBe(360);
  });

  it('accumulates basis across multiple buys at different prices', () => {
    let s = playing();
    s.players[0].money = 10000;
    const sym = Object.keys(s.market)[0];
    s = { ...s, market: { ...s.market, [sym]: 100 } };
    let out = buy(s, sym, 2); // $200
    out = { ...out, market: { ...out.market, [sym]: 150 } };
    out = buy(out, sym, 2); // $300
    expect(active(out).stockCostBasis[sym]).toBe(500);
  });

  it('logs true P/L on SELL_STOCK_ALL — buying high then selling lower is a loss', () => {
    let s = playing();
    s.players[0].money = 10000;
    const sym = Object.keys(s.market)[0];
    s = { ...s, market: { ...s.market, [sym]: 150 } };
    let out = buy(s, sym, 2); // paid $300
    out = { ...out, market: { ...out.market, [sym]: 100 } };
    out = gameReducer(out, { type: 'SELL_STOCK_ALL', symbol: sym }); // gets $200
    expect(out.history[0]).toMatch(/-\$100 loss/);
    expect(active(out).stockCostBasis[sym]).toBeUndefined();
  });

  it('removes proportional basis on partial SELL_STOCK (avg-cost)', () => {
    let s = playing();
    s.players[0].money = 10000;
    const sym = Object.keys(s.market)[0];
    s = { ...s, market: { ...s.market, [sym]: 100 } };
    let out = buy(s, sym, 4); // basis $400
    out = gameReducer(out, { type: 'SELL_STOCK', symbol: sym, quantity: 2 });
    expect(active(out).stockCostBasis[sym]).toBe(200);
    expect(active(out).portfolio[sym]).toBe(2);
  });
});

// M12: REST and READ_BOOK previously skipped autoEndIfNeeded, leaving a 0h
// player parked without the walk-home flow every other action triggers.
describe('REST/READ_BOOK auto-end at 0h (audit M12)', () => {
  it('REST down to 0h flags awaitingEndWeek', () => {
    let s = playing();
    s.players[0].timeRemaining = 2;
    const out = gameReducer(s, { type: 'REST', hours: 2 });
    expect(active(out).timeRemaining).toBe(0);
    expect(out.awaitingEndWeek).toBe(true);
  });
  it('READ_BOOK down to 0h flags awaitingEndWeek', () => {
    let s = playing();
    s.players[0].timeRemaining = 3;
    const out = gameReducer(s, { type: 'READ_BOOK', book: { title: 'Test', hours: 3, happinessGain: 1 } });
    expect(active(out).timeRemaining).toBe(0);
    expect(out.awaitingEndWeek).toBe(true);
  });
});
