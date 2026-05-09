import { test, expect } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';

// Seeded projects with non-null sort_order, in DESC order (see
// server/prisma/seed.ts). Yoga Path has sort_order=null and is
// intentionally excluded — Postgres NULLS-FIRST behavior on DESC
// is implementation-detail not worth pinning.
const SEEDED_PROJECTS_BY_SORT_ORDER_DESC = [
  'Portfolio',       // sort_order=4
  'Plantastic',      // sort_order=3
  'Echo Diary',      // sort_order=2
  'Work-Life Balance', // sort_order=1
];

const ALL_SEEDED_PROJECT_NAMES = [
  ...SEEDED_PROJECTS_BY_SORT_ORDER_DESC,
  'Yoga Path',
];

test.describe('Home Page — Project List (public)', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ---------------------------------------------------------------
  // Section header
  // ---------------------------------------------------------------

  test('renders the "My Projects" heading and subtitle', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'My Projects', level: 2 })
    ).toBeVisible();
    await expect(
      page.getByText(/a collection of my recent work/i)
    ).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Project cards
  // ---------------------------------------------------------------

  test('renders all seeded projects', async ({ page }) => {
    for (const name of ALL_SEEDED_PROJECT_NAMES) {
      await expect(
        page.getByRole('heading', { name, level: 3 })
      ).toBeVisible();
    }
  });

  test('orders projects by sort_order descending', async ({ page }) => {
    const projectsSection = page
      .locator('section')
      .filter({ hasText: 'My Projects' });

    // Wait for the cards to render before reading the order.
    await projectsSection.getByRole('heading', { level: 3 }).first().waitFor();

    const renderedNames = await projectsSection
      .getByRole('heading', { level: 3 })
      .allTextContents();

    // Filter out the null-sort_order project (Yoga Path) and check the
    // relative order of the rest.
    const numberedOnly = renderedNames.filter(
      (n) => n !== 'Yoga Path'
    );
    expect(numberedOnly).toEqual(SEEDED_PROJECTS_BY_SORT_ORDER_DESC);
  });

  // ---------------------------------------------------------------
  // Click → navigate to detail page
  // ---------------------------------------------------------------

  test('clicking a project card navigates to /projects/:id', async ({ page }) => {
    // The card is a <div onClick=...>. Click event bubbles from the heading.
    await page.getByRole('heading', { name: 'Portfolio', level: 3 }).click();

    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+/);
  });

  // ---------------------------------------------------------------
  // Auth-aware UI: logged-out state
  // ---------------------------------------------------------------

  test('logged-out user does not see admin controls', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add new project/i })
    ).not.toBeVisible();
    await expect(page.getByTitle('Edit project')).toHaveCount(0);
    await expect(page.getByTitle('Delete project')).toHaveCount(0);
  });
});
