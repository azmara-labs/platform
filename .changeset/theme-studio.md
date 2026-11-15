---
"@azmr/ui": minor
---

Add `ThemeStudio` (`@azmr/ui/theme-studio`): a ready-made screen where a business admin sets the app name, a brand colour for light and for dark, and logos, with a live Light/Dark preview. It returns a validated `ThemeConfig` through `onSave` and keeps every setting it does not show (radius, font, density, tint, role overrides, favicon). It never saves, fetches or restyles the page, and it blocks Save with a plain-language note when a hidden developer setting conflicts with the new colour. `ThemePreview` is exported for use on its own. `LogoUpload` gains `onBusyChange`, called while a chosen file is being prepared.
