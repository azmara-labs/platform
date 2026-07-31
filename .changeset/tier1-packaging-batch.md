---
"@azmr/ai": patch
"@azmr/cli": patch
"@azmr/db-supabase": patch
"@azmr/policycore": patch
"@azmr/query": patch
---

Fix `exports` condition order (`types` before `import`) across `ai`, `cli`,
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
