# Design tokens

> Every design token in @azmr/ui, with its light and dark values, the Tailwind utilities that use it, and the contrast it is tested against.

Source: https://platform.azmara.io/docs/guide/tokens

Every colour, radius, motion, elevation, layering and density value in `@azmr/ui` is a CSS custom property declared in `@azmr/ui/tokens.css`. This page is generated from that file when the docs are built, so it cannot drift from it.

In the colour tables the swatch shows the light value on the left and the dark value on the right. Colours are OKLCH. The names follow shadcn/ui, so components from any shadcn registry fit alongside ours.

To change a token, override it in your own CSS after the import, for any scope:

```css
:root {
  --primary: oklch(0.55 0.2 260);
}

.dark {
  --primary: oklch(0.75 0.15 260);
}
```

## Shape

| Token      | Value      | Tailwind                                               | Notes |
| ---------- | ---------- | ------------------------------------------------------ | ----- |
| `--radius` | `0.625rem` | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` |       |

## Surfaces

|   | Token                  | Light                | Dark                  | Tailwind                  |
| - | ---------------------- | -------------------- | --------------------- | ------------------------- |
|   | `--background`         | `oklch(1 0 0)`       | `oklch(0.145 0 0)`    | `bg-background`           |
|   | `--foreground`         | `oklch(0.145 0 0)`   | `oklch(0.985 0 0)`    | `text-foreground`         |
|   | `--card`               | `oklch(1 0 0)`       | `oklch(0.205 0 0)`    | `bg-card`                 |
|   | `--card-foreground`    | `oklch(0.145 0 0)`   | `oklch(0.985 0 0)`    | `text-card-foreground`    |
|   | `--popover`            | `oklch(1 0 0)`       | `oklch(0.205 0 0)`    | `bg-popover`              |
|   | `--popover-foreground` | `oklch(0.145 0 0)`   | `oklch(0.985 0 0)`    | `text-popover-foreground` |
|   | `--scrim`              | `oklch(0 0 0 / 0.5)` | `oklch(0 0 0 / 0.65)` | `bg-scrim`                |

## Brand and neutrals

|   | Token                    | Light              | Dark               | Tailwind                    |
| - | ------------------------ | ------------------ | ------------------ | --------------------------- |
|   | `--primary`              | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | `bg-primary`                |
|   | `--primary-foreground`   | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | `text-primary-foreground`   |
|   | `--secondary`            | `oklch(0.97 0 0)`  | `oklch(0.269 0 0)` | `bg-secondary`              |
|   | `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | `text-secondary-foreground` |
|   | `--muted`                | `oklch(0.97 0 0)`  | `oklch(0.269 0 0)` | `bg-muted`                  |
|   | `--muted-foreground`     | `oklch(0.5 0 0)`   | `oklch(0.72 0 0)`  | `text-muted-foreground`     |
|   | `--accent`               | `oklch(0.97 0 0)`  | `oklch(0.269 0 0)` | `bg-accent`                 |
|   | `--accent-foreground`    | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | `text-accent-foreground`    |

## Status

Destructive is shadcn's; success / warning / info are ours.

|   | Token                      | Light                  | Dark                   | Tailwind                      |
| - | -------------------------- | ---------------------- | ---------------------- | ----------------------------- |
|   | `--destructive`            | `oklch(0.53 0.22 27)`  | `oklch(0.65 0.2 22)`   | `bg-destructive`              |
|   | `--destructive-foreground` | `oklch(0.985 0 0)`     | `oklch(0.145 0 0)`     | `text-destructive-foreground` |
|   | `--success`                | `oklch(0.46 0.13 150)` | `oklch(0.72 0.17 150)` | `bg-success`                  |
|   | `--success-foreground`     | `oklch(0.985 0 0)`     | `oklch(0.145 0 0)`     | `text-success-foreground`     |
|   | `--warning`                | `oklch(0.78 0.16 80)`  | `oklch(0.82 0.16 82)`  | `bg-warning`                  |
|   | `--warning-foreground`     | `oklch(0.25 0.04 70)`  | `oklch(0.25 0.04 70)`  | `text-warning-foreground`     |
|   | `--warning-text`           | `oklch(0.5 0.1 75)`    | `oklch(0.82 0.16 82)`  | `text-warning-text`           |
|   | `--info`                   | `oklch(0.5 0.18 255)`  | `oklch(0.72 0.13 245)` | `bg-info`                     |
|   | `--info-foreground`        | `oklch(0.985 0 0)`     | `oklch(0.145 0 0)`     | `text-info-foreground`        |

