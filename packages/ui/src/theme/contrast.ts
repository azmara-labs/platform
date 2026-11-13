// Server-safe. WCAG contrast checks for a resolved theme: every text pair at 4.5:1 and the focus
// rings at 3:1, in both modes. The pairs are the ones tokens.test.ts holds the default tokens to.
import { blendedContrast, contrast, parseColour } from "./colour.js";
import type { Mode, Role } from "./roles.js";

export interface ThemeIssue {
  /** The role that fails (the foreground, or the ring). */
  role: Role;
  /** The role it sits on. */
  against: Role;
  mode: Mode;
  /** Measured contrast ratio. */
  ratio: number;
  /** The ratio the pair needs: 4.5 for text, 3 for focus rings. */
  required: number;
  /** Set when the pair fails only while a solid button is hovered: the surface it blends over. */
  hover?: Role;
  message: string;
}

type Pair = readonly [foreground: Role, background: Role];

/** Text pairs, which need 4.5:1: foregrounds on their surfaces, and tones used as text. */
export const TEXT_PAIRS: readonly Pair[] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["info-foreground", "info"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["success", "background"],
  ["success", "card"],
  ["warning-text", "background"],
  ["warning-text", "card"],
  ["info", "background"],
  ["info", "card"],
];

/** Focus rings, which need 3:1 against the surface they appear on. */
export const NON_TEXT_PAIRS: readonly Pair[] = [
  ["ring", "background"],
  ["ring", "card"],
  ["ring", "popover"],
  ["sidebar-ring", "sidebar"],
];

const TEXT_RATIO = 4.5;
const NON_TEXT_RATIO = 3;

/**
 * Solid buttons blend with what is behind them on hover (`hover:bg-primary/90`, secondary `/80`),
 * which can pull a colour that only just passes below 4.5:1. Each entry is a button's label, its
 * background, and the share of the background left in the blend.
 */
const HOVER_BUTTONS: readonly (readonly [foreground: Role, background: Role, alpha: number])[] = [
  ["primary-foreground", "primary", 0.9],
  ["secondary-foreground", "secondary", 0.8],
  ["destructive-foreground", "destructive", 0.9],
  ["success-foreground", "success", 0.9],
  ["warning-foreground", "warning", 0.9],
  ["info-foreground", "info", 0.9],
];

/** The surfaces a button sits on: the page, and a card. */
const HOVER_SURFACES: readonly Role[] = ["background", "card"];

/** A colour as the contrast maths needs it, or `undefined` for one it cannot read (transparency). */
function read(value: string | undefined) {
  if (value === undefined) return undefined;
  try {
    return parseColour(value, "colour");
  } catch {
    return undefined;
  }
}

/**
 * Check every pair in both modes and return the ones that fail. A pair is skipped when a role is
 * missing or a colour cannot be read (the transparent dark defaults of border and input are not
 * in any pair, and an override cannot carry transparency).
 */
export function checkContrast(resolved: ReadonlyMap<Role, Record<Mode, string>>): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  const groups: [readonly Pair[], number][] = [
    [TEXT_PAIRS, TEXT_RATIO],
    [NON_TEXT_PAIRS, NON_TEXT_RATIO],
  ];
  for (const [pairs, required] of groups) {
    for (const [role, against] of pairs) {
      for (const mode of ["light", "dark"] as const) {
        const fg = read(resolved.get(role)?.[mode]);
        const bg = read(resolved.get(against)?.[mode]);
        if (!fg || !bg) continue;
        const ratio = contrast(fg, bg);
        if (ratio >= required) continue;
        issues.push({
          role,
          against,
          mode,
          ratio,
          required,
          message: `${role} on ${against} (${mode}): ${ratio.toFixed(2)}:1, needs ${required}:1`,
        });
      }
    }
  }
  for (const [role, against, alpha] of HOVER_BUTTONS) {
    for (const mode of ["light", "dark"] as const) {
      const fg = read(resolved.get(role)?.[mode]);
      const bg = read(resolved.get(against)?.[mode]);
      if (!fg || !bg) continue;
      for (const hover of HOVER_SURFACES) {
        const surface = read(resolved.get(hover)?.[mode]);
        if (!surface) continue;
        const ratio = blendedContrast(fg, bg, surface, alpha);
        if (ratio >= TEXT_RATIO) continue;
        issues.push({
          role,
          against,
          mode,
          ratio,
          required: TEXT_RATIO,
          hover,
          message: `${role} on ${against} (${mode}, hovering over ${hover}): ${ratio.toFixed(2)}:1, needs ${TEXT_RATIO}:1`,
        });
      }
    }
  }
  return issues;
}
