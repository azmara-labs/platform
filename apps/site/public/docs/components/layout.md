# Layout

> Stack, Grid with a responsive column count, Container, Separator and AspectRatio. All Server Components.

Source: https://platform.azmara.io/docs/components/layout

Group: Layout · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Stack, Grid, GridItem, Container, Separator, AspectRatio } from "@azmr/ui/layout";
```

Everything here is a **Server Component**: no hooks, no `"use client"`, safe in layouts and `loading.tsx`. They replace MUI's `Box`, `Stack`, `Grid` and `Container`.

## Stack

```tsx
import { Button } from "@azmr/ui/button";
import { Separator, Stack } from "@azmr/ui/layout";

export default function LayoutStack() {
  return (
    <Stack gap={6}>
      {/* A column on phones, a row from md, with the gap following the density token. */}
      <Stack direction={{ base: "column", md: "row" }} gap="density" align="center">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="ghost">Reset</Button>
      </Stack>

      {/* A divider goes between children only. */}
      <Stack direction="row" gap={4} align="center" divider={<Separator orientation="vertical" />}>
        <span>Overview</span>
        <span>Activity</span>
        <span>Settings</span>
      </Stack>
    </Stack>
  );
}
```

`Stack` lays children out in a column (default) or a row with a consistent `gap`. `direction` accepts a responsive object, so a column on phones becomes a row from `md`. `gap` is on the 4px scale (0 to 12), or `density` to follow the density token. `divider` places an element between children, never before the first or after the last, and skips empty children.

## Grid

```tsx
import { Grid, GridItem } from "@azmr/ui/layout";

const cell = "rounded-md border border-border bg-muted p-4 text-sm";

export default function LayoutGrid() {
  return (
    <div className="flex flex-col gap-6">
      {/* One column on phones, two from sm, four from lg. */}
      <Grid cols={{ base: 1, sm: 2, lg: 4 }} gap={4}>
        <div className={cell}>One</div>
        <div className={cell}>Two</div>
        <div className={cell}>Three</div>
        <div className={cell}>Four</div>
      </Grid>

      {/* The 12-column pattern: cols={12} with a span per breakpoint. */}
      <Grid cols={12} gap={4}>
        <GridItem span={{ base: 12, md: 8 }} className={cell}>
          Main (12, then 8 of 12 from md)
        </GridItem>
        <GridItem span={{ base: 12, md: 4 }} className={cell}>
          Aside
        </GridItem>
      </Grid>

      {/* As many columns as fit, each at least 12rem wide. */}
      <Grid minItemWidth="12rem" gap={4}>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
      </Grid>
    </div>
  );
}
```

`Grid` is a CSS grid with a responsive `cols` prop (1 to 12). It is **not** MUI's 12-column item system: for that pattern use `cols={12}` and give children a `GridItem` with a `span` per breakpoint. For card layouts, `minItemWidth="16rem"` fills each row with as many columns as fit. `minItemWidth` is validated as a plain CSS length because it lands in a style attribute.

Breakpoints are Tailwind's: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536px.

## Container, Separator and AspectRatio

```tsx
import { AspectRatio, Container, Separator, Stack } from "@azmr/ui/layout";

