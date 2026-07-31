---
"@azmr/core": minor
---

`effect()`'s disposer now actually detaches the effect from every signal it
read, instead of being a no-op. Previously every `effect()` leaked its
subscriber into every `Signal` it read, forever — and since `computed()`
calls `effect()` internally and discarded the disposer, every computed
leaked too, with no way to dispose one at all.

- The disposer removes the subscriber from every tracked signal and marks
  the effect disposed, so an in-flight flush skips it even if already
  queued — safe to call from inside another effect during the same flush.
- Stale dependencies are dropped before each re-run, so a conditional read
  (`cond.get() ? a.get() : b.get()`) that switches branches doesn't keep
  the effect subscribed to the untaken branch's signal.
- **New:** `computed()`'s return value now carries a non-enumerable
  `dispose()` that stops recomputation and detaches from every signal `fn`
  reads — the return type is `Signal<T> & { dispose(): void }`, additive
  over the previous `Signal<T>`.

Non-breaking for existing callers — `effect()`'s signature is unchanged and
`computed()`'s return value is still a fully-functional `Signal<T>`, just
with one new property. `@azmr/ui`'s `useSignal` and any other long-lived
`effect()`/`computed()` consumer now actually stops leaking on unmount once
its disposer is called.
