---
"@azmr/ui": patch
---

Stop suggesting an `{ l, c, h }` object in the errors for a stored theme. `parseThemeConfig` and `parseThemeJson` take JSON, which cannot hold one, so a bad colour now says `must be #rgb, #rrggbb or oklch(L C H)`. `createTheme` messages are unchanged.
