---
paths:
  - "apps/api/**"
---

# API Security

Authentication, authorization, and abuse limits. Nest is the only authority; the web's checks are UX.

## Rules

### Authentication

1. **MUST** authenticate with `@nestjs/passport` + `@nestjs/jwt`: `GithubStrategy`, `GoogleStrategy`, and a custom `TelegramStrategy` that verifies the Login Widget hash (HMAC-SHA256 keyed with SHA256 of the bot token) and rejects an `auth_date` older than 1 day.
2. **MUST** register `JwtAuthGuard` globally as `APP_GUARD` (**deny by default**). Mark open routes with `@Public()`: OAuth start and callback, `POST /auth/telegram`, `POST /auth/refresh`, `GET /health`.
3. **MUST** read the access token from the `tos_at` cookie and sign it with `{ sub: userId }` only. **NEVER** put email, names, or roles in the payload.
4. **MUST** load the user in `JwtStrategy.validate` and reject the token when the user no longer exists.
5. **MUST** issue refresh tokens as random opaque values, store only their hash, **rotate on every use** (`replacedById`), and on reuse of a rotated token revoke the user's whole token family.
6. **MUST** take secrets (`JWT_SECRET`, OAuth client secrets, `TELEGRAM_BOT_TOKEN`) from validated config only. **NEVER** hardcode or log them.
7. **MUST** expose the current user through a `@CurrentUser()` param decorator. **NEVER** read `req.user` directly in handlers.
8. **MUST** authenticate sockets at the handshake with the same token verification service as HTTP. **NEVER** write a second JWT parser.

### Authorization

9. **MUST** check record permissions **in the service, after loading the record**: membership to read history, join the socket room, or send; ownership to rename, change the password, or delete. Throw `ForbiddenException`.
10. **NEVER** trust ids from the body or socket payload for identity. The actor is always `@CurrentUser()` or the socket's authenticated user.

### Abuse limits and hardening

11. **MUST** hash room passwords with argon2. **NEVER** return or log them.
12. **MUST** apply `@nestjs/throttler` limits:
    | Target | Limit |
    | --- | --- |
    | Global default | 100/min per IP |
    | OAuth start/callback, `POST /auth/telegram` | 10/min per IP |
    | `POST /auth/refresh` | 30/min per IP |
    | `POST /rooms/:id/join` | 5/min per user + room |
    | `message:send` | 10 per 10 s per socket |
13. **MUST** enable helmet, and CORS limited to the web origin with `credentials: true`.
14. **MUST** cap message `content` at 2000 characters in the DTO.

## Check

- [ ] New routes are protected unless explicitly `@Public()`
- [ ] Every read or write of a room or message checks membership or ownership in the service
- [ ] Refresh rotation and reuse revocation are covered by e2e tests

## Source

`nestjs-best-practices` → `security-auth-jwt`, `security-authorize-records`, `security-use-guards`, `security-rate-limiting`, `security-headers-cors-csrf`.
