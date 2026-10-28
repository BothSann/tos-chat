---
paths:
  - "apps/web/src/features/**"
  - "apps/web/src/components/**"
---

# Web Composition

Component APIs that scale without boolean-prop sprawl. React 19.

## Scope

`src/components/ui/**` is **shadcn vendor code**, so these rules do not apply inside it. Customize a primitive through a wrapper component or its `cva` variants. Edit a generated file only when there is no other way, and note why in the commit.

## Rules

1. **NEVER** add a boolean prop that switches a component's behavior or structure (`isPrivate`, `compact`, `withHeader`). Compose instead.
2. **MUST** create explicit variant components when modes diverge (`PublicRoomRow`, `PrivateRoomRow`), sharing the internal pieces they have in common.
3. **MUST** build multi-part components as **compound components** with shared context (`Composer.Root`, `Composer.Input`, `Composer.Submit`) when parts need shared state or flexible ordering.
4. **MUST** prefer `children` over `renderX` props. Use a render prop only when the parent must pass data back to the child.
5. **MUST** keep state management inside the provider. Consumers never know whether state comes from `useState`, a reducer, TanStack Query, or the socket.
6. **MUST** shape a context value as `{ state, actions, meta }` so implementations can be swapped without touching consumers.
7. **MUST** lift state into a provider when siblings need it, instead of syncing it through props or effects.
8. **NEVER** use `forwardRef`. In React 19, `ref` is a normal prop.
9. **MUST** read context with `use(Context)`, not `useContext(Context)`.
10. **MUST** keep providers feature-local (`features/message/providers/`) unless the whole app shell needs them (`app/providers.tsx`).

## Example

```tsx
// ✅
<Composer.Root roomId={roomId}>
  <Composer.Input />
  <Composer.Submit />
</Composer.Root>

// ❌
<Composer roomId={roomId} showAttach={false} isCompact disableSubmitWhenEmpty />
```

## Check

- [ ] No new behavior-switching boolean props
- [ ] Contexts expose `{ state, actions, meta }` and are read with `use()`
- [ ] No `forwardRef`; shadcn files untouched or justified

## Source

`vercel-composition-patterns` → `architecture-*`, `state-*`, `patterns-*`, `react19-no-forwardref`.
