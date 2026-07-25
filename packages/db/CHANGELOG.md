# @azmr/db

## 1.0.0

### Major Changes

- c4f2c02: `SQLiteAdapter`'s methods are now all `async` (previously synchronous) — a
  breaking change to every existing call site. This aligns `@azmr/db` with a
  new, extracted `DbAdapter` interface that a cloud-backed adapter
  (`@azmr/db-supabase`) also implements, so callers can swap SQLite for
  Supabase behind the same shape.

  - `deleteWhere`'s signature changed from `(name, condition: string, params)`
    to `(name, filter: Filter)` — a structured, backend-portable filter shape
    (`{column, operator, value}[]`) replacing raw SQL fragments, since a
    cloud/PostgREST-backed adapter can't accept arbitrary SQL strings.
  - New `findWhere(name, filter)` method, using the same `Filter` shape.
  - `rawSelect` and the `path` getter remain SQLite-only escape hatches, not
    part of the shared `DbAdapter` interface.
  - New exports: `DbAdapter`, `Filter`, `FilterCondition`, `FilterOperator`,
    `DbAdapterError`.

  Existing callers need to add `await` at every `SQLiteAdapter` call site.

### Patch Changes

- Updated dependencies [c4f2c02]
  - @azmr/security@0.3.0

## 0.2.0

### Minor Changes

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).

### Patch Changes

- 5bf56bb: Fix package metadata: mojibake in the description field (encoding
  mismatch, was showing garbled text on npm) and a missing LICENSE file
  in the published tarball despite being listed in `files`.

  `@azmr/ai` got the same fixes plus missing `homepage`/`repository`/
  `author`/`keywords`, but isn't included in this changeset - it's on
  changesets' ignore list and doesn't take version bumps this way.

- Updated dependencies [5bf56bb]
- Updated dependencies [d70fccb]
- Updated dependencies [8b4512b]
  - @azmr/security@0.2.0

## 0.1.0

### Minor Changes

- 0a51a60: Phase 3 security hardening

  - `@azmr/security`: add `createRateLimiter` — sliding-window in-memory rate limiter with per-key tracking
  - `@azmr/security`: add `createJWT` — HMAC-SHA256 JWT using Node built-in crypto, timing-safe verification, 15-min default expiry
  - `@azmr/db`: add `createColumnEncryption` — AES-256-GCM column-level encryption with scrypt key derivation and GCM auth tag tamper detection
  - `@azmr/cli`: add `audit:verify` command — recomputes SHA-256 hashes and validates prevHash chain integrity of audit log files

### Patch Changes

- Updated dependencies [0a51a60]
  - @azmr/security@0.1.0
