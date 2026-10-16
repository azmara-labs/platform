import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Two React copies in one workspace break hooks with a cryptic "Cannot read properties of null
// (reading 'useRef')". Next hides it by aliasing React; every other tool (tests, scripts, a plain
// bundler) crashes. The workspace packages must therefore resolve the very same copy.
const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");

function resolveFrom(fromDir: string, specifier: string): string {
  const require = createRequire(join(fromDir, "package.json"));
  return realpathSync(require.resolve(specifier));
}

describe("one React in the workspace", () => {
  const docs = join(repoRoot, "apps", "docs");
  const ui = join(repoRoot, "packages", "ui");

  it("docs and @azmr/ui resolve the same react and react-dom", () => {
    for (const name of ["react", "react-dom", "react/jsx-runtime"]) {
      expect(resolveFrom(ui, name), name).toBe(resolveFrom(docs, name));
    }
  });

  it("the copy Base UI renders with is the same one", () => {
    const baseUi = resolveFrom(ui, "@base-ui/react/button");
    const fromBaseUi = createRequire(baseUi).resolve("react");
    expect(realpathSync(fromBaseUi)).toBe(resolveFrom(docs, "react"));
  });

  it("docs and @azmr/ui resolve the same lucide-react", () => {
    expect(resolveFrom(ui, "lucide-react")).toBe(resolveFrom(docs, "lucide-react"));
  });
});
