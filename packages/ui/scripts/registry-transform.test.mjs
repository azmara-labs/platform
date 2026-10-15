import { describe, expect, it } from "vitest";
import { relativeSpecifiers, rewriteImports } from "./registry-transform.mjs";

const map = {
  "../../lib/cn.js": "@/lib/utils",
  "../../primitives/button.js": "@base-ui/react/button",
  "../spinner/spinner.js": "@/components/ui/spinner",
};

describe("relativeSpecifiers", () => {
  it("finds static, side-effect, re-export and dynamic relative imports", () => {
    const code = [
      'import { a } from "./one.js";',
      'import "./two.js";',
      'export { b } from "../three.js";',
      'const c = await import("../../four.js");',
      'import x from "react";',
      'import y from "@/lib/utils";',
    ].join("\n");
    expect(relativeSpecifiers(code).sort()).toEqual(
      ["./one.js", "./two.js", "../three.js", "../../four.js"].sort(),
    );
  });

  it("handles multi-line import lists and type imports", () => {
    const code =
      'import {\n  Button as B,\n  type ButtonProps as P,\n} from "../../primitives/button.js";';
    expect(relativeSpecifiers(code)).toEqual(["../../primitives/button.js"]);
  });

  it("ignores the word 'from' in comments and strings that are not imports", () => {
    expect(relativeSpecifiers('// import a from "./x.js"\nconst s = "from ./y.js";')).toEqual([]);
  });
});

describe("rewriteImports", () => {
  it("rewrites mapped specifiers and leaves package imports alone", () => {
    const code = [
      'import { cn } from "../../lib/cn.js";',
      'import { Spinner } from "../spinner/spinner.js";',
      'import { forwardRef } from "react";',
    ].join("\n");
    expect(rewriteImports(code, map, "button.tsx")).toBe(
      [
        'import { cn } from "@/lib/utils";',
        'import { Spinner } from "@/components/ui/spinner";',
        'import { forwardRef } from "react";',
      ].join("\n"),
    );
  });

  it("rewrites a multi-line import and keeps the imported names", () => {
    const code =
      'import {\n  Button as B,\n  type ButtonProps as P,\n} from "../../primitives/button.js";';
    expect(rewriteImports(code, map, "button.tsx")).toBe(
      'import {\n  Button as B,\n  type ButtonProps as P,\n} from "@base-ui/react/button";',
    );
  });

  it("keeps the code intact around comments (offsets must match the original text)", () => {
    const code = [
      "// shared helper: used by every component",
      "/* block */ import { cn } from '../../lib/cn.js'; // trailing note",
      "",
      "// another comment line that is long enough to shift offsets if it were removed",
      'import { Spinner } from "../spinner/spinner.js";',
      "export const a = cn(Spinner);",
    ].join("\n");
    expect(rewriteImports(code, map, "x.tsx")).toBe(
      [
        "// shared helper: used by every component",
        "/* block */ import { cn } from '@/lib/utils'; // trailing note",
        "",
        "// another comment line that is long enough to shift offsets if it were removed",
        'import { Spinner } from "@/components/ui/spinner";',
        "export const a = cn(Spinner);",
      ].join("\n"),
    );
  });

  it("preserves the quote style", () => {
    expect(rewriteImports("import { cn } from '../../lib/cn.js';", map, "x.tsx")).toBe(
      "import { cn } from '@/lib/utils';",
    );
  });

  it("FAILS LOUDLY on a relative import with no mapping, naming the file and specifier", () => {
    expect(() =>
      rewriteImports('import { x } from "../../lib/other.js";', map, "button.tsx"),
    ).toThrow(/button\.tsx.*\.\.\/\.\.\/lib\/other\.js/);
  });

  it("fails on an unmapped dynamic import too", () => {
    expect(() => rewriteImports('const m = await import("./lazy.js");', map, "x.tsx")).toThrow(
      /lazy/,
    );
  });

  it("fails when a mapping is never used (stale rule)", () => {
    expect(() =>
      rewriteImports('import { cn } from "../../lib/cn.js";', map, "x.tsx", { strictUnused: true }),
    ).toThrow(/unused mapping/i);
  });

  it("returns code without relative imports unchanged", () => {
    const code = 'import { forwardRef } from "react";\nexport const a = 1;';
    expect(rewriteImports(code, map, "x.tsx")).toBe(code);
  });

  it("leaves no relative import behind after a successful rewrite", () => {
    const code =
      'import { cn } from "../../lib/cn.js";\nimport { Spinner } from "../spinner/spinner.js";';
    expect(relativeSpecifiers(rewriteImports(code, map, "x.tsx"))).toEqual([]);
  });
});
