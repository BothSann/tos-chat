---
paths:
  - "apps/web/**"
---

# Web Caching and Session

Cache Components is on (`cacheComponents: true`). Almost all data is personal or changed outside Next, so reads are dynamic by default.

## Rules

1. **MUST** keep every query that calls Nest **dynamic by default**: no `'use cache'`, rendered inside a page-owned `<Suspense>`. Actions call `refresh()` after a write.
2. **MAY** add `'use cache'` + `cacheTag` + `cacheLife` to a read only when **both** are true:
   - the data is the same for every user, and
   - every write to it goes through a Next server action that calls `updateTag()`.
   Record the decision in `docs/PLAN.md` when you do.
3. **NEVER** cache a read that changes outside Next (socket messages, other users' writes) or that depends on the viewer (membership, "joined" flags).
4. **NEVER** read `cookies()`, `headers()`, or any identity inside a `'use cache'` scope. Pass trusted, normalized values in from an uncached wrapper.
5. **MUST** take normalized primitives as cached-function arguments (`roomId: string`), never an object such as `params`.
6. **MUST** define a server tag or TanStack key that is shared by a read and its invalidation **once**, in a pure `<domain>-cache.ts` that imports neither Next nor TanStack.
7. **NEVER** wrap a query in React `cache()` "just in case". `getCurrentUser()` is the only exception (`web-data-layer.md` #12).
8. **MUST** implement `src/proxy.ts` (Next 16's renamed middleware) as follows:
   - No Better Auth session cookie (`getSessionCookie()` from `better-auth/cookies`) → redirect protected routes to `/login`. This is UX only; Nest stays the authority.
   - **NEVER** refresh, decode, or validate the session in `proxy.ts`, and never put auth decisions in Next.
9. **NEVER** set cookies from a Server Component. Only `proxy.ts`, route handlers, and server actions may.
10. **NEVER** use polling to keep caches in sync. Live data arrives over Socket.IO (`web-realtime-chat.md`).

## Example

```ts
// ✅ features/message/message-cache.ts (pure)
export const messageKeys = {
  room: (roomId: string) => ['messages', roomId] as const,
};

// ❌ features/room/room-queries.ts
export async function getRooms() { 'use cache'; cacheLife('hours'); /* per-user flags → stale for others */ }
```

## Check

- [ ] No `'use cache'` without both rule-2 conditions and a note in PLAN.md
- [ ] Tags and keys come from `<domain>-cache.ts`, never string literals
- [ ] `proxy.ts` only checks that the session cookie exists

## Source

`nextjs-app-architecture` → `references/cache-components.md`, `references/single-page-applications.md`; Next.js `proxy.ts` docs.
