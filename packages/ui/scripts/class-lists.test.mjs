import { describe, expect, it } from "vitest";
import { classListCss, reachableFiles } from "./class-lists.mjs";

describe("reachableFiles", () => {
  const files = {
    "button.js": 'import { a } from "./chunk-A.js";\nexport * from "./chunk-B.js";',
    "chunk-A.js": 'import "./chunk-C.js";',
    "chunk-B.js": "export const b = 1;",
    "chunk-C.js": 'import { a } from "./button.js";',
    "icons/lucide.js": 'import { x } from "../chunk-B.js";',
  };
  const read = (file) => files[file];

  it("follows imports and re-exports into shared chunks, without looping on a cycle", () => {
    expect([...reachableFiles("button.js", read)].sort()).toEqual([
      "button.js",
      "chunk-A.js",
      "chunk-B.js",
      "chunk-C.js",
    ]);
  });

  it("resolves a nested entry's chunks in the parent directory", () => {
    expect([...reachableFiles("icons/lucide.js", read)].sort()).toEqual([
      "chunk-B.js",
      "icons/lucide.js",
    ]);
  });

  it("leaves out files that do not exist", () => {
    expect([...reachableFiles("missing.js", read)]).toEqual([]);
  });
});

describe("classListCss", () => {
  it("writes one sorted, de-duplicated @source inline rule under a header", () => {
    const css = classListCss("button", [
      "px-4",
      "bg-primary",
      "px-4",
      "data-[disabled]:opacity-50",
    ]);
    expect(css).toContain("@azmr/ui class list: button");
    expect(css).toContain('@source inline("bg-primary data-[disabled]:opacity-50 px-4");');
  });

  it("writes no rule for an entry without classes, so the file still resolves", () => {
    const css = classListCss("lib", []);
    expect(css).not.toContain("@source");
    expect(css).toContain("@azmr/ui class list: lib");
  });

  it("refuses a class that @source inline() would brace-expand or that would end the string", () => {
    expect(() => classListCss("x", ["[content:'{a,b}']"])).toThrow(/x: cannot inline/);
    expect(() => classListCss("x", ['[content:"a"]'])).toThrow(/cannot inline/);
  });
});
