import { test, expect, Page } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from '../playwright.config';

// Echo Diary has 12 seeded steps in its active "Main" manual.
const ECHO_DIARY_ID = 'cmj74ad860005onqbehbjajpt';
const FAKE_IMAGE_URL = 'https://example.com/e2e-step-image.png';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}

// Stub Cloudinary so clicking "Upload Image" fires an immediate success
// callback with a fake URL — same pattern as project-crud.spec.ts.
async function stubCloudinary(page: Page) {
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

// Click the Edit-step pencil for a specific step. Used only in read mode.
// We anchor on the step's image alt AND the Edit-step button — both exist
// in read mode, and requiring both lets us pick a div that contains the
// image (right column) AND the button (left column), which is the outer
// step wrapper. Once we're in edit mode the image and button both
// disappear, so callers should switch to page-level locators for the
// textarea/Save/Cancel inside the form — only one step edits at a time.
async function clickEditOnStep(page: Page, stepNumber: number) {
  await page
    .locator('div')
    .filter({
      has: page.getByRole('img', { name: `Step ${stepNumber}`, exact: true }),
    })
    .filter({
      has: page.getByTitle('Edit step'),
    })
    .last()
    .getByTitle('Edit step')
    .click();
}

test.describe('Manual Steps (admin)', () => {
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

  test('admin sees Edit pencils on each step and the "Add new step" button', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY_ID}`);

    await expect(
      page.getByRole('heading', { name: 'Main - Steps', level: 2 })
    ).toBeVisible();

    // Seed has 12 steps → 12 Edit pencils.
    await expect(page.getByTitle('Edit step')).toHaveCount(12);
    await expect(page.getByTitle('Add new step')).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Add new step (auto-incremented step_number)
  // ---------------------------------------------------------------

  test('admin can add a new step; step_number auto-increments', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY_ID}`);

    await page.getByTitle('Add new step').click();

    // Inline form appears with textarea + Cloudinary widget.
    const descriptionField = page.getByPlaceholder('Describe this step...');
    await expect(descriptionField).toBeVisible();
    await descriptionField.fill('A brand-new step from E2E.');

    // Save is disabled until both description and image are filled.
    const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveBtn).toBeDisabled();

    // Trigger the (stubbed) Cloudinary upload to populate image_url.
    await page.getByRole('button', { name: /upload image/i }).click();
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();

    // The new step appears at the end with step_number = 13 (12 + 1).
    await expect(
      page.getByRole('img', { name: 'Step 13', exact: true })
    ).toBeVisible();
    await expect(page.getByText('A brand-new step from E2E.')).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Edit step
  // ---------------------------------------------------------------

  test('admin can edit a step description', async ({ page }) => {
    const newDescription = `Edited at ${Date.now()}`;
    await page.goto(`/projects/${ECHO_DIARY_ID}`);

    await clickEditOnStep(page, 1);

    // In edit mode: only one StepItem is editing at a time, so page-level
    // locators are unique. No need to re-anchor on the step.
    await page.getByPlaceholder('Step description').fill(newDescription);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // After save, the step returns to read mode with the new description.
    await expect(page.getByText(newDescription)).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Cancel edit reverts to original
  // ---------------------------------------------------------------

  test('cancel during edit reverts to the original description', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY_ID}`);

    // Step 2's seeded description starts with "About Us. General information".
    await clickEditOnStep(page, 2);

    await page.getByPlaceholder('Step description').fill('THIS SHOULD NOT PERSIST');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    // Original text visible, the throwaway edit is gone.
    await expect(page.getByText(/about us\. general information/i)).toBeVisible();
    await expect(page.getByText('THIS SHOULD NOT PERSIST')).toHaveCount(0);
  });
});
