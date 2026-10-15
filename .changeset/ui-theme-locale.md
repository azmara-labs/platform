---
"@azmr/ui": minor
---

Theme, density and locale support.

- **`@azmr/ui/theme`** (server-safe, no React): `createTheme({ primary, radius, font, density })` turns a brand colour into token overrides with guaranteed WCAG AA (primary pair >= 4.5:1, focus ring >= 3:1, both modes); cookie helpers (`readCookie`, `serializeCookie`, `parseThemePreference`, `parseDensity`); `htmlAttributes` / `htmlAttributes.fromCookies(header)` to render `data-theme` and `data-density` on the server with no inline script; `createLocale` (en-NZ / NZD / Monday week start by default, cached `Intl` formatters, date-only strings never shift across time zones); `themeInitScript()` as an optional inline fallback for static sites.
- **`@azmr/ui/react`** (client): `ThemeProvider` / `useTheme` (system tracking, cookie persistence, density) and `LocaleProvider` / `useLocale`.
- `styles.css` gains a `--font-sans-stack` token mapped to Tailwind's `font-sans`.
- Build and conventions: the verifier now fails if a server-safe entry can reach React (including through shared chunks), and a new `server-safe-no-react` convention enforces the same at source level.
