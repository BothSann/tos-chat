---
paths:
  - "apps/api/**"
---

# API Data

Prisma, repositories, transactions, and migrations. Data model: `docs/PLAN.md` → Data model.

## Rules

1. **MUST** pin `prisma` and `@prisma/client` to exactly `7.10.1`, plus `@prisma/adapter-pg`. **NEVER** install a package whose `latest` tag is a pre-release (Prisma's `latest` is `8.0.0-rc.*`). Version bumps are a PLAN.md decision.
2. **MUST** have exactly one `PrismaService extends PrismaClient`, built with the `PrismaPg` driver adapter, connecting in `onModuleInit` and disconnecting in `onModuleDestroy`, exported from `PrismaModule`. **NEVER** call `new PrismaClient()` anywhere else.
3. **MUST** give each data-owning module a `<name>.repository.ts` that wraps `PrismaService`. Services call repositories only. **NEVER** use `prisma.*` in a service, controller, or gateway.
4. **MUST** return plain domain types from repositories. **NEVER** leak Prisma query builders or `Prisma.*` input types into services.
5. **MUST** run every query in a transaction through `tx` (`prisma.$transaction(async (tx) => ...)`). **NEVER** use the outer client inside the callback. Repositories accept an optional `tx` when a service composes a transaction.
6. **MUST** change the schema only with `just migrate <change>` (`prisma migrate dev --name <change>`) and commit the migration. **NEVER** use `prisma db push` and **NEVER** edit an applied migration.
7. **MUST** keep the indexes in PLAN.md: `Account unique(providerId, accountId)`, `Room.name unique`, `Membership PK(userId, roomId)`, `Message index(roomId, createdAt, id)`.
8. **MUST** paginate messages by cursor `(createdAt, id)`, newest first, `limit` ≤ 50. **NEVER** use offset pagination.
9. **NEVER** cause N+1 queries. Load relations with `include`/`select` or a single `in` query.
10. **MUST** cascade deletes in the schema (`Room` → `Membership`, `Message`), not with manual loops.
11. **MUST** connect with `127.0.0.1` in `DATABASE_URL` (dev `:5432`, test `:5433`), not `localhost`.

## Example

```ts
// ✅ rooms.service.ts
async join(userId: string, roomId: string, password?: string) {
  const room = await this.rooms.findById(roomId);       // repository
  if (!room) throw new NotFoundException();
  // ... password check, then:
  return this.rooms.addMember(userId, roomId, 'MEMBER');
}

// ❌ await this.prisma.membership.create({ ... })  // Prisma in a service
```

## Check

- [ ] Prisma versions pinned exactly; one `PrismaService`
- [ ] No `prisma.*` outside repositories; transactions use `tx`
- [ ] Schema changes come with a committed migration

## Source

`nestjs-best-practices` → `db-drizzle-prisma-integration`, `arch-use-repository-pattern`, `db-use-transactions`, `db-use-migrations`, `db-avoid-n-plus-one`.
