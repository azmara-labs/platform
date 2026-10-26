# Changelog

## 0.4.1

### Patch Changes

- ea59e9b: Package metadata: `homepage` now points at each package's page on platform.azmara.io (docs.azmara.io never resolved), `bugs` links to the GitHub issues, and README doc links follow. `@azmr/ui` gets a description that matches the design system it now is.

## 0.4.0

### Minor Changes

- d756ee0: Make the server-safe entries truly server-safe. lucide-react 1.x's icons are client components, so `@azmr/ui/display`, `@azmr/ui/stepper`, `@azmr/ui/breadcrumb`, `@azmr/ui/pagination` and `@azmr/ui/icons/lucide` sent Lucide's runtime (about 44 kB before compression) to every page that used them, even from a Server Component.

  - Built-in icons are now glyphs: plain SVG rendered on the server from the `lucide` package's shape data, with exactly the markup lucide-react renders (attributes, `lucide lucide-<name>` classes and alias classes, `aria-hidden`), tested against lucide-react for every icon. The client components (menu, modal, toast, accordion, split button) use them too.
  - `lucideIcons` and the named `Icon` from `@azmr/ui/icons/lucide` now hold these glyphs. They take the same props as lucide-react's icons (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`), but their TypeScript type is `Glyph` rather than `LucideIcon`.
  - `lucide` becomes a dependency (shape data only, no React). `lucide-react` stays a dependency and is upgraded to 1.59.0.
  - The build now fails if a server-safe entry imports `lucide-react`, and the consumer check builds a Next.js page from every server-safe entry and fails if its client manifest gains anything from `@azmr/ui` or Lucide.

## 0.3.0

### Minor Changes

- d7d6b2b: Add `@azmr/ui/motion`, an optional module for the `motion` library. `MotionProvider` sets up `LazyMotion` (the animation features load on demand, `dom` by default or `max` for layout animation, drag and reorder) and `MotionConfig reducedMotion="user"`, and is strict by default so the full `motion` component cannot be pulled into your bundle by accident. The module re-exports `m`, `AnimatePresence`, `Reorder`, `animate`, `useAnimate`, `useInView`, `useMotionValue`, `useSpring`, `useTransform` and `useDragControls`, and adds `springs` (`gentle`, `snappy`, `bouncy`).

  `motion` is an optional peer dependency (`^14.0.0`, tested against 14.2.0): installing `@azmr/ui` does not install it, and nothing outside this module imports it. The wrapper is about 0.5 kB.

## 0.2.0

### Minor Changes

- 7edd869: Add the button family. `@azmr/ui/button` gains `IconButton` (a required `label` is its accessible name, type-enforced) and `ButtonGroup` (a named, joined group). New entries: `@azmr/ui/toggle` (`Toggle`, `ToggleGroup`: single or multiple selection, roving keyboard) and `@azmr/ui/split-button` (`SplitButton`: a primary action plus a menu of related ones).
- 3efa36a: Add `Button`, `Input` and `Spinner`, built on Base UI primitives, the design tokens and CVA variants.

  - `Button`: variants `default | secondary | outline | ghost | destructive | link`, sizes `sm | md | lg | icon`, `loading` / `loadingText` / `startIcon` / `endIcon`, `type="button"` by default, `render` for links. A loading button ignores activation but stays focusable. Icon-only buttons are type-checked to require `aria-label` or `aria-labelledby`.
  - `Input`: `ref` is the real `<input>`, so `react-hook-form`'s `register()` works with no `Controller`; native `onChange` and typed `onValueChange`; density-token height and padding; full-strength focus ring.
  - `Spinner`: decorative by default or a labelled status; stays animated under reduced motion.
  - New subpaths `@azmr/ui/button`, `@azmr/ui/input`, `@azmr/ui/spinner` (client entries) and root exports for all three, plus `buttonVariants`.
  - `@base-ui/react` and `class-variance-authority` become dependencies. Tree-shaking is budget-tested: importing only `useSignal` from the root costs 0.1 kB.

