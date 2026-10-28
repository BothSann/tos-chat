# tos-chat — Plan (v1)

A chat app built to learn NestJS by doing. Users log in with Google, GitHub, or Telegram, see a list of rooms, and chat in real time. Rooms are **public** (join and chat) or **private** (password required to become a member).

Agreed in a grilling session on 2026-10-28. Changes to these decisions should be recorded here.

## Stack

| Area | Choice |
| --- | --- |
| Repo | pnpm workspace monorepo: `apps/api`, `apps/web`, `packages/shared` |
| Backend | NestJS 12 (ESM), feature modules, following `nestjs-best-practices` |
| Frontend | Next.js 16 App Router, Tailwind 4, shadcn/ui, TanStack Query, socket.io-client |
| Realtime | `@nestjs/websockets` + Socket.IO Gateway |
| Database | PostgreSQL 17 in Docker, Prisma ORM |
| Tests | Vitest (Nest 12 default) unit + e2e with supertest against `postgres-test` |

## Local dev

- Web: `http://localhost:3000`, api: `http://localhost:4000`
- Next `rewrites` proxy `/api/*` → api and `/socket.io/*` → api, so the browser sees **one origin** (cookies `SameSite=Lax`, no CORS needed in dev).
- Postgres: dev on `127.0.0.1:5432` (`tos_chat`), test on `127.0.0.1:5433` (`tos_chat_test`, tmpfs). Use `127.0.0.1`, not `localhost` (IPv6 `::1` does not reach the test port on this machine).
- Telegram needs a public HTTPS domain registered with BotFather → Cloudflare tunnel (only from Lesson 9).

## Auth

- **NestJS owns auth** via `@nestjs/passport`: GitHub, Google, and a custom Telegram strategy (HMAC check of the Login Widget payload with the bot token).
- **Tokens:** access JWT (15 min) + refresh token (7 days), both httpOnly cookies. Refresh tokens stored **hashed**, **rotated** on each use, revocable (logout, reuse detection).
- **Identity:** each provider identity is its own `User` in v1 (no linking). The `Account` table keeps linking possible later.
- `JwtAuthGuard` + `@CurrentUser()` decorator on protected routes.

## Data model

```
User(id, displayName, avatarUrl, createdAt)
Account(id, userId, provider: GOOGLE|GITHUB|TELEGRAM, providerAccountId, email?,
        unique(provider, providerAccountId))
RefreshToken(id, userId, tokenHash, expiresAt, revokedAt?, replacedById?)
Room(id, name unique, description?, type: PUBLIC|PRIVATE, passwordHash?, ownerId, createdAt)
Membership(userId, roomId, role: OWNER|MEMBER, joinedAt, PK(userId, roomId))
Message(id cuid, roomId, authorId, content <= 2000 chars, createdAt,
        index(roomId, createdAt, id))
```

## Rooms

- Any logged-in user can create a room and becomes its `OWNER`.
- All rooms appear in the list; private rooms show a lock and ask for the password on click.
- `POST /rooms/:id/join` creates a `Membership` (password checked for private rooms, throttled). Only members can read history or send messages.
- Owner: rename, change password, delete (messages cascade). Members: leave. Owner cannot leave (deletes instead).

## REST (behind `/api` from the browser)

