import { test, expect } from '@playwright/test';
import { resetAndSeed } from '../helpers/reset-db';

// Seeded fixtures (see server/prisma/seed.ts). If the seed changes, update here.
const ECHO_DIARY = {
  id: 'cmj74ad860005onqbehbjajpt',
  name: 'Echo Diary',
  client_deploy_url: 'https://write-your-own-story.vercel.app/',
  client_github_url: 'https://github.com/VeraV/write_your_own_story',
  server_github_url: 'https://github.com/VeraV/json-server-backend',
  server_deploy_url: 'https://json-server-backend-kklv.onrender.com/',
  activeManualTitle: 'Main',
  firstStepDescription: 'Home Page. A short introduction to the website',
};

// Work-Life Balance has empty strings for both server_github_url and
// server_deploy_url — the optional links should be hidden.
const WORK_LIFE_BALANCE = {
  id: 'cmj73k9be0004onqb2o9i3l9m',
  name: 'Work-Life Balance',
};

test.describe('Project Details Page (public)', () => {
  test.beforeAll(async () => {
    resetAndSeed();
  });

  // ---------------------------------------------------------------
  // Project info
  // ---------------------------------------------------------------

  test('renders project name, description, image, and tech stack heading', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY.id}`);

    await expect(
      page.getByRole('heading', { name: ECHO_DIARY.name, level: 1 })
    ).toBeVisible();
    await expect(page.getByRole('img', { name: ECHO_DIARY.name })).toBeVisible();
    await expect(page.getByText(/echo diary is a mindful journaling app/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /technologies:/i })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Always-visible links
  // ---------------------------------------------------------------

  test('shows "View Live Site" and "Client GitHub" with correct hrefs and target=_blank', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY.id}`);

    const liveSite = page.getByRole('link', { name: /view live site/i });
    await expect(liveSite).toHaveAttribute('href', ECHO_DIARY.client_deploy_url);
    await expect(liveSite).toHaveAttribute('target', '_blank');

    const clientGithub = page.getByRole('link', { name: /client github/i });
    await expect(clientGithub).toHaveAttribute(
      'href',
      ECHO_DIARY.client_github_url
    );
    await expect(clientGithub).toHaveAttribute('target', '_blank');
  });

  // ---------------------------------------------------------------
  // Conditional links: Server GitHub / Server Deploy
  // ---------------------------------------------------------------

  test('renders Server GitHub and Server Deploy when those URLs exist', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY.id}`);

    const serverGithub = page.getByRole('link', { name: /server github/i });
    await expect(serverGithub).toBeVisible();
    await expect(serverGithub).toHaveAttribute(
      'href',
      ECHO_DIARY.server_github_url
    );

    const serverDeploy = page.getByRole('link', { name: /server deploy/i });
    await expect(serverDeploy).toBeVisible();
    await expect(serverDeploy).toHaveAttribute(
      'href',
      ECHO_DIARY.server_deploy_url
    );
  });

  test('hides Server GitHub and Server Deploy when those URLs are empty', async ({ page }) => {
    await page.goto(`/projects/${WORK_LIFE_BALANCE.id}`);

    // Make sure the page actually rendered before asserting absence.
    await expect(
      page.getByRole('heading', { name: WORK_LIFE_BALANCE.name, level: 1 })
    ).toBeVisible();

    await expect(page.getByRole('link', { name: /server github/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /server deploy/i })).toHaveCount(0);
  });

  // ---------------------------------------------------------------
  // Active manual steps
  // ---------------------------------------------------------------

  test('renders the active manual title and step descriptions', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY.id}`);

    await expect(
      page.getByRole('heading', {
        name: `${ECHO_DIARY.activeManualTitle} - Steps`,
      })
    ).toBeVisible();

    // Spot-check step 1's description appears (full text in seed is long;
    // matching a prefix is robust to wording tweaks).
    await expect(
      page.getByText(ECHO_DIARY.firstStepDescription)
    ).toBeVisible();

    // Step images exist with alt="Step N". exact:true so "Step 1" doesn't
    // also match "Step 10", "Step 11", "Step 12".
    await expect(
      page.getByRole('img', { name: 'Step 1', exact: true })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Auth-aware: admin section hidden when logged out
  // ---------------------------------------------------------------

  test('logged-out user does not see the "User Manuals" admin section', async ({ page }) => {
    await page.goto(`/projects/${ECHO_DIARY.id}`);

    // Wait for the project header so we know the page rendered.
    await expect(
      page.getByRole('heading', { name: ECHO_DIARY.name, level: 1 })
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /^user manuals$/i })
    ).not.toBeVisible();
  });

  // ---------------------------------------------------------------
  // 404 / not found
  // ---------------------------------------------------------------

  test('shows "Project not found" for an unknown project id', async ({ page }) => {
    await page.goto('/projects/does-not-exist');

    await expect(page.getByText(/project not found/i)).toBeVisible();
  });
});
