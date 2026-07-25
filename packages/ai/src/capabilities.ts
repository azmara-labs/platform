import fs from "node:fs";
import path from "node:path";
import { assertSafePath } from "@azmr/security";
import type { JsonValue } from "./sandbox-types.js";

const DEFAULT_MAX_FILE_READ_BYTES = 1 * 1024 * 1024; // 1 MiB — well under the
// isolate's 64MB memory limit, leaving headroom for the isolate's own
// working set plus the structured-clone copy of the content string.

export interface FileReadCapabilityOptions {
  /**
   * Hard cap in bytes on how much of a file is read and copied across the
   * isolate boundary, independent of the isolate's own 64MB memory limit —
   * a malicious script could otherwise request a multi-GB file and blow the
   * isolate's memory purely from copying the result across. Default 1 MiB.
   */
  maxBytes?: number;
}

interface FileReadResult extends Record<string, JsonValue> {
  path: string;
  content: string;
  truncated: boolean;
}

/**
 * Read-only file capability scoped to one directory.
 * Sandboxed call shape: `await readFile({ path: "notes.txt" })`.
 * `path` may be relative (resolved against allowedBase) or absolute (still
 * validated to resolve inside allowedBase via assertSafePath — traversal
 * and null-byte escapes are rejected the same way `fix.ts` already rejects
 * them for the file being fixed).
 *
 * Deliberately SYNCHRONOUS (fs.readFileSync, not fs/promises) — the real
 * isolated-vm engine's Callback mechanism doesn't support awaiting a
 * Promise returned by a capability handler (see sandbox.ts's doc comment).
 * Synchronous local file I/O is fast and matches isolated-vm's own docs,
 * which cite implementing something like "readFileSync" as the intended
 * use case for this kind of capability.
 */
export function createFileReadCapability(
  allowedBase: string,
  options: FileReadCapabilityOptions = {},
) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_READ_BYTES;
  const base = path.resolve(allowedBase);

  return (args: unknown): FileReadResult => {
    if (
      !args ||
      typeof args !== "object" ||
      typeof (args as { path?: unknown }).path !== "string"
    ) {
      throw new Error("[azmr/ai] readFile capability requires { path: string }");
    }
    const requested = (args as { path: string }).path;
    const resolved = path.isAbsolute(requested)
      ? path.resolve(requested)
      : path.resolve(base, requested);
    assertSafePath(resolved, base); // throws on traversal / null byte

    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      throw new Error(`[azmr/ai] Not a file: ${requested}`);
    }

    const readLength = Math.min(stat.size, maxBytes);
    const fd = fs.openSync(resolved, "r");
    try {
      const buf = Buffer.alloc(readLength);
      // Partial read — never loads the whole huge file into memory first.
      fs.readSync(fd, buf, 0, readLength, 0);
      return { path: requested, content: buf.toString("utf-8"), truncated: stat.size > maxBytes };
    } finally {
      fs.closeSync(fd);
    }
  };
}
