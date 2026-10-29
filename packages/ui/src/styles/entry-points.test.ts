import { readFileSync } from "node:fs";
import { join } from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

// Two stylesheets, one contract:
//   tokens.css  design tokens, themes, density, motion and the Tailwind theme mapping. Safe to
//               add to an app that already has global styles (another UI library mid-migration,
//               a docs site): it changes nothing outside our own utilities.
//   styles.css  tokens.css plus the global base rules (body colours, default border colour).
const dir = import.meta.dirname;
const read = (name: string) => readFileSync(join(dir, name), "utf8");
const tokens = read("tokens.css");
const styles = read("styles.css");

const bodyRule = /(^|[}\s])body\s*\{/;
const universalRule = /(^|[}\s])\*\s*\{/;

describe("tokens.css", () => {
  it("defines the tokens, themes and Tailwind mapping", () => {
    expect(tokens).toContain("--background:");
    expect(tokens).toContain("--density-control-height:");
    expect(tokens).toContain("--motion-duration-base:");
    expect(tokens).toContain("@theme inline");
    expect(tokens).toContain('[data-theme="dark"]');
  });

  it("scans no files with @source, so an app only generates the components it lists", () => {
    expect(tokens).not.toMatch(/@source\s+["'][^"']+["']/);
  });

  it("contains no global base rules", () => {
    expect(tokens).not.toContain("@layer base");
    expect(tokens).not.toMatch(bodyRule);
    expect(tokens).not.toMatch(universalRule);
  });
});

describe("styles.css", () => {
  it("is tokens.css plus the base rules", () => {
    expect(styles).toMatch(/@import\s+["']\.\/tokens\.css["']/);
    expect(styles).toContain("@layer base");
    expect(styles).toMatch(bodyRule);
    expect(styles).toMatch(universalRule);
  });

  it("does not repeat the tokens", () => {
    expect(styles).not.toContain("--background:");
    expect(styles).not.toContain("@theme inline");
  });
});

describe("compiled by Tailwind v4", () => {
  const compile = async (file: string) => {
    const entry = `
      @import "tailwindcss";
      @import ${JSON.stringify(join(dir, file).replaceAll("\\", "/"))};
      @source inline("bg-background text-foreground");
    `;
    const result = await postcss([tailwindcss()]).process(entry, { from: join(dir, "entry.css") });
    return result.css;
  };
  let withTokensOnly = "";
  let withBase = "";

  beforeAll(async () => {
    withTokensOnly = await compile("tokens.css");
    withBase = await compile("styles.css");
  }, 60_000);

  it("tokens.css alone still gives working utilities and variables", () => {
    expect(withTokensOnly).toContain(".bg-background");
    expect(withTokensOnly).toContain("--background:");
  });

  // The `.border-border` utility legitimately uses var(--border); what must not appear without
  // styles.css is the universal `*` rule that colours every element's border, or the body rule.
  const bodyColours = /(?:^|[{};])\s*body\s*\{[^}]*var\(--background\)/;
  const universalBorder = /(?:^|[{};])\s*\*\s*\{[^}]*border-color:\s*var\(--border\)/;

  it("tokens.css alone leaves body and default borders untouched", () => {
    expect(withTokensOnly).not.toMatch(bodyColours);
    expect(withTokensOnly).not.toMatch(universalBorder);
  });

  it("styles.css adds the body colours and default border colour", () => {
    expect(withBase).toMatch(bodyColours);
    expect(withBase).toMatch(universalBorder);
  });
});
