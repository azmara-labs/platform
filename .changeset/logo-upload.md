---
"@azmr/ui": minor
---

Add `LogoUpload` (`@azmr/ui/logo-upload`): choose or drop a PNG, JPEG or WebP and get back a small `data:` URI. The file is checked from its first bytes, decoded, then shrunk and re-encoded in the browser until it fits `maxChars` (default 32,768, the theme's data URI limit). SVG is refused and nothing is fetched. It returns the string and stores nothing. `shrinkImage` and `ShrinkError` are exported for custom controls.
