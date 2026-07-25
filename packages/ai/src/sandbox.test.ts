/**
 * Tests against the REAL isolated-vm engine — no top-of-file mock. Every
 * test is gated with `it.runIf(isolatedVmAvailable)` so this file safely
 * self-skips (not fails) on any machine/CI image where the native module
 * isn't loadable, rather than needing the whole suite to assume it is.
 *
 * `isolatedVmAvailable` is resolved via top-level await — it.runIf()
 * evaluates its condition at collection time, before any beforeAll hook
 * would have run, so the check can't live inside beforeAll.
 */
import { describe, expect, it } from "vitest";

let isolatedVmAvailable = false;
try {
  await import("isolated-vm");
  isolatedVmAvailable = true;
} catch {
  isolatedVmAvailable = false;
}

describe("runInSandbox — real isolated-vm engine", () => {
  it.runIf(isolatedVmAvailable)("executes simple expressions safely", async () => {
    const { runInSandbox } = await import("./sandbox.js");
    const result = await runInSandbox("1 + 1");
    expect(result.success).toBe(true);
    expect(result.output).toBe(2);
  });

  it.runIf(isolatedVmAvailable)("blocks access to Node.js process", async () => {
    const { runInSandbox } = await import("./sandbox.js");
    const result = await runInSandbox("process.env");
    expect(result.success).toBe(false);
  });

  it.runIf(isolatedVmAvailable)(
    "enforces timeout",
    async () => {
      const { runInSandbox } = await import("./sandbox.js");
      const result = await runInSandbox("while(true){}");
      expect(result.success).toBe(false);
    },
    10_000,
  );

  it.runIf(isolatedVmAvailable)(
    "enforces the memory limit",
    async () => {
      const { runInSandbox } = await import("./sandbox.js");
      const result = await runInSandbox(
        "const arr = []; while(true) { arr.push(new Array(1e6).fill(0)); }",
      );
      expect(result.success).toBe(false);
    },
    10_000,
  );

  it.runIf(isolatedVmAvailable)(
    "exposes a bound (synchronous) capability and calls it through the real isolate boundary",
    async () => {
      const calls: unknown[] = [];
      const { runInSandbox } = await import("./sandbox.js");
      const result = await runInSandbox("const v = await ping({ n: 3 }); return v;", {
        capabilities: {
          ping: (args) => {
            calls.push(args);
            return { n: (args as { n: number }).n + 1 };
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ n: 4 });
      expect(calls).toEqual([{ n: 3 }]);
    },
  );

  it.runIf(isolatedVmAvailable)(
    "a capability handler's thrown error propagates back into the sandbox as a catchable exception",
    async () => {
      const { runInSandbox } = await import("./sandbox.js");
      const result = await runInSandbox(
        "let caught = false; try { await boom({}); } catch { caught = true; } return caught;",
        {
          capabilities: {
            boom: () => {
              throw new Error("nope");
            },
          },
        },
      );
      expect(result.success).toBe(true);
      expect(result.output).toBe(true);
    },
  );

  it.runIf(isolatedVmAvailable)(
    "an async capability handler fails with a clear error, not a raw marshalling error",
    async () => {
      const { runInSandbox } = await import("./sandbox.js");
      const result = await runInSandbox("await asyncCap({});", {
        capabilities: {
          asyncCap: async () => 1,
        },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("async capabilities are not yet supported");
    },
  );

  it.runIf(isolatedVmAvailable)(
    "a capability that is NOT bound has zero path to the real process",
    async () => {
      const { runInSandbox } = await import("./sandbox.js");
      // No capabilities passed here, so the code runs as a plain script
      // (not wrapped in an async IIFE) — a top-level `return` would be a
      // SyntaxError in that context, so this is a bare expression instead.
      const result = await runInSandbox(
        "typeof secretCap === 'undefined' && typeof process === 'undefined' && typeof require === 'undefined'",
      );
      expect(result.success).toBe(true);
      expect(result.output).toBe(true);
    },
  );
});
