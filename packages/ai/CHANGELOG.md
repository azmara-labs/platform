# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-07-25
### Added
- Capability-scoped sandbox: `runSandbox`/`runInSandbox`/`runInFallbackSandbox` now accept an optional
  `options.capabilities` map exposing named, host-bridged functions into the sandbox. Omitting it
  preserves the original zero-capability behavior exactly (`fix.ts`'s `autoFix` pipeline is unaffected).
- `createFileReadCapability(allowedBase, options?)` — scoped, read-only file-read capability.
- Real-engine test coverage (`sandbox.test.ts`, gated with `it.runIf` so it self-skips where the
  native module isn't loadable): memory-limit enforcement, timeout enforcement, capability round-trips,
  and error propagation — none of this was tested against the actual `isolated-vm` engine before.

### Fixed
- `isolated-vm` pin corrected from `^7.0.0` to `^6.1.2` — the previous pin required Node ≥26 (no LTS
  release exists yet), which is why it never installed on this platform's Node 24.x LTS baseline. This
  was misdiagnosed in an earlier audit as a missing VS Build Tools issue — it was an engines-range
  mismatch, not a toolchain gap.
- `isolate.dispose()` in `sandbox.ts`'s `finally` block is now wrapped in a try/catch: a catastrophic
  error (e.g. hitting the isolate's own memory limit) can leave V8 unable to gracefully unwind, making
  a subsequent `dispose()` throw "Isolate is already disposed" — which, uncaught, was overriding the
  already-computed `{success: false, ...}` result with an unhandled rejection instead.

### Known limitation (not fixed, tracked for follow-up)
- Capability handlers must be synchronous against the real `isolated-vm` engine. Verified empirically:
  `isolated-vm@6.1.2`'s `Callback` mechanism never awaits a Promise returned by a handler, and plain
  object/array values don't marshal through `Callback` returns or `script.run(..., {promise:true})`'s
  completion value without JSON-string serialization (both worked around internally for the sync case).
  A `createFetchCapability` was planned for this release but is deferred — true non-blocking async
  capabilities need a `worker_threads` + `Atomics.wait` blocking bridge, which is real additional
  engineering. See `D:/Azmara/ATLAS/decisions/D018-*.md` for the full findings.

## [0.1.0] - 2026-07-19
### Added
- Static source analysis (`analyzeSource`, `formatReport`) - severity-ranked
  findings for common risk patterns (unsafe file access, SQL string
  concatenation, etc.)
- `runSandbox` - unified sandbox entry point, tries isolated-vm first and
  falls back to Node's `vm` module when it's unavailable (no native build
  toolchain), instead of hard-failing
- HTTP model adapter (`createHttpAdapter`)

### Fixed
- `isolated-vm` moved to `optionalDependencies` - a failed native build no
  longer fails the whole package install
- Fixed missing README/LICENSE in the published package, and missing
  `homepage`/`repository`/`author`/`keywords` in package.json

## [0.0.1] - 2026-06-21
### Added
- Initial release of AI auto-fix system
- AI-powered code analysis running inside true V8 isolate sandbox via isolated-vm
- Secure code execution and analysis (not using deprecated vm2)
- Safe code transformation capabilities