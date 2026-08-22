// @ts-check

/** Keep release tests deterministic by allowing only first-party resources. */
async function useFirstPartyOnly(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost') || url.startsWith('data:')) return route.continue();
    return route.abort();
  });
}

/** Load a page without the delayed volunteer dialog obscuring it. */
async function gotoSitePage(page, path, options = {}) {
  await useFirstPartyOnly(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('bs-vol-popup-v1', '1');
    } catch (error) {
      /* The site is expected to remain usable when storage is unavailable. */
    }
  });
  await page.goto(path, { waitUntil: 'domcontentloaded', ...options });
}

async function horizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

module.exports = { gotoSitePage, horizontalOverflow, useFirstPartyOnly };
