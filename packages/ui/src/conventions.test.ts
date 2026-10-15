import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { checkConventions, type SourceFiles } from "./test-utils/conventions.js";

const srcDir = import.meta.dirname;

function readTree(dir: string, out: SourceFiles = {}): SourceFiles {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) readTree(full, out);
    else if (/\.(ts|tsx)$/.test(name)) {
      out[relative(srcDir, full).replaceAll("\\", "/")] = readFileSync(full, "utf8");
    }
  }
  return out;
}

// Legacy files that predate the conventions and are scheduled for replacement. Each entry
// needs a removal condition; new code never goes here.
const LEGACY = ["Grid.tsx"]; // replaced by the Phase 4 DataGrid (PAZM-95)

describe("conventions hold for the real source tree", () => {
  it("has no violations", () => {
    const violations = checkConventions(readTree(srcDir), { legacy: LEGACY });
    expect(violations.map((v) => `${v.rule} ${v.file}:${v.line} ${v.message}`)).toEqual([]);
  });

  it("scans a meaningful number of files (guards against scanning nothing)", () => {
    expect(Object.keys(readTree(srcDir)).length).toBeGreaterThan(10);
  });
});

const rules = (files: SourceFiles, legacy: string[] = []) =>
  checkConventions(files, { legacy }).map((v) => v.rule);

describe("no-raw-colour", () => {
  it("flags hex colours of every legal length", () => {
    for (const hex of ["#fff", "#ffff", "#ffffff", "#ffffffff", "#E2E8F0"]) {
      expect(rules({ "components/a.tsx": `const c = "${hex}";` }), hex).toContain("no-raw-colour");
    }
  });

  it("flags colour functions, including oklch", () => {
    for (const fn of [
      "rgb(0 0 0)",
      "rgba(0,0,0,.5)",
      "hsl(0 0% 0%)",
      "oklch(0.5 0.1 200)",
      "lab(50 10 10)",
    ]) {
      expect(rules({ "components/a.tsx": `const c = "${fn}";` }), fn).toContain("no-raw-colour");
    }
  });

  it("accepts tokens, var(), color-mix over tokens, and non-colour hashes", () => {
    const ok = [
      'className="bg-background text-foreground"',
      'style={{ color: "var(--foreground)" }}',
      'const mix = "color-mix(in oklab, var(--primary) 50%, transparent)";',
      'const href = "#main-content";',
      'const id = "#section";',
    ];
    for (const line of ok) expect(rules({ "components/a.tsx": line }), line).toEqual([]);
  });

  it("ignores colours inside comments", () => {
    const code = "// was #ff0000\n/* old: rgb(1 2 3)\n   #00ff00 */\nconst x = 1;";
    expect(rules({ "components/a.tsx": code })).toEqual([]);
  });

  it("reports the right line number", () => {
    const [v] = checkConventions({ "components/a.tsx": 'const a = 1;\n\nconst c = "#abcdef";' });
    expect(v?.line).toBe(3);
  });

  it("exempts test files, stylesheets-adjacent test code and the explicit escape hatch", () => {
    expect(rules({ "components/a.test.tsx": 'const c = "#fff";' })).toEqual([]);
    expect(rules({ "test-utils/x.ts": 'const c = "#fff";' })).toEqual([]);
    expect(
      rules({ "components/a.tsx": 'const c = "#fff"; // conventions-ignore: brand logo asset' }),
    ).toEqual([]);
  });

  it("honours the legacy allowlist only for the listed files", () => {
    const files = { "Grid.tsx": 'const c = "#888";', "components/b.tsx": 'const c = "#888";' };
    const result = checkConventions(files, { legacy: ["Grid.tsx"] });
    expect(result.map((v) => v.file)).toEqual(["components/b.tsx"]);
  });
});

