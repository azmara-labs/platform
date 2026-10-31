---
"@azmr/ui": minor
---

Add route-level states (PAZM-82). New `@azmr/ui/state-view` (Server Component): `StateView`, one layout (icon, title, description, action) for a region's `loading`, `empty` and `error` states, as a section or a full page; loading is a polite status built on `Loading` (logo and delay included, so it doubles as the page loader), error is an alert, and the title's heading level is configurable. New `@azmr/ui/error-boundary`: `ErrorBoundary` with an `onError(error, info)` reporting hook for any service, `reset` and `resetKeys` for recovery, a custom `fallback` or `fallbackProps`, and `rethrow` to let framework errors through (pass Next.js's `unstable_rethrow` so `redirect()` and `notFound()` keep working). The default fallback never shows the error's message. Add the `inbox` icon to `@azmr/ui/icons/lucide`.
