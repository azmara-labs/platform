---
"@azmr/core": minor
---

`computed()` is now lazy and pull-based instead of eager. `fn` no longer runs
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
