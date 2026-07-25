/**
 * @azmr/ai — sandbox-runner.ts
 *
 * Unified sandbox entry point.
 * Tries isolated-vm first (production-grade, true V8 isolation).
 * Falls back to the vm-module sandbox if isolated-vm is unavailable
 * (Windows dev without native build tools, CI without node-gyp).
 *
 * The caller receives the same SandboxResult interface either way.
 * A `_sandboxEngine` field is added to results so the caller can log
 * which engine was used.
 *
 * Usage:
 *   import { runSandbox } from "./sandbox-runner.js";
 *   const result = await runSandbox(code);
 *   if (result._sandboxEngine === "fallback") {
 *     logger.warn("Using vm fallback sandbox — not for production");
 *   }
 */

import type { SandboxResult, SandboxRunOptions } from "./sandbox-types.js";

export interface SandboxRunResult extends SandboxResult {
  _sandboxEngine: "isolated-vm" | "fallback";
}

let _useIsolatedVm: boolean | null = null;

async function isIsolatedVmAvailable(): Promise<boolean> {
  if (_useIsolatedVm !== null) return _useIsolatedVm;
  try {
    // Whether isolated-vm resolves is environment-dependent (native toolchain present
    // or not). The "expect an error" directive would fail here whenever it DOES
    // resolve, since there'd be no error to expect - only the unconditional ignore
    // directive tolerates both states.
    // biome-ignore lint/suspicious/noTsIgnore: see comment above
    // @ts-ignore isolated-vm is an optionalDependency; its types may be absent
    await import("isolated-vm");
    _useIsolatedVm = true;
  } catch {
    _useIsolatedVm = false;
  }
  return _useIsolatedVm;
}

/**
 * Run untrusted code in the best available sandbox.
 * Always uses isolated-vm in production — warns if falling back.
 */
export async function runSandbox(
  code: string,
  options: SandboxRunOptions = {},
): Promise<SandboxRunResult> {
  if (await isIsolatedVmAvailable()) {
    const { runInSandbox } = await import("./sandbox.js");
    const result = await runInSandbox(code, options);
    return { ...result, _sandboxEngine: "isolated-vm" };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error:
        "[azmr/ai] isolated-vm is required in production. Install VS2022 'Desktop development with C++' workload and run pnpm install.",
      _sandboxEngine: "fallback",
    };
  }

  // Development / CI fallback
  process.stderr.write(
    "[azmr/ai] ⚠ isolated-vm unavailable — using vm fallback (DEV only, not production-safe)\n",
  );
  const { runInFallbackSandbox } = await import("./sandbox-fallback.js");
  const result = await runInFallbackSandbox(code, options);
  return { ...result, _sandboxEngine: "fallback" };
}
