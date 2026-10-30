# Short commands for tos-chat. Each recipe wraps a pnpm script or the api's Prisma CLI.
# Requires just: cargo install just

set windows-shell := ["pwsh", "-NoProfile", "-c"]

# List recipes
default:
    @just --list --unsorted

# Run api + web
dev:
    pnpm dev

# Build every workspace
build:
    pnpm build

# Lint every workspace
lint:
    pnpm lint

# Type-check api + web
typecheck:
    pnpm typecheck

# Run api unit tests
test:
    pnpm --filter api test

# Run api e2e tests (test db on :5433)
e2e:
    pnpm --filter api test:e2e

# Start Postgres dev :5432 + test :5433
up:
    pnpm db:up

# Stop Postgres
down:
    pnpm db:down

# Open Prisma Studio on the dev db
studio:
    pnpm --filter api exec prisma studio

# Create and apply a migration: just migrate add_rooms
migrate name:
    pnpm --filter api exec prisma migrate dev --name {{name}}

# Regenerate the Prisma client
generate:
    pnpm --filter api exec prisma generate

# Drop the dev db and reapply every migration
[confirm("Wipe the dev database? (y/N)")]
reset:
    pnpm --filter api exec prisma migrate reset --force

# Format schema.prisma
format:
    pnpm --filter api exec prisma format
