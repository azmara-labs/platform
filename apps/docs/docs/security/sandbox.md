---
sidebar_position: 3
---

# AI Sandbox

All AI-generated code runs inside a secure V8 isolate before being applied to any file.

## Why not vm2?

`vm2` was the standard choice for years but was [officially deprecated in 2023](https://github.com/patriksimek/vm2/issues/533) with multiple unfixed sandbox escape CVEs. Azmara uses `isolated-vm` which creates a true **V8 isolate** — a completely separate heap with no shared memory or prototype chain.

## Sandbox constraints

| Property | Value |
|---|---|
| Node.js API access | ❌ None |
| File system access | ❌ None by default — opt in via a scoped capability |
| Network access | ❌ None (no fetch capability exists yet — see Capabilities below) |
| Memory limit | 64 MB |
| Execution timeout | 5 seconds |
| Globals exposed | None by default — only what's explicitly passed via `capabilities` |

## Usage

```typescript
import { runSandbox } from "@azmr/ai";

const result = await runSandbox(`
  const nums = [1, 2, 3, 4, 5];
  nums.reduce((a, b) => a + b, 0);
`);

if (result.success) {
  console.log(result.output); // 15
}
```

## Capabilities

Optionally expose named, host-bridged functions into the sandbox — for example, a file reader scoped to one directory:

```typescript
import { runSandbox, createFileReadCapability } from "@azmr/ai";

const result = await runSandbox(
  `const file = await readFile({ path: "notes.txt" }); return file.content;`,
  { capabilities: { readFile: createFileReadCapability("/allowed/dir") } },
);
```

Capability handlers must be **synchronous** — `isolated-vm`'s `Callback` mechanism doesn't await a Promise returned by a handler, so an async handler fails fast with a clear error rather than misbehaving silently. True non-blocking async capabilities (e.g. network fetch) need a `worker_threads` + `Atomics.wait` blocking bridge and aren't implemented yet.

Omitting `capabilities` preserves the sandbox's original zero-capability behavior exactly.

:::info Explicit `return` required when using capabilities
With `capabilities`, your code runs inside a function body, not as a classic script — a bare trailing expression is silently discarded rather than returned. Use `return` to get a value back in `result.output`. Without `capabilities`, the usual script completion-value behavior (last expression counts) is unchanged.
:::

## Auto-fix pipeline

When `autoFix()` is called:

```
1. Validate file path (assertSafePath)
2. Read original file
3. Request AI suggestion (OpenAI API)
4. Run suggestion through V8 isolate sandbox
5. If sandbox passes → apply to file
6. If sandbox fails → revert, log error
7. Write audit log entry regardless of outcome
```

:::info Manual approval
`autoApprove` defaults to `false`. The fix is shown for review before being applied. Set `autoApprove: true` only in trusted CI environments.
:::
