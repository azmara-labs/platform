import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buttonVariants } from "@azmr/ui/button";
import { cn } from "@azmr/ui/lib";
import { describe, expect, it } from "vitest";
import { extractExamples, runExample } from "./lib/doc-examples";

// Checks for the Customising and Tailwind guides: the executable examples, and the statements
// about the package (entries, registry, stylesheet, consumer test) that the prose depends on.

const siteDir = join(import.meta.dirname, "..");
const uiDir = join(siteDir, "..", "..", "packages", "ui");
const guide = (name: string) =>
  readFileSync(join(siteDir, "content", "docs", "guide", `${name}.mdx`), "utf8");
const ui = (...path: string[]) => readFileSync(join(uiDir, ...path), "utf8");

describe("Customising components", () => {
  const examples = extractExamples(guide("customising"));

  it("finds the examples (guards against scanning nothing)", () => {
    expect(examples.map((e) => e.name)).toEqual(["merge", "merge-padding", "merge-values"]);
  });

  it.each(examples.map((e) => [e.name, e] as const))(
    "%s: shows the output cn returns",
    async (_n, e) => {
      expect(e.expected, `${e.name} has no // => line`).not.toBeUndefined();
      expect(await runExample(e, { cn })).toEqual(e.expected);
    },
  );

  it("buttonVariants returns a class string that depends on the variant and size", () => {
    const base = buttonVariants();
    expect(typeof base).toBe("string");
    expect(buttonVariants({ variant: "outline" })).not.toBe(base);
    expect(buttonVariants({ size: "lg" })).not.toBe(base);
    expect(buttonVariants({ variant: "outline" })).toContain("border");
  });

  it("serves buttonVariants from a client entry and cn from a server-safe one", () => {
    const entries = JSON.parse(ui("build", "entries.json")) as Record<
      string,
      Record<string, string>
    >;
    expect(Object.keys(entries.client ?? {})).toContain("button");
    expect(Object.keys(entries.server ?? {})).toContain("lib");
    expect(ui("src", "components", "button", "index.ts")).toContain("buttonVariants");
  });

  it("describes the registry as it is: button, spinner and the tokens item", () => {
    const items = JSON.parse(ui("registry", "items.json")) as { items: { name: string }[] };
    expect(items.items.map((i) => i.name).sort()).toEqual(["button", "spinner"]);
    expect(existsSync(join(uiDir, "scripts", "registry-tokens.mjs"))).toBe(true);
  });

  it("uses every demo it embeds", () => {
    const names = [...guide("customising").matchAll(/<Demo name="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual([
      "customising/class-override",
      "customising/link-as-button",
      "customising/wrapped-button",
    ]);
  });
});

describe("Tailwind CSS setup", () => {
  const tokens = ui("src", "styles", "tokens.css");
  const consumer = ui("scripts", "verify-consumer.mjs");

  it("describes a stylesheet that uses the v4 directives and the @source rule it quotes", () => {
    expect(tokens).toContain("@theme inline");
    expect(tokens).toContain('@source "./**/*.js";');
    expect(guide("tailwind")).toContain('@source "./**/*.js";');
  });

  it("has no Tailwind dependency of its own (the app provides it)", () => {
    const pkg = JSON.parse(ui("package.json")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const names = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
    expect(names.filter((n) => n === "tailwindcss" || n.startsWith("@tailwindcss/"))).toEqual([]);
  });

  it("quotes the setup the consumer test really uses (Next.js, PostCSS, Tailwind v4)", () => {
    const fixture = ui("fixtures", "next-app", "package.json");
    expect(fixture).toMatch(/"tailwindcss": "\^4/);
    expect(fixture).toContain('"@tailwindcss/postcss"');
    expect(fixture).not.toContain("@tailwindcss/vite");
    expect(ui("fixtures", "next-app", "postcss.config.mjs")).toContain(
      '"@tailwindcss/postcss": {}',
    );
  });

  it("is backed by a consumer test that checks the @source rule and proves it can fail", () => {
    expect(consumer).toContain("OUTSIDE the workspace");
    expect(consumer).toContain("--sabotage=no-source");
    expect(consumer).toContain("h-(--density-control-height)");
    expect(consumer).toMatch(/Tailwind v4 scans the package's classes inside node_modules/);
  });

  it("is backed by a test that keeps the responsive class tables spelled out", () => {
    expect(ui("scripts", "gen-layout-classes.test.mjs")).toContain("no drift, no hand edits");
    expect(ui("src", "components", "layout", "responsive.ts")).toContain("grid-cols-3");
  });
});
