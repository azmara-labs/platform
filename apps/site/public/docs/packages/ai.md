# @azmr/ai

> AI auto-fix system with true V8 isolate sandboxing.

Source: https://platform.azmara.io/docs/packages/ai

## Installation

```bash
pnpm add @azmr/ai
```

> **Native module**
>
> `@azmr/ai` uses `isolated-vm` which requires compilation. See
> [Installation](https://platform.azmara.io/docs/guide/installation.md#native-module-note).

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

Optionally expose scoped capabilities (e.g. `createFileReadCapability`) via a `capabilities` option — see [AI Sandbox](https://platform.azmara.io/docs/security/sandbox.md) for the full capabilities guide, including the current synchronous-handler-only limitation.

## Auto-Fix

AI-powered file improvement pipeline with mandatory sandbox check before applying. The platform does not supply a default model backend — bring your own `ModelAdapter`.

```typescript
import { autoFix } from "@azmr/ai";
import type { ModelAdapter } from "@azmr/ai";

const adapter: ModelAdapter = {
  async suggest(context) {
    // call your own model backend
    return "...";
  },
};

const result = await autoFix(
  "src/index.ts",
  "src",     // allowedBase — prevents path traversal
  adapter,   // your ModelAdapter — required, no default
  { autoApprove: false }, // manual review by default
);
```

> **Warning**
>
> The fix is sandboxed and logged to the audit trail before being applied.

## API Reference

### `runSandbox(code, options?)`

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| Memory limit       | 64 MB                                               |
| Timeout            | 5 seconds                                           |
| Node.js API access | None                                                |
| File system access | None by default — opt in via `options.capabilities` |

Returns `{ success: boolean, output?: unknown, error?: string, _sandboxEngine }`.

### `createFileReadCapability(allowedBase, options?)`

Scoped, read-only, synchronous file-read capability for `runSandbox`'s `capabilities` option.

### `autoFix(filePath, allowedBase, adapter, options)`

| Parameter | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `adapter` | Your `ModelAdapter` implementation — required, no default supplied |

| Option        | Default | Description                                 |
| ------------- | ------- | ------------------------------------------- |
| `autoApprove` | `false` | Apply fix automatically after sandbox check |
