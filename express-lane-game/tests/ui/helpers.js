/**
 * Shared helpers for UI tests. Every test must start from a clean
 * localStorage (tests are independent and order-agnostic).
 */

export const SAVE_KEY = 'jones_v2_state';

/** Fresh page with no save. */
export async function freshStart(page) {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
}

/** Drive the real 4-step wizard. */
export async function startNewGame(page, { players = 1 } = {}) {
  await freshStart(page);
  await page.getByRole('button', { name: /Next: Choose Difficulty/i }).click();
  await page.getByRole('button', { name: /Next: Choose Players/i }).click();
  if (players > 1) {
    await page.getByRole('button', { name: new RegExp(`${players} Players`) }).click();
  }
  await page.getByRole('button', { name: /Next: Choose Avatars/i }).click();
  await page.getByRole('button', { name: /🚀 Start/i }).click();
}

/** Seed a save (object) before load, then go to / (start screen shows Resume). */
export async function seedSave(page, save) {
  await page.addInitScript(([key, val]) => {
    localStorage.clear();
    localStorage.setItem(key, val);
  }, [SAVE_KEY, JSON.stringify(save)]);
  await page.goto('/');
}

/** Read the parsed save back out of localStorage. */
export async function readSave(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), SAVE_KEY);
}

/** Read live game state via the persisted snapshot after the debounced save. */
export async function waitForSave(page) {
  await page.waitForTimeout(700); // save is debounced 500ms
  return readSave(page);
}

/** Poll the save until predicate(save) is truthy (animations + debounce). */
export async function waitForSaveWhere(page, predicate, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let save = null;
  while (Date.now() < deadline) {
    save = await readSave(page);
    if (save && predicate(save)) return save;
    await page.waitForTimeout(250);
  }
  return save;
}

/** Minimal single-player mid-game save for seeding flows. */
export function midGameSave(overrides = {}, playerOverrides = {}) {
  return {
    gameStatus: 'playing',
    difficulty: 'normal',
    playerCount: 1,
    week: 5,
    economy: 'Normal',
    economyTimer: 3,
    activePlayerIndex: 0,
    history: [],
    players: [{
      name: 'Player 1', emoji: '😎', color: '#facc15',
      money: 1000, savings: 0, debt: 0, happiness: 50, dependability: 50,
      relaxation: 50, hunger: 10, maxTime: 60, maxTimeReduction: 0, timeRemaining: 60,
      education: 'High School', job: null,
      housing: { id: 'shared_apt', title: 'Shared Apartment', homeType: 'apartment', rent: 200, happiness: 0, security: 'Low' },
      hasChosenHousing: true, currentLocation: 'home', housingEquity: 0,
      portfolio: {}, stockCostBasis: {}, currentCourse: null, inventory: [],
      weekDone: false, ateFoodThisWeek: false, earnedThisWeek: 0, shiftsThisWeek: 0,
      ...playerOverrides,
    }],
    ...overrides,
  };
}
