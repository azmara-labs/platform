---
"@azmr/security": patch
---

`createRateLimiter()`'s internal store no longer grows without bound.
Timestamps were pruned per key on `check()`, but the map entry itself was
never deleted, and keys that stopped being checked were never revisited —
in a long-running server keyed by IP, the store retained one entry per IP
ever seen, contradicting the doc comment's claim that memory stayed
"bounded to active keys × maxRequests."

Each `check()` call now opportunistically sweeps the whole store (dropping
any key whose timestamps have all aged out) if at least `windowMs` has
passed since the last sweep — no `setInterval`, since `rateLimit.ts` is
shared into the browser build via `browser.ts`, and a Node-style
`Timeout.unref()` isn't available there. `resetAll()` also resets the sweep
clock. Doc comment corrected to describe the actual eviction behaviour.

No public API change (`check`/`reset`/`resetAll` unchanged).
