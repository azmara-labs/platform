---
"@azmr/ui": minor
---

Add the `@azmr/ui/styles.css` design tokens and Tailwind v4 theme mapping.

- shadcn-compatible token names (`--background`, `--primary`, `--ring`, `--radius`, `--sidebar-*`) plus `--success`, `--warning`, `--info`, `--chart-1..8`, `--motion-*`, `--elevation-*`, `--z-*` and `--density-*`.
- OKLCH colours with `light-dark()`: follows the system by default, or force a mode with `.dark` / `.light` / `data-theme`. No JavaScript, no flash.
- Density via `data-density="compact|spacious"`; reduced motion collapses the motion tokens and adds a safety net (spare essential motion with `data-motion="essential"`).
- Verified by tests: WCAG AA contrast for every token pair in both modes, 3:1 for the focus ring and chart colours, chart colours distinguishable under protan/deutan/tritan simulation, and the real Tailwind v4 compiler generating every utility.
- `package.json` now exports `./styles.css` and marks only CSS as side-effectful (`sideEffects: ["**/*.css"]`).