## Lines and focus

`--ring` keeps >= 3:1 against every surface (WCAG 2.2).

|   | Token      | Light                  | Dark                   | Tailwind        |
| - | ---------- | ---------------------- | ---------------------- | --------------- |
|   | `--border` | `oklch(0.922 0 0)`     | `oklch(1 0 0 / 12%)`   | `border-border` |
|   | `--input`  | `oklch(0.922 0 0)`     | `oklch(1 0 0 / 16%)`   | `border-input`  |
|   | `--ring`   | `oklch(0.55 0.15 255)` | `oklch(0.72 0.12 255)` | `ring-ring`     |

## Sidebar

|   | Token                          | Light                  | Dark                   | Tailwind                          |
| - | ------------------------------ | ---------------------- | ---------------------- | --------------------------------- |
|   | `--sidebar`                    | `oklch(0.985 0 0)`     | `oklch(0.205 0 0)`     | `bg-sidebar`                      |
|   | `--sidebar-foreground`         | `oklch(0.145 0 0)`     | `oklch(0.985 0 0)`     | `text-sidebar-foreground`         |
|   | `--sidebar-primary`            | `oklch(0.205 0 0)`     | `oklch(0.922 0 0)`     | `bg-sidebar-primary`              |
|   | `--sidebar-primary-foreground` | `oklch(0.985 0 0)`     | `oklch(0.205 0 0)`     | `text-sidebar-primary-foreground` |
|   | `--sidebar-accent`             | `oklch(0.97 0 0)`      | `oklch(0.269 0 0)`     | `bg-sidebar-accent`               |
|   | `--sidebar-accent-foreground`  | `oklch(0.205 0 0)`     | `oklch(0.985 0 0)`     | `text-sidebar-accent-foreground`  |
|   | `--sidebar-border`             | `oklch(0.922 0 0)`     | `oklch(1 0 0 / 12%)`   | `border-sidebar-border`           |
|   | `--sidebar-ring`               | `oklch(0.55 0.15 255)` | `oklch(0.72 0.12 255)` | `ring-sidebar-ring`               |

## Categorical chart palette

8 series), tuned for contrast and colour-vision deficiency. Found with a constrained search (>= 3.2:1 on surfaces, inside sRGB, maximising the worst pairwise CIEDE2000 under normal, protan, deutan and tritan vision); tokens.test.ts holds the thresholds.

|   | Token       | Light                   | Dark                    | Tailwind     |
| - | ----------- | ----------------------- | ----------------------- | ------------ |
|   | `--chart-1` | `oklch(0.52 0.19 266)`  | `oklch(0.69 0.165 273)` | `bg-chart-1` |
|   | `--chart-2` | `oklch(0.64 0.105 45)`  | `oklch(0.8 0.17 73)`    | `bg-chart-2` |
|   | `--chart-3` | `oklch(0.58 0.062 173)` | `oklch(0.64 0.152 158)` | `bg-chart-3` |
|   | `--chart-4` | `oklch(0.5 0.189 339)`  | `oklch(0.63 0.16 336)`  | `bg-chart-4` |
|   | `--chart-5` | `oklch(0.64 0.124 231)` | `oklch(0.86 0.12 204)`  | `bg-chart-5` |
|   | `--chart-6` | `oklch(0.64 0.138 107)` | `oklch(0.86 0.104 114)` | `bg-chart-6` |
|   | `--chart-7` | `oklch(0.5 0.19 22)`    | `oklch(0.65 0.165 35)`  | `bg-chart-7` |
|   | `--chart-8` | `oklch(0.46 0 0)`       | `oklch(0.7 0 0)`        | `bg-chart-8` |

## Motion

