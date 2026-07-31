---
"@azmr/core": minor
---

Add `untrack(fn)`, running `fn` with dependency tracking suspended so any
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
