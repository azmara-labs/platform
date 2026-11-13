---
"@azmr/ui": minor
---

Define themes per colour role for light and dark mode. `createTheme` now accepts `brand`, `tint`, `light` and `dark` overrides, `scope`, and checks contrast when a theme uses tint or overrides (`ThemeContrastError`). New: `validateTheme`, `parseThemeConfig` and `parseThemeJson` for stored themes, the Zod `ThemeConfigSchema` at `@azmr/ui/theme-schema`, and three presets at `@azmr/ui/theme-presets`. Existing `createTheme` calls return the same output as before.
