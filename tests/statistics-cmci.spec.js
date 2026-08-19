const { test, expect } = require('@playwright/test');

test.describe('Statistics — Malolos CMCI performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/statistics/#competitive-index');
  });

  test('shows the official 2024 score, rank, and methodology context', async ({ page }) => {
    const section = page.locator('#competitive-index');

    await expect(section.getByRole('heading', { name: 'Malolos Competitive Index' })).toBeVisible();
    await expect(section).toContainText('Overall Score and Rank (2016-2024)');

    const pillarCards = section.locator('.cmci-pillar-card');
    await expect(pillarCards).toHaveCount(5);
    await expect(pillarCards.nth(0)).toContainText('3.4090');
    await expect(pillarCards.nth(0)).toContainText('2024 rank: #87');
    await expect(pillarCards.nth(1)).toContainText('11.3715');
    await expect(pillarCards.nth(1)).toContainText('2024 rank: #17');

    await expect(section.locator('.cmci-methodology-note')).toContainText('five beginning in 2022');
    await expect(section.locator('.data-source a')).toHaveAttribute(
      'href',
      'https://cmci.dti.gov.ph/lgu-profile.php?lgu=Malolos&year=2024'
    );
  });

  test('opens every pillar panel with its corrected 2024 indicators', async ({ page }) => {
    const expected = {
      'economic-dynamism': ['0.0989', '0.0113', '0.5756', '0.4683', '0.0381'],
      'government-efficiency': ['1.9643', '1.9524', '2.0000', '2.0000', '1.9198'],
      infrastructure: ['0.0042', '1.7339', '1.5875', '0.1975', '0.4413'],
      resiliency: ['1.9091', '1.3282', '1.0060', '0.0658', '2.0000'],
      innovation: ['2.0001', '0.0909', '2.0000', '0.5344', '0.4904'],
    };

    for (const [pillar, values] of Object.entries(expected)) {
      await page.locator(`.cmci-tab[data-pillar="${pillar}"]`).click();
      const panel = page.locator(`#panel-${pillar}`);
      await expect(panel).toBeVisible();
      await expect(panel.locator('.indicator-value')).toHaveText(values);
      await expect(panel.locator('canvas')).toBeVisible();
    }
  });
});
