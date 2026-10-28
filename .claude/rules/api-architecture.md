---
paths:
  - "apps/api/**"
---

# API Architecture

How `apps/api` is structured and which `nestjs-best-practices` rules apply. Project rules here win over the skill.

## Rules

1. **MUST** use these feature modules under `src/`, and no others without a decision in `docs/PLAN.md`: `config`, `prisma`, `auth`, `users`, `rooms` (membership lives here), `messages`, `chat` (Socket.IO gateway), `health`.
2. **MUST** layer each module as controller or gateway → service → repository. Controllers and gateways parse input, call one service method, and return a response DTO. Business rules live in services.
3. **NEVER** put business logic or data access in a controller or gateway. `ChatGateway` authenticates the socket, checks membership via `RoomsService`, and delegates persistence to `MessagesService`.
4. **MUST** import only another module's **exported services**. **NEVER** import its repository, controller, or internal files. No circular module imports.
5. **MUST** use `@nestjs/event-emitter` for side effects that cross modules (`RoomsService` emits `room.deleted` → `ChatGateway` evicts sockets). Within a module, call services directly.
6. **MUST** use constructor injection. **NEVER** use `ModuleRef` lookups as a service locator.
7. **MUST** read configuration through `@nestjs/config`, validated by a zod schema at boot (`validate: (env) => envSchema.parse(env)`), via `ConfigService.getOrThrow`. **NEVER** read `process.env` outside `src/config/` (the `PORT` read in `main.ts` moves there in Lesson 1).
8. **MUST** write ESM: relative imports end in `.js` (`./rooms.service.js`), even in `.ts` files.
9. **MUST** name files `<name>.<role>.ts`: `rooms.controller.ts`, `rooms.service.ts`, `rooms.repository.ts`, `create-room.dto.ts`, `room.response.ts`, `chat.gateway.ts`.
10. **MUST** keep shared, runtime-free contracts (`ApiError`, `*View`, socket event types) in `@tos-chat/shared`. Nest-only classes (DTOs, entities) stay in `apps/api`.

## Skill rules not adopted (v1)

| Rule | Why |
| --- | --- |
| `perf-use-fastify` | Express adapter, already scaffolded |
| `perf-use-caching` | No Redis in v1 |
| `api-versioning` | Single client, no `/v1` prefix |
| `micro-*` (except `micro-use-health-checks` → `GET /health`) | Monolith, no brokers |
| `ddd-*` | Plain feature modules; DDD migration is on the backlog |
| `devops-use-tracing` | Out of scope for v1 |
| `@nestjs/authentication`, `@nestjs/authorization` (from `security-auth-jwt`, `security-authorize-records`) | Pre-1.0 (`0.1.x`) and no GitHub OAuth2 out of the box; hand-rolled Passport instead (`api-security.md`). Revisit at 1.0 |

Every other rule in the skill applies. Read only the ones relevant to the task.

## Check

- [ ] No business logic or Prisma calls in controllers or gateways
- [ ] Cross-module access goes through exported services or events only
- [ ] No `process.env` outside `src/config/`; relative imports end in `.js`

## Source

`nestjs-best-practices` → `arch-*`, `di-*`, `devops-use-config-module`; `docs/PLAN.md`.
