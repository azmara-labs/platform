---
---

Enforce the coverage thresholds already declared in
`vitest.coverage.config.ts` (lines 75, functions 75, branches 70,
statements 75) — CI ran `pnpm test` only, never `pnpm test:coverage`,
so the thresholds were decorative.

- Added the missing `pnpm test:coverage` root script (the config file's own
  header comment already documented this command; it never actually
  existed) and the `@vitest/coverage-v8` devDependency it needs — neither
  was wired up, so running coverage locally failed outright.
- Switched `vitest.coverage.config.ts` from a flat `include` glob to
  `projects: ["packages/*"]`, so each package's own vitest config
  (environment, `setupFiles`) is respected during aggregation. The flat
  glob silently ran every test under plain Node with no jsdom and no
  `@azmr/ui` setup file — any DOM-touching test would register 0%
  coverage (or fail outright) instead of running correctly, which would
  have made the coverage numbers actively misleading rather than merely
  incomplete.
- `.github/workflows/ci.yml`'s test job now runs `pnpm test:coverage`
  instead of `pnpm test` — same test suite, plus enforced thresholds.

Dry-run before landing: aggregate coverage is 83.89% statements / 80.5%
branches / 87.55% functions / 84.83% lines — all above the declared
thresholds already, so this lands green, not as a new gate the codebase
has to grow into.
