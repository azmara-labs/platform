import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { policycoreScan, scanDirectory } from "./policycore-scan.js";

describe("scanDirectory", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-cli-scan-test-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
  });

  it("reports zero findings for a clean project", () => {
    fs.writeFileSync(path.join(dir, "clean.ts"), "export const x = 1 + 2;\n");
    const result = scanDirectory(dir);
    expect(result.summary.total).toBe(0);
    expect(result.fileResults).toHaveLength(0);
  });

  it("detects an @azmr/ai no-eval finding", () => {
    fs.writeFileSync(path.join(dir, "bad.ts"), "eval(userInput);\n");
    const result = scanDirectory(dir);
    const findings = result.fileResults.flatMap((fr) => fr.findings);
    expect(findings.some((f) => f.rule === "no-eval" && f.engine === "ai")).toBe(true);
  });

  it("detects a policycore CORS wildcard+credentials finding", () => {
    fs.writeFileSync(
      path.join(dir, "cors.ts"),
      'const policy = { allowedOrigins: "*", allowCredentials: true };\n',
    );
    const result = scanDirectory(dir);
    const findings = result.fileResults.flatMap((fr) => fr.findings);
    expect(
      findings.some(
        (f) => f.rule === "cors-wildcard-with-credentials" && f.engine === "policycore",
      ),
    ).toBe(true);
  });

  it("skips node_modules and other skip-listed directories", () => {
    fs.mkdirSync(path.join(dir, "node_modules"));
    fs.writeFileSync(path.join(dir, "node_modules", "bad.ts"), "eval(userInput);\n");
    const result = scanDirectory(dir);
    expect(result.summary.total).toBe(0);
  });

  it("scans a single file when given a file path directly", () => {
    const file = path.join(dir, "solo.ts");
    fs.writeFileSync(file, "eval(userInput);\n");
    const result = scanDirectory(file);
    expect(result.filesScanned).toBe(1);
    expect(result.summary.total).toBeGreaterThan(0);
  });
});

describe("policycoreScan (CLI glue)", () => {
  let dir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  class ProcessExitError extends Error {
    code: number | undefined;
    constructor(code: number | undefined) {
      super(`process.exit(${code})`);
      this.code = code;
    }
  }

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-cli-scan-test-"));
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new ProcessExitError(code);
    }) as never);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("does not exit non-zero for a clean project", () => {
    fs.writeFileSync(path.join(dir, "clean.ts"), "export const x = 1;\n");
    policycoreScan([dir]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits 1 by default when error-severity findings exist", () => {
    fs.writeFileSync(path.join(dir, "bad.ts"), "eval(userInput);\n");
    expect(() => policycoreScan([dir])).toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not exit non-zero when --fail-on=none", () => {
    fs.writeFileSync(path.join(dir, "bad.ts"), "eval(userInput);\n");
    policycoreScan([dir, "--fail-on=none"]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("--format=json prints valid, parseable JSON", () => {
    fs.writeFileSync(path.join(dir, "clean.ts"), "export const x = 1;\n");
    policycoreScan([dir, "--format=json"]);
    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(() => JSON.parse(printed)).not.toThrow();
  });

  it("--format=owasp-json prints a valid OWASP report with all 10 categories", () => {
    fs.writeFileSync(path.join(dir, "bad.ts"), "eval(userInput);\n");
    policycoreScan([dir, "--format=owasp-json", "--fail-on=none"]);
    const printed = logSpy.mock.calls[0]?.[0] as string;
    const report = JSON.parse(printed);
    expect(report.categories).toHaveLength(10);
    expect(report.disclaimer.length).toBeGreaterThan(0);
  });

  it("--format=owasp-md prints Markdown containing the disclaimer", () => {
    fs.writeFileSync(path.join(dir, "clean.ts"), "export const x = 1;\n");
    policycoreScan([dir, "--format=owasp-md"]);
    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(printed).toContain("OWASP Top 10 Compliance Report");
    expect(printed).toContain("does not constitute a security audit");
  });

  it("exits 1 for a non-existent path", () => {
    expect(() => policycoreScan([path.join(dir, "does-not-exist")])).toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 for an invalid --format", () => {
    expect(() => policycoreScan([dir, "--format=xml"])).toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 for an invalid --fail-on", () => {
    expect(() => policycoreScan([dir, "--fail-on=bogus"])).toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
