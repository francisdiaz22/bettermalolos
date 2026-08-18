// @ts-check
const { test, expect } = require('@playwright/test');
const { SEL, gotoFresh, waitForOpen } = require('./helpers/volunteer-modal');

test.describe('Volunteer modal — semantics', () => {
  test('exposes correct dialog semantics when open', async ({ page }) => {
    await gotoFresh(page);
    const overlay = await waitForOpen(page);

    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');
    await expect(overlay).toHaveAttribute('aria-labelledby', 'vol-popup-title');
    // aria-hidden must be gone while the dialog is on screen.
    expect(await overlay.getAttribute('aria-hidden')).toBeNull();
  });

  test('accessible name resolves to the heading text', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await expect(page.getByRole('dialog')).toHaveAccessibleName('Be Part of Something Greater');
  });

  test('close button and CTA have discernible names', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await expect(page.locator(SEL.close)).toHaveAccessibleName(/close/i);
    await expect(page.locator(SEL.cta)).toHaveAccessibleName(/volunteer/i);
    await expect(page.locator(SEL.skip)).toHaveAccessibleName(/later/i);
  });

  test('decorative icons are hidden from assistive tech', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const exposedIcons = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('#vol-popup-overlay i')).filter(
          (i) => i.getAttribute('aria-hidden') !== 'true'
        ).length
    );
    expect(exposedIcons).toBe(0);
  });
});

test.describe('Volunteer modal — keyboard access', () => {
  test('focus moves into the dialog on open', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const focusInside = await page.evaluate(
      () => !!document.activeElement && !!document.activeElement.closest('#vol-popup-overlay')
    );
    expect(focusInside).toBe(true);
  });

  test('Tab cycles forward within the dialog only', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () => !!document.activeElement && !!document.activeElement.closest('#vol-popup-overlay')
      );
      expect(inside, `focus escaped the dialog after ${i + 1} Tab press(es)`).toBe(true);
    }
  });

  test('Shift+Tab cycles backward within the dialog only', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await page.evaluate(
        () => !!document.activeElement && !!document.activeElement.closest('#vol-popup-overlay')
      );
      expect(inside, `focus escaped the dialog after ${i + 1} Shift+Tab press(es)`).toBe(true);
    }
  });

  test('focus stays trapped after clicking non-focusable dialog content', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    // Safari/Firefox do not focus elements on mousedown the way Chrome does, so
    // activeElement can fall back to <body> — Tab must still not escape.
    await page.locator('.vol-popup-lead').click();
    await page.keyboard.press('Tab');

    const inside = await page.evaluate(
      () => !!document.activeElement && !!document.activeElement.closest('#vol-popup-overlay')
    );
    expect(inside).toBe(true);
  });

  test('every control is reachable and operable by keyboard', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const seen = new Set();
    for (let i = 0; i < 10; i++) {
      const cls = await page.evaluate(() => document.activeElement?.className || '');
      if (cls) seen.add(String(cls).trim());
      await page.keyboard.press('Tab');
    }

    expect([...seen].some((c) => c.includes('vol-popup-close'))).toBe(true);
    expect([...seen].some((c) => c.includes('vol-popup-cta'))).toBe(true);
    expect([...seen].some((c) => c.includes('vol-popup-skip'))).toBe(true);
  });

  test('"Maybe Later" can be activated with the keyboard', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    await page.locator(SEL.skip).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(SEL.overlay)).toBeHidden();
  });

  test('focus is not left orphaned after dismissal', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Focus must land somewhere real in the document, not on a detached node.
    const state = await page.evaluate(() => {
      const a = document.activeElement;
      return { connected: !!a && a.isConnected, tag: a ? a.tagName : null };
    });
    expect(state.connected).toBe(true);
  });
});

