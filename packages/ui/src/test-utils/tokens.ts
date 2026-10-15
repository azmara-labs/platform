import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Color, interpolate, parse, wcagContrast } from "culori";
import postcss from "postcss";

// Resolves design tokens to colours from src/styles/tokens.css, for contrast tests of component
// surfaces (a tint of a token over the page). Reads the explicit `.light` / `.dark` scope blocks.
const css = readFileSync(join(import.meta.dirname, "..", "styles", "tokens.css"), "utf8");
const root = postcss.parse(css);

export type Mode = "light" | "dark";

function scope(selector: string): Map<string, string> {
  const decls = new Map<string, string>();
  root.walkRules((rule) => {
    if (rule.parent?.type !== "root" || !rule.selectors.includes(selector)) return;
    rule.walkDecls((d) => {
      decls.set(d.prop, d.value.trim());
    });
  });
  return decls;
}

const SCOPES: Record<Mode, Map<string, string>> = { light: scope(".light"), dark: scope(".dark") };

/** A token (`success`, `--success`) as a colour in a mode. */
export function tokenColour(name: string, mode: Mode): Color {
  const prop = name.startsWith("--") ? name : `--${name}`;
  const value = SCOPES[mode].get(prop);
  if (value === undefined) throw new Error(`token ${prop} is not defined for ${mode}`);
  const colour = parse(value);
  if (!colour) throw new Error(`token ${prop} (${mode}) is not a colour: ${value}`);
  return colour;
}

/** `tint` painted over `base` at `alpha` (0 to 1), as an opaque colour. */
export function over(base: Color, tint: Color, alpha: number): Color {
  return interpolate([base, tint], "rgb")(alpha);
}

export const contrast = (a: Color, b: Color): number => wcagContrast(a, b);

/** The alpha written in a Tailwind opacity class such as `bg-success/10` (0.1). */
export function alphaOf(classNames: string, prefix: string): number {
  const match = new RegExp(`(?:^|\\s)${prefix}/(\\d+)(?:\\s|$)`).exec(classNames);
  if (!match) throw new Error(`no ${prefix}/N class in "${classNames}"`);
  return Number(match[1]) / 100;
}
