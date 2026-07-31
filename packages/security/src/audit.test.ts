import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogger } from "./audit.js";

interface AuditEntry {
  timestamp: string;
  context: string;
  action: string;
  meta: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

function readEntries(logPath: string): AuditEntry[] {
  return fs
    .readFileSync(logPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as AuditEntry);
}

/** True if every entry's prevHash matches the previous entry's hash, starting from "". */
function chainIsIntact(entries: AuditEntry[]): boolean {
  let prevHash = "";
  for (const entry of entries) {
    if (entry.prevHash !== prevHash) return false;
    prevHash = entry.hash;
  }
  return true;
}

describe("createAuditLogger", () => {
  let dir: string;
  let logPath: string;
  const originalEnv = process.env.AZMARA_AUDIT_LOG;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-audit-test-"));
    logPath = path.join(dir, "audit.log");
    process.env.AZMARA_AUDIT_LOG = logPath;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
    if (originalEnv === undefined) delete process.env.AZMARA_AUDIT_LOG;
    else process.env.AZMARA_AUDIT_LOG = originalEnv;
  });

  it('writes entries with a chain starting at prevHash = ""', () => {
    const logger = createAuditLogger("test");
    logger.log("action-1");
    logger.log("action-2");

    const entries = readEntries(logPath);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.prevHash).toBe("");
    expect(entries[1]?.prevHash).toBe(entries[0]?.hash);
    expect(chainIsIntact(entries)).toBe(true);
  });

  it("two loggers with different contexts sharing a path produce one unbroken chain", () => {
    const dbLogger = createAuditLogger("db");
    const aiLogger = createAuditLogger("ai:sandbox");

    dbLogger.log("insert");
    aiLogger.log("run");
    dbLogger.log("delete");
    aiLogger.log("run");
    dbLogger.log("insert");

    const entries = readEntries(logPath);
    expect(entries).toHaveLength(5);
    expect(chainIsIntact(entries)).toBe(true);
  });

  it("seeds lastHash from an existing log on a fresh module instance (simulated restart)", async () => {
    const first = createAuditLogger("service");
    for (let i = 0; i < 5; i++) first.log(`action-${i}`);

    // vi.resetModules + a fresh dynamic import gives us an empty module-level
    // `chains` registry, the same as a real process restart would.
    const { vi } = await import("vitest");
    vi.resetModules();
    const { createAuditLogger: createAuditLoggerFresh } = await import("./audit.js");

    const second = createAuditLoggerFresh("service");
    for (let i = 5; i < 10; i++) second.log(`action-${i}`);

    const entries = readEntries(logPath);
    expect(entries).toHaveLength(10);
    expect(chainIsIntact(entries)).toBe(true);
    // The seam: entry 6's prevHash must equal entry 5's hash, not "".
    expect(entries[5]?.prevHash).toBe(entries[4]?.hash);
    expect(entries[5]?.prevHash).not.toBe("");
  });

  it("tolerates a trailing partial line when seeding from disk", async () => {
    const first = createAuditLogger("service");
    first.log("action-0");
    first.log("action-1");
    // Simulates a write interrupted after flushing a newline-terminated but
    // incomplete JSON fragment (its own line, not valid JSON on its own).
    fs.appendFileSync(logPath, '{"timestamp":"2026-01-01","context":"serv\n');

    const { vi } = await import("vitest");
    vi.resetModules();
    const { createAuditLogger: createAuditLoggerFresh } = await import("./audit.js");
    const second = createAuditLoggerFresh("service");
    second.log("action-2");

    const validEntries = fs
      .readFileSync(logPath, "utf-8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is AuditEntry => entry !== null);

    // entry-0, entry-1, action-2 — the malformed line in between is skipped.
    expect(validEntries).toHaveLength(3);
    expect(validEntries[2]?.action).toBe("action-2");
    // The new logger seeded from entry-1's hash, not "" and not the malformed line.
    expect(validEntries[2]?.prevHash).toBe(validEntries[1]?.hash);
    expect(validEntries[2]?.prevHash).not.toBe("");
  });
});
