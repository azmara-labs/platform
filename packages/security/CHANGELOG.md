# @azmr/security

## 0.3.0

### Minor Changes

- c4f2c02: Add `createAccessControl` — a framework-agnostic RBAC primitive:
  `{resource, action, params} → {can, reason}`.

  Policy is a static `Record<role, PolicyRule[]>` grant map with `"*"` wildcards
  for role/resource/action, plus an optional per-rule `condition` callback for
  record-level checks (e.g. ownership). An optional `resolve` callback lets a
  caller back checks with a database or any other backend — `@azmr/security`
  never imports a DB client itself, keeping this package dependency-agnostic.
  Fails closed by default (`defaultEffect: "deny"`); an `onDecision` hook fires
  on every check (grant, deny, or resolver-sourced) for callers who want to
  wire it into `createAuditLogger`.

  Exported from both the Node entry point and `@azmr/security/browser` — the
  module has no Node-only imports, and client-side `can()` checks are a
  legitimate UX-gating use case, though never a security boundary on their own.

## 0.2.0

### Minor Changes

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).
- 8b4512b: Add a browser-safe entry point (`@azmr/security/browser`) exporting
  `createRateLimiter`, `assertSafeIdentifier`, `sanitiseForLog`, and
  `validate` - none of which touch Node.js built-ins. Fixes #10.

  Two functions moved into their own files, both for the same reason: a
  Node-only export sharing a file with browser-safe exports drags the
  Node dependency into any browser bundle re-exporting from that file,
  regardless of which specific export is actually used.

  - `assertSafePath` (uses `node:path`) moved out of `sanitise.ts` into
    `path-safety.ts`
  - `validateEnv` (reads `process.env`) moved out of `validate.ts` into
    `validate-env.ts` - this one is a Node _global_ reference rather than
    an `import`, so it doesn't fail the bundler build the way a missing
    module specifier does, it throws `ReferenceError` only if actually
    called client-side. Excluded from the browser entry; its own doc
    comment already describes it as a server-startup guard.

  `createJWT` is also not included in the browser entry: it uses
  `node:crypto`'s synchronous HMAC/timingSafeEqual APIs, which have no
  browser equivalent - making it browser-safe would mean moving to the
  async Web Crypto API, a breaking change to `sign()`/`verify()` that's
  out of scope here.

  Verified two ways: `browser.test.ts` recursively walks the browser
  entry's full transitive import graph (not just direct re-exports) and
  asserts no file in it contains a Node builtin import (with or without
  the `node:` prefix) or references a Node global (`process`, `Buffer`,
  `__dirname`, `__filename`) - this is the regression guard for the
  `validateEnv` class of bug, which a plain import-statement check can't
  catch. Also manually built `apps/docs-next` (Next.js/Turbopack) with a
  client component actually calling `createRateLimiter`/`validate` from
  `@azmr/security/browser`, confirming the fix against a real bundler.

### Patch Changes

- 5bf56bb: Fix package metadata: mojibake in the description field (encoding
  mismatch, was showing garbled text on npm) and a missing LICENSE file
  in the published tarball despite being listed in `files`.

  `@azmr/ai` got the same fixes plus missing `homepage`/`repository`/
  `author`/`keywords`, but isn't included in this changeset - it's on
  changesets' ignore list and doesn't take version bumps this way.

## 0.1.0

### Minor Changes

- 0a51a60: Phase 3 security hardening

  - `@azmr/security`: add `createRateLimiter` — sliding-window in-memory rate limiter with per-key tracking
  - `@azmr/security`: add `createJWT` — HMAC-SHA256 JWT using Node built-in crypto, timing-safe verification, 15-min default expiry
  - `@azmr/db`: add `createColumnEncryption` — AES-256-GCM column-level encryption with scrypt key derivation and GCM auth tag tamper detection
  - `@azmr/cli`: add `audit:verify` command — recomputes SHA-256 hashes and validates prevHash chain integrity of audit log files
