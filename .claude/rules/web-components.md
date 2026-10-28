---
paths:
  - "apps/web/src/features/**"
  - "apps/web/src/components/**"
---

# Web Components

The server/client boundary and how feature components are shaped.

## Rules

1. **MUST** default to an **async server component** that awaits its own query from minimal props (`roomId`, `userId`) or an already-resolved record.
2. **MUST** use `'use client'` only for hooks, event handlers, or browser APIs, and only on **leaves**. **NEVER** mark a parent of server content as a client component.
3. **NEVER** import an async server component into a `'use client'` file. A client component that needs server data gets a server half in the same feature (`RoomList` server → `RoomListClient` leaf); the server half passes data or a Promise down.
4. **MUST** unwrap a one-shot server Promise in a client leaf with `use()`. Use TanStack Query only where `web-realtime-chat.md` allows it.
5. **MUST** export each component's `*Skeleton` from the **same file**, defined at the end of the file (`RoomList` + `RoomListSkeleton`).
6. **NEVER** create a skeleton alias that only forwards props to another skeleton.
7. **MUST** split a file only when a client and a server component would otherwise share it, or when 3+ call sites reuse a piece.
8. **MUST** import server actions directly in client leaves. **NEVER** pass an action as a prop just so a child can call it.
9. **NEVER** define a component inside another component. Hoist it to module level.
10. **MUST** pass the smallest serializable props across the boundary: ids and primitives, not whole API responses.
11. **MUST** keep interaction state local to the leaf: `useOptimistic`, `useTransition`, `useActionState`, reducers, or URL state. **NEVER** mirror props into state or sync derived state with `useEffect`.

## Example

```tsx
// ✅ features/room/components/room-list.tsx
export async function RoomList() {
  const rooms = await getRooms();
  return <ul>{rooms.map((r) => <RoomRow key={r.id} room={r} />)}</ul>;
}
export function RoomListSkeleton() { /* same height as RoomList */ }

// ❌ 'use client' at the top of room-list.tsx with useEffect(() => fetch('/api/rooms'))
```

## Check

- [ ] Every `'use client'` file is a leaf with a stated reason (hook, event, or browser API)
- [ ] No server component imported into a client file
- [ ] Every component has its sibling `*Skeleton` at the end of the file
- [ ] No action props, no inline components, no prop-to-state mirroring

## Source

`nextjs-app-architecture` → `references/components.md`, `references/ux-patterns.md`, invariants 4, 6, 9, 11.
