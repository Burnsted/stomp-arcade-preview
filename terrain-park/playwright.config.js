// @ts-check
const { defineConfig, devices } = require("@playwright/test");
const path = require("path");

const PORT = Number(process.env.TP_PORT || 8788);
const BASE = `http://127.0.0.1:${PORT}/arcade/terrain-park-next`;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 120000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-evidence/playwright-results.json" }],
  ],
  outputDir: "test-evidence/test-output",
  use: {
    baseURL: BASE + "/",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node arcade/terrain-park-next/scripts/static-server.mjs ${PORT}`,
    url: BASE + "/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: path.join(__dirname, "../.."),
  },
  projects: [
    {
      name: "phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["iPhone 14"].userAgent,
      },
    },
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