test.describe('Volunteer modal — hidden state must not be interactive', () => {
  test('dialog controls are out of the tab order for a returning visitor', async ({ page }) => {
    await gotoFresh(page, { dismissed: true });
    await page.waitForTimeout(1500);

    // If the overlay is still in the DOM it must be fully inert: no descendant
    // may be focusable, or keyboard users hit an invisible trap on every page.
    const reachable = await page.evaluate(() => {
      const overlay = document.querySelector('#vol-popup-overlay');
      if (!overlay) return 0; // removed entirely — ideal
      const nodes = overlay.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      let count = 0;
      nodes.forEach((n) => {
        n.focus();
        if (document.activeElement === n) count++;
      });
      return count;
    });

    expect(reachable, 'invisible dialog controls are still keyboard-focusable').toBe(0);
  });

  test('dialog controls are out of the tab order before the reveal delay', async ({ page }) => {
    await gotoFresh(page);
    // Land in the ~800ms window before the popup is revealed.
    await page.waitForTimeout(150);

    const reachable = await page.evaluate(() => {
      const overlay = document.querySelector('#vol-popup-overlay');
      if (!overlay || overlay.classList.contains('vol-popup-overlay--visible')) return -1;
      const nodes = overlay.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      let count = 0;
      nodes.forEach((n) => {
        n.focus();
        if (document.activeElement === n) count++;
      });
      return count;
    });

    if (reachable === -1) test.skip(true, 'popup revealed before the check could run');
    expect(reachable, 'pre-reveal dialog controls are keyboard-focusable').toBe(0);
  });

  test('hidden overlay does not swallow clicks meant for the page', async ({ page }) => {
    await gotoFresh(page, { dismissed: true });
    await page.waitForTimeout(1500);

    const blocked = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return !!el && !!el.closest('#vol-popup-overlay');
    });
    expect(blocked, 'dismissed overlay is intercepting pointer events').toBe(false);
  });
});

test.describe('Volunteer modal — contrast & motion preferences', () => {
  test('title and body text meet WCAG AA contrast', async ({ page }) => {
    await gotoFresh(page);
    await waitForOpen(page);

    const results = await page.evaluate(() => {
      const lum = (rgb) => {
        const [r, g, b] = rgb.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

      // Walk up for the first opaque background behind an element.
      const bgOf = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const parts = (bg.match(/[\d.]+/g) || []).map(Number);
          if (parts.length >= 3 && (parts.length < 4 || parts[3] > 0.9)) return parts.slice(0, 3);
          n = n.parentElement;
        }
        return [255, 255, 255];
      };

      const check = (sel, fallbackBg) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const fg = parse(getComputedStyle(el).color);
        const bg = fallbackBg || bgOf(el);
        const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        return {
          sel,
          ratio: Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100,
          size: parseFloat(getComputedStyle(el).fontSize),
          weight: getComputedStyle(el).fontWeight,
        };
      };

      // Header sits on a known gradient; sample its darkest published stop.
      const headerBg = [0, 31, 107];
      return [
        check('.vol-popup-title', headerBg),
        check('.vol-popup-header-sub', headerBg),
        check('.vol-popup-lead'),
        check('.vol-popup-role'),
        check('.vol-popup-skip'),
      ].filter(Boolean);
    });

    for (const r of results) {
      // Large text (>=18.66px bold or >=24px) needs 3:1; everything else 4.5:1.
      const isLarge = r.size >= 24 || (r.size >= 18.66 && Number(r.weight) >= 700);
      const min = isLarge ? 3 : 4.5;
      expect(r.ratio, `${r.sel} contrast ${r.ratio}:1 (needs ${min}:1)`).toBeGreaterThanOrEqual(
        min
      );
    }
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoFresh(page);
    await waitForOpen(page);

    const card = page.locator(SEL.modal);
    await expect(card).toBeVisible();

    // With motion disabled the card must be fully opaque and untransformed.
    const style = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return { opacity: s.opacity, animationName: s.animationName, transform: s.transform };
    });
    expect(Number(style.opacity)).toBe(1);
    expect(style.animationName).toBe('none');
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(style.transform);

    // And it must still close cleanly.
    await page.locator(SEL.close).click();
    await expect(page.locator(SEL.overlay)).toBeHidden();
  });

  test('remains legible in forced-colors mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await gotoFresh(page);
    await waitForOpen(page);

    await expect(page.locator(SEL.title)).toBeVisible();
    await expect(page.locator(SEL.cta)).toBeVisible();
    await expect(page.locator(SEL.close)).toBeVisible();

    // The close button must not vanish into the header: it needs a real border
    // or background that forced-colors can substitute.
    const hasBoundary = await page.locator(SEL.close).evaluate((el) => {
      const s = getComputedStyle(el);
      return s.borderTopWidth !== '0px' || s.outlineWidth !== '0px';
    });
    expect(hasBoundary, 'close button has no visible boundary in forced-colors mode').toBe(true);
  });
});