- 4b117dc: Add the `@azmr/ui/styles.css` design tokens and Tailwind v4 theme mapping.

  - shadcn-compatible token names (`--background`, `--primary`, `--ring`, `--radius`, `--sidebar-*`) plus `--success`, `--warning`, `--info`, `--chart-1..8`, `--motion-*`, `--elevation-*`, `--z-*` and `--density-*`.
  - OKLCH colours with `light-dark()`: follows the system by default, or force a mode with `.dark` / `.light` / `data-theme`. No JavaScript, no flash.
  - Density via `data-density="compact|spacious"`; reduced motion collapses the motion tokens and adds a safety net (spare essential motion with `data-motion="essential"`).
  - Verified by tests: WCAG AA contrast for every token pair in both modes, 3:1 for the focus ring and chart colours, chart colours distinguishable under protan/deutan/tritan simulation, and the real Tailwind v4 compiler generating every utility.
  - `package.json` now exports `./styles.css` and marks only CSS as side-effectful (`sideEffects: ["**/*.css"]`).

- 0fb248b: Add `@azmr/ui/disclosure`: `Accordion`, `Collapsible` and `Tabs` (horizontal and vertical), built on Base UI with token styling, heading-wrapped accordion triggers, full keyboard maps (including accordion arrow navigation, which Base UI 1.9 does not implement) and height animation that follows the motion tokens. Add `useUrlTab` to `@azmr/ui/hooks`, which keeps the selected tab in a search parameter and ignores any value not in the allowed list.
- fe55409: Add `Progress`, `Avatar`, `AvatarGroup` and `Chip`.

  - `@azmr/ui/progress`: linear and circular, determinate and indeterminate (`value={null}`), with `min`/`max`, tones, `showValue` and a required accessible name. An indeterminate indicator is partial and pulses, and keeps pulsing under reduced motion (a still full bar would read as complete). Tone colours are tested for 3:1 against the track and the page in both themes; the `warning` tone uses `--warning-text`.
  - `@azmr/ui/avatar`: an image with initials as the fallback when it is missing or fails to load, sizes and shapes, a required name, `alt` or `decorative`, `getInitials` (whole characters, never half a surrogate pair), and `AvatarGroup` with a labelled `+N` overflow.
  - `Chip` (in `@azmr/ui/display`, a Server Component): a removable Badge with an accessible remove button.

- fed8637: Add the display components (`@azmr/ui/display`), all Server Components: `Card` (with Header, Title, Description, Content, Footer), `Badge` (default, secondary, outline and the status variants), `Alert` (info, success, warning, destructive; assertive `role="alert"` for problems and polite `role="status"` otherwise, a default icon per variant, optional labelled dismiss button), `Skeleton` (decorative, pulses, stilled by the reduced-motion rule) and `EmptyState`. The status colours are checked for contrast on the blended tint surface in light and dark, over both the page and a card, from the component class names; this found and fixed a destructive badge at 4.26:1.
- 6a86517: Add `@azmr/ui/floating`: `Tooltip` (with `TooltipProvider` and the shared `TOOLTIP_DELAY_MS`), `Popover` and `HoverCard`. Collision-aware, portalled above overlays, capped to the available space, and animated with the motion tokens. The tooltip adds `role="tooltip"` and `aria-describedby` on its trigger while open, which Base UI 1.9 omits.
- 2799969: Foundation for the `@azmr/ui` redesign (see `docs/superpowers/specs/2026-10-15-azmr-ui-design.md`).

  - **`@azmr/core` is now a peer dependency** (`>=0.0.2 <1.0.0`) instead of an exact-pinned dependency. Two copies of core give separate scheduler/tracking state and incompatible `Signal` types, so the app's own copy must be the one `@azmr/ui` uses. If you already followed the README and installed both packages, nothing changes; otherwise add `@azmr/core` to your dependencies.
  - **New entry points:** `@azmr/ui/hooks` (client) and `@azmr/ui/lib` (server-safe, exports `cn`). `cn()` is also exported from the package root.
  - **`"use client"` is now emitted** on the client entries (`@azmr/ui` and `@azmr/ui/hooks`), so they can be imported from Next.js App Router Server Components' client boundaries without wrapping. `@azmr/ui/lib` has no directive and can be imported from Server Components.
  - **`useSignal` no longer resubscribes on every render.** `subscribe` and `getSnapshot` are memoised on the signal; passing a different signal resubscribes once. Also verified against `computed()` signals.
  - The build now verifies its own output (`scripts/verify-dist.mjs`): directives per entry, type declarations present, and the `exports` map matching the build entries.

