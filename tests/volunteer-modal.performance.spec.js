// @ts-check
const { test, expect } = require('@playwright/test');
const { SEL, gotoFresh, waitForOpen } = require('./helpers/volunteer-modal');

test.describe('Volunteer modal — animation integrity', () => {
  test('entry opacity rises monotonically — no appear/disappear flash', async ({ page }) => {
    await gotoFresh(page);
    await page.waitForSelector(SEL.overlay, { state: 'attached' });

    // Sample the overlay's opacity every frame across the whole reveal. The
    // regression this guards against showed up as opacity going up, back down,
    // then up again while the compositor rebuilt the backdrop-filter layer.
    const samples = await page.evaluate(() => {
      return new Promise((resolve) => {
        const overlay = document.querySelector('#vol-popup-overlay');
        const out = [];
        const start = performance.now();
        (function frame() {
          if (!overlay || !overlay.isConnected) return resolve(out);
          out.push(Number(getComputedStyle(overlay).opacity));
          if (performance.now() - start < 2500) requestAnimationFrame(frame);
          else resolve(out);
        })();
      });
    });

    const revealed = samples.findIndex((v) => v > 0.01);
    expect(revealed, 'overlay never became visible').toBeGreaterThan(-1);

    const after = samples.slice(revealed);
    const peak = Math.max(...after);
    const dipAfterPeak = after.slice(after.indexOf(peak)).some((v) => v < peak - 0.05);

    expect(peak).toBeGreaterThan(0.95);
    expect(dipAfterPeak, `opacity dipped after reaching ${peak} — visible flash`).toBe(false);
  });

  test('card never renders at full size before animating in', async ({ page }) => {
    await gotoFresh(page);
    await page.waitForSelector(SEL.overlay, { state: 'attached' });

    // Before the reveal class lands, the card must already sit at the animation
    // from-state, otherwise it paints one frame at natural size and jumps.
    const preState = await page.evaluate(() => {
      const card = document.querySelector('.vol-popup');
      if (!card) return null;
      const s = getComputedStyle(card);
      return { opacity: Number(s.opacity), transform: s.transform };
    });

    expect(preState).not.toBeNull();
    if (!preState) return;
    expect(preState.opacity).toBe(0);
    expect(preState.transform).not.toBe('none');
  });

  test('the GPU layer hint is released after the entry animation', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);
    await page.waitForTimeout(600);

    const willChange = await page
      .locator(SEL.modal)
      .evaluate((el) => getComputedStyle(el).willChange);
    expect(willChange, 'will-change left permanently promoted').toBe('auto');
  });

  test('exit animation completes and cleans up', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const start = Date.now();
    await page.locator(SEL.close).click();
    await page.waitForSelector(SEL.overlay, { state: 'detached', timeout: 3000 });
    const elapsed = Date.now() - start;

    // Should track the 340ms teardown, not hang around for seconds.
    expect(elapsed).toBeLessThan(1500);
  });
});

test.describe('Volunteer modal — cost to the page', () => {
  test('adds no layout shift to the page', async ({ page }) => {
    await gotoFresh(page);

    await page.evaluate(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // @ts-ignore — layout-shift entries are not in the base typings
          if (!entry.hadRecentInput) window.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await waitForOpen(page);
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => window.__cls);
    // 0.1 is the "good" CLS threshold; opening a modal should cost ~0.
    expect(cls, `modal caused ${cls} cumulative layout shift`).toBeLessThan(0.1);
  });

  test('modal script is small and deferred', async ({ page }) => {
    const sizes = [];
    page.on('response', async (res) => {
      if (res.url().includes('volunteer-popup.js')) {
        const body = await res.body().catch(() => null);
        sizes.push(body ? body.length : 0);
      }
    });

    await gotoFresh(page);
    await waitForOpen(page);

    expect(sizes.length, 'volunteer-popup.js was not requested').toBeGreaterThan(0);
    expect(sizes[0], 'popup script has grown unexpectedly large').toBeLessThan(20_000);

    const isDeferred = await page.evaluate(() => {
      const s = document.querySelector('script[src*="volunteer-popup"]');
      return !!s && s.hasAttribute('defer');
    });
    expect(isDeferred).toBe(true);
  });

  test('does not block first paint', async ({ page }) => {
    await gotoFresh(page);
    // The hero must be painted well before the popup's 800ms reveal delay.
    await expect(page.locator('header.site-header')).toBeVisible({ timeout: 800 });
  });
});
