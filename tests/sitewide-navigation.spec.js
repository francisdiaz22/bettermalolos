// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { gotoSitePage } = require('./helpers/site');

test.use({ serviceWorkers: 'block' });

const root = path.resolve(__dirname, '..');
const excludedDirectories = new Set([
  '.git',
  'admin',
  'dist',
  'node_modules',
  'playwright-report',
  'react-app',
  'test-results',
]);
const expectedSections = [
  'nav-community-tools',
  'nav-barangays',
  'nav-projects-budget',
  'nav-services',
  'nav-city-information',
  'nav-get-involved',
];

function publicHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) return [];
      return publicHtmlFiles(path.join(directory, entry.name));
    }
    return entry.name.endsWith('.html') ? [path.join(directory, entry.name)] : [];
  });
}

test.describe('site-wide resident navigation', () => {
  test('every standard public header uses the canonical architecture and root-safe links', () => {
    for (const file of publicHtmlFiles(root)) {
      const source = fs.readFileSync(file, 'utf8');
      const header = source.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
      if (!header) continue;

      const positions = expectedSections.map((className) => header.indexOf(className));
      expect(positions, path.relative(root, file)).not.toContain(-1);
      expect(positions, path.relative(root, file)).toEqual([...positions].sort((a, b) => a - b));
      expect(header).toContain('src="/assets/images/logo/better-malolos-main.png"');
      expect(header).toContain('href="/ideas/"');
      expect(header).not.toMatch(
        />\s*(Home|Government|Statistics|Legislative|Transparency)\s*<\/a>/
      );

      for (const [, href] of header.matchAll(/href="([^"]+)"/g)) {
        if (!href.startsWith('/')) continue;
        const pathname = new URL(href, 'https://bettermalolos.org').pathname;
        const destination = path.join(root, pathname.slice(1), 'index.html');
        expect(fs.existsSync(destination), `${path.relative(root, file)}: ${href}`).toBe(true);
      }
    }
  });

  const routes = [
    {
      route: '/budget/',
      section: 'projects-budget',
      parent: ['Projects & Budget', '/budget/'],
      current: 'City Budget & Transparency',
    },
    { route: '/services/', section: 'services', current: 'Services' },
    {
      route: '/government/',
      section: 'city-information',
      parent: ['City Information', '/government/'],
      current: 'Government & Officials',
    },
    {
      route: '/ideas/',
      section: 'get-involved',
      parent: ['Get Involved', '/ideas/'],
      current: 'Ideas',
    },
    {
      route: '/service-details/birth-certificate.html',
      section: 'services',
      parent: ['Services', '../services/'],
      current: 'Birth Certificate',
    },
  ];

  for (const { route, section, parent, current: currentLabel } of routes) {
    test(`${route} identifies its resident-facing section`, async ({ page }) => {
      await gotoSitePage(page, route);

      const current = page.locator(`[data-nav-section="${section}"] > a`);
      await expect(current).toHaveClass(/active/);
      await expect(current).toHaveAttribute('aria-current', /^(page|location)$/);
      await expect(page.locator('.main-nav > ul > li')).toHaveCount(6);
      await expect(page.locator('.breadcrumbs [aria-current="page"]')).toHaveText(currentLabel);
      if (parent) {
        await expect(
          page.locator('.breadcrumbs').getByRole('link', { name: parent[0] })
        ).toHaveAttribute('href', parent[1]);
      }
    });
  }

  test('nested pages keep the same mobile order and touch-friendly dropdown behavior', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoSitePage(page, '/service-details/birth-certificate.html');

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

    const getInvolved = page.locator('.nav-get-involved > a');
    await getInvolved.click();
    await expect(getInvolved).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav-get-involved .dropdown-menu')).toBeVisible();
    await expect(page.locator('.nav-get-involved .dropdown-menu a').first()).toHaveAttribute(
      'href',
      '/ideas/'
    );
  });

  test('revised breadcrumbs expose the new hierarchy and translate it', async ({ page }) => {
    await gotoSitePage(page, '/budget/');
    const breadcrumbs = page.locator('.breadcrumbs');

    await expect(breadcrumbs.locator(':scope > *')).toHaveText([
      'Home',
      '/',
      'Projects & Budget',
      '/',
      'City Budget & Transparency',
    ]);
    await expect(breadcrumbs.getByRole('link', { name: 'Projects & Budget' })).toHaveAttribute(
      'href',
      '/budget/'
    );

    await page.locator('.lang-btn[data-lang="fil"]').click();
    await expect(breadcrumbs.locator(':scope > *')).toHaveText([
      'Tahanan',
      '/',
      'Mga Proyekto at Badyet',
      '/',
      'Badyet at Transparency ng Lungsod',
    ]);
  });
});
