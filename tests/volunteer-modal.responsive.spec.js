// @ts-check
const { test, expect } = require('@playwright/test');
const { SEL, gotoFresh, waitForOpen } = require('./helpers/volunteer-modal');

/**
 * Viewports chosen to cover the real edges: the narrowest phone still in use,
 * ordinary portrait phones, phones held sideways, tablets, laptops, and a short
 * desktop window — the case where a modal most often overflows unreachably.
 */
const VIEWPORTS = [
  { name: 'Galaxy Fold (320x653)', width: 320, height: 653 },
  { name: 'iPhone SE portrait (375x667)', width: 375, height: 667 },
  { name: 'iPhone 14 Pro (393x852)', width: 393, height: 852 },
  { name: 'iPhone SE landscape (667x375)', width: 667, height: 375 },
  { name: 'iPhone 14 landscape (852x393)', width: 852, height: 393 },
  { name: 'iPad portrait (768x1024)', width: 768, height: 1024 },
  { name: 'iPad landscape (1024x768)', width: 1024, height: 768 },
  { name: 'Laptop (1280x800)', width: 1280, height: 800 },
  { name: 'Short desktop window (1280x420)', width: 1280, height: 420 },
  { name: 'Full HD (1920x1080)', width: 1920, height: 1080 },
];

test.describe('Volunteer modal — responsive layout', () => {
  for (const vp of VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('fits inside the viewport horizontally', async ({ page }) => {
        await gotoFresh(page);
        await waitForOpen(page);

        const box = await page.locator(SEL.modal).boundingBox();
        expect(box).not.toBeNull();
        if (!box) return;

        expect(box.x, 'card overflows the left edge').toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, 'card overflows the right edge').toBeLessThanOrEqual(
          vp.width + 1
        );
      });

      test('the whole card is reachable — no content stranded off-screen', async ({ page }) => {
        await gotoFresh(page);
        await waitForOpen(page);

        const reach = await page.evaluate(() => {
          const card = document.querySelector('.vol-popup');
          const overlay = document.querySelector('#vol-popup-overlay');
          if (!card || !overlay) return null;
          const r = card.getBoundingClientRect();
          // Content is reachable if it fits, or if some ancestor can scroll to it.
          const scrollable = (el) => {
            let n = el;
            while (n && n !== document.body) {
              const s = getComputedStyle(n);
              if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) {
                return true;
              }
              n = n.parentElement;
            }
            return false;
          };
          return {
            top: r.top,
            bottom: r.bottom,
            viewportH: window.innerHeight,
            cardScrolls: scrollable(card),
            overlayScrolls: /(auto|scroll)/.test(getComputedStyle(overlay).overflowY),
          };
        });

        expect(reach).not.toBeNull();
        if (!reach) return;

        const overflowsTop = reach.top < -1;
        const overflowsBottom = reach.bottom > reach.viewportH + 1;

        if (overflowsTop || overflowsBottom) {
          expect(
            reach.cardScrolls || reach.overlayScrolls,
            `card overflows the viewport (top ${Math.round(reach.top)}, ` +
              `bottom ${Math.round(reach.bottom)} of ${reach.viewportH}) ` +
              `with no scrollable container — content is unreachable`
          ).toBe(true);
        }
      });

      test('the primary CTA is reachable and tappable', async ({ page }) => {
        await gotoFresh(page);
        await waitForOpen(page);

        const cta = page.locator(SEL.cta);
        await cta.scrollIntoViewIfNeeded();
        const box = await cta.boundingBox();

        expect(box, 'CTA has no layout box').not.toBeNull();
        if (!box) return;

        expect(box.height, 'CTA is below the 44px touch-target guideline').toBeGreaterThanOrEqual(
          40
        );
        // After scrolling it into view it must actually be within the viewport.
        expect(box.y).toBeGreaterThanOrEqual(-1);
        expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);

        // And a real click must land on it rather than an overlapping layer.
        await expect(cta).toBeVisible();
        const hitsCta = await page.evaluate(() => {
          const el = document.querySelector('.vol-popup-cta');
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && (hit === el || el.contains(hit));
        });
        expect(hitsCta, 'something is covering the CTA').toBe(true);
      });

      test('the close button is reachable and tappable', async ({ page }) => {
        await gotoFresh(page);
        await waitForOpen(page);

        const close = page.locator(SEL.close);
        await expect(close).toBeVisible();
        const box = await close.boundingBox();
        expect(box).not.toBeNull();
        if (!box) return;

        expect(box.y, 'close button is above the viewport').toBeGreaterThanOrEqual(-1);
        expect(box.y + box.height, 'close button is below the viewport').toBeLessThanOrEqual(
          vp.height + 1
        );

        await close.click({ timeout: 5000 });
        await expect(page.locator(SEL.overlay)).toBeHidden();
      });

      test('does not introduce horizontal page scroll', async ({ page }) => {
        const measure = () =>
          page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth
          );

        // Absolute, not relative to a baseline: the page itself must not scroll
        // sideways at any of these widths, with or without the dialog.
        await gotoFresh(page, { dismissed: true });
        await page.waitForTimeout(1200);
        const baseline = await measure();
        expect(
          baseline,
          `page overflows by ${baseline}px before the modal opens`
        ).toBeLessThanOrEqual(1);

        await gotoFresh(page);
        await waitForOpen(page);
        const withModal = await measure();
        expect(
          withModal,
          `page overflows by ${withModal}px with the modal open`
        ).toBeLessThanOrEqual(1);
      });
    });
  }
});

test.describe('Volunteer modal — orientation change', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('stays usable when the device is rotated while open', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(400);

    const cta = page.locator(SEL.cta);
    await cta.scrollIntoViewIfNeeded();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height, 'CTA fell outside the viewport after rotation').toBeLessThanOrEqual(
      376
    );
  });
});

test.describe('Volunteer modal — visual consistency', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('card geometry matches the design spec', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const style = await page.locator(SEL.modal).evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        width: Math.round(r.width),
        radius: s.borderTopLeftRadius,
        bg: s.backgroundColor,
        overflow: s.overflow,
      };
    });

    expect(style.width).toBe(460); // max-width from the spec
    expect(style.radius).toBe('20px');
    expect(style.bg).toBe('rgb(255, 255, 255)');
  });

  test('the card is optically centred', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const box = await page.locator(SEL.modal).boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const centreOffset = Math.abs(box.x + box.width / 2 - 1280 / 2);
    expect(centreOffset, 'card is not horizontally centred').toBeLessThanOrEqual(2);
  });

  test('role chips wrap without clipping', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const clipped = await page.evaluate(() => {
      const wrap = document.querySelector('.vol-popup-roles');
      if (!wrap) return true;
      const wr = wrap.getBoundingClientRect();
      return Array.from(document.querySelectorAll('.vol-popup-role')).some((chip) => {
        const r = chip.getBoundingClientRect();
        return (
          r.left < wr.left - 1 || r.right > wr.right + 1 || chip.scrollWidth > chip.clientWidth + 1
        );
      });
    });
    expect(clipped, 'a role chip is clipped or overflowing its container').toBe(false);
  });

  test('backdrop dims and blurs the page', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const s = await page.locator(SEL.overlay).evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        opacity: c.opacity,
        bg: c.backgroundColor,
        blur: c.backdropFilter || c.webkitBackdropFilter,
      };
    });

    expect(Number(s.opacity)).toBe(1);
    expect(s.bg).toContain('rgba(0, 0, 0');
    expect(s.blur, 'backdrop blur is not applied').toContain('blur');
  });
});
