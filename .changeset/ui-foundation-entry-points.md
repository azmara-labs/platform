---
"@azmr/ui": minor
---

Foundation for the `@azmr/ui` redesign (see `docs/superpowers/specs/2026-10-15-azmr-ui-design.md`).

- **`@azmr/core` is now a peer dependency** (`>=0.0.2 <1.0.0`) instead of an exact-pinned dependency. Two copies of core give separate scheduler/tracking state and incompatible `Signal` types, so the app's own copy must be the one `@azmr/ui` uses. If you already followed the README and installed both packages, nothing changes; otherwise add `@azmr/core` to your dependencies.
- **New entry points:** `@azmr/ui/hooks` (client) and `@azmr/ui/lib` (server-safe, exports `cn`). `cn()` is also exported from the package root.
- **`"use client"` is now emitted** on the client entries (`@azmr/ui` and `@azmr/ui/hooks`), so they can be imported from Next.js App Router Server Components' client boundaries without wrapping. `@azmr/ui/lib` has no directive and can be imported from Server Components.
- **`useSignal` no longer resubscribes on every render.** `subscribe` and `getSnapshot` are memoised on the signal; passing a different signal resubscribes once. Also verified against `computed()` signals.
- The build now verifies its own output (`scripts/verify-dist.mjs`): directives per entry, type declarations present, and the `exports` map matching the build entries.
