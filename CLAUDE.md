# tos-chat

Real-time chat app built to learn NestJS. Decisions: `docs/PLAN.md`. Later work: `docs/BACKLOG.md`.

## Repo map

```
apps/api         NestJS 12 (ESM, Vitest, oxlint) on :4000
apps/web         Next.js 16 App Router on :3000; proxies /api and /socket.io to the api
packages/shared  Types shared by api and web (DTO shapes, socket events), no runtime logic
.claude/rules    web-*.md (apps/web/**) and api-*.md (apps/api/**), auto-loaded by path
```

## Commands

```sh
pnpm db:up                  # Postgres dev :5432 + test :5433
pnpm dev                    # api + web
pnpm test | pnpm lint | pnpm build
pnpm --filter api test:e2e
```

## Where the rules live

- **Web:** `.claude/rules/web-*.md`. Start with `web-architecture.md`, which sets precedence and layout.
- **API:** `.claude/rules/api-*.md` first (project decisions win), then the `nestjs-best-practices` skill. NestJS features are **lessons the owner types**: see `api-lessons.md` before touching `apps/api/src`.
- `apps/web/AGENTS.md` points at Next.js's version-matched bundled docs. Read them for API mechanics.

## Gotchas

- Use `127.0.0.1`, not `localhost`, in database URLs. IPv6 `::1` does not reach the test port.
- Nest 12 is ESM: relative imports need the `.js` suffix.
- pnpm 11 blocks install scripts. Approve them with `pnpm approve-builds <pkg>`, which writes `allowBuilds` in `pnpm-workspace.yaml`.
