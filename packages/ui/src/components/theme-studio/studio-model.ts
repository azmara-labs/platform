// The theme studio's rules, with no React: a draft (what the admin typed) and the config the studio
// was given become either a config that can be saved, or the reasons it cannot.
import { clampToGamut, encodedSrgb, parseColour } from "../../theme/colour.js";
import { isDisplayText } from "../../theme/config.js";
import { createTheme, parseThemeJson, type ThemeConfig, validateTheme } from "../../theme/index.js";
import { DEFAULT_MESSAGES, fill, type StudioMessages } from "./messages.js";

/** What the admin has typed or chosen. An empty string means "not set". */
export interface StudioDraft {
  appName: string;
  brand: string;
  brandDark: string;
  logo: string;
  logoDark: string;
}

export type StudioField = "appName" | "brand" | "brandDark";

/** What to tell the admin about one colour. `shade` is what links and labels use, as `#rrggbb`. */
export interface ColourNote {
  mode: "light" | "dark";
  kind: "readable" | "adjusted" | "dark-derived";
  shade: string;
}

export type StudioResult =
  | {
      ok: true;
      config: ThemeConfig;
      cssVariables: Record<string, string>;
      notes: ColourNote[];
    }
  | {
      ok: false;
      /** Problems with what the admin typed, by field. */
      errors: Partial<Record<StudioField, string>>;
      /** A setting the admin cannot see (or an incoming problem) stops the save. */
      conflict?: { roles: string[]; issues: string[] };
    };

export function draftFromConfig(config?: ThemeConfig): StudioDraft {
  return {
    appName: config?.branding?.appName ?? "",
    brand: config?.brand ?? config?.primary ?? "",
    brandDark: config?.brandDark ?? "",
    logo: config?.branding?.logo ?? "",
    logoDark: config?.branding?.logoDark ?? "",
  };
}

function trimmed(draft: StudioDraft): StudioDraft {
  return {
    appName: draft.appName.trim(),
    brand: draft.brand.trim(),
    brandDark: draft.brandDark.trim(),
    logo: draft.logo.trim(),
    logoDark: draft.logoDark.trim(),
  };
}

/** Whether the draft differs from what `config` would give, ignoring spaces around values. */
export function isDirty(config: ThemeConfig | undefined, draft: StudioDraft): boolean {
  const a = trimmed(draftFromConfig(config));
  const b = trimmed(draft);
  return (Object.keys(a) as (keyof StudioDraft)[]).some((key) => a[key] !== b[key]);
}

function isColour(text: string): boolean {
  try {
    parseColour(text, "colour", "text");
    return true;
  } catch {
    return false;
  }
}

/** The config with the draft's values applied. Everything the draft does not cover is copied. */
function buildConfig(base: ThemeConfig | undefined, draft: StudioDraft): ThemeConfig {
  const config: ThemeConfig = structuredClone(base ?? {});

  // `brand` and `primary` are aliases: write to whichever the config already used.
  const keys: ("brand" | "primary")[] =
    base?.primary !== undefined
      ? base.brand !== undefined
        ? ["brand", "primary"]
        : ["primary"]
      : ["brand"];
  delete config.brand;
  delete config.primary;
  if (draft.brand) for (const key of keys) config[key] = draft.brand;

  if (draft.brandDark) config.brandDark = draft.brandDark;
  else delete config.brandDark;

  const branding = { ...config.branding };
  const set = (key: "appName" | "logo" | "logoDark", value: string) => {
    if (value) branding[key] = value;
    else delete branding[key];
  };
  set("appName", draft.appName);
  set("logo", draft.logo);
  set("logoDark", draft.logoDark);
  if (Object.keys(branding).length > 0) config.branding = branding;
  else delete config.branding;

  if (config.version === undefined && Object.keys(config).length > 0) config.version = 1;
  return config;
}

