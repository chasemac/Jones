import { test, expect } from 'playwright/test';
import { seedSave, midGameSave, waitForSave } from './helpers.js';

test.describe('persistence', () => {
  test('mid-week reload restores money/time/location exactly', async ({ page }) => {
    await seedSave(page, midGameSave({}, { money: 777, timeRemaining: 42, hunger: 33 }));
    await page.getByRole('button', { name: /Resume/i }).first().click();
    await expect(page.getByText('$777').first()).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: /Resume/i }).first().click();
    await expect(page.getByText('$777').first()).toBeVisible();
    const save = await waitForSave(page);
    expect(save.players[0].timeRemaining).toBe(42);
    expect(save.players[0].hunger).toBe(33);
  });

  test('pending week summary survives a reload (audit M9)', async ({ page }) => {
    const save = midGameSave();
    save.weekSummary = {
      week: 4,
      lines: [{
        emoji: '😎', name: 'Player 1', money: 800, happiness: 50, dependability: 50,
        hunger: 20, relaxation: 50, netWorth: 800, netWorthDelta: -200, job: 'Unemployed',
        currentCourse: null,
        receipt: { earned: 0, shifts: 0, rent: 200, rentDebt: 0, subscriptions: 0, doctor: 0, debtInterest: 0, savingsInterest: 0, equityGain: 0, spoiled: false, net: -200 },
        takeaway: '💡 Biggest cost this week: rent ($200).',
      }],
    };
    await seedSave(page, save);
    await page.getByRole('button', { name: /Resume/i }).first().click();
    // The unacknowledged summary modal must reappear after resume
    await expect(page.getByText(/Week 4 Complete/i)).toBeVisible();
    await expect(page.getByText(/Biggest cost this week/i)).toBeVisible();
  });
});
