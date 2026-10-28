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
