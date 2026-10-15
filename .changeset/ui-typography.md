---
"@azmr/ui": minor
---

Add `Typography`, `Heading`, `Text`, `Link`, `Code` and `Kbd` (`@azmr/ui/typography`), all Server Components.

- `Typography`: a type scale (`h1` to `h6`, `lead`, `body`, `small`, `caption`, `overline`) where the variant picks the semantic element and the look, from colour tokens only. `as` overrides the element without changing the look; `align`, `noWrap` and `gutterBottom` match the MUI props.
- `Heading` separates the semantic `level` from the visual `size`. `Text` has `size`, `tone` (muted, destructive, success, warning, info) and `weight`.
- `Link` is underlined by default (not colour alone), has a full-strength focus ring, and `external` adds `target`, `rel="noopener noreferrer"` and a screen-reader hint. `as` renders a router link.
- `@azmr/ui/typography/mui-map`: data mapping MUI Typography variants and props to ours, flagging the approximate ones, for the migration codemod.
