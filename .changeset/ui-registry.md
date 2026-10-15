---
"@azmr/ui": minor
---

Add a shadcn-compatible registry (namespace `@azmr`, served at `https://platform.azmara.io/r/{name}.json`). `npx shadcn@latest add @azmr/button` copies `button.tsx` and `spinner.tsx` into the app, installs `@base-ui/react` and `class-variance-authority`, and adds a `tokens` item (density, motion, elevation and a few colours, never overriding the app's own palette) to `globals.css`. The registry source is generated from the package source with only import paths rewritten, and an unmapped relative import fails the build. The L2 primitive wrappers now re-export Base UI under its own names; the public API is unchanged. Registry files and fixtures are not published to npm.
