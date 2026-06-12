import { test, expect } from 'playwright/test';
import { seedSave, midGameSave, waitForSaveWhere } from './helpers.js';

test.describe('modal keyboard handling', () => {
  test('I/G/L open modals and Esc closes them layer by layer', async ({ page }) => {
    await seedSave(page, midGameSave());
    await page.getByRole('button', { name: /Resume/i }).first().click();

    await page.keyboard.press('i');
    await expect(page.getByText(/INVENTORY/i).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText(/INVENTORY/i)).toHaveCount(0);

    await page.keyboard.press('g');
    await expect(page.getByText(/GOALS/i).first()).toBeVisible();
    await page.keyboard.press('Escape');

    await page.keyboard.press('l');
    await expect(page.getByText(/LOG|HISTORY/i).first()).toBeVisible();
    await page.keyboard.press('Escape');
  });
});

test.describe('multiplayer handoff', () => {
  test('turn passes with correct attribution and handoff cover (audit pass-check)', async ({ page }) => {
    // Seed both players at home so Player 1 can sleep immediately
    const save = midGameSave({ playerCount: 2 });
    save.players.push({
      ...save.players[0],
      name: 'Player 2', emoji: '🤖', color: '#34d399',
    });
    await seedSave(page, save);
    await page.getByRole('button', { name: /Resume/i }).first().click();
    await expect(page.getByText(/Player 1's turn/i).first()).toBeVisible();

    // Player 1 sleeps → handoff cover names Player 2 before revealing the board
    await page.getByRole('button', { name: /Sleep/i }).first().click();
    await expect(page.getByText(/Player 2/i).first()).toBeVisible({ timeout: 15_000 });
    const ready = page.getByRole('button', { name: /ready/i });
    if (await ready.count()) await ready.click();
    await expect(page.getByText(/Player 2's turn/i).first()).toBeVisible();
  });
});

test.describe('mute sync', () => {
  test('M key and HUD button stay in sync', async ({ page }) => {
    await seedSave(page, midGameSave());
    await page.getByRole('button', { name: /Resume/i }).first().click();

    // The mute button's accessible name is its emoji; target the title attr
    const muteBtn = page.locator('button[title*="ute (M)"]').first();
    await expect(muteBtn).toBeVisible();
    const initial = await muteBtn.textContent();
    await page.keyboard.press('m');
    await expect(muteBtn).not.toHaveText(initial); // icon flipped via keyboard
    await muteBtn.click();
    await expect(muteBtn).toHaveText(initial); // and back via button
  });
});

test.describe('stranded ride home', () => {
  test('ride home charges the displayed fare and ends the turn', async ({ page }) => {
    await seedSave(page, midGameSave({}, { currentLocation: 'coffee_shop', timeRemaining: 1, money: 500 }));
    await page.getByRole('button', { name: /Resume/i }).first().click();

    const rideBtn = page.getByRole('button', { name: /Ride home/i });
    await expect(rideBtn).toBeVisible();
    const fare = Number((await rideBtn.textContent()).match(/\$(\d+)/)?.[1]);
    await rideBtn.click();

    // Riding home zeroes the clock, so the week auto-ends: rent ($200) is
    // also charged before the save we read. Fare must match the button.
    const save = await waitForSaveWhere(page, s => s.week === 6);
    expect(save.week).toBe(6);
    expect(save.players[0].money).toBe(500 - fare - 200);
    expect(save.players[0].currentLocation).toBe('home');
  });
});
