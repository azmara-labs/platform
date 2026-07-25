import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileReadCapability } from "./capabilities.js";

describe("createFileReadCapability", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-ai-cap-test-"));
    fs.writeFileSync(path.join(dir, "notes.txt"), "hello world");
    fs.mkdirSync(path.join(dir, "subdir"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
  });

  it("reads a file inside the allowed base", () => {
    const readFile = createFileReadCapability(dir);
    const result = readFile({ path: "notes.txt" });
    expect(result).toMatchObject({ path: "notes.txt", content: "hello world", truncated: false });
  });

  it("rejects a path traversal attempt", () => {
    const readFile = createFileReadCapability(dir);
    expect(() => readFile({ path: "../../etc/passwd" })).toThrow();
  });

  it("rejects a null byte in the path", () => {
    const readFile = createFileReadCapability(dir);
    expect(() => readFile({ path: "notes.txt\0.evil" })).toThrow();
  });

  it("truncates content over maxBytes", () => {
    fs.writeFileSync(path.join(dir, "big.txt"), "x".repeat(100));
    const readFile = createFileReadCapability(dir, { maxBytes: 10 });
    const result = readFile({ path: "big.txt" });
    expect(result.truncated).toBe(true);
    expect((result.content as string).length).toBe(10);
  });

  it("rejects a directory path", () => {
    const readFile = createFileReadCapability(dir);
    expect(() => readFile({ path: "subdir" })).toThrow("Not a file");
  });

  it("rejects malformed args", () => {
    const readFile = createFileReadCapability(dir);
    expect(() => readFile({})).toThrow();
    expect(() => readFile("notes.txt")).toThrow();
  });
});
