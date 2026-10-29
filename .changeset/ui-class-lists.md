---
"@azmr/ui": minor
---

Per-component class lists replace the stylesheet's `@source` scan, so an app only generates CSS for the components it uses.

`tokens.css` (and so `styles.css`) no longer contains `@source "./**/*.js"`. That rule made Tailwind scan every file in the package, so an app that used Button and Input still generated the CSS for toast, the drawer, the accordion and every other component: in app.azmara.io, 523 of its 1,289 utility classes, about 10 kB gzip of render-blocking CSS and roughly 150 ms of first paint.

Instead, each entry point ships a class list, generated at build time with Tailwind's own scanner: `@azmr/ui/classes/<entry>.css` holds exactly the classes that entry's JavaScript uses (shared chunks included), and `@azmr/ui/classes.css` holds them all.

**Migration (required):** add the class lists to your global CSS, after the stylesheet. Either list the entries you use:

```css
@import "tailwindcss";
@import "@azmr/ui/styles.css";
@import "@azmr/ui/classes/button.css";
@import "@azmr/ui/classes/input.css";
```

or keep generating everything, as before, with one line:

```css
@import "@azmr/ui/classes.css";
```

Without either, components render unstyled. A Button and Input app goes from about 13 kB to about 6 kB of CSS (gzip). The build checks that `classes.css` generates exactly what the old scan did, and that a Button and Input app stays within a 6.5 kB budget.
