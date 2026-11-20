import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseSidebarMode,
  readSidebarMode,
  SIDEBAR_COOKIE,
  SIDEBAR_MODES,
  serializeSidebarMode,
} from "./sidebar-state.js";

describe("parseSidebarMode", () => {
  it("accepts the two modes", () => {
    expect(parseSidebarMode("hidden")).toBe("hidden");
    expect(parseSidebarMode("pinned")).toBe("pinned");
    expect([...SIDEBAR_MODES]).toEqual(["pinned", "hidden"]);
  });

  it.each([
    ["an injected value", "javascript:alert(1)"],
    ["an empty string", ""],
    ["undefined", undefined],
    ["a number", 42],
    ["an object", {}],
    ["a wrong-case value", "Hidden"],
  ])("falls back to pinned for %s", (_label, value) => {
    expect(parseSidebarMode(value)).toBe("pinned");
  });

  it("uses the fallback it is given", () => {
    expect(parseSidebarMode("nonsense", "hidden")).toBe("hidden");
  });
});

describe("readSidebarMode", () => {
  it("finds the cookie among others", () => {
    expect(readSidebarMode(`a=1; ${SIDEBAR_COOKIE}=hidden; b=2`)).toBe("hidden");
  });

  it.each([
    ["an encoded script", `${SIDEBAR_COOKIE}=%3Cscript%3E`],
    ["an empty header", ""],
    ["a header without it", "a=1; b=2"],
    ["null", null],
    ["undefined", undefined],
  ])("gives pinned for %s", (_label, header) => {
    expect(readSidebarMode(header)).toBe("pinned");
  });
});

describe("serializeSidebarMode", () => {
  it("writes the cookie name and value, and round-trips through readSidebarMode", () => {
    const cookie = serializeSidebarMode("hidden");
    expect(cookie.startsWith(`${SIDEBAR_COOKIE}=hidden`)).toBe(true);
    expect(readSidebarMode(cookie)).toBe("hidden");
  });

  it("adds Secure only when asked", () => {
    expect(serializeSidebarMode("pinned")).not.toContain("Secure");
    expect(serializeSidebarMode("pinned", { secure: true })).toContain("Secure");
  });
});

describe("server safety", () => {
  it("imports nothing from react", () => {
    const source = readFileSync(join(import.meta.dirname, "sidebar-state.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']react/);
  });
});
