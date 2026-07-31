# @azmr/ai

AI-powered code analysis, auto-fix, and capability-scoped sandboxed execution — running inside a true V8 isolate via `isolated-vm`.

## Install

```bash
pnpm add @azmr/ai
# or
npm install @azmr/ai
```

`isolated-vm` is an optional dependency (native module). Without it, the sandbox automatically falls back to Node's `vm` module in development/CI — never in production. See the `notes.isolated-vm` field in `package.json` for the Node version this package targets.

## Sandbox

Run untrusted code inside a V8 isolate with no access to Node.js, the file system, or the network by default.

```typescript
import { runSandbox } from "@azmr/ai";

const result = await runSandbox(`
  const x = [1, 2, 3].reduce((a, b) => a + b, 0);
  x;
`);

if (result.success) {
  console.log(result.output); // 6
} else {
  console.error(result.error);
}
```

### Capabilities

Optionally expose named, host-bridged functions into the sandbox — for example, a file reader scoped to one directory:

```typescript
import { runSandbox, createFileReadCapability } from "@azmr/ai";

const result = await runSandbox(
  `const file = await readFile({ path: "notes.txt" }); return file.content;`,
  { capabilities: { readFile: createFileReadCapability("/allowed/dir") } },
);
```

Capability handlers must be **synchronous** against the real `isolated-vm` engine — its `Callback` mechanism does not await a Promise returned by a handler, so an async handler fails fast with a clear error rather than a confusing raw marshalling error. (The `node:vm` dev/CI fallback has no such limitation, since it runs in the same process.) True non-blocking async capabilities (e.g. network fetch) need a `worker_threads` + `Atomics.wait` blocking bridge — not implemented yet, tracked as a follow-up (see `D:/Azmara/ATLAS/decisions/D018-*.md`).

**Gotcha:** when `capabilities` are used, your code runs inside a function body, not as a classic script — so a bare trailing expression (`file.content;`) is silently discarded, not returned. Use an explicit `return` statement to get a value back in `result.output`. (Without capabilities, the classic script completion-value behavior — last expression counts — is unchanged.)

Omitting `capabilities` (or calling `runSandbox(code)` with no second argument) preserves the original zero-capability behavior exactly.

## Auto-Fix

AI-powered file improvement pipeline with a mandatory sandbox check before applying.

```typescript
import { autoFix } from "@azmr/ai";
import type { ModelAdapter } from "@azmr/ai";

const adapter: ModelAdapter = {
  async suggest(context) {
    // call your own model backend — Ollama, a local Llama model, etc.
    return "...";
  },
};

const result = await autoFix(
  "src/index.ts",
  "src", // allowedBase — prevents path traversal
  adapter,
  { autoApprove: false }, // manual review by default
);
```

The platform does not supply a default `ModelAdapter` — bring your own. The suggestion is sandboxed and logged to the audit trail before being applied.

## Analysis

Rule-based static analysis (no-eval, Signal/query misuse, etc.) — a cheap first pass before invoking a model.

```typescript
import { analyzeSource, formatReport } from "@azmr/ai";

const result = analyzeSource(source);
console.log(formatReport(result));
```

## API

| Export | Description |
|---|---|
| `runSandbox(code, options?)` | Runs code in the best available sandbox (isolated-vm, falling back to `node:vm` in dev/CI). Returns `{ success, output?, error?, _sandboxEngine }`. |
| `createFileReadCapability(allowedBase, options?)` | Scoped, read-only file capability for `runSandbox`'s `capabilities` option. |
| `autoFix(filePath, allowedBase, adapter, options?)` | AI auto-fix pipeline with sandbox gate and audit logging. |
| `buildContext(filePath, source)` | Extracts detected Azmara primitives from a source file. |
| `analyzeSource(source)` / `formatReport(result)` | Static analysis and human-readable report formatting. |
| `createHttpAdapter(options)` | Generic OpenAI-compatible-endpoint `ModelAdapter`. |

## Requirements

- Node.js ≥ 22 (matches `isolated-vm@^6.1.2`'s own requirement — see `notes.isolated-vm` in `package.json`; re-evaluate once the platform's baseline moves past Node 26 LTS)
- TypeScript ≥ 5 (types included)
- ESM only — no CommonJS build. `require("@azmr/ai")` will not work; use `import`.

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
