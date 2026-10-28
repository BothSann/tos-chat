---
paths:
  - "apps/api/**"
---

# API Testing

Vitest (the Nest 12 default) for unit and e2e tests. Every lesson ships at least one of each.

## Rules

1. **MUST** use Vitest APIs (`vi.fn()`, `vi.spyOn()`). **NEVER** add Jest or `jest.*` calls.
2. **MUST** build unit-test subjects with `Test.createTestingModule` and replace collaborators with `overrideProvider(...).useValue(...)`. Mock **repositories**, never Prisma internals.
3. **MUST** name unit tests `*.spec.ts` next to the file under test, and e2e tests `test/*.e2e-spec.ts`.
4. **MUST** boot the real `AppModule` in e2e tests against the test database `127.0.0.1:5433` (`tos_chat_test`), with `prisma migrate reset --force` before the suite. **NEVER** point tests at the dev database.
5. **MUST** apply the same global pipes, filters, and guards in e2e setup as in `main.ts`. Extract them into one `configureApp(app)` function used by both.
6. **MUST** test HTTP with supertest and the gateway with `socket.io-client` against `app.listen(0)`.
7. **MUST** mock OAuth providers: override the strategy's `validate` or the provider HTTP call. **NEVER** call GitHub, Google, or Telegram from tests.
8. **MUST** cover, for each feature: the happy path, validation (422 + `fields`), unauthenticated (401), and wrong user (403).
9. **MUST** isolate e2e tests by creating their own users and rooms. **NEVER** depend on order or on data from another test.
10. **MUST** keep `pnpm --filter api test` and `pnpm --filter api test:e2e` green before a lesson is marked done.

## Check

- [ ] At least one unit and one e2e test for the lesson
- [ ] 401, 403, and 422 paths asserted, not just the happy path
- [ ] No real provider calls; no dev-database use

## Source

`nestjs-best-practices` → `test-use-testing-module`, `test-e2e-supertest`, `test-mock-external-services`.
