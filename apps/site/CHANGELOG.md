# @azmr/docs

## 0.0.3

Renamed from `@azmr/docs-next` — this app now replaces the Docusaurus-based
`apps/docs`. Migrated to Fumadocs (static MDX content, live TypeScript type
tables via `fumadocs-typescript`, build-time changelog generation from
`packages/*/CHANGELOG.md`), folded in the interactive playground (previously
`apps/playground`), and reuses the existing `deploy-docs.yml`/Vercel pipeline
(now serving Next.js instead of Docusaurus). Hand-maintained, not
changesets-generated — this package is on the changesets `ignore` list.

## 0.0.2

### Patch Changes

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).
