import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Every e2e file shares one test database and cleans tables in its hooks,
    // so files run one at a time to keep one file from wiping another's rows.
    fileParallelism: false,
    // Fake auth settings: real env vars win over .env files, so e2e never uses
    // your real GitHub secrets, and CI needs no extra variables.
    env: {
      BETTER_AUTH_SECRET: 'e2e-secret-that-is-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
      GITHUB_CLIENT_ID: 'e2e-client-id',
      GITHUB_CLIENT_SECRET: 'e2e-client-secret',
    },
  },
});
