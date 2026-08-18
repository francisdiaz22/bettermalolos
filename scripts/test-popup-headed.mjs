// Headed (real GPU) popup check. Opens a VISIBLE Chromium window so the reveal
// can be watched live, records video, and captures a rapid screenshot burst
// across the exact reveal window (≈750–1150ms after load, covering the 800ms
// show delay + entry animation) so the "appears → disappears → reappears" flash
// — a GPU paint artifact invisible to DOM-level assertions — can be inspected
// frame by frame.
//
// Usage: node scripts/test-popup-headed.mjs [desktop|mobile]   (default desktop)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 8912;
const BASE = `http://localhost:${PORT}`;
const which = process.argv[2] || 'desktop';
const VP =
  which === 'mobile'
    ? { name: 'mobile', width: 390, height: 844 }
    : { name: 'desktop', width: 1440, height: 900 };

const FRAMES_DIR = `/tmp/popup-frames-${VP.name}`;
const VIDEO_DIR = `/tmp/popup-video-${VP.name}`;

const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
});
await sleep(1200);
await rm(FRAMES_DIR, { recursive: true, force: true });
await mkdir(FRAMES_DIR, { recursive: true });

// headless:false → real window + real compositor. The throttling flags stop
// Chromium from pausing requestAnimationFrame when its window is occluded/behind
// other windows (otherwise the rAF-driven reveal never fires in an unfocused
// window — benign in real use, but it would stall this capture).
const browser = await chromium.launch({
  headless: false,
  slowMo: 0,
  args: [
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ],
});
const context = await browser.newContext({
  viewport: { width: VP.width, height: VP.height },
  recordVideo: { dir: VIDEO_DIR, size: { width: VP.width, height: VP.height } },
});
const page = await context.newPage();

// Block off-site resources so the reveal isn't delayed by third-party CDNs.
await page.route('**/*', (route) =>
  route.request().url().includes(`localhost:${PORT}`) ? route.continue() : route.abort()
);

// CDP screencast streams every real compositor frame (GPU paint incl.
// backdrop-filter) as it is produced — fast enough to catch a 1–2 frame flash,
// unlike page.screenshot() which blocks for hundreds of ms.
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async (e) => {
  frames.push({ ts: Date.now() - t0, data: e.data });
  await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
});

const t0 = Date.now();
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });

console.log(`Streaming compositor frames for ${VP.name}…`);
// Generous window: under headed + screencast + throttling-disabled, the rAF
// reveal can land as late as ~1.8s, so capture well past that.
await sleep(3200);
await cdp.send('Page.stopScreencast').catch(() => {});

// Persist every captured compositor frame with its load-relative timestamp.
const { writeFile } = await import('node:fs/promises');
let n = 0;
for (const f of frames) {
  await writeFile(
    `${FRAMES_DIR}/c${String(n++).padStart(3, '0')}_${f.ts}ms.jpg`,
    Buffer.from(f.data, 'base64')
  );
}
console.log(`Compositor frames captured: ${frames.length} (${frames.map((f) => f.ts).join(', ')}ms)`);

// Confirm it settled visible, then hold the window briefly so you can watch.
const opacity = await page
  .locator('#vol-popup-overlay')
  .evaluate((el) => +getComputedStyle(el).opacity)
  .catch(() => null);
console.log(`Final overlay opacity: ${opacity}`);
await sleep(2500);

await context.close(); // flushes the video file
await browser.close();
server.kill();

console.log(`\nFrames: ${FRAMES_DIR}/  (${n} captured)`);
console.log(`Video:  ${VIDEO_DIR}/`);
