// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { existsSync } = require('node:fs');

const edgeExecutables = [
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable',
  process.env.PROGRAMFILES &&
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  process.env['PROGRAMFILES(X86)'] &&
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
].filter(Boolean);

const hasEdge = edgeExecutables.some((executable) => existsSync(executable));

/**
 * Cross-browser validation harness.
 *
 * Chrome and Edge run as real installed channels (not bundled Chromium) so the
 * results reflect the shipping browsers; Firefox uses Gecko and WebKit is the
 * engine behind Safari on both macOS and iOS.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? undefined : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'python3 -m http.server 8321',
    url: 'http://localhost:8321/index.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },

  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    ...(hasEdge ? [{ name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } }] : []),
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
