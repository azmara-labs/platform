---
"@azmr/core": minor
---

Add `onError(handler)`, so an exception thrown by an `effect()` re-run or a
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
