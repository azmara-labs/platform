import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock isolated-vm as unavailable so tests run on any machine
vi.mock("isolated-vm", () => {
  throw new Error("not installed");
});

// Ensure fallback is selected
beforeEach(() => {
  // Reset the cached value between tests
  vi.resetModules();
});

describe("sandbox-runner — fallback sandbox (isolated-vm unavailable)", () => {
  it("executes simple arithmetic", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("1 + 2");
    // vm sandbox returns the value of the last expression
    expect(result.success).toBe(true);
    expect(result._sandboxEngine).toBe("fallback");
  });

  it("catches syntax errors", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("const x = {{{");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("catches runtime errors", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("null.property");
    expect(result.success).toBe(false);
  });

  it("blocks access to global process", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    // process is not in our empty sandbox context — should throw ReferenceError
    const result = await runSandbox("process.env.SECRET");
    expect(result.success).toBe(false);
  });

  it("enforces timeout on infinite loops", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("while(true){}");
    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toMatch(/timed out|script execution timed out/);
  }, 10_000);

  it("passing an explicit empty options object behaves like the omitted-arg default", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("1 + 2", {});
    expect(result.success).toBe(true);
    expect(result.output).toBe(3);
  });
});

describe("sandbox-runner — capabilities (fallback engine)", () => {
  it("calls a bound capability and returns its resolved value", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("const x = await double({ n: 21 }); return x.n;", {
      capabilities: {
        double: async (args) => ({ n: (args as { n: number }).n * 2 }),
      },
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe(42);
  });

  it("an unbound capability is genuinely undefined, even alongside other bound capabilities", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("return typeof secretCap;", {
      capabilities: { double: async (n) => n as number },
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe("undefined");
  });

  it("rejects a reserved capability name", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("1", {
      // "__proto__" as an object-literal key sets the prototype rather than
      // an own property, so it wouldn't reach the reserved-name check at
      // all — "eval" is reserved too and doesn't have that quirk.
      capabilities: { eval: async () => 1 },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("reserved");
  });

  it("rejects an unsafe capability name", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("1", {
      capabilities: { "not-safe": async () => 1 },
    });
    expect(result.success).toBe(false);
  });

  it("a capability rejection is catchable by sandboxed code", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox(
      "let caught = false; try { await boom(); } catch { caught = true; } return caught;",
      {
        capabilities: {
          boom: async () => {
            throw new Error("nope");
          },
        },
      },
    );
    expect(result.success).toBe(true);
    expect(result.output).toBe(true);
  });

  it("an uncaught capability rejection fails the whole run", async () => {
    const { runSandbox } = await import("./sandbox-runner.js");
    const result = await runSandbox("await boom();", {
      capabilities: {
        boom: async () => {
          throw new Error("nope");
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("nope");
  });
});
