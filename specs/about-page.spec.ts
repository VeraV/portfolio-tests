import { test, expect } from '@playwright/test';

// The About page is purely static — no API, no auth-aware rendering — so
// these tests don't need resetAndSeed. Skipping it keeps the suite fast.

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------

  test('renders the title and all main section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /about me/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /hello! i'm vera/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /my journey/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /skills & expertise/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /what drives me/i })).toBeVisible();
  });

  test('shows the profile photo with a non-empty src', async ({ page }) => {
    const photo = page.getByRole('img', { name: /vera fileyeva/i });
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute('src', /.+/);
  });

  test('lists key skill categories', async ({ page }) => {
    await expect(page.getByText(/frontend development/i)).toBeVisible();
    await expect(page.getByText(/backend development/i)).toBeVisible();
    await expect(page.getByText(/database management/i)).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Call-to-action buttons
  // ---------------------------------------------------------------

  test('"View My Work" navigates to the home page', async ({ page }) => {
    await page.getByRole('link', { name: /view my work/i }).click();

    await expect(page).toHaveURL('/');
  });

  test('"Email Me" has the correct mailto href', async ({ page }) => {
    const emailLink = page.getByRole('link', { name: /email me/i });

    await expect(emailLink).toHaveAttribute(
      'href',
      'mailto:veremei.vera@gmail.com'
    );
  });
});
