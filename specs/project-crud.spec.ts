import { test, expect, Page } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from '../playwright.config';

// ---------------------------------------------------------------
// Cloudinary widget stub.
//
// The real widget is a 3rd-party iframe loaded from upload-widget.cloudinary.com
// and is impractical to drive from Playwright. We override `window.cloudinary`
// before any page script runs so the component thinks it's talking to the
// real widget but actually gets an instant "success" with a fake URL.
// ---------------------------------------------------------------
const FAKE_IMAGE_URL = 'https://example.com/e2e-test-image.png';

async function stubCloudinary(page: Page) {
  // Block the real Cloudinary widget script so it can't overwrite our stub
  // when index.html loads it via <script src="...">.
  await page.route('**/upload-widget.cloudinary.com/**', (route) =>
    route.abort()
  );

  await page.addInitScript((url) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).cloudinary = {
      createUploadWidget: (
        _config: unknown,
        callback: (err: null, result: { event: string; info: { secure_url: string } }) => void
      ) => ({
        open: () => {
          callback(null, {
            event: 'success',
            info: { secure_url: url },
          });
        },
        destroy: () => {},
      }),
    };
  }, FAKE_IMAGE_URL);
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Project CRUD (admin)', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test.beforeEach(async ({ page }) => {
    await stubCloudinary(page);
    await loginAsAdmin(page);
  });

  // ---------------------------------------------------------------
  // Admin UI visibility
  // ---------------------------------------------------------------

  test('logged-in admin sees "Add New Project" and per-card Edit/Delete icons', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add new project/i })
    ).toBeVisible();

    // One Edit + one Delete icon per project card (5 seeded projects).
    await expect(page.getByTitle('Edit project')).toHaveCount(5);
    await expect(page.getByTitle('Delete project')).toHaveCount(5);
  });

  // ---------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------

  test('admin can create a new project via the modal form', async ({ page }) => {
    const uniqueName = `E2E Create ${Date.now()}`;

    await page.getByRole('button', { name: /add new project/i }).click();

    // Modal header
    await expect(
      page.getByRole('heading', { name: /add new project/i })
    ).toBeVisible();

    await page.getByLabel(/project name/i).fill(uniqueName);
    await page.getByLabel(/short description/i).fill('Created by E2E test.');

    // Trigger the (stubbed) Cloudinary upload.
    await page.getByRole('button', { name: /upload image/i }).click();

    await page.getByLabel(/client github url/i).fill('https://github.com/x/y');
    await page.getByLabel(/client deploy url/i).fill('https://example.com');

    // Pick one technology from the Available column. Each tech button has
    // title="Add {name}" — the accessible name resolves to the inner img's
    // alt ("React"), so getByTitle is the reliable way to disambiguate.
    await page.getByTitle('Add React').click();

    await page.getByRole('button', { name: 'Create Project' }).click();

    // Modal closes, new card appears in the list.
    await expect(
      page.getByRole('heading', { name: uniqueName, level: 3 })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------

  test('admin can edit an existing project', async ({ page }) => {
    const newName = `Yoga Path (edited ${Date.now()})`;

    // Click pencil inside the Yoga Path card.
    const yogaCard = page
      .locator('.cursor-pointer')
      .filter({
        has: page.getByRole('heading', { name: 'Yoga Path', exact: true }),
      });
    await yogaCard.getByTitle('Edit project').click();

    // Modal opens prefilled in "Edit Project" mode.
    await expect(
      page.getByRole('heading', { name: /edit project/i })
    ).toBeVisible();

    const nameInput = page.getByLabel(/project name/i);
    await expect(nameInput).toHaveValue('Yoga Path');

    await nameInput.fill(newName);
    await page.getByRole('button', { name: 'Update Project' }).click();

    // Renamed card visible, original gone.
    await expect(
      page.getByRole('heading', { name: newName, level: 3 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Yoga Path', exact: true, level: 3 })
    ).toHaveCount(0);
  });

  // ---------------------------------------------------------------
  // Delete (accept confirm)
  // ---------------------------------------------------------------

  test('admin can delete a project after confirming', async ({ page }) => {
    const card = page
      .locator('.cursor-pointer')
      .filter({
        has: page.getByRole('heading', { name: 'Echo Diary', exact: true }),
      });

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toMatch(/echo diary/i);
      dialog.accept();
    });

    await card.getByTitle('Delete project').click();

    // Card disappears from the list.
    await expect(
      page.getByRole('heading', { name: 'Echo Diary', exact: true, level: 3 })
    ).toHaveCount(0);
  });

  // ---------------------------------------------------------------
  // Cancel delete (dismiss confirm)
  // ---------------------------------------------------------------

  test('dismissing the delete confirm dialog keeps the project', async ({ page }) => {
    const card = page
      .locator('.cursor-pointer')
      .filter({
        has: page.getByRole('heading', { name: 'Plantastic', exact: true }),
      });

    page.once('dialog', (dialog) => dialog.dismiss());

    await card.getByTitle('Delete project').click();

    // Card still there.
    await expect(
      page.getByRole('heading', { name: 'Plantastic', exact: true, level: 3 })
    ).toBeVisible();
  });
});
