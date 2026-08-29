// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoSitePage } = require('./helpers/site');

test.use({ serviceWorkers: 'block' });

test.describe('v1.0.3 community-first homepage', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSitePage(page, '/index.html');
  });

  test('presents the release promise, actions, and roadmap honestly', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Better tools and information for a better Malolos.'
    );
    await expect(page.getByText('Independent. Community-built. For Malolos.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Community Tools' })).toHaveAttribute(
      'href',
      '#community-tools'
    );
    await expect(
      page.locator('#main-content').getByRole('link', { name: 'Suggest an Idea', exact: true })
    ).toHaveAttribute('href', '/ideas');

    const cards = page.locator('[data-community-tools] .community-tool-card');
    await expect(cards).toHaveCount(8);
    await expect(cards.locator('.community-status')).toHaveCount(8);
    expect(await cards.locator('a').count(), 'proposed tools must not expose dead routes').toBe(0);
    await expect(cards.nth(0)).toContainText('Bantay Baha');
    await expect(cards.nth(7)).toContainText('Opportunities Hub');
  });

  test('keeps the required content order and working resident destinations', async ({ page }) => {
    const orderIsCorrect = await page.evaluate(() => {
      const selectors = [
        '.home-hero-v2',
        '#community-tools',
        '.home-suggestion-section',
        '#barangay-hub',
        '#project-tracker',
        '.community-tools-section--more',
        '#government-services',
        '.home-volunteer-section',
      ];
      const nodes = selectors.map((selector) => document.querySelector(selector));
      return nodes.every(
        (node, index) =>
          node &&
          (index === 0 ||
            Boolean(
              nodes[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING
            ))
      );
    });
    expect(orderIsCorrect).toBe(true);

    for (const href of ['/ideas/', '/services/', '/budget/', '/government/']) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} should resolve`).toBeLessThan(400);
    }
  });
});

test.describe('v1.0.3 ideas intake', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSitePage(page, '/ideas/');
  });

  test('exposes the required, labelled form contract', async ({ page }) => {
    const required = ['submission-type', 'idea-title', 'description', 'category'];
    for (const id of required) {
      const control = page.locator(`#${id}`);
      await expect(control).toHaveAttribute('required', '');
      expect(await control.getAttribute('aria-describedby')).toBeTruthy();
    }

    await expect(page.getByLabel('Submission type')).toHaveCount(1);
    await expect(page.getByLabel('Title')).toHaveCount(1);
    await expect(page.getByLabel('Description')).toHaveCount(1);
    await expect(page.getByLabel('Category')).toHaveCount(1);
    expect(await page.locator('fieldset').count()).toBe(3);
    expect(await page.locator('#submission-type option').count()).toBe(6);
    expect(await page.locator('#category option').count()).toBe(19);
  });

  test('uses native validation while the production channel remains safely paused', async ({
    page,
  }) => {
    const form = page.locator('.ideas-form');
    expect(await form.evaluate((element) => element.checkValidity())).toBe(false);

    await page.locator('#submission-type').selectOption('idea');
    await page.locator('#idea-title').fill('Safer school crossings');
    await page.locator('#description').fill('Clear crossing information would help residents.');
    await page.locator('#category').selectOption('Safety');
    expect(await form.evaluate((element) => element.checkValidity())).toBe(true);

    const paused = page.getByRole('button', { name: 'Submissions not open yet' });
    await expect(paused).toHaveAttribute('type', 'button');
    await expect(paused).toHaveAttribute('aria-disabled', 'true');
    await expect(form).not.toHaveAttribute('action');
    await expect(page.locator('#channel-status')).toHaveAttribute('role', 'status');
  });

  test('removes contact values whenever anonymous mode is restored', async ({ page }) => {
    const anonymous = page.getByLabel('Submit anonymously');
    const contact = page.locator('#contact-fields');
    const name = page.getByLabel('Name', { exact: true });
    const email = page.getByLabel('Email', { exact: true });

    await expect(anonymous).toBeChecked();
    await expect(contact).toBeHidden();
    await expect(name).toBeDisabled();
    await anonymous.uncheck();
    await expect(contact).toBeVisible();
    await name.fill('Resident');
    await email.fill('resident@example.com');
    await anonymous.check();
    await expect(contact).toBeHidden();
    await expect(name).toHaveValue('');
    await expect(email).toHaveValue('');
    await expect(name).toBeDisabled();
  });

  test('supports contextual links and both site languages', async ({ page }) => {
    await page.goto('/ideas/?submissionType=source#submission-type');
    await expect(page.locator('#submission-type')).toHaveValue('source');

    await page.getByRole('button', { name: 'Switch to Filipino' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
    await expect(page.locator('#channel-status')).toContainText(/hindi pa bukas/i);
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('loads first-party data without script or local-request failures', async ({ page }) => {
    // Let requests from beforeEach settle so the reload does not report an
    // intentionally cancelled favicon request from the initial navigation.
    await page.waitForLoadState('load');

    const pageErrors = [];
    const failedLocalRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      if (request.url().startsWith('http://localhost')) failedLocalRequests.push(request.url());
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-community-tools] .community-tool-card')).toHaveCount(8);
    expect(pageErrors).toEqual([]);
    expect(failedLocalRequests).toEqual([]);
  });
});