| Token                       | Value                             | Tailwind          | Reduced motion | Notes                                                                                      |
| --------------------------- | --------------------------------- | ----------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `--motion-duration-instant` | `75ms`                            |                   | `0.01ms`       |                                                                                            |
| `--motion-duration-fast`    | `150ms`                           |                   | `0.01ms`       |                                                                                            |
| `--motion-duration-base`    | `200ms`                           |                   | `0.01ms`       |                                                                                            |
| `--motion-duration-slow`    | `300ms`                           |                   | `0.01ms`       |                                                                                            |
| `--motion-ease-standard`    | `cubic-bezier(0.2, 0, 0, 1)`      | `ease-standard`   |                |                                                                                            |
| `--motion-ease-emphasized`  | `cubic-bezier(0.05, 0.7, 0.1, 1)` | `ease-emphasized` |                |                                                                                            |
| `--motion-ease-decelerate`  | `cubic-bezier(0, 0, 0, 1)`        | `ease-decelerate` |                |                                                                                            |
| `--motion-ease-accelerate`  | `cubic-bezier(0.3, 0, 1, 1)`      | `ease-accelerate` |                |                                                                                            |
| `--motion-stagger-step`     | `40ms`                            |                   | `0ms`          | Delay between items of a staggered list, and the loop length of ambient effects (shimmer). |
| `--motion-duration-ambient` | `1500ms`                          |                   | `0.01ms`       |                                                                                            |

## Typography

`createTheme({ font })` overrides `--font-sans-stack`.

| Token               | Value                                                                                              | Tailwind    | Notes |
| ------------------- | -------------------------------------------------------------------------------------------------- | ----------- | ----- |
| `--font-sans-stack` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `font-sans` |       |

## Elevation

|   | Token           | Value                                                                       | Tailwind             | Notes |
| - | --------------- | --------------------------------------------------------------------------- | -------------------- | ----- |
|   | `--elevation-1` | `0 1px 2px 0 oklch(0 0 0 / 0.08)`                                           | `shadow-elevation-1` |       |
|   | `--elevation-2` | `0 2px 6px -1px oklch(0 0 0 / 0.12), 0 1px 3px 0 oklch(0 0 0 / 0.08)`       | `shadow-elevation-2` |       |
|   | `--elevation-3` | `0 8px 16px -4px oklch(0 0 0 / 0.16), 0 2px 6px -2px oklch(0 0 0 / 0.1)`    | `shadow-elevation-3` |       |
|   | `--elevation-4` | `0 20px 32px -8px oklch(0 0 0 / 0.24), 0 8px 12px -4px oklch(0 0 0 / 0.12)` | `shadow-elevation-4` |       |

## Layering

| Token          | Value  | Tailwind | Notes |
| -------------- | ------ | -------- | ----- |
| `--z-dropdown` | `1000` |          |       |
| `--z-sticky`   | `1100` |          |       |
| `--z-overlay`  | `1300` |          |       |
| `--z-modal`    | `1400` |          |       |
| `--z-popover`  | `1500` |          |       |
| `--z-toast`    | `1700` |          |       |
| `--z-tooltip`  | `1800` |          |       |

## Density

Comfortable by default.

| Token                         | Value     | Tailwind | Notes |
| ----------------------------- | --------- | -------- | ----- |
| `--density-control-height`    | `2.25rem` |          |       |
| `--density-control-padding-x` | `0.75rem` |          |       |
| `--density-gap`               | `0.5rem`  |          |       |
| `--density-row-height`        | `2.75rem` |          |       |

### Density levels

Set `data-density="compact"` or `data-density="spacious"` on any element to change the density of everything inside it.

| Token                         | Compact    | Comfortable (default) | Spacious  |
| ----------------------------- | ---------- | --------------------- | --------- |
| `--density-control-height`    | `2rem`     | `2.25rem`             | `2.75rem` |
| `--density-control-padding-x` | `0.625rem` | `0.75rem`             | `1rem`    |
| `--density-gap`               | `0.375rem` | `0.5rem`              | `0.75rem` |
| `--density-row-height`        | `2.25rem`  | `2.75rem`             | `3.25rem` |

## Contrast the tests guarantee

The values below are computed from the tokens above with the WCAG 2.x contrast formula. The package's own tests fail if any of them drops below its threshold, so a token change cannot make a component unreadable without a test failing.

### Text on its surface (4.5:1)

