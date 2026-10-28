---
paths:
  - "apps/web/**"
---

# Web Architecture

Where code lives in `apps/web` and which rule wins when guidance conflicts.

## Rules

1. **MUST** follow this precedence: `nextjs-app-architecture` → `vercel-composition-patterns` → `vercel-react-best-practices`. These rule files already resolve the known conflicts.
2. **MUST** use this top-level layout under `apps/web/src/`:
   - `app/` — routes, layouts, `error.tsx`, `loading` composition only
   - `features/<domain>/` — everything owned by a product domain
   - `components/ui/` — shadcn primitives (vendor zone); `components/*.tsx` — app-shell singletons used once (`site-header.tsx`)
   - `hooks/`, `types/` — cross-feature only, after real reuse by 2+ features
   - `lib/` — non-domain helpers and subsystems: `api-server.ts`, `api-client.ts`, `socket/`, `utils.ts`
   - `proxy.ts` — auth gating and token refresh (see `web-caching.md`)
3. **MUST** keep exactly three features in v1: `user` (session, current user, login, logout), `room` (list, create, join, password, settings, leave, membership), `message` (history, live updates, composer, socket hooks).
4. **NEVER** create a feature folder for a sub-concept. Membership lives in `room`; a reaction would live in `message`. No `features/chat/`, `features/auth/`, or `features/membership/`.
5. **MUST** use this feature layout, creating only the files that are needed:
   ```
   features/<domain>/
     <domain>-queries.ts        # server-only reads via lib/api-server
     <domain>-actions.ts        # 'use server' writes via lib/api-server
     <domain>-schema.ts         # zod schemas for actions
     <domain>-cache.ts          # pure tags + TanStack query keys
     <domain>-query-options.ts  # TanStack queryOptions via lib/api-client
     components/  hooks/  types/  providers/
   ```
6. **MUST** prefix every non-component file with the folder name (`room-actions.ts`, never `actions.ts` or `join-actions.ts`), even for a sub-concept.
7. **NEVER** add `common/`, `shared/`, `helpers/`, or root `*-types.ts` files. A name must state its scope.
8. **NEVER** import `@prisma/client`, a database driver, or anything from `apps/api` into `apps/web`. Nest owns all data and auth; the web talks to it over HTTP and Socket.IO only.
9. **MAY** import shared contracts (socket event types, DTO shapes) from `@tos-chat/shared`. **NEVER** put runtime logic there.
10. **NEVER** create `index.ts` barrel files in `features/` or `lib/`. Import from the defining file.

## Example

```
✅ features/room/room-actions.ts            exports joinRoom, leaveRoom, createRoom
✅ features/room/components/join-dialog.tsx
❌ features/membership/membership-actions.ts
❌ features/room/index.ts
```

## Check

- [ ] New code sits in `user`, `room`, `message`, `lib/`, or `components/`, nowhere new without a decision in `docs/PLAN.md`
- [ ] Filenames carry the folder prefix
- [ ] No Prisma, DB, or `apps/api` imports; no barrels

## Source

`nextjs-app-architecture` → `references/feature-folders.md`, invariants 7, 8, 10.
