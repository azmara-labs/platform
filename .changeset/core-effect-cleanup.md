---
"@azmr/core": minor
---

`effect(fn)`'s callback may now return a cleanup function. It runs right
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
