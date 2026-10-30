---
paths:
  - "apps/web/**"
---

# Web Data Layer

How the web reads from and writes to the Nest API. Nest is the only authority for data and auth.

## Rules

1. **MUST** put server reads in `features/<domain>/<domain>-queries.ts`, starting with `import 'server-only'`, calling only `lib/api-server.ts`.
2. **MUST** put server writes in `features/<domain>/<domain>-actions.ts`, starting with `'use server'`, calling only `lib/api-server.ts`.
3. **MUST** keep exactly two API clients:
   - `lib/api-server.ts` (`server-only`): base `process.env.API_URL`, forwards the incoming request's cookies, maps errors (rule 6).
   - `lib/api-client.ts` (browser): relative `/api/...` through the Next proxy; used only by `*-query-options.ts`.
4. **NEVER** call `fetch` directly in feature code, and **NEVER** hardcode `localhost:4000` or any API host outside `lib/` and `next.config.ts`.
5. **MUST** return domain types from queries and map API payloads inside the query. Components never see raw response envelopes.
6. **MUST** map Nest responses in `lib/api-server.ts`, once. Error bodies are `ApiError` from `@tos-chat/shared` (contract: `api-contracts.md`):
   | Nest | Web |
   | --- | --- |
   | 401 | `redirect('/login')` |
   | 404 | `notFound()`, raised inside the query |
   | 403 | throw `ForbiddenError`, rendered by `error.tsx` |
   | 422 | returned to the action as `{ ok: false, error, fields }`, never thrown |
   | 400 / 409 / 429 | returned to the action as `{ ok: false, error }` (generic message) |
   | 5xx | throw to the nearest error boundary |
7. **MUST** run every action in this order: validate with the zod schema from `<domain>-schema.ts` → call Nest → `refresh()` (or `updateTag()` when the read is cached) → return a discriminated union.
8. **MUST** mirror Nest DTO limits in zod (room name length, message ≤ 2000 chars). zod gives fast feedback; Nest stays the final authority. **NEVER** skip the Nest call because zod passed.
9. **MUST** return the submitted values from a failed action so the form keeps what the user typed (`defaultValue={state.values?.name}`).
10. **MUST** start OAuth with plain links: `<a href="/api/auth/github">`, `<a href="/api/auth/google">`. **NEVER** start OAuth from a server action, `fetch`, or `router.push`.
11. **MUST** keep `createAuthClient` (`better-auth/react`) in `features/user/auth-client.ts` and call it only from `'use client'` leaves in `features/user/components/` (social sign-in buttons including Telegram, email and password forms, sign-out).
12. **MUST** expose `getCurrentUser()` from `features/user/user-queries.ts`, wrapped in React `cache()`. It is the only sanctioned `cache()` in the app.
13. **NEVER** trust Next-side checks for authorization. A hidden button is UX; Nest returning 401/403 is the rule.

## Example

```ts
// ✅ features/room/room-actions.ts
'use server';
export async function createRoom(_: unknown, formData: FormData) {
  const values = Object.fromEntries(formData);
  const parsed = createRoomSchema.safeParse(values);
  if (!parsed.success) return { ok: false as const, error: 'Invalid input', fields: parsed.error.flatten().fieldErrors, values };
  const res = await apiServer.post('/rooms', parsed.data);
  if (!res.ok) return { ...res, values };
  refresh();
  return { ok: true as const, room: res.data };
}
```

## Check

- [ ] `*-queries.ts` starts with `import 'server-only'`; `*-actions.ts` with `'use server'`
- [ ] No raw `fetch` or API host in `features/`
- [ ] Status mapping happens only in `lib/api-server.ts`
- [ ] Actions validate, call Nest, invalidate, and return a union with values on failure

## Source

`nextjs-app-architecture` → `references/queries-actions.md`; `vercel-react-best-practices` → `server-auth-actions`.
