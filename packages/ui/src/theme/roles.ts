// Server-safe. The colour roles a theme can set, and their default values in each mode.
// The defaults are the neutral values from tokens.css (roles.test.ts keeps the two identical).
// Chart colours are not roles. Defaults are written as the components inside oklch(...) and built
// into CSS strings, because some are transparent (border, input and sidebar-border in dark mode),
// which the colour parser rejects.

export const ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "scrim",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "warning-text",
  "info",
  "info-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type Role = (typeof ROLES)[number];
export type Mode = "light" | "dark";

/** Roles an app cannot override: the dimming layer behind modals. */
export const FIXED_ROLES = ["scrim"] as const;
export type OverridableRole = Exclude<Role, (typeof FIXED_ROLES)[number]>;

const OVERRIDABLE: ReadonlySet<string> = new Set(
  ROLES.filter((role) => !(FIXED_ROLES as readonly string[]).includes(role)),
);

/** Whether `value` names a role an app may override (a role, but not `scrim`). */
export function isOverridableRole(value: string): value is OverridableRole {
  return OVERRIDABLE.has(value);
}

const o = (components: string) => `oklch(${components})`; // conventions-ignore: builds the default colour strings from tokens.css

export const ROLE_DEFAULTS: Readonly<Record<Role, Readonly<Record<Mode, string>>>> = {
  background: { light: o("1 0 0"), dark: o("0.145 0 0") },
  foreground: { light: o("0.145 0 0"), dark: o("0.985 0 0") },
  card: { light: o("1 0 0"), dark: o("0.205 0 0") },
  "card-foreground": { light: o("0.145 0 0"), dark: o("0.985 0 0") },
  popover: { light: o("1 0 0"), dark: o("0.205 0 0") },
  "popover-foreground": { light: o("0.145 0 0"), dark: o("0.985 0 0") },
  scrim: { light: o("0 0 0 / 0.5"), dark: o("0 0 0 / 0.65") },
  primary: { light: o("0.205 0 0"), dark: o("0.922 0 0") },
  "primary-foreground": { light: o("0.985 0 0"), dark: o("0.205 0 0") },
  secondary: { light: o("0.97 0 0"), dark: o("0.269 0 0") },
  "secondary-foreground": { light: o("0.205 0 0"), dark: o("0.985 0 0") },
  muted: { light: o("0.97 0 0"), dark: o("0.269 0 0") },
  "muted-foreground": { light: o("0.5 0 0"), dark: o("0.72 0 0") },
  accent: { light: o("0.97 0 0"), dark: o("0.269 0 0") },
  "accent-foreground": { light: o("0.205 0 0"), dark: o("0.985 0 0") },
  destructive: { light: o("0.53 0.22 27"), dark: o("0.65 0.2 22") },
  "destructive-foreground": { light: o("0.985 0 0"), dark: o("0.145 0 0") },
  success: { light: o("0.46 0.13 150"), dark: o("0.72 0.17 150") },
  "success-foreground": { light: o("0.985 0 0"), dark: o("0.145 0 0") },
  warning: { light: o("0.78 0.16 80"), dark: o("0.82 0.16 82") },
  "warning-foreground": { light: o("0.25 0.04 70"), dark: o("0.25 0.04 70") },
  "warning-text": { light: o("0.5 0.1 75"), dark: o("0.82 0.16 82") },
  info: { light: o("0.5 0.18 255"), dark: o("0.72 0.13 245") },
  "info-foreground": { light: o("0.985 0 0"), dark: o("0.145 0 0") },
  border: { light: o("0.922 0 0"), dark: o("1 0 0 / 12%") },
  input: { light: o("0.922 0 0"), dark: o("1 0 0 / 16%") },
  ring: { light: o("0.55 0.15 255"), dark: o("0.72 0.12 255") },
  sidebar: { light: o("0.985 0 0"), dark: o("0.205 0 0") },
  "sidebar-foreground": { light: o("0.145 0 0"), dark: o("0.985 0 0") },
  "sidebar-primary": { light: o("0.205 0 0"), dark: o("0.922 0 0") },
  "sidebar-primary-foreground": { light: o("0.985 0 0"), dark: o("0.205 0 0") },
  "sidebar-accent": { light: o("0.97 0 0"), dark: o("0.269 0 0") },
  "sidebar-accent-foreground": { light: o("0.205 0 0"), dark: o("0.985 0 0") },
  "sidebar-border": { light: o("0.922 0 0"), dark: o("1 0 0 / 12%") },
  "sidebar-ring": { light: o("0.55 0.15 255"), dark: o("0.72 0.12 255") },
};

/** The custom property that carries a role, for example `--primary-foreground`. */
export function cssVar(role: Role): string {
  return `--${role}`;
}