describe("no-dangerous-html", () => {
  it("flags dangerouslySetInnerHTML in any layer", () => {
    for (const path of [
      "components/a.tsx",
      "blocks/b.tsx",
      "primitives/c.tsx",
      "lib/d.ts",
      "index.ts",
    ]) {
      expect(rules({ [path]: "<div dangerouslySetInnerHTML={{ __html: x }} />" }), path).toContain(
        "no-dangerous-html",
      );
    }
  });

  it("cannot be silenced with the colour escape hatch", () => {
    const line = "<div dangerouslySetInnerHTML={{ __html: x }} /> // conventions-ignore: nope";
    expect(rules({ "components/a.tsx": line })).toEqual(["no-dangerous-html"]);
  });

  it("does not flag the word in a comment or in tests", () => {
    expect(rules({ "components/a.tsx": "// never use dangerouslySetInnerHTML here" })).toEqual([]);
    expect(rules({ "components/a.test.tsx": "const s = 'dangerouslySetInnerHTML';" })).toEqual([]);
  });
});

describe("layer-boundary (tokens < primitives < components < blocks < dynamic)", () => {
  it("allows a layer to import the same layer and any lower layer", () => {
    expect(
      rules({
        "components/a/index.ts":
          'import { x } from "../../primitives/x.js"; import { y } from "../b/y.js";',
      }),
    ).toEqual([]);
    expect(rules({ "blocks/a.ts": 'import { x } from "../components/x.js";' })).toEqual([]);
    expect(
      rules({
        "dynamic/a.ts":
          'import { x } from "../blocks/x.js"; import { y } from "../primitives/y.js";',
      }),
    ).toEqual([]);
  });

  it("flags a lower layer importing a higher one", () => {
    expect(rules({ "primitives/a.ts": 'import { x } from "../components/x.js";' })).toContain(
      "layer-boundary",
    );
    expect(rules({ "components/a.ts": 'import { x } from "../blocks/x.js";' })).toContain(
      "layer-boundary",
    );
    expect(rules({ "blocks/a.ts": 'import { x } from "../dynamic/x.js";' })).toContain(
      "layer-boundary",
    );
  });

  it("flags re-exports and dynamic imports too", () => {
    expect(rules({ "components/a.ts": 'export { x } from "../blocks/x.js";' })).toContain(
      "layer-boundary",
    );
    expect(rules({ "components/a.ts": 'const m = await import("../dynamic/x.js");' })).toContain(
      "layer-boundary",
    );
  });

  it("lets every layer use the foundation modules (lib, hooks, icons, motion)", () => {
    for (const layer of ["primitives", "components", "blocks", "dynamic"]) {
      expect(
        rules({
          [`${layer}/a.ts`]:
            'import { cn } from "../lib/cn.js"; import { useSignal } from "../hooks.js";',
        }),
        layer,
      ).toEqual([]);
    }
  });

  it("stops foundation modules from importing any layer", () => {
    expect(rules({ "lib/a.ts": 'import { x } from "../components/x.js";' })).toContain(
      "layer-boundary",
    );
    expect(rules({ "hooks/a.ts": 'import { x } from "../primitives/x.js";' })).toContain(
      "layer-boundary",
    );
  });

  it("ignores package imports and files that sit outside any layer", () => {
    expect(rules({ "components/a.ts": 'import { useState } from "react";' })).toEqual([]);
    expect(rules({ "index.ts": 'export { x } from "./dynamic/x.js";' })).toEqual([]);
  });
});

describe("base-ui-only-in-primitives", () => {
  it("cannot be silenced with the colour escape hatch either", () => {
    const line = 'import { Dialog } from "@base-ui/react/dialog"; // conventions-ignore: nope';
    expect(rules({ "components/a.tsx": line })).toContain("base-ui-only-in-primitives");
  });

  it("allows @base-ui/react inside primitives", () => {
    expect(
      rules({ "primitives/dialog.tsx": 'import { Dialog } from "@base-ui/react/dialog";' }),
    ).toEqual([]);
  });

  it("flags it anywhere else, including subpaths", () => {
    for (const path of [
      "components/a.tsx",
      "blocks/b.tsx",
      "dynamic/c.ts",
      "lib/d.ts",
      "hooks.ts",
      "index.ts",
    ]) {
      expect(rules({ [path]: 'import { Dialog } from "@base-ui/react/dialog";' }), path).toContain(
        "base-ui-only-in-primitives",
      );
    }
    expect(rules({ "components/a.tsx": 'import * as B from "@base-ui/react";' })).toContain(
      "base-ui-only-in-primitives",
    );
  });

  it("does not confuse similarly named packages", () => {
    expect(rules({ "components/a.tsx": 'import x from "@base-ui-components/other";' })).toEqual([]);
  });
});
