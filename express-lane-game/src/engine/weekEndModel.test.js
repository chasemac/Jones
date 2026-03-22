import { describe, it, expect, vi } from 'vitest';
import { processPlayerWeekEnd, advanceEconomy, buildWeekSummary } from './weekEndModel';

/** Helper: build a minimal player that won't trigger most penalties. */
function basePlayer(overrides = {}) {
  return {
    name: 'Tester',
    emoji: '🎮',
    money: 500,
    savings: 0,
    debt: 0,
    happiness: 50,
    dependability: 50,
    relaxation: 50,
    hunger: 0,
    housing: { homeType: 'studio', rent: 100, happiness: 1, id: 'studio' },
    inventory: [],
    job: { title: 'Cashier', wage: 12, weeksWorked: 4 },
    hasChosenHousing: true,
    maxTime: 60,
    maxTimeReduction: 0,
    timeRemaining: 10,
    weekDone: true,
    ateFoodThisWeek: false,
    hungerWarning: null,
    clothingWarning: null,
    currentLocation: 'quick_eats',
    ...overrides,
  };
}

describe('processPlayerWeekEnd', () => {
  it('deducts rent from money', () => {
    const { player } = processPlayerWeekEnd(basePlayer({ money: 300, housing: { homeType: 'studio', rent: 100, happiness: 1 } }));
    expect(player.money).toBeLessThanOrEqual(200); // may be less from weekly fees
  });

  it('adds debt when player can\'t afford rent', () => {
    const { player, logEntries } = processPlayerWeekEnd(basePlayer({ money: 50, housing: { homeType: 'studio', rent: 100, happiness: 1 } }));
    // shortfall = 50, then 5% interest applied → 52
    expect(player.debt).toBe(52);
    expect(player.money).toBe(0);
    expect(logEntries.some(e => e.includes('debt'))).toBe(true);
  });

  it('increases hunger each week', () => {
    const { player } = processPlayerWeekEnd(basePlayer({ hunger: 0 }));
    expect(player.hunger).toBeGreaterThan(0);
  });

  it('applies debt interest when debt exists', () => {
    const { player, logEntries } = processPlayerWeekEnd(basePlayer({ debt: 100 }));
    expect(player.debt).toBe(105); // 5% interest
    expect(logEntries.some(e => e.includes('interest'))).toBe(true);
  });

  it('applies savings interest when savings exist', () => {
    const { player } = processPlayerWeekEnd(basePlayer({ savings: 1000 }));
    expect(player.savings).toBe(1010); // 1% interest
  });

  it('resets player to home location', () => {
    const { player } = processPlayerWeekEnd(basePlayer());
    expect(player.currentLocation).toBe('home');
  });

  it('resets to leasing_office when player has not chosen housing', () => {
    const { player } = processPlayerWeekEnd(basePlayer({ hasChosenHousing: false }));
    expect(player.currentLocation).toBe('leasing_office');
  });

  it('resets timeRemaining for the new week', () => {
    const { player } = processPlayerWeekEnd(basePlayer({ timeRemaining: 5 }));
    expect(player.timeRemaining).toBeGreaterThanOrEqual(20);
  });

  it('decreases dependability each week', () => {
    const { player } = processPlayerWeekEnd(basePlayer({ dependability: 80 }));
    expect(player.dependability).toBeLessThan(80);
  });

  it('wears down clothing items', () => {
    const shirt = { id: 'business_casual', name: 'Business Casual', clothingWear: 50 };
    const { player } = processPlayerWeekEnd(basePlayer({ inventory: [shirt] }));
    const item = player.inventory.find(i => i.id === 'business_casual');
    expect(item.clothingWear).toBe(43); // 50 - 7
  });

  it('removes clothing when fully worn out', () => {
    const shirt = { id: 'business_casual', name: 'Business Casual', clothingWear: 5 };
    const { player, logEntries } = processPlayerWeekEnd(basePlayer({ inventory: [shirt] }));
    expect(player.inventory.find(i => i.id === 'business_casual')).toBeUndefined();
    expect(logEntries.some(e => e.includes('wore out'))).toBe(true);
  });

  it('consumes weekly meal plans and reduces hunger', () => {
    const meal = { id: 'meal_plan', name: 'Meal Plan', type: 'weekly_meal', weeklyHungerRestore: 55 };
    const { player, logEntries } = processPlayerWeekEnd(basePlayer({ hunger: 60, inventory: [meal] }));
    expect(player.inventory.find(i => i.id === 'meal_plan')).toBeUndefined();
    expect(logEntries.some(e => e.includes('ate weekly meals'))).toBe(true);
  });

  it('triggers doctor visit when relaxation hits zero', () => {
    const { player, logEntries } = processPlayerWeekEnd(basePlayer({ relaxation: 0 }));
    expect(player.relaxation).toBe(30);
    expect(logEntries.some(e => e.includes('doctor'))).toBe(true);
  });

  it('doctor visit costs less with health insurance', () => {
    const ins = { id: 'health_insurance', name: 'Health Insurance' };
    const p1 = processPlayerWeekEnd(basePlayer({ money: 500, relaxation: 0, inventory: [] })).player;
    const p2 = processPlayerWeekEnd(basePlayer({ money: 500, relaxation: 0, inventory: [ins] })).player;
    // With insurance: -$50, without: -$200 (plus rent $100 each)
    expect(p2.money).toBeGreaterThan(p1.money);
  });
});

