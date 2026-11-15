---
"@azmr/ui": minor
---

Add `brandDark`, an optional second brand colour for dark mode. `createTheme` derives `primary`, `primary-foreground`, `primary-text`, `ring`, `sidebar-primary`, `sidebar-primary-foreground` and `sidebar-ring` for dark mode from it, and adjusts it for contrast like `brand`. It needs a `brand` or `primary`, and a stored theme and `ThemeConfigSchema` accept it. Output for themes without it does not change.
