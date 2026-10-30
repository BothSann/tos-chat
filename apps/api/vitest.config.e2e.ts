import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
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