- eb89693: Add the icon system.

  - `@azmr/ui/icons`: `Icon` renders any icon component (Lucide, Tabler or your own SVG) with size tokens (`xs`..`xl` or a number), `strokeWidth`, `spin` and accessibility (decorative by default; `aria-label` / `aria-labelledby` make it a labelled image). It is a Server Component. `createIconSet()` builds a typed `<Icon name>` for a fixed set, and `registerIcons()` registers custom SVGs by name. An unknown name renders nothing and warns once in development.
  - `@azmr/ui/icons/lucide`: a curated set of about 60 Lucide icons by name, with Lucide's own kebab-case names.
  - `@azmr/ui/icons/mui-map`: migration data mapping over 300 `@mui/icons-material` icons (variants and the legacy `Outline` spelling resolved) to Lucide and Tabler, validated in tests against the real packages, with the deliberately unmapped common names listed.
  - `Spinner` is now a Server Component (no `"use client"`), so it can be used in `loading.tsx` and Suspense fallbacks.
  - `lucide-react` becomes a dependency. `react-icons` is deliberately not bundled.
  - The build gains a `serverComponents` entry kind: `verify-dist` now allows stateless React (no hooks, no context) in server entries and follows imports through nested shared chunks.

- 04f06eb: Add the layout components (`@azmr/ui/layout`), all Server Components: `Stack` (responsive direction, gap on the 4px scale or the density token, align, justify, wrap, dividers between children), `Grid` and `GridItem` (CSS grid with a responsive 1 to 12 column count, spans per breakpoint, and `minItemWidth` for an auto-fit grid), `Container`, `Separator` (a real `hr`, a labelled vertical separator, or decorative) and `AspectRatio`. They replace MUI `Box`, `Stack`, `Grid` and `Container`. `@azmr/ui/layout/mui-map` is data and helpers for the migration codemod (spacing to gap, breakpoints, Container `maxWidth`, Grid item props), returning `undefined` or `unsupported` for what has no equivalent. Inputs that reach a style attribute (`minItemWidth`, `ratio`) are validated. The responsive class tables are generated and checked for drift so Tailwind always sees the class names.
- 6825a0f: Add `@azmr/ui/menu`: `DropdownMenu` and `ContextMenu` with items, link, checkbox and radio items, groups, separators, shortcut hints and submenus. Menus sit on the popover layer so they appear above dialogs. Full WAI-ARIA keyboard map (open keys, arrows with wrap, Home and End, typeahead, submenu keys, Escape one level at a time).
- d2275af: Add `@azmr/ui/modal`: `Dialog` (sizes, stackable), `AlertDialog` (no outside dismissal, focus starts on Cancel) and `Drawer` (four edges, swipe to dismiss). All trap focus, make the page inert, lock scroll and return focus. Add the `--scrim` colour token (and the `bg-scrim` utility) for the dimming layer behind modal surfaces.
- 259c350: Add the motion system. `@azmr/ui/styles.css` now includes CSS presets (fade, scale, four slides, collapse, stagger, shimmer, check draw, a page cross-fade) driven by the motion tokens, with a reduced-motion rule for each; new tokens `--motion-stagger-step` and `--motion-duration-ambient`. New entries: `@azmr/ui/presets` (server-safe `Collapse`, which animates `grid-template-rows` and is inert while closed, `Stagger`, `AnimatedCheck`, and the typed `motionPresets` map) and `@azmr/ui/transition` (`Transition`, a feature-detecting wrapper for React's `ViewTransition` that is a no-op until your React has it, and `CountUp`). `useReducedMotion` is exported from `@azmr/ui/hooks`. `Skeleton` gains `shimmer`.
- 538a678: Add a shadcn-compatible registry (namespace `@azmr`, served at `https://platform.azmara.io/r/{name}.json`). `npx shadcn@latest add @azmr/button` copies `button.tsx` and `spinner.tsx` into the app, installs `@base-ui/react` and `class-variance-authority`, and adds a `tokens` item (density, motion, elevation and a few colours, never overriding the app's own palette) to `globals.css`. The registry source is generated from the package source with only import paths rewritten, and an unmapped relative import fails the build. The L2 primitive wrappers now re-export Base UI under its own names; the public API is unchanged. Registry files and fixtures are not published to npm.
- d707f33: Add `ScrollArea` (`@azmr/ui/scroll-area`), built on Base UI: a scrollable region with token-styled scrollbars that fade with the motion tokens (and stop animating under reduced motion). The viewport is a keyboard-focusable `role="region"`, so `aria-label` or `aria-labelledby` is required by the types. `orientation` (vertical, horizontal, both), `scrollbar` (`hover` or `always`), `keepMounted`, `viewportClassName` and `viewportRef`. Adds the `primitives/scroll-area` L2 wrapper.
- 63884e3: Add four server-safe components, each its own entry: `@azmr/ui/table` (a semantic `Table` with caption, header, footer, sticky header, striping, a named scroll region and `numeric` cells), `@azmr/ui/breadcrumb` (`Breadcrumb` parts and a data-driven `Breadcrumbs` with `maxItems` collapsing), `@azmr/ui/pagination` (`Pagination` as real links or buttons, plus the pure `getPageRange` the data grid can reuse) and `@azmr/ui/stepper` (a status `Stepper`, horizontal or vertical, with every state also said in text). `buttonVariants` now lives in a pure module so server components can use it.
- 630d373: Status colours in buttons and in `createTheme`.

  - `Button` gains `success`, `warning` and `info` variants (`destructive` was already the "danger" button).
  - `createTheme` now accepts `secondary`, `success`, `warning`, `info` and `destructive` alongside `primary`. Each is derived to be AA in both modes. Labels stay at least 4.5:1 on a solid button's **hover** surface, checked with the same gamma-space blend a browser uses (this also tightens `primary`: a brand colour that only just passed at rest could fall below 4.5:1 on hover). `success`, `info` and `destructive` are also readable as text on the page and on cards, and `warning` gets a readable `--warning-text`. Errors name the option that was wrong.
  - The default light `success` colour is slightly darker: its button label measured 4.46:1 on hover.
  - Hover contrast of every solid Button variant is now tested over the page and a card in both modes.

- f534058: Theme, density and locale support.

  - **`@azmr/ui/theme`** (server-safe, no React): `createTheme({ primary, radius, font, density })` turns a brand colour into token overrides with guaranteed WCAG AA (primary pair >= 4.5:1, focus ring >= 3:1, both modes); cookie helpers (`readCookie`, `serializeCookie`, `parseThemePreference`, `parseDensity`); `htmlAttributes` / `htmlAttributes.fromCookies(header)` to render `data-theme` and `data-density` on the server with no inline script; `createLocale` (en-NZ / NZD / Monday week start by default, cached `Intl` formatters, date-only strings never shift across time zones); `themeInitScript()` as an optional inline fallback for static sites.
  - **`@azmr/ui/react`** (client): `ThemeProvider` / `useTheme` (system tracking, cookie persistence, density) and `LocaleProvider` / `useLocale`.
  - `styles.css` gains a `--font-sans-stack` token mapped to Tailwind's `font-sans`.
  - Build and conventions: the verifier now fails if a server-safe entry can reach React (including through shared chunks), and a new `server-safe-no-react` convention enforces the same at source level.

- c835cbf: Add `@azmr/ui/toast`: a `Toaster` and an imperative `toast` API (`toast.success`, `error`, `info`, `warning`, `loading`, `promise`, `update`, `dismiss`). Toasts stack, dedupe by id, pause while hovered or focused, can be swiped away, take an action such as Undo, and are announced politely (errors urgently). Six positions, on the `--z-toast` layer.
- 12aef93: Add `@azmr/ui/tokens.css`: the design tokens, themes, density, motion and Tailwind mapping without the global base rules. `styles.css` is now `tokens.css` plus those rules (the `body` colours and the default border and outline colour), so existing imports render exactly as before. Use `tokens.css` in an app that already has global styles, such as one migrating from another UI library, or a docs site.
- 1cffcfd: Add `Typography`, `Heading`, `Text`, `Link`, `Code` and `Kbd` (`@azmr/ui/typography`), all Server Components.

  - `Typography`: a type scale (`h1` to `h6`, `lead`, `body`, `small`, `caption`, `overline`) where the variant picks the semantic element and the look, from colour tokens only. `as` overrides the element without changing the look; `align`, `noWrap` and `gutterBottom` match the MUI props.
  - `Heading` separates the semantic `level` from the visual `size`. `Text` has `size`, `tone` (muted, destructive, success, warning, info) and `weight`.
  - `Link` is underlined by default (not colour alone), has a full-strength focus ring, and `external` adds `target`, `rel="noopener noreferrer"` and a screen-reader hint. `as` renders a router link.
  - `@azmr/ui/typography/mui-map`: data mapping MUI Typography variants and props to ours, flagging the approximate ones, for the migration codemod.

### Patch Changes

- a5a2134: Fix `exports` condition order (`types` before `import`) and declare
  `"sideEffects": false` on `@azmr/core`, `@azmr/ui`, and `@azmr/security`
  (both the `.` and `./browser` conditions on `security`).

  The `types`-first order previously worked only because TypeScript falls
  back to the sibling `index.d.ts` when the condition order doesn't matter to
  it — bundlers with stricter `exports` resolution (e.g. Next.js's
  Turbopack/webpack) are not guaranteed to be as forgiving. `sideEffects:
false` lets bundlers tree-shake unused named exports out of consuming
  bundles; verified with an esbuild bundle of a single named import from
  `@azmr/security/browser` — no unrelated exports leak in.

  No public API change.

- 343204f: Fix scoped themes when the bundler lowers `light-dark()` (Next.js does, for older browser targets). Lowered tokens are resolved where they are declared and inherited, so a nested `data-theme="light"` inside a dark page, or `.dark` on a panel, had no effect on colours; only the root worked. `.light`, `.dark` and `data-theme` scopes now re-declare every colour token explicitly (a test keeps them identical to the `:root` values), so nesting works however the CSS is processed. Adds about 0.6 kB gzip to the stylesheet (budget now 4 kB). Also exports the `ButtonOwnProps` type and aligns the workspace on a single React version.
- ef12296: `useSignal` is now built on `useSyncExternalStore` instead of
  `useState` + `useEffect` + `Signal.subscribe`, the exact pattern
  `useSyncExternalStore` exists to replace. Under concurrent rendering, an
  update that lands between render and commit could previously produce a
  torn UI; `useSyncExternalStore` closes that window by re-checking the
  snapshot immediately after subscribing and forcing a synchronous re-render
  if it changed.

  `getSnapshot`/`getServerSnapshot` both read via `Signal.peek()` (which never
  registers a dependency), and the hook no longer depends on
  `Signal.subscribe()` firing immediately with the current value on
  subscribe — it deliberately doesn't; the snapshot is read independently, as
  `useSyncExternalStore`'s contract expects.

  New render tests (via `react-dom/client` + `React.act`, no new
  dependency — the package's existing `react`/`react-dom` devDependencies
  cover it) verify the hook actually renders correctly: initial value shown
  without waiting on subscribe, updates after mount reflected, and rapid
  sequential `set()` calls before the next flush don't leave a stale value.
  The previous test file had zero real render tests. A `test-setup.ts` sets
  `IS_REACT_ACT_ENVIRONMENT` for React 19's `act`.

  No public API change.

- 1cffcfd: Add a `--warning-text` token (and `text-warning-text`): a warning colour that is readable as text on the page and on cards in light and dark (the yellow `--warning` and the near-black `--warning-foreground` are surface colours, and the latter was unreadable as text on the dark theme). `Text tone="warning"` now uses it. Contrast of all four semantic tone colours as text on the background and card is now tested in both modes.

## 0.1.0

### Minor Changes

- d70fccb: Upgrade workspace dependencies across the monorepo (pnpm 10 -> 11 tooling
  migration): React 18.3 -> 19.2 (`@azmr/ui`), Zod 3.24 -> 4.4 (`@azmr/security`),
  better-sqlite3 11.7 -> 12.11 (`@azmr/db`), plus vitest, tsup, and `@types/node`
  bumped to latest across all packages. `typescript` stays pinned at `^5.7.3`
  (TypeScript 7 currently breaks `tsup`'s `.d.ts` bundling via
  `rollup-plugin-dts`).

### Patch Changes

- 5bf56bb: Fix package metadata: mojibake in the description field (encoding
  mismatch, was showing garbled text on npm) and a missing LICENSE file
  in the published tarball despite being listed in `files`.

  `@azmr/ai` got the same fixes plus missing `homepage`/`repository`/
  `author`/`keywords`, but isn't included in this changeset - it's on
  changesets' ignore list and doesn't take version bumps this way.

- Updated dependencies [5bf56bb]
- Updated dependencies [d70fccb]
  - @azmr/core@0.0.2

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-06-21

### Added

- Initial release of React UI components wired to reactive Signals
- XSS-safe Grid component
- useSignal hook for automatic re-renders
- Zero boilerplate reactive UI development