/** `#rrggbb` for a colour the theme library wrote or accepts. */
function toHex(text: string): string {
  const [r, g, b] = encodedSrgb(clampToGamut(parseColour(text, "colour")));
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Whether two `#rrggbb` colours are the same to the eye: the library rounds what it writes. */
function sameHex(a: string, b: string): boolean {
  return [1, 3, 5].every(
    (i) =>
      Math.abs(Number.parseInt(a.slice(i, i + 2), 16) - Number.parseInt(b.slice(i, i + 2), 16)) <=
      2,
  );
}

/** One half of a role's `light-dark(a, b)` value, as the library wrote it. */
function modeValue(vars: Record<string, string>, role: string, mode: "light" | "dark") {
  const match = /^light-dark\((.+?), (.+)\)$/.exec(vars[`--${role}`] ?? "");
  return match?.[mode === "light" ? 1 : 2];
}

function notesFor(draft: StudioDraft, vars: Record<string, string>): ColourNote[] {
  if (!draft.brand) return [];
  const notes: ColourNote[] = [];
  for (const mode of ["light", "dark"] as const) {
    const primary = modeValue(vars, "primary", mode);
    const text = modeValue(vars, "primary-text", mode);
    if (!primary || !text) continue;
    const shade = toHex(text);
    const typed = mode === "light" ? draft.brand : draft.brandDark;
    if (!typed) {
      notes.push({ mode, kind: "dark-derived", shade });
      continue;
    }
    const wanted = toHex(typed);
    const readable = sameHex(toHex(primary), wanted) && sameHex(shade, wanted);
    notes.push({ mode, kind: readable ? "readable" : "adjusted", shade });
  }
  return notes;
}

function issueTexts(error: unknown): { roles: string[]; issues: string[] } {
  const roles: string[] = [];
  const issues: string[] = [];
  const add = (list: string[], value: string) => {
    if (!list.includes(value)) list.push(value);
  };
  const named = (error as { issues?: unknown }).issues;
  if (Array.isArray(named)) {
    for (const issue of named) {
      if (typeof issue === "string") add(issues, issue);
      else if (issue && typeof issue === "object" && "message" in issue) {
        const { message, role, against } = issue as {
          message: string;
          role?: string;
          against?: string;
        };
        add(issues, message);
        if (role) add(roles, role);
        if (against) add(roles, against);
      }
    }
  } else add(issues, error instanceof Error ? error.message : String(error));
  return { roles, issues };
}

/**
 * Check a draft. The admin's own values are checked first; whatever the library then refuses must
 * come from a setting the studio does not show (a role override, a tint) or from a problem the
 * incoming config already had, so it is reported as a conflict and nothing is dropped to get past it.
 */
export function evaluateDraft(
  base: ThemeConfig | undefined,
  input: StudioDraft,
  messages: StudioMessages = DEFAULT_MESSAGES,
): StudioResult {
  const draft = trimmed(input);
  const errors: Partial<Record<StudioField, string>> = {};
  if (draft.appName && !isDisplayText(draft.appName)) errors.appName = messages.errorAppName;
  if (draft.brand && !isColour(draft.brand)) {
    errors.brand = fill(messages.errorColour, { field: messages.lightColourName });
  }
  if (draft.brandDark) {
    if (!isColour(draft.brandDark)) {
      errors.brandDark = fill(messages.errorColour, { field: messages.darkColourName });
    } else if (!draft.brand) errors.brandDark = messages.errorDarkNeedsLight;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const config = buildConfig(base, draft);
  try {
    parseThemeJson(JSON.stringify(config));
    const issues = validateTheme(config);
    if (issues.length > 0) return { ok: false, errors: {}, conflict: issueTexts({ issues }) };
    const { cssVariables } = createTheme(config);
    return { ok: true, config, cssVariables, notes: notesFor(draft, cssVariables) };
  } catch (error) {
    return { ok: false, errors: {}, conflict: issueTexts(error) };
  }
}
