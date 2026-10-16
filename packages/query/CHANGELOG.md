# Changelog

## 0.0.3

### Patch Changes

- c657b91: `QueryBuilder.first()` no longer permanently mutates the builder. Previously
  `first()` called `this.limit(1)`, which set `_limitN = 1` on the instance
  forever — so any later `.select()` on the same builder returned at most one
  row, even without an explicit `.limit()` call. `select()` and `first()` now
  share an internal helper that takes the limit as a parameter instead of
  reading `this._limitN` directly, so `first()` can read one row without
  touching builder state.

  No public API change.

- 449c93a: Fix `exports` condition order (`types` before `import`) across `ai`, `cli`,
  `db-supabase`, `policycore`, `query`, matching the same fix already applied
  to `core`/`ui`/`security`.

  Add `"sideEffects": false` to `ai`, `db-supabase`, `policycore`, `query` —
  audited each `src/` tree first (no module-level executable statements
  outside function/class bodies); verified with an esbuild bundle of a single
  named import from `@azmr/policycore` (24.85KB unminified) that unused
  exports tree-shake out (3KB bundled, zero unrelated exports leaked).
  **`@azmr/cli` deliberately excluded** — its `src/index.ts` calls `main()`
  unconditionally at module scope (the CLI's actual entry point), a genuine
  import-time side effect; marking it `sideEffects: false` would tell
  bundlers it's safe to drop, which is false for this package.

  Add `engines.node: ">=22.0.0"` to `@azmr/ai` (previously had no `engines`
  field at all) — matches `isolated-vm@^6.1.2`'s own documented requirement
  (see `notes.isolated-vm` in its `package.json`), not the `>=18.0.0`/`>=20.0.0`
  baseline other packages use, since production auto-fix runs genuinely need
  `isolated-vm` (the `node:vm` fallback is dev/CI-only). README corrected to
  match (was still claiming Node ≥18).

  Document "ESM only, no CommonJS build" in the root README and every
  package README that didn't already have it (`ai`, `cli`, `db`,
  `db-supabase`, `policycore`, `query` — `core`/`ui`/`security` got this in
  an earlier PR).

  No public API change.

  **Note:** `@azmr/ai` and `@azmr/cli` are excluded from this changeset's
  frontmatter even though their `package.json`/README changes are part of
  this PR — both are in `.changeset/config.json`'s `ignore` list, and
  changesets rejects a changeset mixing ignored and non-ignored packages.
  Since they're ignored, the normal `changesets/action` release flow will
  never version-bump or publish them — their fixes land in the repo but
  won't reach npm without a manual publish or a deliberate change to the
  ignore list. Flagged as an open question for the maintainer; not resolved
  in this PR.

- Updated dependencies [de9fd88]
- Updated dependencies [76435db]
- Updated dependencies [c5724c2]
- Updated dependencies [a5b3307]
- Updated dependencies [d644047]
- Updated dependencies [5e05e8f]
- Updated dependencies [a5a2134]
- Updated dependencies [7eb9c43]
  - @azmr/core@0.1.0

## 0.0.2

### Patch Changes

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).
- Updated dependencies [5bf56bb]
- Updated dependencies [d70fccb]
  - @azmr/core@0.0.2

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-06-21

### Added

- Initial release of chainable, type-safe query builder
- Support for reactive and static data sources
- No eval, no injection - predicates are TypeScript functions
- FoxPro-style querying syntax
