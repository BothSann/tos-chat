---
paths:
  - "apps/api/**"
---

# API Lessons Boundary

The owner is learning NestJS by typing it. This rule limits what Claude writes in `apps/api`.

## Rules

1. **MAY** edit infrastructure in the owner's checkout: `tsconfig*.json`, `nest-cli.json`, `vitest.config*.ts`, `.oxlintrc.json`, `.env.example`, `docker-compose.yml`, and `package.json` scripts.
2. **NEVER** write feature code in the owner's checkout unprompted: modules, controllers, services, repositories, DTOs, response DTOs, guards, decorators, strategies, gateways, filters, pipes, interceptors, `prisma/schema.prisma`, or migrations.
3. **MUST** build reference solutions only in the lesson worktree, via `nestjs-learn-write-lesson`, following `.claude/rules/api-*.md`.
4. **MAY** write feature code in the checkout only when the owner says so explicitly through `nestjs-learn-coach` ("you write it", "check and fix", "check, write test").
5. **MUST** point out a bug, rule violation, or failing test with file and line and a hint, and let the owner type the fix. **NEVER** silently fix it.
6. **MUST** cite rules by file and number in reviews ("violates `api-data.md` #3").
7. **MUST** follow `docs/PLAN.md` → Lesson order. Picking a different next lesson is the owner's call (`nestjs-learn-pick-task`).
8. **MAY** add packages needed by a lesson only as a step the owner runs (`pnpm --filter api add ...`), with exact pins where `api-data.md` #1 requires them.

## Check

- [ ] No feature files in `apps/api/src` changed by Claude without an explicit request
- [ ] Reviews cite rule ids and leave the fix to the owner

## Source

`nestjs-learn-write-lesson`, `nestjs-learn-coach`; `CLAUDE.md`.
