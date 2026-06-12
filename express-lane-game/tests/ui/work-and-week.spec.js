import { test, expect } from 'playwright/test';
import { seedSave, midGameSave, waitForSave } from './helpers.js';

const withJob = (economy = 'Boom') => midGameSave(
  { economy },
  {
    currentLocation: 'megamart',
    job: { id: 'mm_cashier', title: 'Cashier', wage: 12, location: 'megamart', type: 'service', shiftsWorked: 0 },
  },
);

test.describe('work', () => {
  test('shift button preview equals the amount actually paid (audit M1)', async ({ page }) => {
    await seedSave(page, withJob('Boom'));
    await page.getByRole('button', { name: /Resume/i }).first().click();

    const fullShift = page.getByRole('button', { name: /Full.*8h/i }).first();
    await expect(fullShift).toBeVisible();
    const label = await fullShift.textContent();
    const promised = Number(label.match(/\+\$(\d+)/)?.[1]);
    expect(promised).toBeGreaterThan(0);

    const before = (await waitForSave(page)).players[0].money;
    await fullShift.click();
    const after = (await waitForSave(page)).players[0].money;
    expect(after - before).toBe(promised); // UI promise === reducer payment
  });

  test('W shortcut is swallowed while a modal is open (audit pass-check)', async ({ page }) => {
    await seedSave(page, withJob('Normal'));
    await page.getByRole('button', { name: /Resume/i }).first().click();
    const before = (await waitForSave(page)).players[0];

    await page.keyboard.press('g'); // goals modal
    await expect(page.getByText(/GOALS/i).first()).toBeVisible();
    await page.keyboard.press('w'); // must NOT work a shift through the modal
    await page.keyboard.press('Escape');

    const after = (await waitForSave(page)).players[0];
    expect(after.money).toBe(before.money);
    expect(after.timeRemaining).toBe(before.timeRemaining);
  });
});

test.describe('end week', () => {
  test('sleep ends the week and shows the receipt summary (audit M7)', async ({ page }) => {
    await seedSave(page, midGameSave({}, { currentLocation: 'home' }));
    await page.getByRole('button', { name: /Resume/i }).first().click();

    await page.getByRole('button', { name: /Sleep/i }).first().click();
    // A random event modal (40%/week) renders before the summary — dismiss it.
    const gotIt = page.getByRole('button', { name: /Got it/i });
    await expect(gotIt.or(page.getByText(/Week 5 Complete/i)).first()).toBeVisible({ timeout: 15_000 });
    if (await gotIt.count()) await gotIt.click();
    await expect(page.getByText(/Week 5 Complete/i)).toBeVisible({ timeout: 10_000 });
    // Receipt rows: rent always present
    await expect(page.getByText(/^Rent/).first()).toBeVisible();
    await expect(page.getByText(/^Net$/).first()).toBeVisible();

    await page.getByRole('button', { name: /Start Week 6/i }).click();
    const save = await waitForSave(page);
    expect(save.week).toBe(6);
  });
});
