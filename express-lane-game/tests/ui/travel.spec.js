import { test, expect } from 'playwright/test';
import { seedSave, midGameSave, waitForSaveWhere } from './helpers.js';

test.describe('travel', () => {
  test('clicking a shop node travels there and charges time', async ({ page }) => {
    await seedSave(page, midGameSave({}, { currentLocation: 'home', timeRemaining: 60 }));
    await page.getByRole('button', { name: /Resume/i }).first().click();
    // The current location's panel auto-opens over the board — dismiss it
    // before clicking ring nodes, as a player would.
    await page.keyboard.press('Escape');

    // Shops expose descriptive aria-labels (verified in the UX audit)
    const quickEats = page.getByRole('button', { name: /Quick Eats/i }).first();
    await expect(quickEats).toBeVisible();
    await quickEats.click();

    // Travel animates the token before dispatching — poll the save
    const save = await waitForSaveWhere(page, s => s.players[0].currentLocation === 'quick_eats');
    expect(save.players[0].currentLocation).toBe('quick_eats');
    expect(save.players[0].timeRemaining).toBeLessThan(60);
  });

  test('bottom-ring shops are clickable, not buried under the HUD (audit B4/M10)', async ({ page }) => {
    await seedSave(page, midGameSave({}, { currentLocation: 'home' }));
    await page.getByRole('button', { name: /Resume/i }).first().click();
    await page.keyboard.press('Escape'); // dismiss the auto-opened home panel

    const blacks = page.getByRole('button', { name: /Black's Mkt/i }).first();
    await expect(blacks).toBeVisible();
    // Center point must hit the node itself (elementFromPoint check)
    const box = await blacks.boundingBox();
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[aria-label*="Black"]') != null || el?.textContent?.includes('Black') || false;
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit).toBe(true);
  });
});
