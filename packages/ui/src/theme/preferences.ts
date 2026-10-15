// Server-safe: no React, no browser globals. Theme and density preferences, and the
// cookie helpers a server layout uses to render them into <html> before first paint.
// Reading the preference on the server avoids an inline script entirely, so strict CSPs work.

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DENSITIES = ["compact", "comfortable", "spacious"] as const;
export type Density = (typeof DENSITIES)[number];

export const THEME_COOKIE = "azmr-theme";
export const DENSITY_COOKIE = "azmr-density";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Validate untrusted input (a cookie, storage, a query string) down to a known value. */
export function parseThemePreference(
  value: unknown,
  fallback: ThemePreference = "system",
): ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value)
    ? (value as ThemePreference)
    : fallback;
}

export function parseDensity(value: unknown, fallback: Density = "comfortable"): Density {
  return typeof value === "string" && (DENSITIES as readonly string[]).includes(value)
    ? (value as Density)
    : fallback;
}

/** Read one cookie from a `Cookie` header / `document.cookie` string. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1 || trimmed.slice(0, eq) !== name) continue;
    const raw = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

// RFC 6265: a cookie name is an HTTP token; a value excludes whitespace, quotes, commas,
// semicolons and backslashes. Refusing anything else keeps a caller from injecting attributes.
const COOKIE_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const COOKIE_VALUE = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/;

export interface CookieOptions {
  /** Add the `Secure` attribute (set when the page is served over HTTPS). */
  secure?: boolean;
}

/** Build a `Set-Cookie` / `document.cookie` string: path-wide, one year, SameSite=Lax. */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  if (!COOKIE_NAME.test(name)) throw new Error(`Invalid cookie name: ${JSON.stringify(name)}`);
  if (!COOKIE_VALUE.test(value)) throw new Error(`Invalid cookie value for "${name}"`);
  const secure = options.secure ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export interface HtmlAttributes {
  "data-theme"?: "light" | "dark";
  "data-density"?: "compact" | "spacious";
}

interface HtmlAttributesInput {
  theme?: ThemePreference;
  density?: Density;
}

function buildHtmlAttributes({ theme, density }: HtmlAttributesInput): HtmlAttributes {
  const attributes: HtmlAttributes = {};
  // "system" is the CSS default (color-scheme: light dark + light-dark()), so it needs no attribute.
  if (theme === "light" || theme === "dark") attributes["data-theme"] = theme;
  if (density === "compact" || density === "spacious") attributes["data-density"] = density;
  return attributes;
}

/**
 * Attributes for `<html>` in a server layout:
 * `<html lang="en-NZ" {...htmlAttributes.fromCookies(cookieHeader)}>`.
 */
export const htmlAttributes = Object.assign(buildHtmlAttributes, {
  fromCookies(header: string | null | undefined): HtmlAttributes {
    return buildHtmlAttributes({
      theme: parseThemePreference(readCookie(header, THEME_COOKIE)),
      density: parseDensity(readCookie(header, DENSITY_COOKIE)),
    });
  },
});
