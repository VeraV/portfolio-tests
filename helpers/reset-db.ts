import { execSync } from 'child_process';
import * as path from 'path';
import {
  TEST_DATABASE_URL,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from '../playwright.config';

const serverDir = path.resolve(__dirname, '../../server');

/**
 * Wipes the test database, re-runs all Prisma migrations, and re-seeds
 * with the full portfolio fixture. Call from `test.beforeAll()` in any
 * spec that mutates data.
 *
 * `prisma migrate reset` auto-runs the seed script because
 * server/package.json has `"prisma": { "seed": "ts-node prisma/seed.ts" }`.
 *
 * Flags:
 *   --force          skips the confirmation prompt
 *   --skip-generate  skips regenerating @prisma/client (already generated)
 */
export function resetAndSeed(): void {
  execSync('npx prisma migrate reset --force --skip-generate', {
    cwd: serverDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      ADMIN_EMAIL: TEST_ADMIN_EMAIL,
      ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
    },
  });
}
