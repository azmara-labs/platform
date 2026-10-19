---
"@azmr/ui": minor
---

Make the server-safe entries truly server-safe. lucide-react 1.x's icons are client components, so `@azmr/ui/display`, `@azmr/ui/stepper`, `@azmr/ui/breadcrumb`, `@azmr/ui/pagination` and `@azmr/ui/icons/lucide` sent Lucide's runtime (about 44 kB before compression) to every page that used them, even from a Server Component.

- Built-in icons are now glyphs: plain SVG rendered on the server from the `lucide` package's shape data, with exactly the markup lucide-react renders (attributes, `lucide lucide-<name>` classes and alias classes, `aria-hidden`), tested against lucide-react for every icon. The client components (menu, modal, toast, accordion, split button) use them too.
- `lucideIcons` and the named `Icon` from `@azmr/ui/icons/lucide` now hold these glyphs. They take the same props as lucide-react's icons (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`), but their TypeScript type is `Glyph` rather than `LucideIcon`.
- `lucide` becomes a dependency (shape data only, no React). `lucide-react` stays a dependency and is upgraded to 1.59.0.
- The build now fails if a server-safe entry imports `lucide-react`, and the consumer check builds a Next.js page from every server-safe entry and fails if its client manifest gains anything from `@azmr/ui` or Lucide.
