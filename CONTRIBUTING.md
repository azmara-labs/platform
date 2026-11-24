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

- `@azmr/ai`, `@azmr/cli`, and `@azmr/site` are excluded from changesets
  versioning (internal app, or versioned manually) - don't add a changeset
  for changes scoped only to those.
- Bump type: `patch` for fixes/internal changes, `minor` for new
  backward-compatible features, `major` for breaking changes. Everything
  is currently pre-1.0, so use judgement - a "breaking" change to a
  0.x package conventionally ships as `minor`, not `major`.
- Merging a PR doesn't publish anything by itself. Changesets accumulate
  until a separate "Version Packages" PR is merged, which is what
  actually triggers `npm publish`.

## Releasing

A release is merging the bot's "chore: version packages" PR (branch
`changeset-release/main`). The `Release` workflow opens or updates that PR on
every push to `main`, and publishes when it is merged.

**Do not click "Update branch" on that PR.** The `Release` workflow owns the
branch and force-pushes it. A manual update while a `Release` run is in flight
makes that run's push fail (it showed as a red `Release` run on `main` on
21 Nov 2026; nothing was published or lost). If the PR looks behind `main`, wait
for the `Release` run triggered by the latest merge to finish and the bot will
refresh it.

### Before merging the Version Packages PR

1. Read the diff: each package's `CHANGELOG.md` entry and the new version in its
   `package.json`. Check the bump matches the changes (pre-1.0: breaking changes
   ship as `minor`).
2. Check that every package in the PR is ready to ship. There is no mechanism yet
   for marking a package "not ready" (PAZM-153), so if one is not, stop and
   remove its changeset on `main` first.
3. Check that `Test & Lint` has run and passed on the PR. It is the only check
   the `main` ruleset requires, and the merge is blocked until it has run.
   `Changeset check` is skipped on this PR on purpose (`ci.yml` excludes the
   `changeset-release/main` branch), so do not wait for it. Commits the bot
   pushed used to leave out the other checks as well (PAZM-151, fix merged
   24 Nov 2026 but not yet proven on a real release). If `Test & Lint` is
   missing, close and reopen the PR, then wait for it.

### After merging

1. Open the `Release` run on `main` and wait for it to go green. It builds, runs
   `changeset publish` with npm provenance, pushes the tags and creates the
   GitHub releases.
2. Confirm all three outputs for each package that was versioned:
   - npm: `npm view @azmr/<name> version` shows the new version.
   - Git tag: named like `@azmr/ui@0.16.0`.
   - GitHub release: the Releases page has an entry with the same name.
3. If npm shows the new version but the tag or release is missing, the publish
   worked and only the follow-up step failed. Create the tag and release by hand
   from the Version Packages commit (this is how 0.14.0 was backfilled). Do not
   publish the same version twice.

## Package structure

| Package | Published? |
|---|---|
| `@azmr/core`, `@azmr/db`, `@azmr/db-core-interface`, `@azmr/db-supabase`, `@azmr/query`, `@azmr/security`, `@azmr/ui`, `@azmr/policycore` | Yes - versioned via changesets |
| `@azmr/ai`, `@azmr/cli` | Yes - versioned manually (changesets-ignored, since `@azmr/cli` depends on `@azmr/ai`) |
| `apps/site` | No - `private: true` |

## Review

Branch protection currently requires 0 approving reviews (solo
maintainer) - this will change to require at least one approval once
there's more than one active maintainer. `Test & Lint` passing is
always required regardless, with no bypass for anyone, including admins.
