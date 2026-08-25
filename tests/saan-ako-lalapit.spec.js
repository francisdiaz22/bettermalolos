const { test, expect } = require('@playwright/test');
const { gotoSitePage } = require('./helpers/site');

test.use({ serviceWorkers: 'block' });

test.describe('Saan Ako Lalapit? feature suite', () => {
  test('renders hero, search input, categories, and concern results', async ({ page }) => {
    await gotoSitePage(page, 'saan-ako-lalapit');

    await expect(page).toHaveTitle(/Saan Ako Lalapit\?/);
    await expect(page.locator('h1')).toHaveText('Saan Ako Lalapit?');

    const searchInput = page.locator('#sal-search-input');
    await expect(searchInput).toBeVisible();

    const categoryButtons = page.locator('.sal-cat-btn');
    await expect(categoryButtons.first()).toBeVisible();
    const catCount = await categoryButtons.count();
    expect(catCount).toBeGreaterThan(5);

    const concernCards = page.locator('.sal-concern-card');
    await expect(concernCards.first()).toBeVisible();
    const count = await concernCards.count();
    expect(count).toBeGreaterThan(10);
  });

  test('searches for birth certificate and finds relevant office with deep-link guide', async ({
    page,
  }) => {
    await gotoSitePage(page, 'saan-ako-lalapit');

    const searchInput = page.locator('#sal-search-input');
    await searchInput.fill('birth certificate');

    const results = page.locator('.sal-concern-card');
    await expect(results.first()).toBeVisible();
    await expect(results.first()).toContainText(/Birth Certificate/i);
    const guideBtn = results.first().locator('.sal-guide-btn');
    if ((await guideBtn.count()) > 0) {
      await expect(guideBtn.first()).toHaveAttribute('href', /service-details/);
    }
  });

  test('filters by category on sidebar click', async ({ page }) => {
    await gotoSitePage(page, 'saan-ako-lalapit');

    const businessCatBtn = page.locator('.sal-cat-btn[data-category="business-permits"]');
    await expect(businessCatBtn).toBeVisible();
    await businessCatBtn.click();

    await expect(businessCatBtn).toHaveClass(/active/);

    const results = page.locator('.sal-concern-card');
    await expect(results.first()).toBeVisible();
    await expect(results.first()).toContainText(/Business|Negosyo|Tricycle/i);
  });

  test('handles Filipino keyword searches properly', async ({ page }) => {
    await gotoSitePage(page, 'saan-ako-lalapit');

    const searchInput = page.locator('#sal-search-input');
    await searchInput.fill('amilyar');

    const results = page.locator('.sal-concern-card');
    await expect(results.first()).toBeVisible();
    await expect(results.first()).toContainText(/Property Tax|Amilyar/i);
  });

  test('switches language with TranslationEngine', async ({ page }) => {
    await gotoSitePage(page, 'saan-ako-lalapit');

    const filBtn = page.locator('.lang-btn[data-lang="fil"]');
    await filBtn.click();

    // Allow for async translation updates
    await page.waitForTimeout(200);

    const resultsTitle = page.locator('.sal-results-title');
    await expect(resultsTitle).toBeVisible();
    await expect(resultsTitle).toHaveText('Mga Opisina at Hakbang na Gagawin');
  });

  test('toggles category filter on mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoSitePage(page, 'saan-ako-lalapit');

    const toggleBtn = page.locator('#sal-sidebar-toggle');
    await expect(toggleBtn).toBeVisible();

    const categoryList = page.locator('#sal-category-list');
    await expect(categoryList).toBeHidden();

    await toggleBtn.click();
    await expect(categoryList).toBeVisible();
    await expect(categoryList).toHaveClass(/sal-expanded/);

    await toggleBtn.click();
    await expect(categoryList).toBeHidden();
  });
});