describe('advanceEconomy', () => {
  it('decrements timer when timer > 1', () => {
    const { economy, economyTimer } = advanceEconomy('Normal', 5);
    expect(economy).toBe('Normal');
    expect(economyTimer).toBe(4);
  });

  it('transitions to next economy state when timer reaches 0', () => {
    // ECONOMY_STATES = ['Normal', 'Boom', 'Depression']
    const { economy, logEntry } = advanceEconomy('Normal', 1);
    expect(economy).toBe('Boom');
    expect(logEntry).toBeTruthy();
    expect(logEntry).toContain('Normal');
    expect(logEntry).toContain('Boom');
  });

  it('wraps around economy states', () => {
    const { economy } = advanceEconomy('Depression', 1);
    expect(economy).toBe('Normal');
  });

  it('sets a new timer between 4 and 7 on transition', () => {
    const { economyTimer } = advanceEconomy('Normal', 1);
    expect(economyTimer).toBeGreaterThanOrEqual(4);
    expect(economyTimer).toBeLessThanOrEqual(7);
  });
});

describe('buildWeekSummary', () => {
  const players = [
    { name: 'Alice', emoji: '🐱', money: 300, savings: 100, debt: 0, happiness: 60, dependability: 70, hunger: 20, relaxation: 50, job: { title: 'Barista' } },
    { name: 'Bob', emoji: '🐶', money: 100, savings: 0, debt: 50, happiness: 40, dependability: 30, hunger: 60, relaxation: 40, job: null },
  ];

  const snapshot = [
    { name: 'Alice', money: 250, savings: 80, debt: 0 },
    { name: 'Bob', money: 150, savings: 0, debt: 30 },
  ];

  it('builds a summary with correct week number', () => {
    const summary = buildWeekSummary(3, players, snapshot, players);
    expect(summary.week).toBe(3);
    expect(summary.lines).toHaveLength(2);
  });

  it('computes net worth delta correctly', () => {
    const summary = buildWeekSummary(3, players, snapshot, players);
    const alice = summary.lines.find(l => l.name === 'Alice');
    // old: 250 + 80 - 0 = 330, new: 300 + 100 - 0 = 400, delta = 70
    expect(alice.netWorth).toBe(400);
    expect(alice.netWorthDelta).toBe(70);
  });

  it('shows "Unemployed" for players without jobs', () => {
    const summary = buildWeekSummary(3, players, snapshot, players);
    const bob = summary.lines.find(l => l.name === 'Bob');
    expect(bob.job).toBe('Unemployed');
  });

  it('uses fallback players when no snapshot exists', () => {
    const summary = buildWeekSummary(1, players, null, players);
    expect(summary.lines).toHaveLength(2);
    // Delta will be zero since fallback = current players
    expect(summary.lines[0].netWorthDelta).toBe(0);
  });
});
