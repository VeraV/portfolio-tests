import { test, expect } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';

test.describe('Public Navigation & Layout', () => {
  // Reset DB once — these tests are read-only against the public surface,
  // so they don't need fresh state per test.
  test.beforeAll(async () => {
    resetAndSeed();
  });

  // ---------------------------------------------------------------
  // Navbar persistence and contents (logged-out state)
  // ---------------------------------------------------------------

  test('navbar renders Home, About, and key icon on the home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('navbar persists on the about page', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Client-side navigation
  // ---------------------------------------------------------------

  test('clicking About navigates to /about', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'About', exact: true }).click();

    await expect(page).toHaveURL('/about');
  });

  test('clicking Home from /about navigates back to /', async ({ page }) => {
    await page.goto('/about');

    await page.getByRole('link', { name: /home/i }).click();

    await expect(page).toHaveURL('/');
  });

  test('clicking the key icon navigates to /login', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------
  // Catch-all 404 route
  // ---------------------------------------------------------------

  test('unknown URL renders NotFoundPage and the navbar stays visible', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
    await expect(page.getByText(/this page doesn't seem to exist/i)).toBeVisible();

    // Navbar persists outside <Routes>, so it must still be there.
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  });
});
