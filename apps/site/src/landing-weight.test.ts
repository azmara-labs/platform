import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

// The landing page is the first thing a visitor loads, so it is kept light. These checks keep out
// the three things that made it heavy (the highlighter in the browser, a client-side FAQ, the docs
// toaster and layout code loaded for everyone), and, after a build, hold its JavaScript to a budget.

const siteDir = join(import.meta.dirname, "..");
const src = join(siteDir, "src");
const read = (...path: string[]) => readFileSync(join(src, ...path), "utf8");
const landingFiles = readdirSync(join(src, "components", "landing")).filter((f) =>
  f.endsWith(".tsx"),
);
const landing = (file: string) => read("components", "landing", file);

describe("landing page source", () => {
  it("finds the landing components (guards against scanning nothing)", () => {
    expect(landingFiles).toEqual(
      expect.arrayContaining(["hero.tsx", "faq.tsx", "code-showcase.tsx", "landing-card.tsx"]),
    );
  });

  it("highlights code on the server, not in the browser", () => {
    for (const file of landingFiles) {
      expect(landing(file), file).not.toContain("dynamic-codeblock");
      expect(landing(file), file).not.toContain("DynamicCodeBlock");
    }
    expect(landing("hero.tsx")).toContain("codeblock.rsc");
    expect(landing("code-showcase.tsx")).toContain("codeblock.rsc");
  });

  it("does not prefetch the docs from links on the landing page or in the footer", () => {
    const files: [string, string][] = [
      ...landingFiles.map((f): [string, string] => [f, landing(f)]),
      ["site-footer.tsx", read("components", "site-footer.tsx")],
    ];
    const bare: string[] = [];
    for (const [name, text] of files) {
      // Each <Link ...> opening tag, up to its closing ">" outside braces.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "");
      for (const match of code.matchAll(/<Link\b([\s\S]*?)>/g)) {
        if (!(match[1] ?? "").includes("prefetch={false}"))
          bare.push(`${name}: <Link${match[1]?.slice(0, 40)}`);
      }
    }
    expect(bare).toEqual([]);
  });

  it("uses no Fumadocs Card on the landing page (its Link prefetches the docs)", () => {
    for (const file of landingFiles) expect(landing(file), file).not.toContain("components/card");
  });

  it("keeps the FAQ free of client JavaScript", () => {
    expect(landing("faq.tsx")).not.toContain('"use client"');
    expect(landing("faq.tsx")).toContain("<details");
  });

  it("mounts the docs toaster in the docs layout, not the root layout", () => {
    expect(read("app", "layout.tsx")).not.toContain("@azmr/ui");
    expect(read("app", "layout.tsx")).not.toContain("Toaster");
    expect(read("app", "docs", "layout.tsx")).toContain("<Toaster />");
  });

  it("generates the package cards from the packages, not a hand-written list", () => {
    const showcase = landing("package-showcase.tsx");
    expect(showcase).toContain("readPackages");
    expect(showcase).not.toMatch(/name: "@azmr\//);
  });
});

// After `pnpm build` the landing page's HTML lists its scripts. The sizes at the time this budget was
// set: 10 script tags and 207 kB gzipped (it was 14 tags and 271 kB before the changes above). The
// budget leaves some room; raise it deliberately, not by accident.
const MAX_SCRIPT_TAGS = 12;
const MAX_GZIP_KB = 230;
const builtLanding = join(siteDir, ".next", "server", "app", "index.html");

describe("landing page JavaScript budget (needs a build)", () => {
  it.skipIf(!existsSync(builtLanding))("stays within the script budget", () => {
    const html = readFileSync(builtLanding, "utf8");
    const scripts = [
      ...new Set([...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1] as string)),
    ];
    let bytes = 0;
    for (const script of scripts) {
      const file = join(siteDir, ".next", script.replace(/^\/_next\//, ""));
      if (existsSync(file)) bytes += gzipSync(readFileSync(file)).length;
    }
    expect(scripts.length).toBeLessThanOrEqual(MAX_SCRIPT_TAGS);
    expect(bytes / 1024).toBeLessThanOrEqual(MAX_GZIP_KB);
  });
});
