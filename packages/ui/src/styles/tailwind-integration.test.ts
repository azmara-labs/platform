import { readFileSync } from "node:fs";
import { join } from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

// Compile styles.css with the real Tailwind v4 compiler and check that the token
// names become working utilities. Catches a broken @theme mapping, a bad @source
// rule, or CSS that Tailwind rejects, none of which a plain CSS parser would see.
const stylesPath = join(import.meta.dirname, "styles.css");

const classes = [
  "bg-background",
  "text-foreground",
  "bg-card",
  "text-card-foreground",
  "bg-primary",
  "text-primary-foreground",
  "bg-muted",
  "text-muted-foreground",
  "bg-destructive",
  "bg-success",
  "bg-warning",
  "text-warning-foreground",
  "bg-info",
  "border-border",
  "ring-ring",
  "bg-sidebar",
  "bg-chart-1",
  "bg-chart-8",
  "rounded-sm",
  "rounded-md",
  "rounded-lg",
  "rounded-xl",
  "shadow-elevation-1",
  "shadow-elevation-4",
  "ease-standard",
  "ease-emphasized",
];

let output = "";

beforeAll(async () => {
  const input = `
    @import "tailwindcss";
    @import ${JSON.stringify(stylesPath.replaceAll("\\", "/"))};
    @source inline("${classes.join(" ")}");
  `;
  const result = await postcss([tailwindcss()]).process(input, {
    from: join(import.meta.dirname, "entry.css"),
  });
  output = result.css;
}, 60_000);

describe("styles.css compiled by Tailwind v4", () => {
  it("emits the design tokens as custom properties", () => {
    expect(output).toContain("--background:");
    expect(output).toContain("--motion-duration-base:");
    expect(output).toContain("light-dark(");
  });

  it.each(classes)("generates a utility for .%s", (cls) => {
    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(output, cls).toMatch(new RegExp(`\\.${escaped}\\s*\\{`));
  });

  it("points colour utilities at the tokens, not at literal colours", () => {
    expect(output).toMatch(/\.bg-background\s*\{[^}]*var\(--background\)/);
    expect(output).toMatch(/\.text-muted-foreground\s*\{[^}]*var\(--muted-foreground\)/);
  });

  it("derives the radius scale from --radius", () => {
    expect(output).toMatch(/\.rounded-md\s*\{[^}]*var\(--radius\)\s*-\s*2px/);
  });

  it("keeps the reduced-motion safety net", () => {
    expect(output).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it("was read from disk (sanity: the source file is the one under test)", () => {
    expect(readFileSync(stylesPath, "utf8")).toContain("@theme inline");
  });
});
