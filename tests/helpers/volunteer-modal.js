// @ts-check

/** localStorage key the popup uses to remember a dismissal. */
const STORAGE_KEY = 'bs-vol-popup-v1';

/** Selectors for the "Be Part of Something Greater" modal. */
const SEL = {
  overlay: '#vol-popup-overlay',
  modal: '.vol-popup',
  title: '#vol-popup-title',
  close: '.vol-popup-close',
  skip: '.vol-popup-skip',
  cta: '.vol-popup-cta',
  roles: '.vol-popup-role',
};

/**
 * Blocks third-party requests (CDN players, tile servers, weather APIs) so the
 * modal's behaviour is measured without unrelated network flakiness.
 */
async function blockThirdParty(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost') || url.startsWith('data:')) return route.continue();
    return route.abort();
  });
}

/**
 * Loads the homepage with a clean slate, so the popup treats every visit as a
 * first visit. The storage seed runs as an init script because the popup reads
 * localStorage during its own DOMContentLoaded handler.
 */
async function gotoFresh(page, { dismissed = false } = {}) {
  await blockThirdParty(page);
  await page.addInitScript(
    ([key, value]) => {
      try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      } catch (e) {
        /* storage disabled — the popup must cope on its own */
      }
    },
    [STORAGE_KEY, dismissed ? '1' : '']
  );
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
}

/** Waits for the popup to finish its entry animation and settle. */
async function waitForOpen(page) {
  const overlay = page.locator(SEL.overlay);
  await overlay.waitFor({ state: 'attached' });
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && el.classList.contains('vol-popup-overlay--visible');
    },
    SEL.overlay,
    { timeout: 10_000 }
  );
  // Entry animation is 380ms; give it room to complete before measuring.
  await page.waitForTimeout(500);
  return overlay;
}

module.exports = { STORAGE_KEY, SEL, blockThirdParty, gotoFresh, waitForOpen };
