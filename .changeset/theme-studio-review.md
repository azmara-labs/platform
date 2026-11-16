---
"@azmr/ui": patch
---

`ThemeStudio` and `LogoUpload` review fixes. The studio writes only the keys the admin changed (key order and untouched values are kept, and a stored problem is reported, not repaired), accepts `logoLabels` for the logo uploads' text, drops a stale preview when a new theme arrives, discards a logo still being prepared on Reset, and keeps the developer details out of the live alert. `ThemePreview` applies only `--` properties and uses the package's `inertProps()`. `LogoUpload` reports `onBusyChange(false)` when it unmounts mid-preparation and drops a file that finishes after it was disabled.
