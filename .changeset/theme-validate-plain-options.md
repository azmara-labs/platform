---
"@azmr/ui": patch
---

`validateTheme` now refuses the same `radius`, `font`, `density` and `scope` values that `createTheme` refuses, so an editor that only calls `validateTheme` can no longer accept a theme that cannot be built. Its doc comment now lists what it throws for.
