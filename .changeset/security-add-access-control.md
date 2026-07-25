---
"@azmr/security": minor
---

Add `createAccessControl` — a framework-agnostic RBAC primitive:
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
