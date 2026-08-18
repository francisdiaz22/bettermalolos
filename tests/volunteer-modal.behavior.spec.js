// @ts-check
const { test, expect } = require('@playwright/test');
const { STORAGE_KEY, SEL, gotoFresh, waitForOpen } = require('./helpers/volunteer-modal');

test.describe('Volunteer modal — display & content', () => {
  test('appears on a first visit with all content intact', async ({ page }) => {
    await gotoFresh(page);
    const overlay = await waitForOpen(page);

    await expect(overlay).toBeVisible();
    await expect(page.locator(SEL.title)).toHaveText('Be Part of Something Greater');
    await expect(page.locator(SEL.roles)).toHaveCount(5);
    await expect(page.locator(SEL.cta)).toHaveAttribute(
      'href',
      'mailto:volunteer@bettersolano.org'
    );
    await expect(page.locator(SEL.close)).toBeVisible();
    await expect(page.locator(SEL.skip)).toBeVisible();
  });

  test('renders above every other stacking layer', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    // The element at the centre of the screen must belong to the modal, proving
    // nothing on the page paints over it.
    const ownedByModal = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return !!el && !!el.closest('#vol-popup-overlay');
    });
    expect(ownedByModal).toBe(true);
  });

  test('logo and icon fonts actually render', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const logo = page.locator('.vol-popup-logo');
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box && box.width).toBeGreaterThan(50);
    expect(box && box.height).toBeGreaterThan(10);
  });
});

test.describe('Volunteer modal — dismissal paths', () => {
  for (const [name, selector] of [
    ['close button', SEL.close],
    ['"Maybe Later"', SEL.skip],
  ]) {
    test(`${name} closes the modal and persists the choice`, async ({ page }) => {
      await gotoFresh(page);
      await waitForOpen(page);

      await page.locator(selector).click();
      await expect(page.locator(SEL.overlay)).toBeHidden();

      const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
      expect(stored).toBe('1');
    });
  }

  test('clicking the backdrop closes the modal', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    // Top-left corner of the viewport is backdrop, never card.
    await page.mouse.click(8, 8);
    await expect(page.locator(SEL.overlay)).toBeHidden();
  });

  test('clicking inside the card does NOT close the modal', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await page.locator('.vol-popup-lead').click();
    await page.waitForTimeout(400);
    await expect(page.locator(SEL.overlay)).toBeVisible();
  });

  test('Escape closes the modal', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await page.keyboard.press('Escape');
    await expect(page.locator(SEL.overlay)).toBeHidden();
  });

  test('does not reappear for a returning visitor', async ({ page }) => {
    await gotoFresh(page, { dismissed: true });
    await page.waitForTimeout(1600); // well past the 800ms show delay

    const overlay = page.locator(SEL.overlay);
    // Being stripped from the DOM is the strongest form of "did not reappear";
    // if the markup is still present it must at least be fully hidden.
    if ((await overlay.count()) === 0) return;
    await expect(overlay).toBeHidden();
  });

  test('the overlay is removed from the DOM after closing', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await page.locator(SEL.close).click();
    await expect(page.locator(SEL.overlay)).toHaveCount(0, { timeout: 3000 });
  });
});

test.describe('Volunteer modal — scroll lock', () => {
  test('page behind the modal cannot be scrolled', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const before = await page.evaluate(() => window.scrollY);

    // Mobile WebKit exposes no wheel input, so try it where it exists and always
    // follow with a programmatic scroll — the pinned body leaves the document
    // with nothing to scroll, so neither route may move the page.
    try {
      await page.mouse.wheel(0, 600);
    } catch (e) {
      /* wheel unsupported on this device profile */
    }
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBe(before);
  });

  test('scrolling is restored after dismissal', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);
    await page.locator(SEL.close).click();
    await page.waitForTimeout(400);

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('');
  });

  test('body is pinned, so touch scrolling cannot chain through on iOS', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    // iOS Safari ignores `overflow: hidden` on <body> for touch scrolling; only
    // pinning with position:fixed actually holds. Synthetic touch events do not
    // drive real scrolling in any engine, so assert the mechanism directly.
    const locked = await page.evaluate(() => getComputedStyle(document.body).position);
    expect(locked).toBe('fixed');

    await page.locator(SEL.close).click();
    await page.waitForTimeout(400);

    const released = await page.evaluate(() => getComputedStyle(document.body).position);
    expect(released).not.toBe('fixed');
  });

  test('reading position survives the modal opening and closing', async ({ page }) => {
    await gotoFresh(page);
    // Scroll during the 800ms window before the popup reveals itself.
    await page.evaluate(() => window.scrollTo(0, 350));
    await page.waitForTimeout(120);

    await waitForOpen(page);
    await page.locator(SEL.close).click();
    await page.waitForTimeout(500);

    const restored = await page.evaluate(() => window.scrollY);
    expect(Math.abs(restored - 350), `scroll jumped to ${restored}, expected ~350`).toBeLessThan(
      20
    );
  });

  test('locking the scroll does not shift the page horizontally', async ({ page }) => {
    await gotoFresh(page);

    const widthBefore = await page.evaluate(() => document.documentElement.clientWidth);
    await waitForOpen(page);
    const widthAfter = await page.evaluate(() => document.documentElement.clientWidth);

    expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(1);
  });
});

test.describe('Volunteer modal — resilience', () => {
  test('survives localStorage being unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate Safari private browsing / cookies-blocked, where access throws.
      const boom = () => {
        throw new Error('SecurityError: localStorage is disabled');
      };
      try {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get: boom,
        });
      } catch (e) {
        /* engine refused the override; test still meaningful elsewhere */
      }
    });
    await page.route('**/*', (r) =>
      r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()
    );

    // Every script on the page must tolerate this, not just the popup — a throw
    // anywhere here runs before the dialog and takes the page down with it.
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForOpen(page);

    await expect(page.locator(SEL.overlay)).toBeVisible();
    await page.locator(SEL.close).click();
    await expect(page.locator(SEL.overlay)).toBeHidden();
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('page still translates when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      const boom = () => {
        throw new Error('SecurityError: localStorage is disabled');
      };
      try {
        Object.defineProperty(window, 'localStorage', { configurable: true, get: boom });
      } catch (e) {
        /* engine refused the override */
      }
    });
    await page.route('**/*', (r) =>
      r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()
    );

    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForOpen(page);

    // The translation engine reads the saved language during init. When that
    // read threw, the engine aborted and left every data-i18n node untouched.
    const initialised = await page.evaluate(
      () => !!(window.TranslationEngine && window.TranslationEngine.initialized)
    );
    expect(initialised, 'translation engine failed to initialise').toBe(true);
  });

  test('opens without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoFresh(page);
    await waitForOpen(page);
    await page.locator(SEL.close).click();
    await page.waitForTimeout(400);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('rapid repeated dismissal clicks are harmless', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoFresh(page);
    await waitForOpen(page);

    const close = page.locator(SEL.close);
    await close.click();
    // Fire more clicks while the exit animation is still running.
    for (let i = 0; i < 3; i++) {
      await close.click({ force: true, timeout: 1000 }).catch(() => {});
    }

    await expect(page.locator(SEL.overlay)).toHaveCount(0, { timeout: 3000 });
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });
});
