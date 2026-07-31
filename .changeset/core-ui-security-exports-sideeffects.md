---
"@azmr/core": patch
"@azmr/ui": patch
"@azmr/security": patch
---

Fix `exports` condition order (`types` before `import`) and declare
`"sideEffects": false` on `@azmr/core`, `@azmr/ui`, and `@azmr/security`
(both the `.` and `./browser` conditions on `security`).

The `types`-first order previously worked only because TypeScript falls
back to the sibling `index.d.ts` when the condition order doesn't matter to
it — bundlers with stricter `exports` resolution (e.g. Next.js's
Turbopack/webpack) are not guaranteed to be as forgiving. `sideEffects:
false` lets bundlers tree-shake unused named exports out of consuming
bundles; verified with an esbuild bundle of a single named import from
`@azmr/security/browser` — no unrelated exports leak in.

No public API change.
