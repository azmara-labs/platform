import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseColour } from "culori";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { docsFrontmatter } from "../src/lib/docs-frontmatter";
import {
  colourUtility,
  contrastTables,
  mdxText,
  parseTokens,
  proseText,
  renderTokensMdx,
  splitArgs,
} from "./build-tokens";

const uiStyles = join(import.meta.dirname, "..", "..", "..", "packages", "ui", "src", "styles");
const css = readFileSync(join(uiStyles, "tokens.css"), "utf8");

const FIXTURE = `
:root {
  color-scheme: light dark;

  --radius: 0.5rem;

  /* Surfaces */
  --background: light-dark(oklch(1 0 0), oklch(0.145 0 0));
  /* Behind modals. */
  --scrim: light-dark(oklch(0 0 0 / 0.5), oklch(0 0 0 / 0.65));

  /* Motion (durations and easings) */
  --motion-duration-fast: 150ms;
  --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Typography. createTheme({ font }) overrides --font-sans-stack. */
  --font-sans-stack:
    ui-sans-serif,
    system-ui;

  /* Density (comfortable by default) */
  --density-gap: 0.5rem;
}

[data-density="compact"] { --density-gap: 0.375rem; }
[data-density="spacious"] { --density-gap: 0.75rem; }

@media (prefers-reduced-motion: reduce) {
  :root { --motion-duration-fast: 0.01ms; }
}

@theme inline {
  --color-background: var(--background);
  --color-scrim: var(--scrim);
  --radius-md: calc(var(--radius) - 2px);
  --ease-standard: var(--motion-ease-standard);
  --font-sans: var(--font-sans-stack);
}
`;

describe("parseTokens on a small stylesheet", () => {
  const parsed = parseTokens(FIXTURE);
  const all = parsed.groups.flatMap((g) => g.tokens);
  const token = (name: string) => all.find((t) => t.name === name);

  it("opens a section at a comment that follows a blank line", () => {
    expect(parsed.groups.map((g) => g.title)).toEqual([
      "Shape",
      "Surfaces",
      "Motion",
      "Typography",
      "Density",
    ]);
  });

  it("keeps what follows the title as the section's note", () => {
    const byTitle = (title: string) => parsed.groups.find((g) => g.title === title);
    expect(byTitle("Motion")?.note).toBe("durations and easings");
    expect(byTitle("Typography")?.note).toBe("createTheme({ font }) overrides --font-sans-stack.");
    expect(byTitle("Density")?.note).toBe("comfortable by default");
  });

  it("treats a comment directly above a token as that token's note", () => {
    expect(token("--scrim")?.note).toBe("Behind modals.");
    expect(token("--background")?.note).toBeUndefined();
  });

  it("splits light-dark() into its two halves, including nested functions", () => {
    expect(token("--background")).toMatchObject({
      light: "oklch(1 0 0)",
      dark: "oklch(0.145 0 0)",
    });
    expect(token("--scrim")).toMatchObject({
      light: "oklch(0 0 0 / 0.5)",
      dark: "oklch(0 0 0 / 0.65)",
    });
  });

  it("joins a multi-line value", () => {
    expect(token("--font-sans-stack")?.value).toBe("ui-sans-serif, system-ui");
  });

  it("reads the Tailwind utilities from the @theme mapping", () => {
    expect(token("--background")?.utilities).toEqual(["bg-background"]);
    expect(token("--radius")?.utilities).toEqual(["rounded-md"]);
    expect(token("--motion-ease-standard")?.utilities).toEqual(["ease-standard"]);
    expect(token("--font-sans-stack")?.utilities).toEqual(["font-sans"]);
  });

  it("records the reduced-motion value only where it differs", () => {
    expect(token("--motion-duration-fast")?.reduced).toBe("0.01ms");
    expect(token("--motion-ease-standard")?.reduced).toBeUndefined();
  });

  it("reads the density levels", () => {
    expect(parsed.density.compact.get("--density-gap")).toBe("0.375rem");
    expect(parsed.density.spacious.get("--density-gap")).toBe("0.75rem");
  });

  it("fails loudly when there is no :root rule", () => {
    expect(() => parseTokens(".a { --x: 1; }")).toThrow(/:root/);
  });
});

describe("helpers", () => {
  it("splitArgs splits on top-level commas only", () => {
    expect(splitArgs("oklch(1 0 0), oklch(0 0 0 / 0.5)")).toEqual([
      "oklch(1 0 0)",
      "oklch(0 0 0 / 0.5)",
    ]);
    expect(splitArgs("a(1, 2), b")).toEqual(["a(1, 2)", "b"]);
  });

  it("mdxText escapes braces and angle brackets", () => {
    expect(mdxText("a {b} <c>")).toBe("a \\{b\\} &lt;c&gt;");
  });

  it("proseText turns token names and createTheme calls into code, capitalises and ends with a stop", () => {
    expect(proseText("createTheme({ font }) overrides --font-sans-stack")).toBe(
      "`createTheme({ font })` overrides `--font-sans-stack`.",
    );
    expect(proseText("comfortable by default")).toBe("Comfortable by default.");
    expect(proseText("Already ends.")).toBe("Already ends.");
  });

  it("colourUtility picks the utility that matches a colour's role", () => {
    expect(colourUtility("primary")).toBe("bg-primary");
    expect(colourUtility("primary-foreground")).toBe("text-primary-foreground");
    expect(colourUtility("warning-text")).toBe("text-warning-text");
    expect(colourUtility("border")).toBe("border-border");
    expect(colourUtility("ring")).toBe("ring-ring");
  });
});

