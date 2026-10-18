# Typography

> A type scale where the variant picks the semantic element, with Heading, Text, Link, Code and Kbd. All Server Components.

Source: https://platform.azmara.io/docs/components/typography

Group: Data display · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Typography, Heading, Text, Link, Code, Kbd } from "@azmr/ui/typography";
```

```tsx
import { Typography } from "@azmr/ui/typography";

export default function TypographyScale() {
  return (
    <div className="flex flex-col gap-2">
      <Typography variant="overline">Overline</Typography>
      <Typography variant="h1">Heading 1</Typography>
      <Typography variant="h2">Heading 2</Typography>
      <Typography variant="h3">Heading 3</Typography>
      <Typography variant="h4">Heading 4</Typography>
      <Typography variant="h5">Heading 5</Typography>
      <Typography variant="h6">Heading 6</Typography>
      <Typography variant="lead">A lead paragraph introduces the page.</Typography>
      <Typography>Body text is the default variant and renders a paragraph.</Typography>
      <Typography variant="small">Small text for secondary detail.</Typography>
      <Typography variant="caption">Caption text</Typography>
    </div>
  );
}
```

A `variant` chooses a step on the type scale **and** the semantic element: `h1` to `h6` render real headings, `lead`, `body` and `small` render paragraphs, `caption` and `overline` render spans. Colours are tokens only, so the whole scale follows the theme. Pass `as` to render a different element without changing the look: `<Typography variant="h1" as="h2">` is a visually large `<h2>`.

Everything here is a **Server Component**: no hooks, no `"use client"`, safe in layouts and `loading.tsx`.

## Heading, Text, Link, Code and Kbd

```tsx
import { Code, Heading, Kbd, Link, Text } from "@azmr/ui/typography";

export default function TypographyInline() {
  return (
    <div className="flex flex-col gap-3">
      {/* The level is the document outline; the size is the look. They are separate decisions. */}
      <Heading level={2} size="h4">
        A quiet section heading
      </Heading>
      <Text>
        Press <Kbd>Enter</Kbd> to open a record, or run <Code>pnpm dev</Code> to start. Read the{" "}
        <Link href="/docs/components">components guide</Link> or visit{" "}
        <Link href="https://base-ui.com" external>
          Base UI
        </Link>
        .
      </Text>
      <Text tone="muted" size="sm">
        Muted, small text for secondary information.
      </Text>
      <Text tone="destructive" weight="medium">
        Something needs your attention.
      </Text>
    </div>
  );
}
```

- **`Heading`** separates the semantic `level` from the visual `size`, so you can keep the document outline correct and still choose how loud a heading looks.
- **`Text`** is running text, a paragraph by default. `tone` uses semantic tokens (`muted`, `destructive`, `success`, `warning`, `info`); `size` and `weight` adjust it.
- **`Link`** is underlined by default, so links are distinguishable without relying on colour alone, and has a full-strength focus ring. `external` adds `target="_blank"`, `rel="noopener noreferrer"` and a screen-reader-only "(opens in a new tab)". To use your router's link, pass it as `as`: `<Link as={NextLink} href="/x">`.
- **`Code`** and **`Kbd`** are inline code and a keyboard key, styled from tokens.

## Props

| Prop           | Type                                                                                                                  | Default | Required | Description                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------- |
| `variant`      | `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "lead" \| "body" \| "small" \| "caption" \| "overline" \| undefined` |         | No       | The type-scale step. It picks the semantic element and the look. Default `body`. |
| `align`        | `"left" \| "center" \| "right" \| "justify" \| undefined`                                                             |         | No       |                                                                                  |
| `noWrap`       | `boolean \| undefined`                                                                                                |         | No       | Truncate to one line with an ellipsis.                                           |
| `gutterBottom` | `boolean \| undefined`                                                                                                |         | No       | Add a small bottom margin (MUI's `gutterBottom`).                                |

Everything else a native element accepts passes through, and `ref` is the rendered element.

## Migrating from MUI Typography

`@azmr/ui/typography/mui-map` is plain data the migration codemod uses. Exact mappings are rewritten; approximate ones (a small difference in weight, case or colour) are flagged for a person to look at.

| MUI `variant`           | `@azmr/ui`            | Note                                                                                 |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `h1` to `h6`            | `h1` to `h6`          | exact                                                                                |
| `subtitle1`             | `lead`                | `lead` is muted; add `className="text-foreground"` for MUI's colour                  |
| `subtitle2`             | `small`               | MUI is medium weight: add `weight="medium"` on `Text`                                |
| `body1` (MUI's default) | `body`                | exact                                                                                |
| `body2`                 | `small`               | exact                                                                                |
| `caption`, `overline`   | `caption`, `overline` | ours are muted; add `className="text-foreground"` for MUI's colour                   |
| `button`                | `small`               | MUI is uppercase medium: add `weight="medium"` and `className="uppercase"`           |
| `inherit`               | `body`                | takes the parent's font in MUI; use `className="text-inherit"` if that is the intent |

Props: `component` becomes `as`; `gutterBottom`, `noWrap` and `align` keep their names; `paragraph` becomes a `Text`; `color` becomes `tone` or a `text-*` class; `sx` becomes `className`.

## Accessibility

- Variants render the right semantic element, so headings form a real outline for assistive technology.
- Keep one `h1` per page and do not skip levels; use `Heading`'s `size` when you want a different look at the right level.
- Links are underlined by default and external links announce that they open a new tab.
- There is no keyboard interaction beyond native links; `Kbd` only documents shortcuts and does not bind them.
