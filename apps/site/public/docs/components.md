# Components

> The @azmr/ui component library, built on Base UI primitives and the Azmara design tokens.

Source: https://platform.azmara.io/docs/components

`@azmr/ui` is a component library for React 18 and 19, built on [Base UI](https://base-ui.com) primitives, styled with Tailwind v4 and a small set of design tokens. Every component page has live demos you can preview in light and dark and at each density, the source of each demo, a props table generated from the TypeScript types, and an accessibility section with the keyboard map.

> **Using Vue, Svelte or another framework?**
>
> The components are React-only today. These parts have no React dependency:
> [`@azmr/core`](https://platform.azmara.io/docs/packages/core.md) (signals), [`@azmr/query`](https://platform.azmara.io/docs/packages/query.md),
> [`@azmr/security`](https://platform.azmara.io/docs/packages/security.md), the database packages
> ([`@azmr/db`](https://platform.azmara.io/docs/packages/db.md) and
> [`@azmr/db-core-interface`](https://platform.azmara.io/docs/packages/db-core-interface.md)), and the design tokens in
> `@azmr/ui/tokens.css`, which are plain CSS for any Tailwind v4 project.

## All components

Grouped by purpose. Each badge shows the component's maturity: stable, new or beta.

### Layout

- [Layout](https://platform.azmara.io/docs/components/layout.md): Stack, Grid with a responsive column count, Container, Separator and AspectRatio. All Server Components.
- [ScrollArea](https://platform.azmara.io/docs/components/scroll-area.md): A scrollable region with token-styled scrollbars that is keyboard-focusable and named. Built on Base UI.

### Inputs

- [Button](https://platform.azmara.io/docs/components/button.md): Triggers an action. Six variants, density-aware sizes, a loading state that keeps keyboard focus, and an icon-only form the types force you to name.
- [SplitButton](https://platform.azmara.io/docs/components/split-button.md): A primary action with a menu of related actions attached. Button plus DropdownMenu.
- [Input](https://platform.azmara.io/docs/components/input.md): A text input whose ref is the real input element, so react-hook-form works without a Controller.
- [Toggle](https://platform.azmara.io/docs/components/toggle.md): Toggle and ToggleGroup. A button that stays pressed, and a group of them that acts as one control with arrow-key navigation. Built on Base UI.

### Data display

- [Display](https://platform.azmara.io/docs/components/display.md): Card, Badge, Alert, Skeleton and EmptyState. Server Components with status colours checked for contrast in both themes.
- [Table](https://platform.azmara.io/docs/components/table.md): A semantic, non-interactive table with a caption, sticky header, striping and a named scroll region. Server-safe.
- [Avatar](https://platform.azmara.io/docs/components/avatar.md): A person or entity as an image with initials as the fallback, plus a group with a labelled overflow count. Built on Base UI.
- [Typography](https://platform.azmara.io/docs/components/typography.md): A type scale where the variant picks the semantic element, with Heading, Text, Link, Code and Kbd. All Server Components.
- [Icon](https://platform.azmara.io/docs/components/icon.md): Renders Lucide, Tabler or your own SVG with consistent size, stroke, motion and accessibility. A Server Component.
- [Disclosure](https://platform.azmara.io/docs/components/disclosure.md): Accordion, Collapsible and Tabs. Show and hide content with the keyboard maps users expect. Built on Base UI.

### Feedback

- [Progress](https://platform.azmara.io/docs/components/progress.md): A linear or circular progress indicator with a required name, a determinate and an indeterminate state, and tones that stay visible against the track.
- [Spinner](https://platform.azmara.io/docs/components/spinner.md): An indeterminate progress indicator that is a Server Component and keeps spinning under reduced motion.
- [Toast](https://platform.azmara.io/docs/components/toast.md): Short notifications raised from anywhere with toast.success(), toast.error() and toast.promise(). Stacked, pausable, swipeable and announced to screen readers. Built on Base UI.

### Overlays

- [Floating](https://platform.azmara.io/docs/components/floating.md): Tooltip, Popover and HoverCard. Surfaces anchored to a trigger, collision-aware, portalled, and animated with the motion tokens. Built on Base UI.
- [Modal](https://platform.azmara.io/docs/components/modal.md): Dialog, AlertDialog and Drawer. Surfaces that take over the screen, with a focus trap, an inert page, scroll lock and focus return. Built on Base UI.
- [Menu](https://platform.azmara.io/docs/components/menu.md): DropdownMenu and ContextMenu. Menus of actions with items, checkbox and radio items, groups and submenus. Built on Base UI.

### Navigation

- [Breadcrumb](https://platform.azmara.io/docs/components/breadcrumb.md): A trail showing where you are and the way back up. Built from parts or from data, collapsible, router-friendly. Server-safe.
- [Pagination](https://platform.azmara.io/docs/components/pagination.md): A page control that is real links on the server or buttons for client state, with a stable-width page range the data grid reuses. Server-safe.
- [Stepper](https://platform.azmara.io/docs/components/stepper.md): Shows where someone is in a fixed sequence of steps. A status display with each state said in text, horizontal or vertical. Server-safe.

### Utils

- [Motion](https://platform.azmara.io/docs/components/motion.md): CSS-first motion presets driven by tokens, a Collapse that never measures height, a count-up, a ViewTransition wrapper, useReducedMotion and an optional module for the motion library. Reduced motion is built in. (new)

## Set up

```css
/* global.css */
@import "tailwindcss";
@import "@azmr/ui/styles.css";
```

Use `@azmr/ui/tokens.css` instead if the app already has global styles. See the [package page](https://platform.azmara.io/docs/packages/ui.md) for the tokens, theming and locale.

## Or copy the source with the shadcn CLI

If you would rather own the code than import a package, the same components are published to a shadcn-compatible registry. Add the namespace to your `components.json`:

```json
{
  "registries": {
    "@azmr": "https://platform.azmara.io/r/{name}.json"
  }
}
```

Then, in a project that has run `npx shadcn@latest init`:

```bash
npx shadcn@latest add @azmr/button
```

This copies `button.tsx` and the components it needs (`spinner.tsx`) into `components/ui`, installs `@base-ui/react` and `class-variance-authority`, and adds a small `tokens` item to your `globals.css`: density, motion and elevation tokens, plus colours a standard shadcn setup lacks (`--destructive-foreground`, `--success`, `--warning`, `--info`). It never changes the tokens you already have, so your palette stays yours. The copied source is generated from the package source with only the import paths rewritten, so it behaves identically. Available now: `button`, `spinner`, `tokens`; more arrive with each component.

## What every component guarantees

- **Tokens only.** No raw colours; a test enforces it, so a theme change reaches every component.
- **Accessible by default.** Each component is tested with axe, by keyboard, and under reduced motion.
- **Server-safe where it can be.** Stateless components such as `Spinner` and `Icon` are Server Components; the rest carry `"use client"` on their own entry only.
- **Tree-shakeable, with budgets.** Each entry has a size budget checked in CI.
- **`className` merges last,** and `ref` is the real DOM element.
