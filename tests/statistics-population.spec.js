const { test, expect } = require('@playwright/test');

test.describe('Statistics — 2024 population by barangay', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    });

    await page.goto('/statistics/');
  });

  test('shows all 51 Malolos barangays and reconciles to the city total', async ({ page }) => {
    const topRows = page.locator('#barangayTopList .barangay-row');
    const remainingRows = page.locator('#barangayRemainingList .barangay-row');

    await expect(topRows).toHaveCount(10);
    await expect(remainingRows).toHaveCount(41);
    await expect(topRows.first()).toContainText('Longos');
    await expect(topRows.first()).toContainText('17,863');
    await expect(remainingRows.last()).toContainText('Caliligawan');
    await expect(remainingRows.last()).toContainText('530');

    const populations = await page
      .locator('.stats-distribution .barangay-row .pop')
      .allTextContents();
    const total = populations.reduce((sum, value) => sum + Number(value.replaceAll(',', '')), 0);
    expect(total).toBe(269809);

    await expect(page.locator('.more-barangays summary')).toHaveText('View all 51 barangays');
  });

  test('shows the reviewed PSA data context with provenance', async ({ page }) => {
    const context = page.locator('[data-psa-context]');
    await expect(context.locator('.psa-context-card')).toHaveCount(3);
    await expect(context).toContainText('269,809');
    await expect(context).toContainText('PSA-2024-POPCEN');
    await expect(context).toContainText('PSGC-Q2_2024');
    await expect(context).toContainText('Reviewed 2026-09-21');
  });
});
