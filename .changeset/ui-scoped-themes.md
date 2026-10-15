---
"@azmr/ui": patch
---

Fix scoped themes when the bundler lowers `light-dark()` (Next.js does, for older browser targets). Lowered tokens are resolved where they are declared and inherited, so a nested `data-theme="light"` inside a dark page, or `.dark` on a panel, had no effect on colours; only the root worked. `.light`, `.dark` and `data-theme` scopes now re-declare every colour token explicitly (a test keeps them identical to the `:root` values), so nesting works however the CSS is processed. Adds about 0.6 kB gzip to the stylesheet (budget now 4 kB). Also exports the `ButtonOwnProps` type and aligns the workspace on a single React version.
