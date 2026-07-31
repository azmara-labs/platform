---
"@azmr/core": minor
---

Add `batch(fn)`, coalescing every `set()` call made inside `fn` into a
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