| Foreground                     | On                  | Light          | Dark           |
| ------------------------------ | ------------------- | -------------- | -------------- |
| `--foreground`                 | `--background`      | 19.79:1 (pass) | 18.96:1 (pass) |
| `--card-foreground`            | `--card`            | 19.79:1 (pass) | 17.16:1 (pass) |
| `--popover-foreground`         | `--popover`         | 19.79:1 (pass) | 17.16:1 (pass) |
| `--primary-foreground`         | `--primary`         | 17.16:1 (pass) | 14.22:1 (pass) |
| `--secondary-foreground`       | `--secondary`       | 16.42:1 (pass) | 14.48:1 (pass) |
| `--muted-foreground`           | `--muted`           | 5.50:1 (pass)  | 6.09:1 (pass)  |
| `--accent-foreground`          | `--accent`          | 16.42:1 (pass) | 14.48:1 (pass) |
| `--destructive-foreground`     | `--destructive`     | 5.67:1 (pass)  | 5.56:1 (pass)  |
| `--success-foreground`         | `--success`         | 6.43:1 (pass)  | 8.54:1 (pass)  |
| `--warning-foreground`         | `--warning`         | 7.90:1 (pass)  | 9.09:1 (pass)  |
| `--info-foreground`            | `--info`            | 5.86:1 (pass)  | 8.07:1 (pass)  |
| `--sidebar-foreground`         | `--sidebar`         | 18.96:1 (pass) | 17.16:1 (pass) |
| `--sidebar-primary-foreground` | `--sidebar-primary` | 17.16:1 (pass) | 14.22:1 (pass) |
| `--sidebar-accent-foreground`  | `--sidebar-accent`  | 16.42:1 (pass) | 14.48:1 (pass) |
| `--muted-foreground`           | `--background`      | 6.00:1 (pass)  | 7.98:1 (pass)  |

### Status colours as text on the page and on cards (4.5:1)

`--warning` is a yellow surface colour, so text in the warning tone uses `--warning-text`.

| Foreground       | On             | Light         | Dark           |
| ---------------- | -------------- | ------------- | -------------- |
| `--destructive`  | `--background` | 5.92:1 (pass) | 5.56:1 (pass)  |
| `--destructive`  | `--card`       | 5.92:1 (pass) | 5.03:1 (pass)  |
| `--success`      | `--background` | 6.71:1 (pass) | 8.54:1 (pass)  |
| `--success`      | `--card`       | 6.71:1 (pass) | 7.72:1 (pass)  |
| `--warning-text` | `--background` | 6.11:1 (pass) | 11.18:1 (pass) |
| `--warning-text` | `--card`       | 6.11:1 (pass) | 10.12:1 (pass) |
| `--info`         | `--background` | 6.12:1 (pass) | 8.07:1 (pass)  |
| `--info`         | `--card`       | 6.12:1 (pass) | 7.30:1 (pass)  |

### Focus ring (3:1)

| Foreground | On             | Light         | Dark          |
| ---------- | -------------- | ------------- | ------------- |
| `--ring`   | `--background` | 4.89:1 (pass) | 7.98:1 (pass) |
| `--ring`   | `--card`       | 4.89:1 (pass) | 7.22:1 (pass) |
| `--ring`   | `--popover`    | 4.89:1 (pass) | 7.22:1 (pass) |

### Chart series on the page and on cards (3:1)

The eight chart colours are also tested to stay distinguishable from each other under normal vision, protanopia, deuteranopia and tritanopia.

| Foreground  | On             | Light         | Dark           |
| ----------- | -------------- | ------------- | -------------- |
| `--chart-1` | `--background` | 5.76:1 (pass) | 6.91:1 (pass)  |
| `--chart-1` | `--card`       | 5.76:1 (pass) | 6.26:1 (pass)  |
| `--chart-2` | `--background` | 3.49:1 (pass) | 10.31:1 (pass) |
| `--chart-2` | `--card`       | 3.49:1 (pass) | 9.33:1 (pass)  |
| `--chart-3` | `--background` | 4.15:1 (pass) | 6.31:1 (pass)  |
| `--chart-3` | `--card`       | 4.15:1 (pass) | 5.71:1 (pass)  |
| `--chart-4` | `--background` | 6.68:1 (pass) | 5.21:1 (pass)  |
| `--chart-4` | `--card`       | 6.68:1 (pass) | 4.71:1 (pass)  |
| `--chart-5` | `--background` | 3.28:1 (pass) | 13.48:1 (pass) |
| `--chart-5` | `--card`       | 3.28:1 (pass) | 12.20:1 (pass) |
| `--chart-6` | `--background` | 3.31:1 (pass) | 13.16:1 (pass) |
| `--chart-6` | `--card`       | 3.31:1 (pass) | 11.91:1 (pass) |
| `--chart-7` | `--background` | 6.64:1 (pass) | 5.70:1 (pass)  |
| `--chart-7` | `--card`       | 6.64:1 (pass) | 5.16:1 (pass)  |
| `--chart-8` | `--background` | 7.13:1 (pass) | 7.41:1 (pass)  |
| `--chart-8` | `--card`       | 7.13:1 (pass) | 6.70:1 (pass)  |
