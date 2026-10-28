---
paths:
  - "apps/web/src/features/message/**"
  - "apps/web/src/lib/socket/**"
  - "apps/web/src/app/rooms/**"
---

# Web Realtime Chat

The one place the web uses a client cache: the room's message stream. Event contract: `docs/PLAN.md` → Socket contract.

## Rules

1. **MUST** use TanStack Query **only** in `features/message/`. Everything else reads through server queries (`web-data-layer.md`).
2. **MUST** seed from the server: the async `RoomMessages` component fetches the first page through `message-queries.ts` and renders `<HydrationBoundary>` with the key from `message-cache.ts`. **NEVER** move the first read to the browser.
3. **MUST** load older pages with `useInfiniteQuery`, using `queryOptions` from `message-query-options.ts`, through `lib/api-client.ts` (`GET /api/rooms/:id/messages?cursor=&limit=`).
4. **MUST** keep one Socket.IO client per tab in `lib/socket/`: a lazy singleton plus a provider mounted in the room layout. **NEVER** call `io()` inside a component body or a feature hook.
5. **MUST** wrap socket usage in feature hooks under `features/message/hooks/` (`use-room-subscription.ts`, `use-send-message.ts`). Components never touch the raw socket.
6. **MUST** emit `room:join` on mount and `room:leave` on unmount for the open room, and re-join after reconnect.
7. **MUST** apply `message:new` with `queryClient.setQueryData(messageKeys.room(roomId), ...)`, deduplicating by message `id`.
8. **MUST** send with `message:send` and an **ack**, not a server action:
   - insert an optimistic message with a temporary `clientId` and `status: 'pending'`
   - on ack success, replace it with the saved message (server `id`, `createdAt`)
   - on ack error, mark it `failed`, show a retry, and toast the error code
9. **NEVER** add a second write path for messages (no `sendMessage` server action, no REST POST).
10. **MUST** type every event payload with the shared contract from `@tos-chat/shared`.
11. **MUST** keep fast-changing values (scroll anchor, "at bottom" flag) in refs, not state, and keep the composer's text local to the composer leaf.

## Example

```ts
// ✅ features/message/hooks/use-room-subscription.ts
socket.on('message:new', ({ message }) =>
  queryClient.setQueryData(messageKeys.room(roomId), (data) => appendUnique(data, message)),
);

// ❌ setInterval(() => refetch(), 3000)   // polling
// ❌ const socket = io('/');              // inside a component
```

## Check

- [ ] First page is server-seeded; client fetches only older pages
- [ ] One socket per tab; joined and left with the room lifecycle
- [ ] Sends go through the ack, with pending, failed, and retry states
- [ ] Event types come from `@tos-chat/shared`

## Source

`nextjs-app-architecture` → `references/single-page-applications.md`, `references/ux-patterns.md`; `vercel-react-best-practices` → `rerender-use-ref-transient-values`.
