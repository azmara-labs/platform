# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities privately - **do not** open a public issue.

**Email:** gazmutech@gmail.com

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code, if applicable)
- The affected package (`@azmr/core`, `@azmr/db`, `@azmr/query`, `@azmr/ui`, `@azmr/ai`, `@azmr/security`, `@azmr/cli`, etc.) and version

We aim to acknowledge reports within 3 business days and to keep you updated as the issue is triaged and fixed.

## Supported Versions

Only the latest published version of each `@azmr/*` package is supported with security fixes. Please upgrade rather than requesting a backported patch for an older version.

## What This Repo Already Does

- `pnpm audit --audit-level=high` is run before every PR
- Dependency overrides in `pnpm-workspace.yaml` pin known-vulnerable transitive dependencies to patched, verified ranges
- `@azmr/pr-quality-checks` runs on every PR to catch package hygiene and publish-safety issues
- Branch protection on `main` requires PRs, passing CI (`Test & Lint`, `Changeset check`), and blocks force-pushes/deletion

## Scope

This policy covers the packages and apps in this monorepo. Vulnerabilities in third-party dependencies should ideally be reported upstream to their own maintainers, but we're happy to be notified as well so we can track and patch on our end via `pnpm.overrides`.
