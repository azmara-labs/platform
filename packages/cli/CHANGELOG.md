# @azmr/cli

## 0.2.0

### Minor Changes

- Add the `azmara policycore:scan [path]` command — walks a project directory,
  runs `@azmr/ai`'s static analysis plus `@azmr/policycore`'s own security
  checks (currently: CORS wildcard-with-credentials misconfiguration) against
  every matched source file, and reports findings. Supports
  `--format=table|json|owasp-md|owasp-json` and `--fail-on=error|warning|info|none`.

  This entry is hand-written, not changesets-generated: `@azmr/cli` moved to
  changesets' `ignore` list alongside `@azmr/ai` in this same release, since
  it now has a genuine dependency on `@azmr/ai` (which was already
  ignore-listed) and changesets requires both sides of a dependency on an
  ignored package to be ignored together. See
  `ATLAS/decisions/D020-azmr-ai-manual-versioning.md`.

## 0.1.1

### Patch Changes

- 5bf56bb: Fix package metadata: mojibake in the description field (encoding
  mismatch, was showing garbled text on npm) and a missing LICENSE file
  in the published tarball despite being listed in `files`.

  `@azmr/ai` got the same fixes plus missing `homepage`/`repository`/
  `author`/`keywords`, but isn't included in this changeset - it's on
  changesets' ignore list and doesn't take version bumps this way.

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).
- Updated dependencies [5bf56bb]
- Updated dependencies [d70fccb]
- Updated dependencies [8b4512b]
  - @azmr/core@0.0.2
  - @azmr/db@0.2.0
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
  - @azmr/db@0.1.0
