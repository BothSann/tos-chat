# tos-chat

Real-time chat app (Next.js + NestJS) built to learn NestJS lesson by lesson.

- Plan and decisions: [docs/PLAN.md](docs/PLAN.md)
- Post-v1 work: [docs/BACKLOG.md](docs/BACKLOG.md)

## Layout

```
apps/api         NestJS api (port 4000)
apps/web         Next.js web (port 3000, proxies /api and /socket.io to the api)
packages/shared  Types shared by api and web
```

## Run

Requires Node 24, pnpm 11, Docker, and `just` (`cargo install just`).

```sh
pnpm install
just up           # Postgres dev (5432) + test (5433)
just dev          # api + web in parallel
```

Run `just` to list every recipe.

Open http://localhost:3000. The api answers directly at http://localhost:4000 and through the proxy at http://localhost:3000/api.

## Checks

```sh
just test         # api unit tests
just e2e          # api e2e tests
just lint
just typecheck
just build
```