describe("the tokens reference for the real tokens.css", () => {
  const parsed = parseTokens(css);
  const mdx = renderTokensMdx(css);
  const all = parsed.groups.flatMap((g) => g.tokens);

  // Found independently of the parser, so a parsing bug cannot hide a missing token.
  const declared = (() => {
    const names: string[] = [];
    const root = postcss.parse(css);
    for (const rule of root.nodes) {
      if (rule.type !== "rule" || rule.selector !== ":root") continue;
      rule.each((node) => {
        if (node.type === "decl" && node.prop.startsWith("--")) names.push(node.prop);
      });
    }
    return names;
  })();

  it("finds the tokens (guards against scanning nothing)", () => {
    expect(declared.length).toBeGreaterThan(50);
  });

  it("lists exactly the custom properties declared in :root, each once", () => {
    expect(all.map((t) => t.name)).toEqual(declared);
  });

  it("mentions every token in the page", () => {
    const missing = declared.filter((name) => !mdx.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });

  it("has the sections the docs promise, none of them empty", () => {
    const titles = parsed.groups.map((g) => g.title);
    for (const title of [
      "Surfaces",
      "Brand and neutrals",
      "Status",
      "Lines and focus",
      "Sidebar",
      "Motion",
      "Typography",
      "Elevation",
      "Layering",
      "Density",
    ]) {
      expect(titles, title).toContain(title);
    }
    expect(parsed.groups.filter((g) => g.tokens.length === 0).map((g) => g.title)).toEqual([]);
  });

  it("includes the tokens that were missing from the old docs", () => {
    for (const name of [
      "--scrim",
      "--warning-text",
      "--z-popover",
      "--z-toast",
      "--motion-duration-fast",
      "--motion-duration-slow",
    ]) {
      expect(mdx, name).toContain(`\`${name}\``);
    }
  });

  it("parses both halves of every colour token as colours", () => {
    const colours = all.filter((t) => t.light !== undefined);
    expect(colours.length).toBeGreaterThan(40);
    const bad = colours.filter((t) => !parseColour(t.light ?? "") || !parseColour(t.dark ?? ""));
    expect(bad.map((t) => t.name)).toEqual([]);
  });

  it("shows density for all three levels, and the reduced-motion values", () => {
    expect(parsed.density.compact.size).toBeGreaterThanOrEqual(4);
    expect(parsed.density.spacious.size).toBeGreaterThanOrEqual(4);
    expect(mdx).toContain("| Token | Compact | Comfortable (default) | Spacious |");
    expect(mdx).toContain("Reduced motion");
  });

  it("has valid frontmatter for the docs site", () => {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(mdx);
    expect(match).not.toBeNull();
    const fields: Record<string, string> = {};
    for (const line of (match?.[1] ?? "").split("\n")) {
      const [key, ...rest] = line.split(": ");
      fields[key as string] = rest.join(": ");
    }
    expect(docsFrontmatter.safeParse(fields).success).toBe(true);
  });

  describe("the contrast tables", () => {
    const tables = contrastTables(parsed);

    it("meets the thresholds the page states", () => {
      const below = (rows: typeof tables.text, minimum: number) =>
        rows
          .filter((r) => r.light < minimum || r.dark < minimum)
          .map((r) => `${r.foreground} on ${r.background}`);
      expect(below(tables.text, 4.5)).toEqual([]);
      expect(below(tables.tones, 4.5)).toEqual([]);
      expect(below(tables.ring, 3)).toEqual([]);
      expect(below(tables.charts, 3)).toEqual([]);
    });

    it("covers every pair (guards against computing nothing)", () => {
      expect(tables.text.length).toBeGreaterThanOrEqual(15);
      expect(tables.tones).toHaveLength(8);
      expect(tables.ring).toHaveLength(3);
      expect(tables.charts).toHaveLength(16);
    });

    it("only claims guarantees that the package's own token tests make", () => {
      // The page says these ratios are tested. Each text pair must be in @azmr/ui's tokens.test.ts.
      const uiTest = readFileSync(join(uiStyles, "tokens.test.ts"), "utf8");
      const untested = tables.text
        .map((r) => [r.foreground.slice(2), r.background.slice(2)] as const)
        .filter(([fg, bg]) => !uiTest.includes(`["${fg}", "${bg}"]`));
      expect(untested).toEqual([]);
      for (const tone of ["destructive", "success", "warning-text", "info"]) {
        expect(uiTest, tone).toContain(`"${tone}"`);
      }
    });
  });
});
