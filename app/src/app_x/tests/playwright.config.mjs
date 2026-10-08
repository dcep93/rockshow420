import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "browser.spec.mjs",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    actionTimeout: 10000,
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 960 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "/Users/danielcepeda/repos/_codex_output/rockshow420/browser-results",
  reporter: "list",
});
