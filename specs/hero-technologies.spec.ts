import { test, expect } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';

// First three technologies by sort_order ascending in the seed (see
// server/prisma/seed.ts). If the seed changes, update these.
const FIRST_THREE_TECHS_BY_SORT_ORDER = ['HTML', 'React', 'CSS'];

test.describe('Home Page — Hero & Technologies', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ---------------------------------------------------------------
  // Hero block: name, title, bio, social links
  // ---------------------------------------------------------------

  test('renders the name, title, and bio', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Vera Fileyeva', level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Junior Web Developer', level: 2 })
    ).toBeVisible();
    await expect(page.getByText(/full stack developer/i)).toBeVisible();
  });

  test('LinkedIn and GitHub links open in a new tab with the correct URLs', async ({ page }) => {
    const linkedin = page.getByRole('link', { name: 'LinkedIn' });
    await expect(linkedin).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/veramei-webdeveloper/'
    );
    await expect(linkedin).toHaveAttribute('target', '_blank');

    const github = page.getByRole('link', { name: 'GitHub' });
    await expect(github).toHaveAttribute('href', 'https://github.com/VeraV');
    await expect(github).toHaveAttribute('target', '_blank');
  });

  // ---------------------------------------------------------------
  // Technologies section
  // ---------------------------------------------------------------

  test('renders the technologies heading and seeded logos', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /technologies i work with/i })
    ).toBeVisible();

    // Each tech logo is an <a title="{name}"><img alt="{name}"></a>. Querying
    // by title is more reliable than getByRole({ name }) because the link's
    // accessible name with both title and inner alt set is implementation-defined.
    for (const techName of FIRST_THREE_TECHS_BY_SORT_ORDER) {
      await expect(page.locator(`a[title="${techName}"]`)).toBeVisible();
    }
  });

  test('each technology logo links to its official site in a new tab', async ({ page }) => {
    // Pick one (React) as a representative. The same wrapping applies to all.
    const reactLink = page.locator('a[title="React"]');
    await expect(reactLink).toHaveAttribute('href', 'https://react.dev/');
    await expect(reactLink).toHaveAttribute('target', '_blank');
  });

  test('technologies render in sort_order ascending', async ({ page }) => {
    // Scope to the hero <section> so we don't pick up project card logos below.
    const heroSection = page
      .locator('section')
      .filter({ hasText: 'Technologies I Work With' });

    // evaluateAll() does NOT auto-wait — wait for at least one logo to render
    // (which only happens after technologyService.getAll() resolves) before
    // reading the full list.
    await heroSection.locator('img').first().waitFor();

    const altTexts = await heroSection
      .locator('img')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLImageElement).alt));

    expect(altTexts.slice(0, 3)).toEqual(FIRST_THREE_TECHS_BY_SORT_ORDER);
  });

  // ---------------------------------------------------------------
  // CTA
  // ---------------------------------------------------------------

  test('"Learn More About Me" navigates to /about', async ({ page }) => {
    await page.getByRole('link', { name: 'Learn More About Me' }).click();

    await expect(page).toHaveURL('/about');
  });
});
