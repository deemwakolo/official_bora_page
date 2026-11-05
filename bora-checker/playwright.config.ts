import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BORA_CHECKER_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 300_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'list',
  workers: 1,
  outputDir: '../.bora-checker/test-output',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
