const { test, expect } = require('@playwright/test');
const { gotoSitePage, horizontalOverflow } = require('./helpers/site');

test.describe('Budget — Malolos BetterGov data', () => {
  test('shows the reviewed Malolos snapshot with provenance', async ({ page }) => {
    await gotoSitePage(page, '/budget/');

    const context = page.locator('[data-malolos-budget]');
    await expect(context).toContainText('Malolos budget data');
    await expect(context.locator('[data-budget-status]')).toBeHidden();
    await expect(context).toContainText('₱294,000,000.00');
    await expect(context).toContainText('BetterGov budget records returned for the Malolos search scope');

    await expect(page.locator('#sre-total-receipts')).toContainText('₱1,837.57 M');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
