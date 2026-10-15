// @vitest-environment node
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

// Bundles tiny consumer programs the way an app bundler would (ESM, tree-shaking, minified) and
// inspects the output. Lucide builds each icon with `name:"kebab-name"`, which survives
// minification, so an icon that is bundled shows up by that string.
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

describe("tree-shaking", () => {
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
    expect(out).toContain('name:"check"');
    expect(out).toContain('name:"search"');
    // Icons that are not in the curated set must not come along.
    expect(out).not.toContain('name:"anvil"');
    expect(out).not.toContain('name:"cannabis"');
    expect(out).not.toContain('name:"zap"');
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
