---
"@azmr/ui": patch
---

Narrow the `ThemeConfig` type to what a stored theme can hold: colours are text (no `{ l, c, h }` object) and there is no `scope`. Every `ThemeConfig` is still accepted by `createTheme`, and `parseThemeConfig` returns the same values as before.
