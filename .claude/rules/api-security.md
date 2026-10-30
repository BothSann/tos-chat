---
paths:
  - "apps/api/**"
---

# API Security

Authentication, authorization, and abuse limits. Nest is the only authority; the web's checks are UX.

## Rules

### Authentication

1. **MUST** authenticate with Better Auth, mounted through `@thallesp/nestjs-better-auth` with the Prisma adapter. Providers: GitHub and Google (`socialProviders`), `emailAndPassword`, and Telegram through the official `genericOAuth` plugin with Telegram's OIDC discovery URL and `pkce: true`. **NEVER** add a third-party auth plugin without a decision in `docs/PLAN.md`.
2. **MUST** keep the library's global `AuthGuard` (**deny by default**). Mark open routes with `@AllowAnonymous()`: `GET /health` and anything that must work signed out. Better Auth's own `/auth/*` routes are handled by the library.
3. **MUST** configure email and password with `requireEmailVerification: true`, `minPasswordLength: 12`, `maxPasswordLength: 128`, and `revokeSessionsOnPasswordReset: true`. Verification is required because account linking (rule 5) trusts verified emails.
4. **MUST** use database sessions: `expiresIn` 7 days, `updateAge` 1 day, `cookieCache` 5 minutes. **NEVER** issue JWTs or write a refresh flow.
5. **MUST** enable `accountLinking` with `trustedProviders: ["github", "google"]` only. Telegram users get `<sub>@telegram.invalid` with `emailVerified: false` and link only from inside a session.
6. **MUST** take secrets (`BETTER_AUTH_SECRET`, OAuth client secrets, `RESEND_API_KEY`) from validated config only. **NEVER** hardcode or log them.
7. **MUST** read the actor with the library's `@Session()` decorator. **NEVER** read `req.user` or parse cookies in handlers.
8. **MUST** authenticate sockets at the handshake with `auth.api.getSession({ headers })` from the same Better Auth instance as HTTP. **NEVER** write a second session parser.
9. **MUST** send verification and reset emails through the `Mailer` token. **NEVER** call Resend from auth config directly.

### Authorization

10. **MUST** check record permissions **in the service, after loading the record**: membership to read history, join the socket room, or send; ownership to rename, change the room password, or delete. Throw `ForbiddenException`.
11. **NEVER** trust ids from the body or socket payload for identity. The actor is always `@Session()` or the socket's authenticated user.

### Abuse limits and hardening

12. **MUST** hash room passwords with argon2. **NEVER** return or log them.
13. **MUST** rate-limit `/auth/*` with Better Auth's limiter (`rateLimit.storage: "database"`), and everything else with `@nestjs/throttler`:
    | Target | Limit | By |
    | --- | --- | --- |
    | `/auth/*` default | 10/min per IP | Better Auth |
    | Global default | 100/min per IP | throttler |
    | `POST /rooms/:id/join` | 5/min per user + room | throttler |
    | `message:send` | 10 per 10 s per socket | throttler |
14. **MUST** enable helmet, and CORS limited to the web origin with `credentials: true`.
15. **MUST** cap message `content` at 2000 characters in the DTO.

## Check

- [ ] New routes are protected unless explicitly `@AllowAnonymous()`
- [ ] Every read or write of a room or message checks membership or ownership in the service
- [ ] Sign-up without verification cannot sign in, and linking trusts only verified emails (e2e)

## Source

`better-auth-best-practices`, `better-auth-security-best-practices`, `email-and-password-best-practices`; `nestjs-best-practices` → `security-authorize-records`, `security-use-guards`, `security-rate-limiting`, `security-headers-cors-csrf`.