- `GET /auth/{github,google}` + callbacks, `POST /auth/telegram`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`
- `GET /rooms`, `POST /rooms`, `PATCH /rooms/:id`, `DELETE /rooms/:id`
- `POST /rooms/:id/join`, `POST /rooms/:id/leave`
- `GET /rooms/:id/messages?cursor=&limit=` (cursor pagination, newest first)

## Socket contract

Handshake: JWT from the access cookie → reject unauthenticated sockets. Per event: membership guard.

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `room:join` | `{ roomId }` — must already be a member; subscribes the socket |
| client → server | `room:leave` | `{ roomId }` |
| client → server | `message:send` | `{ roomId, content }` → ack `{ message }` or `{ error }` |
| server → client | `message:new` | `{ message }` (saved row, server id + createdAt) |
| server → client | `error` | `{ code, message }` |

Membership is created over REST only; the socket only subscribes. Messages are persisted first, then broadcast.

## Hardening (every lesson)

Global `ValidationPipe` (whitelist, transform) + class-validator DTOs · `@nestjs/config` with schema-validated env · `@nestjs/throttler` on login, private join, `message:send` · global exception filter with one error shape · helmet.

## Frontend architecture

Agreed 2026-10-28. The how-to lives in `.claude/rules/web-*.md`; this section records the decisions.

- **Style:** `nextjs-app-architecture` (feature-sliced RSC) wins over `vercel-composition-patterns`, which wins over `vercel-react-best-practices`.
- **Server-first:** `<domain>-queries.ts` (server-only) and `<domain>-actions.ts` (`'use server'`) call Nest through `lib/api-server.ts`, which forwards cookies. The web never touches Prisma or Postgres.
- **Live-chat exception:** `features/message` seeds TanStack Query from the server, pages older history through `lib/api-client.ts`, applies `message:new` from Socket.IO, and sends via `message:send` with an ack. There is no second write path.
- **Features:** `user`, `room` (membership folded in), `message`; the socket client lives in `lib/socket/`. No `features/chat/`.
- **Session:** `src/proxy.ts` redirects to `/login` when there is no refresh cookie (UX only) and refreshes ahead of access-token expiry, writing rotated cookies to both the request and the response. Nest is the only authority.
- **Caching:** dynamic by default under Suspense, with `refresh()` after writes. `'use cache'` only for non-personal data whose every write goes through a Next action.
- **Errors:** `lib/api-server.ts` maps 401 → `/login`, 404 → `notFound()`, 403 → `ForbiddenError`, 400/422 → action result, 5xx → error boundary.
- **Forms:** actions validate with zod (mirroring Nest DTOs), return `{ ok: false, error, fields, values }`, and keep user input.
- **Login:** GitHub and Google via plain `<a href="/api/auth/...">`; Telegram widget as a client leaf.
- **shadcn:** `components/ui/**` is vendor code, exempt from the composition rules.

## Backend rules

Agreed 2026-10-28. The how-to lives in `.claude/rules/api-*.md`; this section records the decisions.

- **Auth stack:** `@nestjs/passport` + `@nestjs/jwt`. The official `@nestjs/authentication` / `@nestjs/authorization` (0.1.x) were considered and declined as pre-1.0 without GitHub OAuth2 out of the box; revisit at 1.0.
- **Authorization:** global `JwtAuthGuard` (deny by default) + `@Public()`; record checks (membership, ownership) in services after loading.
- **Tokens:** JWT payload `{ sub }` only; `tos_at` (15 min) and `tos_rt` (7 d, opaque, hashed, rotated, reuse revokes the family). Both `HttpOnly`, `SameSite=Lax`, `Path=/`.
- **Data:** `prisma` / `@prisma/client` pinned to 7.10.1 with `PrismaPg`; one `PrismaService`; a repository per module; services never touch Prisma.
- **Contract:** one `ApiError { statusCode, code, message, fields? }` in `@tos-chat/shared`; validation → 422 + `fields`; response DTOs with `excludeExtraneousValues` implementing shared `*View` types; socket acks `{ ok, data } | { ok: false, error }`.
- **Structure:** modules `config`, `prisma`, `auth`, `users`, `rooms`, `messages`, `chat`, `health`; `@nestjs/event-emitter` for cross-module side effects (`room.deleted`); config validated by zod.
- **Throttling:** 100/min default, 10/min auth, 30/min refresh, 5/min per user + room on join, 10 per 10 s per socket on `message:send`.
- **Not adopted:** Fastify, caching, API versioning, microservices (except `/health`), DDD, tracing.

## How we build it

- Infra and the Next.js frontend are scaffolded by Claude.
- **Every NestJS feature is a lesson the owner types**: `nestjs-learn-write-lesson` builds the reference in a separate worktree, `nestjs-learn-coach` coaches. Each lesson ships at least one unit and one e2e test.

## Lesson order

1. Nest skeleton, `@nestjs/config`, Prisma module, first migration
2. Users module + GitHub strategy
3. Google strategy
4. JWT access/refresh cookies, `JwtAuthGuard`, `@CurrentUser()`
5. Rooms CRUD + ownership checks
6. Join/leave, private-room passwords, throttling
7. Messages + cursor pagination
8. Socket.IO Gateway: handshake auth, membership guard, events
9. Custom Telegram strategy (+ Cloudflare tunnel)
10. Hardening sweep + e2e coverage

Post-v1 work lives in [BACKLOG.md](./BACKLOG.md).
