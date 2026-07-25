/**
 * @azmr/ai — sandbox-fallback.ts
 *
 * Node.js vm-module fallback sandbox for development environments where
 * isolated-vm cannot be compiled (e.g. Windows without VS2022 C++ workload).
 *
 * ⚠️  IMPORTANT — security comparison:
 *   isolated-vm  → TRUE isolation: separate V8 heap, no Node APIs accessible
 *   vm (this)    → PARTIAL isolation: same process, some builtins accessible
 *
 * This fallback is ONLY for local development and CI without native build tools.
 * Production deployments MUST use isolated-vm (sandbox.ts).
 *
 * The fallback is selected automatically via sandbox-runner.ts — never use
 * this file directly in production code.
 */

import vm from "node:vm";
import { assertSafeIdentifier } from "@azmr/security";
import type { SandboxResult, SandboxRunOptions } from "./sandbox-types.js";

const TIMEOUT_MS = 5_000;

const RESERVED_CAPABILITY_NAMES = new Set([
  "global",
  "eval",
  "Function",
  "constructor",
  "__proto__",
  "prototype",
  "this",
]);

/**
 * Best-effort wall-clock guard around an already-pending promise. NOT a
 * security boundary — see the comment below on why vm's own `timeout`
 * option can't cover the capability-call case.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Execution timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Run code in a Node.js vm context.
 * Provides syntactic isolation and timeout enforcement.
 * Does NOT prevent access to Node.js internals via prototype chains.
 *
 * `options.capabilities` mirrors sandbox.ts's capability option for dev/CI
 * parity — exposed via direct property assignment on the context object
 * (same process/heap as Node itself, so no marshalling is needed; this is
 * genuinely simpler than isolated-vm's Callback wrapping, at the cost of
 * the weaker isolation this file already documents above).
 */
export async function runInFallbackSandbox(
  code: string,
  options: SandboxRunOptions = {},
): Promise<SandboxResult> {
  const capabilities = Object.entries(options.capabilities ?? {});
  try {
    // Create a completely empty context by default — no globals at all
    const sandbox = Object.create(null) as Record<string, unknown>;

    for (const [name, handler] of capabilities) {
      if (RESERVED_CAPABILITY_NAMES.has(name)) {
        throw new Error(`[azmr/ai] Capability name "${name}" is reserved`);
      }
      assertSafeIdentifier(name, "capability name");
      sandbox[name] = handler;
    }

    vm.createContext(sandbox);

    const executable = capabilities.length > 0 ? `(async () => {\n${code}\n})()` : code;

    const script = new vm.Script(executable, {
      filename: "sandbox-input.js",
      // Syntax check happens at compile time — caught before execution
    });

    const result = script.runInContext(sandbox, {
      timeout: TIMEOUT_MS,
      // Prevent infinite loops from blocking the event loop
      breakOnSigint: true,
    });

    // IMPORTANT: vm's `timeout` option only bounds *synchronous* execution
    // inside runInContext. Once the IIFE returns a pending Promise and
    // control yields back to the event loop for a capability's real I/O to
    // resolve, `timeout`/`breakOnSigint` no longer apply — withTimeout here
    // is a best-effort dev convenience so a hung capability handler doesn't
    // hang the process indefinitely, NOT a security boundary (consistent
    // with this file's "PARTIAL isolation" warning above).
    const output =
      capabilities.length > 0 ? await withTimeout(result as Promise<unknown>, TIMEOUT_MS) : result;

    return { success: true, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message.includes("timed out") ? `Execution timed out after ${TIMEOUT_MS}ms` : message,
    };
  }
}
