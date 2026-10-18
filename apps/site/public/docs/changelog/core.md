# @azmr/core

> Release history for @azmr/core.

Source: https://platform.azmara.io/docs/changelog/core

## 0.1.0

### Minor Changes

- de9fd88: Add `batch(fn)`, coalescing every `set()` call made inside `fn` into a
  single effect flush, instead of one flush per `set()`. Values still update
  synchronously as usual — `.get()`/`.peek()` inside `fn` always see the
  latest write; only the effect flush is deferred. Nests correctly: an inner
  `batch()` completing does not trigger a flush while an outer one is still
  open.

  ```typescript
  import { Signal, batch, effect } from "@azmr/core";

  const first = new Signal("Aroha");
  const last = new Signal("Ngata");

  effect(() => console.log(`${first.get()} ${last.get()}`));
  // → Aroha Ngata

  batch(() => {
    first.set("Tane");
    last.set("Mahuta");
  });
  // → Tane Mahuta   (logged once, not twice)
  ```

  Additive — no existing behaviour changes for callers not using `batch()`.

- 76435db: `Signal`'s constructor now accepts an optional `{ equals }` option,
  replacing the default `Object.is` check `set()` uses to decide whether a
  write is a no-op.

  ```typescript
  import { Signal } from "@azmr/core";

  const shallowEqual = (a: { x: number }, b: { x: number }) => a.x === b.x;
  const point = new Signal({ x: 1 }, { equals: shallowEqual });

  point.set({ x: 1 }); // no-op — a different reference, but equal by equals()
  ```

  Useful for object/array values you want compared by shape rather than by
  reference, so setting a structurally-identical value doesn't notify
  subscribers or trigger a re-render.

  Additive — no existing behaviour changes for callers not passing `equals`;
  `Object.is` remains the default.

- c5724c2: `effect(fn)`'s callback may now return a cleanup function. It runs right
  before the next re-run (after stale dependencies are dropped, before the
  callback runs again) and on dispose — the same shape as React's
  `useEffect`.

  ```typescript
  import { Signal, effect } from "@azmr/core";

  const count = new Signal(0);

  const dispose = effect(() => {
    const id = setInterval(() => console.log(count.get()), 1000);
    return () => clearInterval(id);
  });
  ```

  The callback's return value is only treated as a cleanup when it's
  actually a function — existing effects that return other values (e.g.
  `effect(() => signal.get())`) are unaffected.

  Additive — no existing behaviour changes for callers not returning a
  cleanup function.

- a5b3307: `effect()`'s disposer now actually detaches the effect from every signal it
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

- d644047: Add `onError(handler)`, so an exception thrown by an `effect()` re-run or a
  `subscribe()` callback during a flush no longer propagates out of an
  unrelated caller's `set()` and aborts every other subscriber still pending
  in that flush.

  ```typescript
  import { Signal, effect, onError } from "@azmr/core";

  const restore = onError((error) => {
    console.error("effect failed:", error);
  });

  const count = new Signal(0);
  effect(() => {
    if (count.get() > 10) throw new Error("too high");
  });
  ```

  `onError` returns a function that restores whichever handler was active
  before the call. Without a registered handler, the error is rethrown
  asynchronously instead of being silently swallowed, without blocking the
  flush that surfaced it.

  Doesn't apply to `effect(fn)`'s first, synchronous run, or to a direct
  `fn()` call inside `batch()`/`untrack()` — those still throw normally to
  the caller, who is right there to catch them.

  Additive — no existing behaviour changes for callers not using `onError()`.

- 5e05e8f: `computed()` is now lazy and pull-based instead of eager. `fn` no longer runs
  at creation, and while a computed is unobserved (nothing reading it via
  `effect()`, another `computed()`, or `subscribe()`), an upstream change only
  marks it stale — it doesn't recompute. The real computation happens on the
  next `.get()`/`.peek()`, always from the latest values. Once something does
  depend on it, it switches to recomputing eagerly on every upstream change,
  matching the old always-eager behaviour, so an observing effect still only
  re-runs when the derived value itself actually changes.

  ```typescript
  const price = new Signal(100);
  const doubled = computed(() => price.get() * 2); // fn hasn't run yet

  price.set(200); // doubled is unobserved — just marked stale, not recomputed
  price.set(300);

  doubled.get(); // 600 — computes once here, from the latest value
  ```

  **Behaviour change / migration note:** a throwing `fn` used to throw
  synchronously from `computed(fn)` itself. It now throws from the first
  `.get()`/`.peek()` instead, since that's when `fn` actually runs. If you
  relied on `computed()` throwing at creation time (e.g. to fail fast during
  setup), wrap the first read instead:

  ```typescript
  const doubled = computed(fn);
  doubled.get(); // any error from fn now surfaces here, not at computed(fn)
  ```

  No other observable change for the common case of an effect (or another
  computed) reading a computed's value — the eager recompute-on-write path is
  unchanged while observed.

- 7eb9c43: Add `untrack(fn)`, running `fn` with dependency tracking suspended so any
  `.get()` calls made inside it — including ones buried in code `fn` calls
  into, not just a direct call at the top level — don't register a
  dependency on the currently-running effect. Unlike `.peek()`, which only
  works where you control the call site, `untrack()` composes: it works even
  when `fn` calls third-party or generic code you can't rewrite to use
  `.peek()` internally.

  ```typescript
  import { Signal, effect, untrack } from "@azmr/core";

  const count = new Signal(0);
  const debugFlag = new Signal(false);

  effect(() => {
    if (untrack(() => debugFlag.get())) console.log(`count: ${count.get()}`);
  });
  ```

  A no-op outside an effect. An effect created inside `fn` still tracks its
  own reads normally — the suspension only applies to the effect that was
  active when `untrack()` was called.

  Additive — no existing behaviour changes for callers not using `untrack()`.

### Patch Changes

- a5a2134: Fix `exports` condition order (`types` before `import`) and declare
  `"sideEffects": false` on `@azmr/core`, `@azmr/ui`, and `@azmr/security`
  (both the `.` and `./browser` conditions on `security`).

  The `types`-first order previously worked only because TypeScript falls
  back to the sibling `index.d.ts` when the condition order doesn't matter to
  it — bundlers with stricter `exports` resolution (e.g. Next.js's
  Turbopack/webpack) are not guaranteed to be as forgiving. `sideEffects:
  false` lets bundlers tree-shake unused named exports out of consuming
  bundles; verified with an esbuild bundle of a single named import from
  `@azmr/security/browser` — no unrelated exports leak in.

  No public API change.

## 0.0.2

### Patch Changes

- 5bf56bb: Fix package metadata: mojibake in the description field (encoding
  mismatch, was showing garbled text on npm) and a missing LICENSE file
  in the published tarball despite being listed in `files`.

  `@azmr/ai` got the same fixes plus missing `homepage`/`repository`/
  `author`/`keywords`, but isn't included in this changeset - it's on
  changesets' ignore list and doesn't take version bumps this way.

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).

All notable changes to this project will be documented in this file.

## \[0.0.1]

### Added

- Initial release of reactive engine with signals, effects, and computed values
- Built-in infinite-loop protection
- Automatic UI updates when data changes
