---
paths:
  - "apps/web/src/app/**"
  - "apps/web/src/features/**/components/**"
---

# Web Pages and Suspense

Pages describe the loading experience. They compose and never fetch.

## Rules

1. **MUST** keep `page.tsx` and `layout.tsx` synchronous composition surfaces: static chrome, headings, `<Suspense>`, error boundaries, transition wrappers.
2. **NEVER** import a `*-queries.ts` file, call `lib/api-server`, or hold domain logic in a page or layout.
3. **NEVER** `await params` or `await searchParams` at the top of a page. Use `params.then(...)` or `Promise.all([params, searchParams]).then(...)` so the chrome lands in the static shell.
4. **MUST** turn route props into plain values (`roomId`, `cursor`) at the page boundary. **NEVER** pass a prop named `params` or `searchParams` to a feature.
5. **MUST** place every data `<Suspense>` boundary in the page. **NEVER** let a feature wrap itself in `<Suspense>`.
6. **MUST** keep stable chrome (cards, panels, section headings) **outside** the boundary. The fallback swaps only the data-dependent body, and fallback and content never both render the same outer card.
7. **MUST** use the feature's own `*Skeleton` as the fallback, sized to match the content. Sections that can be empty reserve their height.
8. **MUST** nest sections below a variable-height section as sibling boundaries inside it, not awaited by it.
9. **MUST** wrap each section that can fail independently in an error boundary. Route-level failures use `error.tsx`, which renders `ForbiddenError` (see `web-data-layer.md`) as a "no access" state.
10. **MAY** use a tiny route-local helper only to place a boundary around `connection()`, `redirect()`, or a resolved route prop.

## Example

```tsx
// ✅ app/rooms/[roomId]/page.tsx
export default function RoomPage({ params }: PageProps<'/rooms/[roomId]'>) {
  return (
    <main className="flex h-dvh flex-col">
      <Suspense fallback={<RoomHeaderSkeleton />}>
        {params.then(({ roomId }) => <RoomHeader roomId={roomId} />)}
      </Suspense>
      <Suspense fallback={<RoomMessagesSkeleton />}>
        {params.then(({ roomId }) => <RoomMessages roomId={roomId} />)}
      </Suspense>
    </main>
  );
}

// ❌ export default async function RoomPage({ params }) { const { roomId } = await params; const room = await getRoom(roomId); ... }
```

## Check

- [ ] No async page or layout; no top-level `await params`
- [ ] No `*-queries` import under `src/app/`
- [ ] Every data section has a page-owned `<Suspense>` with the feature's skeleton
- [ ] Skeleton height matches content (no CLS); headings sit outside the boundary

## Source

`nextjs-app-architecture` → `references/pages-suspense.md`, invariants 1, 2, 3, 5.
