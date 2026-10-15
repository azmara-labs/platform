import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { demoSourcePath, isDemoName } from "./demo-name";

const root = resolve("/site/src/demos");

describe("isDemoName", () => {
  it.each(["button/variants", "button/loading-state", "data-grid/sorting", "a/b/c"])(
    "accepts %s",
    (name) => {
      expect(isDemoName(name)).toBe(true);
    },
  );

  it.each([
    "",
    "button",
    "../secret",
    "button/../../secret",
    "/etc/passwd",
    "C:/Windows/system.ini",
    "button\\variants",
    "Button/Variants",
    "button/variants.demo",
    "button/variants.tsx",
    "button//variants",
    "button/",
    "/button/variants",
    "button/variants ",
    "button/-variants",
    "button/variants-",
    "button/va riants",
    "button/vari\u0000ants",
    "button/%2e%2e",
  ])("rejects %j", (name) => {
    expect(isDemoName(name)).toBe(false);
  });

  it("rejects values that are not strings", () => {
    for (const value of [undefined, null, 42, {}, ["button/variants"]]) {
      expect(isDemoName(value)).toBe(false);
    }
  });
});

describe("demoSourcePath", () => {
  it("maps a name to its .demo.tsx file inside the demos folder", () => {
    expect(demoSourcePath(root, "button/variants")).toBe(join(root, "button", "variants.demo.tsx"));
  });

  it("throws for names that could leave the folder", () => {
    for (const name of ["../x/y", "button/../../x", "/abs/path", "a\\b/c"]) {
      expect(() => demoSourcePath(root, name), name).toThrow(/Invalid demo name/);
    }
  });

  it("never returns a path outside the root", () => {
    for (const name of ["button/variants", "a/b/c", "x-y/z-w"]) {
      expect(demoSourcePath(root, name).startsWith(root)).toBe(true);
    }
  });
});
