import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error a build script (.mjs) with no type declarations
import { cssFiles } from "../../scripts/css-files.mjs";

const stylesDir = import.meta.dirname;

describe("the stylesheets that ship", () => {
  it("include everything styles.css and tokens.css import, so a consumer's @import resolves", () => {
    const files = cssFiles() as string[];
    const imports = ["styles.css", "tokens.css"].flatMap((name) =>
      [
        ...readFileSync(join(stylesDir, name), "utf8").matchAll(/@import\s+"\.\/([\w.-]+\.css)"/g),
      ].map((m) => m[1]),
    );
    expect(imports).toContain("motion.css");
    expect(imports).toContain("tokens.css");
    for (const name of imports) expect(files, name).toContain(name);
  });

  it("always include tokens.css and styles.css, and motion.css", () => {
    expect(cssFiles()).toEqual(expect.arrayContaining(["styles.css", "tokens.css", "motion.css"]));
  });

  it("every one of them exists in src/styles", () => {
    for (const name of cssFiles() as string[])
      expect(existsSync(join(stylesDir, name)), name).toBe(true);
  });

  it("follows an import of an import, and ignores external and package imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "azmr-css-"));
    writeFileSync(
      join(dir, "styles.css"),
      '@import "./tokens.css";\n@import "./a.css";\n@import "tailwindcss";\n@import url("https://x.test/y.css");',
    );
    writeFileSync(join(dir, "tokens.css"), ":root{}");
    writeFileSync(join(dir, "a.css"), '@import "./b.css";');
    writeFileSync(join(dir, "b.css"), ".b{}");
    expect(cssFiles(dir)).toEqual(["a.css", "b.css", "styles.css", "tokens.css"]);
  });

  it("ships a file that only tokens.css imports (an app that uses tokens.css must still resolve it)", () => {
    const dir = mkdtempSync(join(tmpdir(), "azmr-css-"));
    writeFileSync(join(dir, "styles.css"), "body{}");
    writeFileSync(join(dir, "tokens.css"), '@import "./only-tokens.css";');
    writeFileSync(join(dir, "only-tokens.css"), ".x{}");
    expect(cssFiles(dir)).toEqual(["only-tokens.css", "styles.css", "tokens.css"]);
  });

  it("does not loop on a cycle", () => {
    const dir = mkdtempSync(join(tmpdir(), "azmr-css-"));
    writeFileSync(join(dir, "styles.css"), '@import "./a.css";');
    writeFileSync(join(dir, "tokens.css"), "");
    writeFileSync(join(dir, "a.css"), '@import "./styles.css";');
    expect(cssFiles(dir)).toEqual(["a.css", "styles.css", "tokens.css"]);
  });
});
