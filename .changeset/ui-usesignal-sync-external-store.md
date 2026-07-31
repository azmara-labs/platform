---
"@azmr/ui": patch
---

`useSignal` is now built on `useSyncExternalStore` instead of
`useState` + `useEffect` + `Signal.subscribe`, the exact pattern
`useSyncExternalStore` exists to replace. Under concurrent rendering, an
update that lands between render and commit could previously produce a
torn UI; `useSyncExternalStore` closes that window by re-checking the
snapshot immediately after subscribing and forcing a synchronous re-render
if it changed.

`getSnapshot`/`getServerSnapshot` both read via `Signal.peek()` (which never
registers a dependency), and the hook no longer depends on
`Signal.subscribe()` firing immediately with the current value on
subscribe — it deliberately doesn't; the snapshot is read independently, as
`useSyncExternalStore`'s contract expects.

New render tests (via `react-dom/client` + `React.act`, no new
dependency — the package's existing `react`/`react-dom` devDependencies
cover it) verify the hook actually renders correctly: initial value shown
without waiting on subscribe, updates after mount reflected, and rapid
sequential `set()` calls before the next flush don't leave a stale value.
The previous test file had zero real render tests. A `test-setup.ts` sets
`IS_REACT_ACT_ENVIRONMENT` for React 19's `act`.

No public API change.
