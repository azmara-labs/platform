---
"@azmr/ui": minor
---

Add the icon system.

- `@azmr/ui/icons`: `Icon` renders any icon component (Lucide, Tabler or your own SVG) with size tokens (`xs`..`xl` or a number), `strokeWidth`, `spin` and accessibility (decorative by default; `aria-label` / `aria-labelledby` make it a labelled image). It is a Server Component. `createIconSet()` builds a typed `<Icon name>` for a fixed set, and `registerIcons()` registers custom SVGs by name. An unknown name renders nothing and warns once in development.
- `@azmr/ui/icons/lucide`: a curated set of about 60 Lucide icons by name, with Lucide's own kebab-case names.
- `@azmr/ui/icons/mui-map`: migration data mapping over 300 `@mui/icons-material` icons (variants and the legacy `Outline` spelling resolved) to Lucide and Tabler, validated in tests against the real packages, with the deliberately unmapped common names listed.
- `Spinner` is now a Server Component (no `"use client"`), so it can be used in `loading.tsx` and Suspense fallbacks.
- `lucide-react` becomes a dependency. `react-icons` is deliberately not bundled.
- The build gains a `serverComponents` entry kind: `verify-dist` now allows stateless React (no hooks, no context) in server entries and follows imports through nested shared chunks.
