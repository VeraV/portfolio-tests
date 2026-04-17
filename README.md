# Playwright E2E Tests

End-to-end tests for the portfolio app using [Playwright](https://playwright.dev/).

## Prerequisites

- Docker running with the test database container
- Node dependencies installed in `tests/`, `client/`, and `server/`

## Test Database Setup

Tests run against a local PostgreSQL container (port 5433), not the production Supabase database.

```bash
# Start the test database (from repo root)
docker compose up -d

# Apply Prisma migrations to the test database (from server/)
cd ../server
DATABASE_URL='postgresql://postgres:test@localhost:5433/portfolio_test' npx prisma migrate deploy

# Seed the test database (from server/)
DATABASE_URL='postgresql://postgres:test@localhost:5433/portfolio_test' ADMIN_PASSWORD='TestAdminPassword123!' npm run seed
```

The `resetAndSeed()` helper in `helpers/reset-db.ts` automates the reset + seed before each test suite, so you only need the manual steps above for initial setup.

## Test Admin Credentials

- Email: `admin@portfolio.com`
- Password: `TestAdminPassword123!`

These are set via `ADMIN_PASSWORD` env var during seeding and defined in `playwright.config.ts`.

## Running Tests

```bash
cd tests
npm test              # headless (default: Chromium only)
npm run test:headed   # watch the browser while tests run
npm run test:ui       # interactive Playwright UI
npm run test:debug    # step through with the Playwright inspector
npm run report        # open the last HTML test report
```

## Database Management

```bash
npm run db:up         # start the Docker Postgres container
npm run db:down       # stop the container (data preserved)
npm run db:reset      # stop, wipe volume, and restart (clean slate)
```

## Writing New Tests

1. Create a new file in `specs/` (e.g., `specs/navigation.spec.ts`)
2. Call `resetAndSeed()` in `test.beforeAll()` to put the DB in a known state
3. Use `page.goto()`, `page.getByRole()`, `page.getByLabel()`, and `expect()` assertions
4. Reference the spec docs in `docs/` for expected behavior and error messages

Example structure:

```typescript
import { test, expect } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';

test.describe('Feature Name', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /expected text/i })).toBeVisible();
  });
});
```

## Project Structure

```
tests/
  playwright.config.ts   # Playwright config, test constants, webServer setup
  helpers/
    reset-db.ts          # resetAndSeed() — wipes and re-seeds the test DB
  specs/
    auth.spec.ts         # Authentication tests (login, logout, route guards)
```
