const { test, expect } = require('@playwright/test');
const { gotoSitePage, horizontalOverflow } = require('./helpers/site');

test.describe('Budget — Malolos BetterGov data', () => {
  test('shows the reviewed Malolos snapshot with provenance', async ({ page }) => {
    await gotoSitePage(page, '/budget/');

    const context = page.locator('[data-malolos-budget]');
    await expect(context).toContainText('Malolos budget data');
    await expect(context).toContainText('Bulacan State University FY 2026 total');
    await expect(context).toContainText('₱2,036,641,000');
    await expect(context).toContainText('₱2.11B');
    await expect(context).toContainText('≈₱73.36M');
    await expect(context.locator('[data-budget-status]')).toBeHidden();
    await expect(context.locator('[data-budget-progress-wrap]')).toHaveCount(1);
    await expect(context.locator('[data-budget-progress-wrap]')).toBeHidden();
    await expect(context.locator('[data-budget-progress]')).toHaveAttribute('aria-valuenow', '100');
    await expect(context.locator('[data-budget-progress-label]')).toHaveText('Snapshot loaded.');
    await expect(context).toContainText('₱294,000,000.00');
    await expect(context.locator('.budget-context-scope')).toHaveCount(0);
    await expect(context.locator('.budget-explorer-summary')).toContainText('Records');
    await expect(context.locator('.budget-explorer-table tbody tr')).toHaveCount(42);
    await expect(context).toContainText('Construction of Sports and Recreation Zone Phase II, Bulacan State University Campus II');
    await expect(context).toContainText('Construction of Five-Storey Student Dormitory and Staff Housing Facility Phase I, Bulacan State University Campus II');
    await expect(context).toContainText('₱150,000,000.00');
    await expect(context).toContainText('₱50,000,000.00');
    await expect(context).toContainText('General Administration and Support (DBM F.4 regular program)');
    await expect(context).toContainText('Operations (DBM F.4 regular program)');
    await expect(context).toContainText('₱1,417,499,000.00');
    await expect(context.locator('.budget-explorer-controls input')).toBeVisible();

    await context.locator('.budget-explorer-controls select').selectOption({ label: 'State Universities and Colleges (SUCs)' });
    await expect(context.locator('.budget-explorer-table tbody tr')).toHaveCount(7);
    await expect(context.locator('.budget-explorer-summary')).toContainText('₱2,036,641,000.00');

    await expect(page.locator('#sre-total-receipts')).toContainText('₱1,837.57 M');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
