const { test, expect } = require('@playwright/test');
const { gotoSitePage, horizontalOverflow } = require('./helpers/site');

test.describe('Budget — national funding context', () => {
  test('shows the local Phase 3 preview while keeping review status explicit', async ({ page }) => {
    await gotoSitePage(page, '/budget/');

    const context = page.locator('[data-national-budget-context]');
    await expect(context).toContainText('National funding context');
    await expect(context.locator('[data-budget-status]')).toContainText('Local preview only');
    await expect(context).toContainText('₱1,250,000,000.00');
    await expect(context).toContainText('GAA · FY 2026');
    await expect(context).toContainText('National-government context; not an LGU Malolos appropriation.');

    await expect(page.locator('#sre-total-receipts')).toContainText('₱1,837.57 M');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
