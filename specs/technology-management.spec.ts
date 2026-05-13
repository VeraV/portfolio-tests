import { test, expect, Page } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from '../playwright.config';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(TEST_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
}

// Open the ProjectForm modal, then click the "+" in the TechnologySelector
// to open the nested TechnologyForm modal. The TechnologyForm is only
// reachable through this path (per spec — no standalone admin page).
async function openTechnologyForm(page: Page) {
  await page.getByRole('button', { name: /add new project/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Add New Project', level: 2 })
  ).toBeVisible();

  // The "+" button is unique inside TechnologySelector (the "+ Add New
  // Project" button has a longer name). exact:true keeps the partial-match
  // default from picking up the latter.
  await page.getByRole('button', { name: '+', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Add New Technology', level: 2 })
  ).toBeVisible();
}

test.describe('Technology Management (admin)', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test.beforeEach(async ({ page }) => {
    // Block the real Cloudinary widget script — ProjectForm's CloudinaryUpload
    // child tries to load it on mount, but we never trigger an upload in this
    // spec. Blocking it keeps tests fast and avoids the iframe overlay.
    await page.route('**/upload-widget.cloudinary.com/**', (route) =>
      route.abort()
    );

    await loginAsAdmin(page);
  });

  // ---------------------------------------------------------------
  // Modal opens with required fields + populated category dropdown
  // ---------------------------------------------------------------

  test('modal opens with all required fields and the seeded categories', async ({ page }) => {
    await openTechnologyForm(page);

    await expect(page.getByLabel(/technology name/i)).toBeVisible();
    await expect(page.getByLabel(/logo url/i)).toBeVisible();
    await expect(page.getByLabel(/official website/i)).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();

    // Category dropdown is populated from GET /api/tech-category (3 seeded
    // categories). toHaveCount auto-waits for the async fetch to resolve.
    const options = page.locator('select#categoryId option');
    await expect(options).toHaveCount(3);
    const optionText = await options.allTextContents();
    expect(optionText.sort()).toEqual(['back-end', 'front-end', 'full-stack']);

    await expect(
      page.getByRole('button', { name: 'Create Technology' })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Logo URL preview
  // ---------------------------------------------------------------

  test('renders a preview when a logo URL is entered', async ({ page }) => {
    await openTechnologyForm(page);

    await page.getByLabel(/logo url/i).fill('https://example.com/logo.png');

    await expect(page.getByText('Preview:')).toBeVisible();
    await expect(page.getByAltText('Technology logo preview')).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Create flow
  // ---------------------------------------------------------------

  test('admin can create a new technology and it appears in the selector', async ({ page }) => {
    const uniqueName = `E2E Tech ${Date.now()}`;

    await openTechnologyForm(page);

    await page.getByLabel(/technology name/i).fill(uniqueName);
    await page.getByLabel(/logo url/i).fill('https://example.com/logo.png');
    await page.getByLabel(/official website/i).fill('https://example.com');
    // Category defaults to first seeded — leave as-is.

    await page.getByRole('button', { name: 'Create Technology' }).click();

    // TechnologyForm closes; the new tech shows up in TechnologySelector's
    // Available column with title="Add {name}".
    await expect(
      page.getByRole('heading', { name: 'Add New Technology', level: 2 })
    ).not.toBeVisible();
    await expect(page.getByTitle(`Add ${uniqueName}`)).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------

  test('cancel closes the modal without creating a technology', async ({ page }) => {
    await openTechnologyForm(page);

    await page.getByLabel(/technology name/i).fill('Should Not Save');

    // Both ProjectForm and TechnologyForm have a "Cancel" button. The
    // TechnologyForm renders after ProjectForm in DOM, so .last() picks it.
    await page
      .getByRole('button', { name: 'Cancel', exact: true })
      .last()
      .click();

    // TechnologyForm gone, ProjectForm still open.
    await expect(
      page.getByRole('heading', { name: 'Add New Technology', level: 2 })
    ).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Add New Project', level: 2 })
    ).toBeVisible();

    // No tech with that name was created.
    await expect(page.getByTitle('Add Should Not Save')).toHaveCount(0);
  });
});
