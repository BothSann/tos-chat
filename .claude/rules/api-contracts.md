---
paths:
  - "apps/api/**"
  - "packages/shared/**"
---

# API Contracts

What the API promises the web. `lib/api-server.ts` and the socket hooks depend on every line here; change both sides together.

## Rules

1. **MUST** return every error with one body, defined in `@tos-chat/shared` as `ApiError`:
   `{ statusCode: number; code: string; message: string; fields?: Record<string, string[]> }`.
2. **MUST** produce that body from one global exception filter. **NEVER** format errors in controllers or catch exceptions just to rethrow a new shape.
3. **MUST** use these status meanings, which match `web-data-layer.md` #6:
   | Status | `code` | Meaning |
   | --- | --- | --- |
   | 400 | `BAD_REQUEST` | Malformed request (bad JSON, wrong types before validation) |
   | 401 | `UNAUTHORIZED` | No valid access token |
   | 403 | `FORBIDDEN` | Authenticated but not a member or owner |
   | 404 | `NOT_FOUND` | Record absent |
   | 409 | `CONFLICT` | Unique violation (room name taken) |
   | 422 | `VALIDATION_FAILED` | Input broke a rule; `fields` present |
   | 429 | `TOO_MANY_REQUESTS` | Throttled |
   | 500 | `INTERNAL` | Anything else; never leak stack or SQL |
4. **MUST** configure the global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`, `errorHttpStatusCode: 422`, and an `exceptionFactory` that builds `fields` (property → messages).
5. **MUST** respond with response DTOs (`<name>.response.ts`) whose `@Expose()` fields are the full allowlist, converted with `excludeExtraneousValues: true`. **NEVER** return a Prisma row or entity. `Room.passwordHash` must never leave the API.
6. **MUST** make each response DTO `implements` its `*View` type from `@tos-chat/shared` (`UserView`, `RoomView`, `MessageView`).
7. **MUST** leave auth cookies to Better Auth: `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`, and `Secure` only when `NODE_ENV=production` (`advanced.useSecureCookies`). **NEVER** set an auth cookie by hand.
8. **MUST** answer every client→server socket event with an ack `{ ok: true; data } | { ok: false; error: ApiError }`, typed in `@tos-chat/shared`, with a WS exception filter that converts `WsException` and HTTP exceptions.
9. **MUST** reject unauthenticated handshakes with `connect_error` whose `data.code` is `UNAUTHORIZED`.
10. **MUST** keep socket event names and payloads identical to `docs/PLAN.md` → Socket contract.
11. **NEVER** put runtime code in `packages/shared`: types, interfaces, and `as const` string unions only.

## Check

- [ ] Errors come only from the global filter, in the `ApiError` shape
- [ ] Validation returns 422 with `fields`
- [ ] Responses go through `excludeExtraneousValues` DTOs implementing a shared `*View`
- [ ] Cookie names and flags match rule 7; acks match rule 8

## Source

`nestjs-best-practices` → `error-use-exception-filters`, `error-throw-http-exceptions`, `api-use-dto-serialization`, `api-use-pipes`, `security-validate-all-input`.
