import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAuditLogger } from "@azmr/security";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditVerify } from "./audit-verify.js";

class ProcessExitError extends Error {
  code: number | undefined;
  constructor(code: number | undefined) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

describe("auditVerify", () => {
  let dir: string;
  let logPath: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.AZMARA_AUDIT_LOG;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-audit-verify-test-"));
    logPath = path.join(dir, "audit.log");
    process.env.AZMARA_AUDIT_LOG = logPath;
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new ProcessExitError(code);
    }) as never);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
    if (originalEnv === undefined) delete process.env.AZMARA_AUDIT_LOG;
    else process.env.AZMARA_AUDIT_LOG = originalEnv;
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("reports an empty log as nothing to verify, without exiting", () => {
    fs.writeFileSync(logPath, "");
    auditVerify([logPath]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes a clean, freshly-written log", () => {
    const logger = createAuditLogger("test");
    logger.log("action-1");
    logger.log("action-2");
    logger.log("action-3");

    auditVerify([logPath]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes a log spanning two logger instances against the same path (simulated restart)", async () => {
    const first = createAuditLogger("service");
    for (let i = 0; i < 5; i++) first.log(`action-${i}`);

    vi.resetModules();
    const { createAuditLogger: createAuditLoggerFresh } = await import("@azmr/security");
    const second = createAuditLoggerFresh("service");
    for (let i = 5; i < 10; i++) second.log(`action-${i}`);

    auditVerify([logPath]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes a log from two loggers with different contexts sharing a path, interleaved", () => {
    const dbLogger = createAuditLogger("db");
    const aiLogger = createAuditLogger("ai:sandbox");

    dbLogger.log("insert");
    aiLogger.log("run");
    dbLogger.log("delete");
    aiLogger.log("run");
    dbLogger.log("insert");

    auditVerify([logPath]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("still fails on a manually corrupted entry (regression guard — detection must not weaken)", () => {
    const logger = createAuditLogger("test");
    logger.log("action-1");
    logger.log("action-2");
    logger.log("action-3");

    const lines = fs.readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
    const entry = JSON.parse(lines[1] as string);
    entry.action = "tampered-action"; // content changed, hash no longer matches
    lines[1] = JSON.stringify(entry);
    fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

    expect(() => auditVerify([logPath])).toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
