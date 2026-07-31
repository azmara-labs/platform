# @azmr/core

Reactive engine for the Azmara platform — signals, effects, and computed values with a batch scheduler that eliminates double-firing.

## Install

```bash
pnpm add @azmr/core
# or
npm install @azmr/core
```

## Usage

```typescript
import { Signal, computed, effect } from "@azmr/core";

const count = new Signal(0);
const doubled = computed(() => count.get() * 2);

effect(() => {
  console.log(`count: ${count.get()}, doubled: ${doubled.get()}`);
});
// → count: 0, doubled: 0

count.set(5);
// → count: 5, doubled: 10
```

## Subscribe (for React / external bridges)

```typescript
const unsub = count.subscribe((value) => {
  console.log("changed:", value);
});

count.set(10); // → changed: 10
unsub();        // stop listening
```

## Disposing effects and computed values

`effect()` returns a disposer that detaches it from every signal it read, so it stops re-running and can be garbage collected. Safe to call more than once, and safe to call from inside another effect during the same flush.

```typescript
const dispose = effect(() => console.log(count.get()));
dispose(); // stops re-running; count.set(...) no longer triggers it
```

`effect()`'s callback may also return a cleanup function. It runs right before the next re-run and on dispose — the same shape as React's `useEffect`:

```typescript
effect(() => {
  const id = setInterval(() => console.log(count.get()), 1000);
  return () => clearInterval(id);
});
```

`computed()`'s return value carries a `dispose()` too, for tearing down the whole derived chain:

```typescript
const doubled = computed(() => count.get() * 2);
doubled.dispose(); // stops recomputing; doubled.peek() stays at its last value
```

## batch

Coalesces every `set()` call made inside a callback into a single effect flush, instead of one flush per `set()`. Values update synchronously as usual — `.get()`/`.peek()` inside the callback always see the latest write; only the effect flush is deferred.

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

## untrack

Runs a callback with dependency tracking suspended — any `.get()` calls made inside it (including ones buried in code you call into, not just a direct call at the top level) don't register a dependency on the currently-running effect. Unlike `.peek()`, which only works where you control the call site, `untrack()` composes through indirection.

```typescript
import { Signal, effect, untrack } from "@azmr/core";

const count = new Signal(0);
const debugFlag = new Signal(false);

effect(() => {
  // Reacts to count, but reading debugFlag here should never itself
  // trigger a re-run — it's just checked, not depended on.
  if (untrack(() => debugFlag.get())) console.log(`count: ${count.get()}`);
});
```

## onError

Registers a handler for errors thrown by an `effect()` re-run or a `subscribe()` callback during a flush. Without this, one bad subscriber's exception propagates out of an unrelated caller's `set()` and aborts every other subscriber still pending in that flush; with a handler registered, the error is routed here instead and the flush continues. Returns a function that restores whichever handler was active before the call. Doesn't apply to `effect(fn)`'s first, synchronous run, or to a direct `fn()` call inside `batch()`/`untrack()` — those still throw normally to the caller.

```typescript
import { Signal, effect, onError } from "@azmr/core";

const restore = onError((error) => {
  console.error("effect failed:", error);
});

const count = new Signal(0);
effect(() => {
  if (count.get() > 10) throw new Error("too high");
});

restore(); // back to the previous handler (none by default)
```

If no handler is registered, the error is rethrown asynchronously (so it isn't silently swallowed) without blocking the flush that surfaced it.

## API

| Export | Description |
|---|---|
| `Signal<T>` | Reactive value container |
| `Signal.get()` | Read value, subscribe current effect |
| `Signal.set(value)` | Update value, notify subscribers |
| `Signal.peek()` | Read value without subscribing |
| `Signal.subscribe(fn)` | Push-based subscription, returns unsubscribe |
| `effect(fn)` | Run `fn` reactively, returns a disposer that fully detaches it; `fn` may return a cleanup function |
| `computed(fn)` | Read-only derived Signal; return value has a `dispose()` |
| `batch(fn)` | Coalesce `set()` calls inside `fn` into one flush; returns `fn`'s return value |
| `untrack(fn)` | Run `fn` with dependency tracking suspended; returns `fn`'s return value |
| `onError(handler)` | Register a handler for errors thrown during a flush; returns a function that restores the previous handler |

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (types included)

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
