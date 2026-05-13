import { test, expect, Page } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from '../playwright.config';

// Seeded project IDs (see server/prisma/seed.ts).
const PROJECTS = {
  ECHO_DIARY: 'cmj74ad860005onqbehbjajpt',     // has 1 active manual: "Main"
  YOGA_PATH: 'cmmdjq4s20006g30i98sk8a0w',       // has 1 active manual: "main"
  WORK_LIFE_BALANCE: 'cmj73k9be0004onqb2o9i3l9m', // has 1 active manual: "Basics"
  PLANTASTIC: 'cmj74fpnc0006onqbm89x7xax',      // has 2 manuals: "Main" (active) + "Main Features" (inactive)
};

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}

// Locate a specific manual card by its title (h3). exact:true avoids
// collisions with substring matches (e.g., "Main" vs "Main Features").
// .last() picks the innermost matching div — the manual card itself,
// not the page ancestors that also contain the heading as a descendant.
function manualCard(page: Page, title: string) {
  return page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: title, exact: true, level: 3 }),
    })
    .last();
}

test.describe('Manual Management (admin)', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ---------------------------------------------------------------
  // Section visibility for logged-in admin
  // ---------------------------------------------------------------

  test('admin sees the "User Manuals" section and existing cards', async ({ page }) => {
    await page.goto(`/projects/${PROJECTS.ECHO_DIARY}`);

    await expect(
      page.getByRole('heading', { name: 'User Manuals', level: 2 })
    ).toBeVisible();

    // The seeded "Main" manual for Echo Diary should be visible with its
    // title, description, version label, and an "Active" radio.
    const card = manualCard(page, 'Main');
    await expect(card.getByText(/main manual with all the features/i)).toBeVisible();
    await expect(card.getByText(/version: 1\.0/i)).toBeVisible();
    await expect(card.getByRole('radio', { name: /active/i })).toBeChecked();
  });

  // ---------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------

  test('admin can create a new manual', async ({ page }) => {
    const uniqueTitle = `E2E Manual ${Date.now()}`;
    await page.goto(`/projects/${PROJECTS.YOGA_PATH}`);

    await expect(
      page.getByRole('heading', { name: 'User Manuals', level: 2 })
    ).toBeVisible();

    await page.getByRole('button', { name: '+ Create New Manual' }).click();

    await page.getByPlaceholder('Title').fill(uniqueTitle);
    await page.getByPlaceholder('Description').fill('Created by E2E.');
    await page.getByPlaceholder('Version').fill('2.0');

    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // New card visible in the grid.
    await expect(
      page.getByRole('heading', { name: uniqueTitle, level: 3 })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------

  test('admin can edit an existing manual', async ({ page }) => {
    const newTitle = `Basics (edited ${Date.now()})`;
    await page.goto(`/projects/${PROJECTS.WORK_LIFE_BALANCE}`);

    const card = manualCard(page, 'Basics');
    await card.getByTitle('Edit manual').click();

    // Inline edit-mode inputs appear (no modal). Title input is prefilled.
    const titleInput = page.getByPlaceholder('Title');
    await expect(titleInput).toHaveValue('Basics');

    await titleInput.fill(newTitle);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Card returns to read mode with the new title.
    await expect(
      page.getByRole('heading', { name: newTitle, level: 3 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Basics', exact: true, level: 3 })
    ).toHaveCount(0);
  });

  // ---------------------------------------------------------------
  // Set active (transactional: previously-active flips to inactive)
  // ---------------------------------------------------------------

  test('setting a manual active deactivates the previously-active one', async ({ page }) => {
    await page.goto(`/projects/${PROJECTS.PLANTASTIC}`);

    // Seed state: "Main" active, "Main Features" inactive.
    const mainCard = manualCard(page, 'Main');
    const mainFeaturesCard = manualCard(page, 'Main Features');

    await expect(mainCard.getByRole('radio', { name: /active/i })).toBeChecked();
    await expect(
      mainFeaturesCard.getByRole('radio', { name: /active/i })
    ).not.toBeChecked();

    // Activate the inactive one. Use click() instead of check() because the
    // radio is controlled by React state that only updates after the server
    // round-trip (PATCH /api/manuals/.../set-active + refetch). check()
    // asserts the state changed synchronously, which races the network.
    await mainFeaturesCard.getByRole('radio', { name: /active/i }).click();

    // After the $transaction + refetch, the flags should be swapped.
    await expect(
      mainFeaturesCard.getByRole('radio', { name: /active/i })
    ).toBeChecked();
    await expect(mainCard.getByRole('radio', { name: /active/i })).not.toBeChecked();
  });

  // ---------------------------------------------------------------
  // Delete (accept confirm)
  // ---------------------------------------------------------------

  test('admin can delete a manual after confirming', async ({ page }) => {
    await page.goto(`/projects/${PROJECTS.ECHO_DIARY}`);

    const card = manualCard(page, 'Main');
    await expect(card).toBeVisible();

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toMatch(/are you sure you want to delete this manual/i);
      dialog.accept();
    });

    await card.getByTitle('Delete manual').click();

    // Manual gone — no h3 named "Main" remains in the manuals grid.
    await expect(
      page.getByRole('heading', { name: 'Main', exact: true, level: 3 })
    ).toHaveCount(0);
  });
});
