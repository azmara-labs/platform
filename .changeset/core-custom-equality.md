---
"@azmr/core": minor
---

`Signal`'s constructor now accepts an optional `{ equals }` option,
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
