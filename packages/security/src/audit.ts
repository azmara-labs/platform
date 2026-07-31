import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface AuditEntry {
  timestamp: string;
  context: string;
  action: string;
  meta: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

/**
 * Creates a tamper-evident audit logger.
 * Each entry includes a SHA-256 hash of its content chained to the previous entry's hash.
 * Any modification to a log entry breaks the chain, making tampering detectable.
 *
 * Concurrency model (deliberate — smallest correct change over the two failure
 * modes this used to have):
 * - Within a process, every `createAuditLogger()` call targeting the same
 *   resolved log path shares one chain via a module-level registry, seeded
 *   from the last valid line already on disk. A second package's logger, or
 *   a fresh logger created after this module first loaded, continues the
 *   existing chain instead of restarting it at `""`.
 * - Across processes, this module assumes a single writer process per log
 *   file — there is no file locking. Two OS processes appending to the same
 *   path concurrently can still interleave writes and desync their chains.
 *   If multiple processes must write to the same audit log, route them
 *   through one process rather than writing directly from each.
 * - Appends are synchronous (`fs.appendFileSync`); `log()` blocks the event
 *   loop until the write completes. This trades throughput for simple,
 *   easy-to-reason-about ordering — revisit with a queued async append if
 *   audit logging becomes a hot path.
 *
 * IMPORTANT: Never log passwords, tokens, or PII in `meta`.
 */

const chains = new Map<string, { lastHash: string }>();

/** Reads the last valid entry's hash from an existing log, tolerating a missing/empty file or a trailing partial line. */
function readLastHash(logPath: string): string {
  if (!fs.existsSync(logPath)) return "";

  const lines = fs
    .readFileSync(logPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i] as string) as AuditEntry;
      if (typeof entry.hash === "string") return entry.hash;
    } catch {
      // Trailing line wasn't valid JSON (e.g. a write interrupted mid-append) — try the one before it.
    }
  }
  return "";
}

function getChain(logPath: string): { lastHash: string } {
  let chain = chains.get(logPath);
  if (!chain) {
    chain = { lastHash: readLastHash(logPath) };
    chains.set(logPath, chain);
  }
  return chain;
}

export function createAuditLogger(context: string) {
  const logPath = path.resolve(process.env.AZMARA_AUDIT_LOG ?? ".azmara/audit.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const chain = getChain(logPath);

  return {
    log(action: string, meta: Record<string, unknown> = {}): void {
      const base: Omit<AuditEntry, "hash"> = {
        timestamp: new Date().toISOString(),
        context,
        action,
        meta,
        prevHash: chain.lastHash,
      };
      const hash = crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex");
      chain.lastHash = hash;
      const line = `${JSON.stringify({ ...base, hash } satisfies AuditEntry)}\n`;
      fs.appendFileSync(logPath, line, { encoding: "utf-8" });
    },
  };
}

export type AuditLogger = ReturnType<typeof createAuditLogger>;
