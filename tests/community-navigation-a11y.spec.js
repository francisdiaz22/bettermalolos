// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoSitePage } = require('./helpers/site');

test.use({ serviceWorkers: 'block' });

test.describe('v1.0.3 navigation and accessibility', () => {
  test('desktop dropdowns expose state and support arrow-key navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoSitePage(page, '/index.html');

    const trigger = page.locator('.nav-community-tools > a');
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav-community-tools .dropdown-menu a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile navigation has the specified visual order and traps focus while open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoSitePage(page, '/index.html');

    const toggle = page.getByRole('button', { name: 'Toggle Navigation' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const visualOrder = await page.locator('.main-nav > ul > li').evaluateAll((items) =>
      items
        .map((item) => ({ className: item.className, top: item.getBoundingClientRect().top }))
        .sort((a, b) => a.top - b.top)
        .map(({ className }) => className)
    );
    expect(visualOrder).toEqual([
      'has-dropdown nav-community-tools',
      'has-dropdown nav-barangays',
      'has-dropdown nav-get-involved',
      'has-dropdown nav-projects-budget',
      'nav-services',
      'has-dropdown nav-city-information',
    ]);

    await page.locator('.nav-get-involved > a').click();
    await expect(page.locator('.nav-get-involved > a')).toHaveAttribute('aria-expanded', 'true');
    const visibleLinks = page.locator('.main-nav a:visible');
    const firstLink = visibleLinks.first();
    const lastLink = visibleLinks.last();
    await lastLink.focus();
    await page.keyboard.press('Tab');
    await expect(firstLink).toBeFocused();
    await firstLink.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(lastLink).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  for (const path of ['/index.html', '/ideas/']) {
    test(`${path} has a usable document outline, landmarks, and skip link`, async ({ page }) => {
      await gotoSitePage(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('header')).toHaveCount(1);
      await expect(page.locator('nav.main-nav[aria-label]')).toHaveCount(1);
      await expect(page.locator('main#main-content')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);

      const skippedLevel = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((headings) => {
        const levels = headings.map((heading) => Number(heading.tagName.slice(1)));
        return levels.some((level, index) => index > 0 && level > levels[index - 1] + 1);
      });
      expect(skippedLevel).toBe(false);

      const skip = page.getByRole('link', { name: 'Skip to main content' });
      await skip.focus();
      await expect(skip).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#main-content$/);
    });
  }

  test('proposed status text meets WCAG AA contrast', async ({ page }) => {
    await gotoSitePage(page, '/index.html');
    const ratio = await page
      .locator('.community-status--proposed')
      .first()
      .evaluate((element) => {
        const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const luminance = (color) =>
          color
            .map((channel) => {
              const value = channel / 255;
              return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        const style = getComputedStyle(element);
        const light = Math.max(luminance(rgb(style.color)), luminance(rgb(style.backgroundColor)));
        const dark = Math.min(luminance(rgb(style.color)), luminance(rgb(style.backgroundColor)));
        return (light + 0.05) / (dark + 0.05);
      });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
