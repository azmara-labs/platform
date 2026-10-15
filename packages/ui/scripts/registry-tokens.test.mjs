import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTokensItem, STANDARD_TOKENS } from "./registry-tokens.mjs";

const css = readFileSync(join(import.meta.dirname, "..", "src", "styles", "tokens.css"), "utf8");
const item = buildTokensItem(css);

describe("tokens registry item", () => {
  it("is a theme item named tokens", () => {
    expect(item.name).toBe("tokens");
    expect(item.type).toBe("registry:theme");
    expect(item.title).toBeTruthy();
    expect(item.description).toBeTruthy();
  });

  it("ships the density tokens components need as a plain :root block", () => {
    const root = item.css[":root"];
    expect(root["--density-control-height"]).toBe("2.25rem");
    expect(root["--density-control-padding-x"]).toBe("0.75rem");
    expect(root["--density-row-height"]).toBe("2.75rem");
  });

  it("keeps non-colour tokens out of cssVars (the CLI would self-map them as var(--x) inside @theme)", () => {
    for (const mode of ["light", "dark"]) {
      const names = Object.keys(item.cssVars[mode]);
      const bad = names.filter((n) => /^(density|motion|elevation|z|font)-/.test(n));
      expect(bad, mode).toEqual([]);
    }
  });

  it("ships the motion tokens", () => {
    for (const name of [
      "--motion-duration-fast",
      "--motion-duration-base",
      "--motion-ease-standard",
    ]) {
      expect(item.css[":root"][name], name).toBeTruthy();
    }
  });

  it("ships colour tokens a standard shadcn setup lacks, with a value for each mode", () => {
    for (const name of ["destructive-foreground", "success", "warning", "info"]) {
      expect(item.cssVars.light[name], `light ${name}`).toBeTruthy();
      expect(item.cssVars.dark[name], `dark ${name}`).toBeTruthy();
      expect(item.cssVars.light[name]).not.toBe(item.cssVars.dark[name]);
    }
  });

  it("uses plain values, never light-dark(), because each mode has its own block", () => {
    for (const mode of ["light", "dark"]) {
      for (const [name, value] of Object.entries(item.cssVars[mode])) {
        expect(value, `${mode} ${name}`).not.toContain("light-dark(");
      }
    }
  });

  it("maps the non-colour Tailwind theme entries components use (ease, shadow); colour mappings are derived by the CLI", () => {
    expect(item.cssVars.theme["ease-standard"]).toBe("var(--motion-ease-standard)");
    expect(Object.keys(item.cssVars.theme).filter((n) => n.startsWith("color-"))).toEqual([]);
    expect(item.cssVars.theme["shadow-elevation-1"]).toBe("var(--elevation-1)");
  });

  it("never overrides a standard shadcn token, so the app keeps its own palette", () => {
    for (const mode of ["light", "dark", "theme"]) {
      const clashes = Object.keys(item.cssVars[mode] ?? {}).filter((name) =>
        STANDARD_TOKENS.has(name),
      );
      expect(clashes, mode).toEqual([]);
    }
    expect(item.cssVars.light.radius).toBeUndefined();
  });

  it("ships the density variants and the reduced-motion rules as css", () => {
    expect(item.css['[data-density="compact"]']["--density-control-height"]).toBe("2rem");
    expect(item.css['[data-density="spacious"]']["--density-control-height"]).toBe("2.75rem");
    const reduced = item.css["@media (prefers-reduced-motion: reduce)"];
    expect(reduced).toBeTruthy();
    expect(JSON.stringify(reduced)).toContain("--motion-duration-fast");
    // The safety net must exempt essential motion (a spinner), or it would freeze loaders.
    expect(Object.keys(reduced).join(" ")).toContain('[data-motion="essential"]');
  });

  it("is deterministic and serialisable (the CLI reads it as JSON)", () => {
    expect(JSON.parse(JSON.stringify(item))).toEqual(item);
    expect(JSON.stringify(buildTokensItem(css))).toBe(JSON.stringify(item));
  });

  it("throws on a stylesheet that does not look like tokens.css", () => {
    expect(() => buildTokensItem("body { color: red; }")).toThrow(/:root/);
  });
});
