import { test, expect } from 'playwright/test';
import { freshStart, startNewGame, seedSave, midGameSave } from './helpers.js';

test.describe('start wizard', () => {
  test('walks all 4 steps and lands on the board', async ({ page }) => {
    await startNewGame(page);
    await expect(page.getByText(/Player 1's|Wk|Week/i).first()).toBeVisible();
    // HUD cash for normal difficulty
    await expect(page.getByText('$1,000').first()).toBeVisible();
  });

  test('multiplayer start seats 3 players', async ({ page }) => {
    await startNewGame(page, { players: 3 });
    await expect(page.getByText(/Player 1's turn/i).first()).toBeVisible();
    await expect(page.getByText(/1\/3/).first()).toBeVisible();
  });

  test('duplicate avatars are locked out per player (audit UX17)', async ({ page }) => {
    await freshStart(page);
    await page.getByRole('button', { name: /Next: Choose Difficulty/i }).click();
    await page.getByRole('button', { name: /Next: Choose Players/i }).click();
    await page.getByRole('button', { name: /2 Players/ }).click();
    await page.getByRole('button', { name: /Next: Choose Avatars/i }).click();
    // Player 1's default 😎 must be disabled in Player 2's row
    const rows = page.locator('div.rounded-2xl', { hasText: 'Player 2' });
    const p2Smiley = rows.getByRole('button', { name: '😎' });
    await expect(p2Smiley).toBeDisabled();
  });

  test('returning player sees Resume as the hero (audit M8)', async ({ page }) => {
    await seedSave(page, midGameSave({ week: 9 }));
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Resume — Week 9/i })).toBeVisible();
    await page.getByRole('button', { name: /Resume Saved Game/i }).click();
    await expect(page.getByText(/Wk 9|Week 9/i).first()).toBeVisible();
  });
});
