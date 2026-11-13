import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { cssVar, FIXED_ROLES, isOverridableRole, ROLE_DEFAULTS, ROLES } from "./roles.js";

const css = readFileSync(join(import.meta.dirname, "../styles/tokens.css"), "utf8");
const root = postcss.parse(css);

/** Declarations of every rule whose selector list contains `selector`. */
function declsFor(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  root.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls((d) => {
      out.set(d.prop, d.value.trim());
    });
  });
  return out;
}

const rootVars = declsFor(":root");
const lightVars = declsFor(".light");
const darkVars = declsFor(".dark");

// A colour token is a custom property whose value is a colour or a light-dark() pair of colours.
const COLOUR_VALUE = /^(?:oklch\(|light-dark\(oklch\()/;
const rootColourTokens = [...rootVars]
  .filter(([name, value]) => name.startsWith("--") && COLOUR_VALUE.test(value))
  .map(([name]) => name.slice(2))
  .filter((name) => !name.startsWith("chart-"));

describe("theme roles", () => {
  it("guards against checking nothing", () => {
    expect(ROLES).toHaveLength(36);
    expect(rootColourTokens.length).toBeGreaterThan(30);
  });

  it("lists exactly the colour tokens in :root, apart from the chart palette", () => {
    expect([...ROLES].sort()).toEqual([...rootColourTokens].sort());
  });

  it("has a default for each role in each mode that equals the scoped .light and .dark declarations", () => {
    for (const role of ROLES) {
      expect(ROLE_DEFAULTS[role].light, `${role} (light)`).toBe(lightVars.get(`--${role}`));
      expect(ROLE_DEFAULTS[role].dark, `${role} (dark)`).toBe(darkVars.get(`--${role}`));
    }
  });

  it("keeps the transparent dark defaults of border, input and sidebar-border", () => {
    expect(ROLE_DEFAULTS.border.dark).toContain("/");
    expect(ROLE_DEFAULTS.input.dark).toContain("/");
    expect(ROLE_DEFAULTS["sidebar-border"].dark).toContain("/");
  });

  it("treats every role except scrim as overridable, and nothing else", () => {
    for (const role of ROLES) expect(isOverridableRole(role), role).toBe(role !== "scrim");
    for (const other of ["", "nonsense", "__proto__", "constructor", "toString", "Background"]) {
      expect(isOverridableRole(other), other).toBe(false);
    }
  });

  it("makes only scrim fixed, and names a role's custom property", () => {
    expect(FIXED_ROLES).toEqual(["scrim"]);
    expect(cssVar("primary-foreground")).toBe("--primary-foreground");
  });
});
