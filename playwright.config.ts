import { defineConfig, devices } from '@playwright/test';

// ---------------------------------------------------------------
// Test environment constants.
// These point at the Docker Postgres container (port 5433) and the
// admin credentials that prisma/seed.ts bcrypts into the test DB.
// Also exported for use in specs (see specs/*.spec.ts).
//
// IMPORTANT: These values are duplicated in
// server/src/test-helpers/test-config.ts (a separate git repo, so we
// cannot share imports). If you change any value here, update the
// matching constant there.
// ---------------------------------------------------------------
export const TEST_DATABASE_URL =
  'postgresql://postgres:test@localhost:5433/portfolio_test';
export const TEST_ADMIN_EMAIL = 'admin@portfolio.com';
export const TEST_ADMIN_PASSWORD = 'TestAdminPassword123!';
export const TEST_TOKEN_SECRET = 'test-secret-not-for-production';

export default defineConfig({
  testDir: './specs',

  // Tests share a single DB — run them sequentially to avoid clobbering state.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Start client + server before running tests. Both use the test DB.
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server',
      url: 'http://localhost:5005/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        TOKEN_SECRET: TEST_TOKEN_SECRET,
        ORIGIN: 'http://localhost:3000',
        PORT: '5005',
        DISABLE_LOGIN_RATE_LIMIT: 'true',
      },
    },
    {
      command: 'npm start',
      cwd: '../client',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        REACT_APP_SERVER_URL: 'http://localhost:5005',
        BROWSER: 'none',
      },
    },
  ],
});
