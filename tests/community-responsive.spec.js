// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoSitePage, horizontalOverflow, useFirstPartyOnly } = require('./helpers/site');

test.use({ serviceWorkers: 'block' });

const VIEWPORTS = [
  { name: 'narrow mobile', width: 320, height: 700 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of ['/index.html', '/ideas/']) {
      test(`${path} has no horizontal overflow`, async ({ page }) => {
        await gotoSitePage(page, path);
        await page.locator('[data-community-tools] .community-tool-card').last().waitFor();
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      });
    }
  });
}

test('the ideas page stays usable with reduced motion requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoSitePage(page, '/ideas/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-community-tools] .community-tool-card')).toHaveCount(8);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test.describe('JavaScript-disabled ideas fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('keeps the intake readable and unable to claim receipt', async ({ page }) => {
    await useFirstPartyOnly(page);
    await page.goto('/ideas/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#channel-status')).toContainText('Submissions are not open yet');
    await expect(page.getByRole('button', { name: 'Submissions not open yet' })).toHaveAttribute(
      'type',
      'button'
    );
    await expect(page.locator('.ideas-form')).not.toHaveAttribute('action');
  });
});
