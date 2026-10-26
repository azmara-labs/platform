# @azmr/db-supabase

## 0.2.3

### Patch Changes

- ea59e9b: Package metadata: `homepage` now points at each package's page on platform.azmara.io (docs.azmara.io never resolved), `bugs` links to the GitHub issues, and README doc links follow. `@azmr/ui` gets a description that matches the design system it now is.
- Updated dependencies [ea59e9b]
  - @azmr/db-core-interface@0.1.1
  - @azmr/security@0.3.2

## 0.2.2

### Patch Changes

- 9e4ee63: Move the `DbAdapter` contract (the interface, its filter and schema types, and `DbAdapterError`) into a new dependency-free package, `@azmr/db-core-interface`.

  `@azmr/db-supabase` now depends on it instead of on `@azmr/db`, so installing `@azmr/db-supabase` no longer installs `better-sqlite3`. `@azmr/db` re-exports everything from the package root and from `@azmr/db/interface`, so existing imports keep working and `DbAdapterError` is the same class from every entry point.

- Updated dependencies [9e4ee63]
  - @azmr/db-core-interface@0.1.0

## 0.2.1

### Patch Changes

- 221ef3b: Import `DbAdapterError`, `DbAdapter`, `Filter` from `@azmr/db/interface`
  instead of the root `@azmr/db` export, so installing `@azmr/db-supabase`
  no longer drags `better-sqlite3` into the module graph. Unblocks
  serverless/edge deployments (e.g. Vercel, Next.js) where a native
  node-gyp-built module in the server bundle is unwanted or unsupported.
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

- Updated dependencies [a5a2134]
- Updated dependencies [221ef3b]
- Updated dependencies [c8712c6]
- Updated dependencies [7e2bf0e]
  - @azmr/security@0.3.1
  - @azmr/db@1.1.0

## 0.2.0

### Minor Changes

- c4f2c02: Initial release. `SupabaseAdapter` implements `@azmr/db`'s `DbAdapter`
  interface backed by `supabase-js`'s PostgREST query builder, so RLS is
  enforced automatically from whatever `SupabaseClient` the caller injects —
  this package never constructs its own client and never bypasses RLS.

  `createTable` always throws (PostgREST can't run DDL — manage schema via the
  Supabase SQL editor, CLI migrations, or dashboard). Every method validates
  identifiers via `@azmr/security`'s `assertSafeIdentifier`, and every
  `{data, error}` tuple from `supabase-js` is checked — a failure throws a
  `DbAdapterError` carrying the Postgres error's `code`/`details`/`hint`, never
  silently swallowed into a generic string.

### Patch Changes

- Updated dependencies [c4f2c02]
- Updated dependencies [c4f2c02]
  - @azmr/db@1.0.0
  - @azmr/security@0.3.0
