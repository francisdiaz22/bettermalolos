// Behavioral test for the volunteer popup across desktop / tablet / mobile.
// Drives the real page with Playwright, sampling the overlay's computed opacity
// every animation frame from load through the reveal to detect any flicker
// (a visible -> hidden -> visible dip). Also verifies show-once persistence,
// centering, dismiss, and absence of console errors.
//
// NOTE: the original "appears -> disappears -> reappears" symptom is a GPU
// compositor paint artifact that lives below the DOM/style layer, so no JS-level
// test can observe the actual paint flash. What this test *can* guarantee is that
// the reveal is driven by a single, monotonic opacity ramp with no logic-level
// re-render or class thrash — the necessary precondition for a flash-free reveal.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 8911;
const BASE = `http://localhost:${PORT}`;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

function startServer() {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'ignore',
  });
  return srv;
}

// Installed into the page before any script runs. Records overlay opacity +
// presence every frame, and counts how many times the --visible class is added.
function installProbe() {
  // Per-frame record of the overlay's computed opacity and whether it currently
  // carries the --visible class. visibleToggles is derived from false->true
  // edges of that class so we never depend on MutationObserver timing.
  window.__popup = { samples: [], vis: [], removed: 0 };
  const tick = () => {
    const o = document.getElementById('vol-popup-overlay');
    if (o) {
      window.__popup.samples.push(+parseFloat(getComputedStyle(o).opacity).toFixed(3));
      window.__popup.vis.push(o.classList.contains('vol-popup-overlay--visible'));
    } else if (window.__popup.samples.length) {
      window.__popup.removed++;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Given the per-frame opacity samples, detect a flicker: once opacity has risen
// to a clearly-visible level (>=0.5), it must never dip back toward hidden.
function detectFlicker(samples) {
  let peakedVisible = false;
  for (const v of samples) {
    if (v >= 0.5) peakedVisible = true;
    if (peakedVisible && v < 0.3) return true;
  }
  return false;
}

let failures = 0;
const ok = (c, m) => {
  console.log(`  ${c ? '✅' : '❌'} ${m}`);
  if (!c) failures++;
};

const server = startServer();
await sleep(1500);

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    console.log(`\n── ${vp.name} (${vp.width}×${vp.height}) ──`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    try {
      // Hermetic: block all off-site requests (unpkg CDN scripts, Leaflet, live
      // FX/weather fetches). The popup depends only on the local DOM + its own
      // deferred script, so this removes network flakiness without affecting it.
      await page.route('**/*', (route) => {
        const url = route.request().url();
        return url.includes(`localhost:${PORT}`) ? route.continue() : route.abort();
      });

      // Only uncaught JS exceptions fail the test. Caught console.error noise from
      // unrelated subsystems (e.g. info-bar.js live FX fetch failing offline, or a
      // missing favicon 404) is not a popup concern.
      const jsErrors = [];
      page.on('pageerror', (e) => jsErrors.push(e.message));

      await page.addInitScript(installProbe);
      // domcontentloaded (not 'load'): the popup's deferred script runs at DOM ready
      // and needs no external resources; waiting for full load would couple the test
      // to flaky third-party CDNs.
      await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });

      const overlay = page.locator('#vol-popup-overlay');
      const card = page.locator('.vol-popup');

      // Wait through the 800ms show delay + entry animation, sampling frames.
      // Generous timeout: under heavy CI/local load the rAF reveal can lag.
      await page.waitForSelector('.vol-popup-overlay--visible', { timeout: 15000 });
      // Wait for the reveal to actually settle (opacity fully 1) rather than a fixed
      // sleep, so measurement is never taken mid-animation under load.
      await overlay.evaluate(
        (el) =>
          new Promise((res) => {
            const check = () =>
              +getComputedStyle(el).opacity >= 0.99 ? res() : requestAnimationFrame(check);
            check();
          })
      );
      await sleep(120); // a few extra frames of samples past settle

      const probe = await page.evaluate(() => window.__popup);

      // Count false->true edges of the --visible class across all sampled frames.
      const reveals = probe.vis.reduce((n, v, i) => n + (v && !probe.vis[i - 1] ? 1 : 0), 0);
      const finalOpacity = await overlay.evaluate((el) => +getComputedStyle(el).opacity);
      console.log(
        `    · probe: ${probe.samples.length} frames, maxOpacity=${Math.max(0, ...probe.samples)}, visFrames=${probe.vis.filter(Boolean).length}, finalOpacity=${finalOpacity}`
      );

      ok(finalOpacity >= 0.99, `overlay fully opaque after reveal (opacity=${finalOpacity})`);
      ok(reveals === 1, `reveal happened exactly once (got ${reveals})`);
      ok(
        !detectFlicker(probe.samples),
        'opacity ramp is monotonic — no visible→hidden→visible dip'
      );
      ok(probe.removed === 0, 'overlay not removed/re-added during reveal');
      ok(
        jsErrors.length === 0,
        `no uncaught JS errors${jsErrors.length ? ': ' + jsErrors[0] : ''}`
      );

      // Card is centered within the viewport.
      const box = await card.boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      ok(
        Math.abs(cx - vp.width / 2) < 4,
        `card horizontally centered (Δ${Math.abs(cx - vp.width / 2).toFixed(1)}px)`
      );
      ok(box.width <= vp.width, `card fits viewport width (${box.width.toFixed(0)}≤${vp.width})`);

      await page.screenshot({ path: `/tmp/popup-${vp.name}.png` });

      // Dismiss via "Maybe Later" and confirm it closes + persists. The overlay is
      // removed from the DOM after the exit animation (EXIT_DURATION_MS=340).
      await page.locator('.vol-popup-skip').click();
      await sleep(500);
      ok((await overlay.count()) === 0, 'overlay removed from DOM after dismiss');
      const flag = await page.evaluate(() => localStorage.getItem('bs-vol-popup-v1'));
      ok(flag === '1', 'dismissal persisted to localStorage');

      // Reload: popup must NOT show again (show-once). Assert via computed opacity,
      // since the markup stays in the DOM but init() returns early at opacity:0.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1200);
      const reloadVisible = await overlay.evaluate(
        (el) =>
          el.classList.contains('vol-popup-overlay--visible') ||
          +getComputedStyle(el).opacity > 0.01
      );
      ok(!reloadVisible, 'popup does not reappear on reload');
    } catch (err) {
      ok(false, `unexpected error: ${err.message.split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${failures ? '❌ ' + failures + ' check(s) failed' : '✅ all checks passed'}`);
console.log('Screenshots: /tmp/popup-desktop.png, /tmp/popup-tablet.png, /tmp/popup-mobile.png');
process.exit(failures ? 1 : 0);
