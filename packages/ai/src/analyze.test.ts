import { describe, expect, it } from "vitest";
import { analyzeSource, formatReport } from "./analyze.js";

describe("analyzeSource — no-eval", () => {
  it("flags eval()", () => {
    const result = analyzeSource("test.ts", "const x = eval('1+1');");
    expect(result.hasErrors).toBe(true);
    expect(result.findings[0]?.rule).toBe("no-eval");
    expect(result.findings[0]?.line).toBe(1);
  });

  it("flags new Function()", () => {
    const result = analyzeSource("test.ts", "const fn = new Function('return 1');");
    expect(result.hasErrors).toBe(true);
    expect(result.findings[0]?.rule).toBe("no-eval");
  });

  it("passes clean code", () => {
    const result = analyzeSource("test.ts", "const x = 1 + 1;");
    const evalFindings = result.findings.filter((f) => f.rule === "no-eval");
    expect(evalFindings).toHaveLength(0);
  });
});

describe("analyzeSource — no-sql-concat", () => {
  it("flags template literal SQL with interpolation", () => {
    const result = analyzeSource(
      "test.ts",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: source code quoted as text
      "const sql = `SELECT * FROM users WHERE id = ${userId}`;",
    );
    expect(result.findings.some((f) => f.rule === "no-sql-concat")).toBe(true);
  });

  it("passes parameterised SQL", () => {
    const result = analyzeSource(
      "test.ts",
      'db.rawSelect("SELECT * FROM users WHERE id = ?", [userId]);',
    );
    expect(result.findings.some((f) => f.rule === "no-sql-concat")).toBe(false);
  });
});

describe("analyzeSource — no-unguarded-file-access", () => {
  it("flags readFileSync without assertSafePath", () => {
    const result = analyzeSource("test.ts", "const data = fs.readFileSync(userPath, 'utf-8');");
    expect(result.findings.some((f) => f.rule === "no-unguarded-file-access")).toBe(true);
  });

  it("passes when assertSafePath is present", () => {
    const result = analyzeSource(
      "test.ts",
      `assertSafePath(userPath, base);\nconst data = fs.readFileSync(userPath, 'utf-8');`,
    );
    expect(result.findings.some((f) => f.rule === "no-unguarded-file-access")).toBe(false);
  });
});

describe("analyzeSource — effect-missing-disposer", () => {
  it("warns on bare effect() call", () => {
    const result = analyzeSource("test.ts", "  effect(() => console.log(x.get()));");
    expect(result.findings.some((f) => f.rule === "effect-missing-disposer")).toBe(true);
  });

  it("passes when disposer is captured", () => {
    const result = analyzeSource("test.ts", "const dispose = effect(() => console.log(x.get()));");
    expect(result.findings.some((f) => f.rule === "effect-missing-disposer")).toBe(false);
  });
});

describe("analyzeSource — signal-mutation-in-computed", () => {
  it("flags set() inside computed()", () => {
    const source = `
const bad = computed(() => {
  other.set(123);
  return x.get() * 2;
});`;
    const result = analyzeSource("test.ts", source);
    expect(result.findings.some((f) => f.rule === "signal-mutation-in-computed")).toBe(true);
  });

  it("passes clean computed()", () => {
    const source = `const good = computed(() => x.get() * 2);`;
    const result = analyzeSource("test.ts", source);
    expect(result.findings.some((f) => f.rule === "signal-mutation-in-computed")).toBe(false);
  });
});

describe("analyzeSource — audit-log-pii", () => {
  it("warns when password appears in audit.log call", () => {
    const result = analyzeSource("test.ts", 'audit.log("auth", { password: input.password });');
    expect(result.findings.some((f) => f.rule === "audit-log-pii")).toBe(true);
  });

  it("passes safe audit.log call", () => {
    const result = analyzeSource(
      "test.ts",
      'audit.log("auth", { userId: "u1", action: "login" });',
    );
    expect(result.findings.some((f) => f.rule === "audit-log-pii")).toBe(false);
  });
});

describe("analyzeSource — no findings", () => {
  it("returns hasErrors false and hasWarnings false for clean code", () => {
    const result = analyzeSource("clean.ts", "export const x = 1;");
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(false);
    expect(result.findings).toHaveLength(0);
  });
});

describe("formatReport", () => {
  it("shows ✓ for clean file", () => {
    const result = analyzeSource("clean.ts", "export const x = 1;");
    const report = formatReport(result);
    expect(report).toContain("✓");
  });

  it("shows ✗ for errors", () => {
    const result = analyzeSource("bad.ts", "eval('x')");
    const report = formatReport(result);
    expect(report).toContain("✗");
    expect(report).toContain("no-eval");
  });

  it("includes line number when available", () => {
    const result = analyzeSource("bad.ts", "const x = eval('1');");
    const report = formatReport(result);
    expect(report).toContain(":1");
  });
});
