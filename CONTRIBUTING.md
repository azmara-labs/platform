# Contributing to Azmara Platform

Thanks for contributing. This covers the practical, repo-specific parts;
[azmara-labs' general contribution philosophy](https://github.com/azmara-labs/.github/blob/main/CONTRIBUTING.md)
covers the rest (workflow philosophy, CLA, security disclosure).

## Setup

See the [README](README.md#development) for prerequisites and install steps.

## Branching

We use [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) —
everything branches off `main`, merges back via PR. No `develop`/`release` branches.

Branch names: `type/short-description`, matching [Conventional Commits](https://www.conventionalcommits.org/)
types - `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/`.

## Before opening a PR

```bash
pnpm build
pnpm test
pnpm check-types
pnpm lint
pnpm audit:deps
```

All of these run in CI (`Test & Lint`, required to merge) — running them
locally first saves a round trip.

## Changesets

If your PR changes anything inside `packages/*`, add a changeset describing
the version bump:

```bash
pnpm changeset add
```

- `@azmr/ai`, `@azmr/cli`, and `@azmr/docs` are excluded from changesets
  versioning (internal app, or versioned manually) - don't add a changeset
  for changes scoped only to those.
- Bump type: `patch` for fixes/internal changes, `minor` for new
  backward-compatible features, `major` for breaking changes. Everything
  is currently pre-1.0, so use judgement - a "breaking" change to a
  0.x package conventionally ships as `minor`, not `major`.
- Merging a PR doesn't publish anything by itself. Changesets accumulate
  until a separate "Version Packages" PR is merged, which is what
  actually triggers `npm publish`.

## Package structure

| Package | Published? |
|---|---|
| `@azmr/core`, `@azmr/db`, `@azmr/db-supabase`, `@azmr/query`, `@azmr/security`, `@azmr/ui`, `@azmr/policycore` | Yes - versioned via changesets |
| `@azmr/ai`, `@azmr/cli` | Yes - versioned manually (changesets-ignored, since `@azmr/cli` depends on `@azmr/ai`) |
| `apps/docs` | No - `private: true` |

## Review

Branch protection currently requires 0 approving reviews (solo
maintainer) - this will change to require at least one approval once
there's more than one active maintainer. `Test & Lint` passing is
always required regardless, with no bypass for anyone, including admins.
