const { test, expect } = require('@playwright/test');
const { gotoSitePage, horizontalOverflow } = require('./helpers/site');

test.describe('Budget — Malolos BetterGov data', () => {
  test('shows the reviewed Malolos snapshot with provenance', async ({ page }) => {
    await gotoSitePage(page, '/budget/');

    const context = page.locator('[data-malolos-budget]');
    await expect(context).toContainText('Malolos budget data');
    await expect(context.locator('[data-budget-status]')).toBeHidden();
    await expect(context).toContainText('₱294,000,000.00');
    await expect(context.locator('.budget-context-scope')).toHaveCount(0);
    await expect(context.locator('.budget-explorer-summary')).toContainText('Records');
    await expect(context.locator('.budget-explorer-table tbody tr')).toHaveCount(25);
    await expect(context.locator('.budget-explorer-controls input')).toBeVisible();

    await expect(page.locator('#sre-total-receipts')).toContainText('₱1,837.57 M');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