export default function LayoutContainer() {
  return (
    <Container size="sm" className="rounded-md border border-dashed border-border py-4">
      <Stack gap={4}>
        <p className="text-sm">A container centres its content and limits the width.</p>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <AspectRatio ratio="video" className="rounded-md bg-muted">
            <div className="grid size-full place-items-center text-sm">16 / 9</div>
          </AspectRatio>
          <AspectRatio ratio="square" className="rounded-md bg-muted">
            <div className="grid size-full place-items-center text-sm">1 / 1</div>
          </AspectRatio>
        </div>
      </Stack>
    </Container>
  );
}
```

- **`Container`** centres content, limits the width (`sm` 42rem to `xl` 80rem, `2xl` 96rem, or `full`) and adds gutters that grow with the screen (`gutters={false}` removes them).
- **`Separator`**: a horizontal one is a real `<hr>`; a vertical one is `role="separator"` with `aria-orientation`. `decorative` hides it from assistive technology.
- **`AspectRatio`** keeps a ratio (`square`, `video`, `4/3`, `3/2`, `21/9`, `3/4`, or a number). Direct `img`, `video` and `iframe` children fill it.

## Migrating from MUI

`@azmr/ui/layout/mui-map` is plain data and helper functions for the codemod.

| MUI                                   | `@azmr/ui`                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `<Grid container spacing={2}>`        | `<Grid cols={12} gap={4}>` (MUI spacing is 8px, ours 4px: `muiSpacingToGap`)                         |
| `<Grid item xs={12} md={6}>`          | `<GridItem span={{ base: 12, md: 6 }}>`                                                              |
| `alignItems`, `justifyContent`        | `align`, `justify`                                                                                   |
| `<Stack spacing={2} direction="row">` | `<Stack gap={4} direction="row">`                                                                    |
| `<Container maxWidth="md">`           | `<Container size="md">` (`xl` becomes `2xl`, 96rem = 1536px; `xs` is approximate; `false` is `full`) |
| `disableGutters`                      | `gutters={false}`                                                                                    |

A spacing with no matching step (such as 7), and item props that cannot be expressed (`xs="auto"`, `xs={true}`), are reported by the helpers as `undefined` or in `unsupported` so the codemod flags them rather than guessing. MUI's breakpoints are 0/600/900/1200/1536px and Tailwind's are 0/640/768/1024/1280px, so check layouts near the boundaries.

## Props

| Prop        | Type                                                                                                                                         | Default | Required | Description                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| `direction` | `"row" \| "column" \| Partial<Record<"base" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl", "row" \| "column">> \| undefined`                      |         | No       | `column` (default) or `row`, or one per breakpoint: `{ base: "column", md: "row" }`.              |
| `gap`       | `0 \| 6 \| 1 \| 2 \| 3 \| 4 \| 5 \| 8 \| 10 \| 12 \| "density" \| undefined`                                                                 |         | No       | The space between children, on the 4px scale (0 to 12), or `density` to follow the density token. |
| `align`     | `"start" \| "center" \| "end" \| "stretch" \| "baseline" \| undefined`                                                                       |         | No       |                                                                                                   |
| `justify`   | `"start" \| "center" \| "end" \| "between" \| "around" \| "evenly" \| undefined`                                                             |         | No       |                                                                                                   |
| `wrap`      | `boolean \| undefined`                                                                                                                       |         | No       |                                                                                                   |
| `divider`   | `ReactNode`                                                                                                                                  |         | No       | An element placed between children (never before the first or after the last).                    |
| `as`        | `"div" \| "section" \| "article" \| "aside" \| "nav" \| "header" \| "footer" \| "main" \| "ul" \| "ol" \| "form" \| "fieldset" \| undefined` |         | No       | The element to render. Default `div`.                                                             |
| `children`  | `ReactNode`                                                                                                                                  |         | No       |                                                                                                   |

| Prop           | Type                                                                                                                                                        | Default | Required | Description                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `cols`         | `6 \| 1 \| 2 \| 3 \| 4 \| 5 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| Partial<Record<"base" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl", ColumnCount>> \| undefined` |         | No       | Column count, or one per breakpoint: `{ base: 1, md: 3 }`. Default 1.                                                               |
| `minItemWidth` | `string`                                                                                                                                                    |         | No       | Fill the row with as many columns as fit, each at least this wide (`"16rem"`), instead of a fixed count. Takes the place of `cols`. |
| `gap`          | `0 \| 6 \| 1 \| 2 \| 3 \| 4 \| 5 \| 8 \| 10 \| 12 \| "density" \| undefined`                                                                                |         | No       |                                                                                                                                     |
| `align`        | `"start" \| "center" \| "end" \| "stretch" \| "baseline" \| undefined`                                                                                      |         | No       | Vertical alignment of items within their cell.                                                                                      |
| `justify`      | `"start" \| "center" \| "end" \| "stretch" \| undefined`                                                                                                    |         | No       | Horizontal alignment of items within their cell.                                                                                    |
| `as`           | `"div" \| "section" \| "article" \| "aside" \| "nav" \| "header" \| "footer" \| "main" \| "ul" \| "ol" \| "form" \| "fieldset" \| undefined`                |         | No       |                                                                                                                                     |
| `children`     | `ReactNode`                                                                                                                                                 |         | No       |                                                                                                                                     |

## Accessibility

- Layout components render no roles of their own; pass `as` for a landmark (`main`, `nav`, `aside`, `header`, `footer`, `section`) so the page has a real structure.
- Source order is the reading and tab order: do not rely on a grid to reorder content visually.
- A horizontal `Separator` is announced as a separator; mark it `decorative` when the content either side already reads as separate.
