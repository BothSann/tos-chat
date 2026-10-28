---
paths:
  - "apps/web/**"
---

# Web Performance

A curated subset of `vercel-react-best-practices` that applies to tos-chat. Where it conflicts with the other `web-*` rules, they win (see `web-architecture.md` #1).

## Rules

### Waterfalls (critical)

1. **MUST** start independent awaits together with `Promise.all`. **NEVER** await sequentially when the calls don't depend on each other.
2. **MUST** move an `await` into the branch that uses it, and check cheap sync conditions before awaiting.
3. **MUST** split independent server reads into sibling components under separate `<Suspense>` boundaries rather than one component awaiting everything.

### Bundle (critical)

4. **NEVER** import through barrel files. Import from the defining module (`lucide-react` icons by path if the bundler doesn't optimize them).
5. **MUST** load heavy, non-initial UI (emoji picker, markdown renderer) with `next/dynamic`, and preload it on hover or focus when the user is likely to open it.
6. **MUST** keep import paths statically analyzable. No computed `import()` paths.

### Server (high)

7. **MUST** keep auth enforcement in Nest. Actions still pass the forwarded cookies so Nest can check them (`web-data-layer.md`).
8. **NEVER** keep request or user state in module-level variables on the server.
9. **MUST** pass only the fields a client leaf renders. **NEVER** serialize whole API objects across the boundary.
10. **MUST** use `after()` for non-blocking server work (logging) instead of delaying the response.

### Re-renders (medium)

11. **MUST** derive values during render. **NEVER** use `useEffect` + `setState` to compute derived state.
12. **MUST** use functional `setState` when the next state depends on the previous one.
13. **MUST** pass a function to `useState` for expensive initial values.
14. **MUST** put interaction logic in event handlers, not effects triggered by state flags.
15. **MUST** use `startTransition` / `useTransition` for non-urgent updates and pending UI, and `useDeferredValue` for expensive renders driven by typing.
16. **MUST** use refs for transient, frequently changing values (scroll position, typing timers).
17. **MUST** keep effect dependencies primitive. Split hooks whose dependencies are independent.
18. **NEVER** `useMemo` a simple primitive expression. Memoize only measured expensive work.

### Rendering (medium)

19. **MUST** use a ternary (`cond ? <A /> : null`), not `cond && <A />`, when `cond` can be `0` or `''`.
20. **MUST** use `content-visibility: auto` (or virtualization once measured) for long message lists.

## Not adopted

`client-swr-dedup` (we use TanStack Query in `message` only), `server-cache-lru` and broad `server-cache-react` (see `web-caching.md`), `js-*` micro-optimizations, and `advanced-*` patterns. Consult the full skill only when profiling shows a problem.

## Check

- [ ] No sequential independent awaits
- [ ] No barrel imports; heavy UI is dynamically imported
- [ ] No derived state in effects; transitions for non-urgent updates

## Source

`vercel-react-best-practices` → `async-*`, `bundle-*`, `server-*`, `rerender-*`, `rendering-*`.
