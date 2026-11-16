---
"@azmr/ui": patch
---

`ThemeStudio` copy fixes. A stored logo that is not an `https:` URL or a PNG, JPEG or WebP data URI is now reported next to that logo, with a way to fix it, instead of being blamed on a developer. When a developer has set `primary` or `primary-text` for a mode directly, the note under the colour says so instead of calling the colour adjusted. New messages `errorLogo` and `statusOverridden`.
