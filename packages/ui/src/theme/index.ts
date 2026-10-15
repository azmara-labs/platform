// Server-safe entry (`@azmr/ui/theme`): no React, no browser globals.
// Usable from Server Components, layouts, route handlers and middleware.
export { createTheme, type Oklch, type Theme, type ThemeOptions } from "./create-theme.js";
export { themeInitScript } from "./init-script.js";
export {
  createLocale,
  type DateInput,
  DEFAULT_MESSAGES,
  type Locale,
  type LocaleMessages,
  type LocaleOptions,
  type WeekStart,
} from "./locale.js";
export {
  type CookieOptions,
  DENSITIES,
  DENSITY_COOKIE,
  type Density,
  type HtmlAttributes,
  htmlAttributes,
  parseDensity,
  parseThemePreference,
  readCookie,
  serializeCookie,
  THEME_COOKIE,
  THEME_PREFERENCES,
  type ThemePreference,
} from "./preferences.js";
