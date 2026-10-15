---
"@azmr/ui": minor
---

Add the layout components (`@azmr/ui/layout`), all Server Components: `Stack` (responsive direction, gap on the 4px scale or the density token, align, justify, wrap, dividers between children), `Grid` and `GridItem` (CSS grid with a responsive 1 to 12 column count, spans per breakpoint, and `minItemWidth` for an auto-fit grid), `Container`, `Separator` (a real `hr`, a labelled vertical separator, or decorative) and `AspectRatio`. They replace MUI `Box`, `Stack`, `Grid` and `Container`. `@azmr/ui/layout/mui-map` is data and helpers for the migration codemod (spacing to gap, breakpoints, Container `maxWidth`, Grid item props), returning `undefined` or `unsupported` for what has no equivalent. Inputs that reach a style attribute (`minItemWidth`, `ratio`) are validated. The responsive class tables are generated and checked for drift so Tailwind always sees the class names.
