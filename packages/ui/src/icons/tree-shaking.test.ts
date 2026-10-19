// @vitest-environment node
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

// Bundles tiny consumer programs the way an app bundler would (ESM, tree-shaking, minified) and
// inspects the output. Lucide builds each icon with `name:"kebab-name"`, which survives
// minification, so an icon that is bundled shows up by that string.
const PATH = {
  check: "M20 6 9 17l-5-5",
  search: "m21 21-4.34-4.34",
  anvil: "M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4",
  zap: "M15.914 4a1.5 1.5 0 00-2.474-1.561",
};
const LUCIDE_REACT_RUNTIME = "iconNode is required";
const srcDir = import.meta.dirname.replace(/[\\/]icons$/, "");

async function bundle(code: string): Promise<string> {
  const result = await build({
    stdin: { contents: code, resolveDir: srcDir, loader: "ts", sourcefile: "consumer.ts" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    treeShaking: true,
    minify: true,
    external: ["react", "react/jsx-runtime", "react-dom"],
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  return result.outputFiles[0]?.text ?? "";
}

// Every test here runs a real bundler, which is slow when the whole suite runs in parallel.
describe("tree-shaking", { timeout: 30_000 }, () => {
  it("the Icon core bundles no icon at all", async () => {
    const out = await bundle(`import { Icon } from "./icons/index.ts"; console.log(Icon);`);
    expect(out).not.toContain('name:"cannabis"');
    expect(out).not.toContain("lucide-react");
    expect(out).not.toContain("tabler");
  });

  it("an app that imports one icon bundles that icon and no other", async () => {
    const out = await bundle(
      `import { Icon } from "./icons/index.ts"; import { Check } from "lucide-react"; console.log(Icon, Check);`,
    );
    expect(out).toContain('name:"check"');
    expect(out).not.toContain('name:"cannabis"');
    expect(out).not.toContain('name:"anvil"');
  });

  it("the curated set bundles its icons but not the rest of Lucide", async () => {
    const out = await bundle(`import { Icon } from "./icons/lucide.ts"; console.log(Icon);`);
    // The curated icons are glyphs built from the `lucide` package's shape data, so probe by
    // each icon's path rather than lucide-react's name:"..." string.
    expect(out).toContain(PATH.check);
    expect(out).toContain(PATH.search);
    // Icons that are not in the curated set must not come along.
    expect(out).not.toContain(PATH.anvil);
    expect(out).not.toContain(PATH.zap);
  });

  // lucide-react's icons are client components; its runtime carries this message. A server-safe
  // entry must not pull it in, or every page that uses the entry ships it (PAZM-142).
  it.each([
    "./components/display/index.ts",
    "./components/stepper/index.ts",
    "./components/breadcrumb/index.ts",
    "./components/pagination/index.ts",
    "./icons/lucide.ts",
  ])("%s bundles no lucide-react runtime", async (entry) => {
    const out = await bundle(`import * as entry from "${entry}"; console.log(entry);`);
    expect(out).not.toContain(LUCIDE_REACT_RUNTIME);
  });

  it("the guard works: lucide-react's runtime is detected when it is bundled", async () => {
    const out = await bundle(`import { Check } from "lucide-react"; console.log(Check);`);
    expect(out).toContain(LUCIDE_REACT_RUNTIME);
  });

  it("the MUI map is plain data and pulls in no React or icon library", async () => {
    const out = await bundle(
      `import { resolveMuiIcon } from "./icons/mui-map.ts"; console.log(resolveMuiIcon);`,
    );
    expect(out).not.toMatch(/react|createElement|forwardRef/i);
    expect(out).not.toContain("lucide-react");
  });

  it("the guard works: a namespace import of Lucide does bundle everything it is given", async () => {
    // Negative control: proves the probes can fail, so the checks above mean something.
    const out = await bundle(
      `import * as L from "lucide-react"; console.log(L.Cannabis, L.Anvil);`,
    );
    expect(out).toContain('name:"cannabis"');
    expect(out).toContain('name:"anvil"');
  });
});
