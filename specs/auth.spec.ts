import { test, expect } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from '../playwright.config';

test.describe('Login', () => {
  // Reset DB once before all login tests — puts it in a known state.
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------

  test('login page renders the form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/admin access only/i)).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------

  test('shows error for nonexistent email', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('nobody@example.com');
    await page.getByLabel(/password/i).fill('SomeRandomPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText('User not found.')).toBeVisible();
    // Should stay on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill('WrongPassword1234567!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText('Unable to authenticate the user')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------
  // Successful login
  // ---------------------------------------------------------------

  test('logs in with valid credentials and redirects to home', async ({ page }) => {
    await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to home page
    await expect(page).toHaveURL('/');

    // Navbar should show welcome message and logout button
    await expect(page.getByText('Welcome, Admin')).toBeVisible();
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------

  test('logout reverts navbar to logged-out state', async ({ page }) => {
    // First log in
    await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');

    // Now log out
    await page.getByRole('button', { name: /logout/i }).click();

    // Welcome message should disappear, login icon should appear
    await expect(page.getByText('Welcome, Admin')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Route guard: IsAnon redirects logged-in users away from /login
  // ---------------------------------------------------------------

  test('logged-in user visiting /login gets redirected to home', async ({ page }) => {
    // Log in first
    await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');

    // Try to visit /login directly
    await page.goto('/login');

    // IsAnon guard should redirect back to home
    await expect(page).toHaveURL('/');
  });
});
