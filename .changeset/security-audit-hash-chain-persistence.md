---
"@azmr/security": patch
---

`createAuditLogger()` no longer reports false "chain broken" errors on
legitimate logs. Previously every call started a fresh in-memory chain at
`prevHash: ""`, which desynced from the on-disk chain whenever: two loggers
in one process shared a log path (e.g. `@azmr/db` and `@azmr/ai`, both
defaulting to `.azmara/audit.log`), or a process restarted and created a new
logger against an existing log.

Loggers targeting the same resolved path now share one hash chain via a
module-level registry, seeded from the last valid entry already on disk
(tolerating a missing file, an empty file, or a trailing partial line from
an interrupted write). Cross-process concurrent writers are still not
guarded against — this module assumes a single writer process per log
file, documented in the file header and the audit-logging docs page.

No public API change.
