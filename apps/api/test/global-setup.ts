import { execSync } from 'node:child_process';
import { config } from 'dotenv';

// Runs once before the e2e suite: wipe the test database and apply every
// migration, so each run starts from the committed schema.
export default function setup(): void {
  // Same files as the app under test; real env vars (CI) are never overridden.
  config({ path: ['.env.test', '.env'], quiet: true });

  const url = process.env['DATABASE_URL'];
  if (!url)
    throw new Error(
      'DATABASE_URL is not set for e2e tests (.env.test or CI env)',
    );

  // Guard: `migrate reset` drops everything, so only touch disposable databases.
  const database = new URL(url).pathname.slice(1);
  if (!/(_test|_lesson_\d+)$/.test(database)) {
    throw new Error(
      `Refusing to reset "${database}": e2e only resets *_test or *_lesson_NN databases`,
    );
  }

  execSync('pnpm exec prisma migrate reset --force', {
    stdio: 'inherit',
    env: process.env,
  });
}
