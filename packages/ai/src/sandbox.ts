import { assertSafeIdentifier, createAuditLogger } from "@azmr/security";
import ivm from "isolated-vm";
import type { SandboxResult, SandboxRunOptions } from "./sandbox-types.js";

const SANDBOX_TIMEOUT_MS = 5_000;
const SANDBOX_MEMORY_MB = 64;

const RESERVED_CAPABILITY_NAMES = new Set([
  "global",
  "eval",
  "Function",
  "constructor",
  "__proto__",
  "prototype",
  "this",
]);

const audit = createAuditLogger("ai:sandbox");

export type { SandboxResult } from "./sandbox-types.js";

/**
 * Executes untrusted code inside a V8 Isolate — a true sandbox with:
 * - Separate V8 heap (memory limit enforced)
 * - No access to Node.js APIs, file system, or network
 * - Hard execution timeout
 * - Audit log entry for every run
 *
 * This replaces the insecure `vm2` approach from the design doc.
 * vm2 has known sandbox escape CVEs. isolated-vm uses actual V8 isolate boundaries.
 *
 * `options.capabilities` optionally exposes named host-bridged functions
 * into the sandbox (e.g. a scoped file reader). Omitting it — or calling
 * with no second argument at all — preserves today's "expose nothing"
 * behavior exactly, including the classic script completion-value return.
 *
 * IMPORTANT — capability handlers must be SYNCHRONOUS against this engine.
 * Verified empirically against the real isolated-vm@6.1.2 engine: its
 * Callback mechanism never awaits a Promise returned by a handler — it
 * tries to marshal whatever the handler synchronously returns, and a
 * Promise object can't be marshalled ("#<Promise> could not be cloned"),
 * regardless of sync/async Callback mode. True non-blocking async
 * capabilities (e.g. network fetch) need a worker_threads + Atomics.wait
 * blocking bridge, which is real additional work tracked separately (see
 * ATLAS decision D018) — not implemented here. A handler that returns a
 * Promise throws a clear error below instead of the confusing raw
 * isolated-vm message.
 *
 * Structured (object/array) return values also don't marshal directly
 * through Callback in this isolated-vm version ("A non-transferable value
 * was passed", even wrapped in ExternalCopy) — worked around by
 * JSON-serialising the return value and JSON.parse-ing it back inside the
 * isolate via a small per-capability wrapper function. Object *arguments*
 * passed INTO a capability marshal fine natively and need no such wrapping.
 *
 * The SAME "non-transferable value" limitation turns out to apply to
 * `script.run(..., { promise: true })`'s own completion value too — a
 * plain object/array return from the wrapping async IIFE fails the exact
 * same way, independent of capabilities entirely. Worked around the same
 * way: the executed code's own result is JSON.stringify'd inside the
 * isolate before being returned, and JSON.parse'd back on the host side
 * once `script.run()` resolves.
 */
export async function runInSandbox(
  code: string,
  options: SandboxRunOptions = {},
): Promise<SandboxResult> {
  const capabilities = Object.entries(options.capabilities ?? {});
  const capabilityNames = capabilities.map(([name]) => name);
  const codePreview = code.slice(0, 80).replace(/\n/g, " ");
  const isolate = new ivm.Isolate({ memoryLimit: SANDBOX_MEMORY_MB });

  try {
    const context = await isolate.createContext();
    const jail = context.global;

    // Expose nothing to the sandbox by default — least privilege
    await jail.set("global", jail.derefInto());

    const wrapperPreamble: string[] = [];

    for (const [name, handler] of capabilities) {
      if (RESERVED_CAPABILITY_NAMES.has(name)) {
        throw new Error(`[azmr/ai] Capability name "${name}" is reserved`);
      }
      assertSafeIdentifier(name, "capability name");

      const dispatchName = `__${name}_dispatch`;
      await jail.set(
        dispatchName,
        new ivm.Callback(
          (args: unknown) => {
            const result = handler(args);
            if (result && typeof (result as Promise<unknown>).then === "function") {
              throw new Error(
                `[azmr/ai] Capability "${name}" returned a Promise — async capabilities are not yet supported against the real isolated-vm engine (needs a worker_threads bridge, tracked separately). Make this capability's handler synchronous.`,
              );
            }
            return JSON.stringify(result);
          },
          { sync: true },
        ),
      );

      // Friendly wrapper: sandboxed code calls `capName(args)` (still
      // awaitable even though it's not a real Promise — `await` on a
      // plain value just resolves immediately) and gets back the parsed
      // JsonValue rather than a raw JSON string.
      wrapperPreamble.push(`function ${name}(args) { return JSON.parse(${dispatchName}(args)); }`);
    }

    // Only wrap in an async IIFE when capabilities are present — this is
    // what keeps the zero-capability path byte-for-byte identical to
    // today's completion-value semantics (e.g. `runInSandbox("1 + 2")`
    // still returns output === 3 via classic script completion value).
    // The inner IIFE's result is JSON round-tripped (see doc comment above)
    // since `promise: true` can't carry a plain object/array completion
    // value directly.
    const executable =
      capabilityNames.length > 0
        ? `${wrapperPreamble.join("\n")}\n(async () => { const __result = await (async () => {\n${code}\n})(); return JSON.stringify(__result ?? null); })()`
        : code;

    const script = await isolate.compileScript(executable);
    const rawOutput = await script.run(context, {
      timeout: SANDBOX_TIMEOUT_MS,
      ...(capabilityNames.length > 0 ? { promise: true } : {}),
    });
    const output = capabilityNames.length > 0 ? JSON.parse(rawOutput as string) : rawOutput;

    audit.log("sandbox:run:success", { preview: codePreview, capabilities: capabilityNames });
    return { success: true, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    audit.log("sandbox:run:failure", {
      preview: codePreview,
      error: message,
      capabilities: capabilityNames,
    });
    return { success: false, error: message };
  } finally {
    // A catastrophic error (e.g. the isolate hitting its own memory limit)
    // can leave V8 unable to gracefully unwind — isolated-vm's own docs
    // describe this as the isolate being quarantined internally, which
    // makes an explicit dispose() throw "Isolate is already disposed".
    // Swallow that here: dispose() is pure cleanup, and letting it throw
    // from a `finally` would override the {success:false, ...} value the
    // `catch` block above already computed, turning a clean failure result
    // into an unhandled rejection instead.
    try {
      isolate.dispose();
    } catch {
      // already disposed — nothing to clean up
    }
  }
}
