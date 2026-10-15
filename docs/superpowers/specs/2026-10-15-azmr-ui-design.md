# @azmr/ui — Design Spec

- **Date:** 2026-10-15
- **Status:** Draft for review
- **Owner:** Alshafaraz Gazi
- **Package:** `@azmr/ui` (`packages/ui`, evolving the published 0.1.0)
- **Tracking:** Linear team PAZM, project `@azmr/ui` (supersedes PAZM-34: the scope decision is made, see D1)

## 1. Purpose and goals

`@azmr/ui` becomes the Azmara design system and component library: Tailwind CSS v4, accessible primitives (Base UI), built-in motion and icons, and a **dynamic layer** that renders forms, grids, CRUD pages, dashboards and charts from configuration. It replaces MUI, MUI X and Toolpad Core in Azmara-controlled apps and is shaped by two real consumers (section 2).

| # | Goal |
|---|---|
| G1 | One import path and one token system: consistent, themeable, dark mode included. |
| G2 | Accessible by default (WCAG 2.2 AA), keyboard-complete, reduced-motion aware. |
| G3 | Dynamic: CRUD pages, forms, grids and dashboards from configuration over a backend-agnostic `DataSource`. |
| G4 | Animation as a first-class, cheap, accessible feature. |
| G5 | A credible exit from MUI: coexistence, codemods, icon mapping. |
| G6 | Native integration with `@azmr/core` signals, `@azmr/policycore` / `@azmr/security` access control, and `@azmr/query`. |

### Non-goals for v1

- MUI X's paid grid features: column pinning, row grouping, aggregation, pivot, tree data (planned after v1, section 9).
- React Native, CSS-in-JS, a visual page builder, Storybook.

## 2. Consumers and success criteria

### 2.1 Pilot: `app_azmara.io`

Next.js 16, React 19.2 (moving to 19.3), Tailwind 4, shadcn (`radix-nova`), lucide-react, Sonner. After Phases 0 and 1 land, the pilot swaps its local shadcn/Radix components for `@azmr/ui` incrementally. Tokens use shadcn's names, so old and new components look identical while they coexist.

### 2.2 Consumer B: a large private enterprise PWA

Generic profile only; no project details live in this repository.

- About 520 source files and 80k lines, roughly half still JavaScript; React 19.3, Next.js 16, TypeScript 7.
- MUI 9.4 + MUI X 9.14 + Toolpad Core 0.16, held together by `patch-package` patches against Toolpad's Account, CRUD and DashboardLayout files.
- Heavy `sx` styling (1,000+ usages, ~300 theme-token reads) and 76 distinct MUI icons.
- Hand-built tables far outnumber `DataGrid` use; the grid is server-side (paging, sorting, inline edit, row actions, CSV/print, column visibility) and uses **no** paid MUI X features.
- A CRUD framework built on Toolpad's `DataSource` / `DataModel` / `List` / `Create` / `Edit` / `Show`, plus data-source cache, notifications, dialogs, dashboard layout, account menu, page header and breadcrumbs.
- Offline PWA (IndexedDB, service worker), role-based navigation plus route-level access rules.
- Advanced components worth a first-class home: debounced number and money inputs with forwarded refs, date/datetime/select/checkbox field wrappers, async picker comboboxes, session-expiry warning, sync-progress indicator, "new version available" prompt, error boundary, page loader, typed snackbar alerts, config-driven dashboard launcher cards, a loading-aware action button.
- Backend is not Node: REST returning `{ items, totalCount, page, pageSize }`.
- Charts are not used today; they are planned for future dashboard reports.

### 2.3 Success criteria

| # | Criterion |
|---|---|
| SC1 | Pilot: shell and at least five screens on `@azmr/ui`, no functional regression, Lighthouse >= 96 on migrated routes (FCP < 1.5 s, LCP < 2.5 s, CLS < 0.1, TTI < 3.5 s). |
| SC2 | axe-core reports zero serious or critical violations on every component demo; keyboard maps documented and tested. |
| SC3 | Consumer B: one full entity (list, create, edit, show) runs on the CRUD layer in <= 30 lines of model configuration. |
| SC4 | Zero `@mui/*` imports in migrated folders; codemods convert >= 80% of mechanical imports and `sx` usages automatically on a sample of Consumer B. |
| SC5 | Size budgets enforced in CI per entry point (initial targets: Button < 2 KB gzip; DataGrid < 30 KB gzip excluding optional peers). |
| SC6 | >= 90% line coverage in `packages/ui`; every component has an a11y test and a reduced-motion test where it animates. |

## 3. Principles

1. **Own the API, borrow the engine.** Base UI, TanStack Table/Virtual, Recharts and react-day-picker do the hard behaviour; we own the public surface.
2. **Real DOM, real refs.** `ref` points at the actual element. No synthetic-event shims, no `inputComponent`-style indirection.
3. **Accessible and secure by construction.** No `dangerouslySetInnerHTML`; hiding UI is never presented as authorization.
4. **Composition for primitives, configuration for the dynamic layer only.**
5. **CSS-first motion**, `prefers-reduced-motion` honoured everywhere.
6. **Server-safe where possible**, client boundaries explicit.
7. **Small units.** One component = one folder with source, test, demo and docs.
8. **Pre-1.0 breaks need a minor bump and a migration note; after 1.0, strict semver.**

## 4. Architecture

### 4.1 Layers

```
L5 Dynamic     Crud.*, generated forms, ChartSpec dashboards, DataSource adapters
L4 Blocks      AppShell, DataGrid, Notifications, Dialogs, LauncherCards, ...
L3 Components  Button, Input, Select, DatePicker, Dialog, Table, Card, ...
L2 Primitives  thin wrappers around Base UI (the only place Base UI is imported)
L1 Tokens      CSS variables: colour, radius, spacing, motion, density, charts
```

A layer imports only from layers below it. A boundary check (a script run by `pnpm check:standards`) scans imports and fails on violations. Only L2 may import `@base-ui/react`, so the engine can be swapped.

### 4.2 Package and exports

Single package `@azmr/ui` with source under `packages/ui/src/`:
`tokens/`, `primitives/`, `components/<name>/`, `blocks/<name>/`, `dynamic/`, `icons/`, `motion/`, `hooks/`, `lib/`, `styles/`.

Export map: `.` (barrel), `./styles.css`, per-component subpaths (`./button`, `./dialog`, ...), `./icons`, `./motion`, `./hooks`, `./access`, `./dynamic`, plus adapter subpaths `./rhf` and `./zod`. ESM only, `types` condition first, `sideEffects: ["**/*.css"]`. Built with tsup, one entry per subpath.

- **Dependencies:** `@base-ui/react` (1.9; renamed from `@base-ui-components/react`), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
- **Peer dependencies:** `react` and `react-dom` (`^18 || ^19`), **`@azmr/core`** (a peer, not a pinned dependency, which fixes PAZM-38: two copies of core break `Signal` typing and scheduler state), `tailwindcss ^4`.
- **Optional peers** (installed only by apps that import the block): `@tanstack/react-table` 9, `@tanstack/react-virtual` 3, `recharts` 3, `react-day-picker` 10, `@date-fns/tz`, `motion`.

### 4.3 Styling contract

- Tailwind v4 utilities only. No CSS-in-JS. Inline `style` only for CSS-variable-driven dynamic values.
- `cn()` = `clsx` + `tailwind-merge`. Every component accepts `className`, merged last. Variants via CVA.
- State styling uses `data-*` attributes (`data-open`, `data-checked`, `data-disabled`, `data-highlighted`, `data-pending`, `data-starting-style`, `data-ending-style`).
- Parts are exposed through composition (`Dialog.Content`) and Base UI's `render` prop where polymorphism is needed. There is no MUI-style `slots` / `slotProps` / `components` / `componentsProps`.
- No raw hex or `rgb()` in components. Colours come from tokens; a test enforces it.
- Consumers write `@import "tailwindcss"; @import "@azmr/ui/styles.css";`. `styles.css` declares the tokens, the `@theme inline` mapping and an `@source` rule so Tailwind v4 scans our distributed classes inside `node_modules`.

### 4.4 Server and client boundaries

Each subpath is a separate build entry. Client entries (anything with state, effects or event handlers) get a `"use client"` banner; server-safe entries (Typography, Card, Badge, Skeleton, Separator, Label, Icon) do not. This fixes PAZM-37.

### 4.5 Distribution (approach C: hybrid)

1. **npm package is primary**, versioned with changesets; one version bump propagates fixes to every consumer.
2. **shadcn-compatible registry is secondary**, generated from the same source at build time and published at `https://platform.azmara.io/r/{name}.json` under the `@azmr` namespace. Items declare `registry:base` to pin Base UI. It is for components an app must own and is introduced in Phase 1 once Button, Input and Dialog stabilise.

### 4.6 Versioning

`0.x` until SC1 and SC2 are met on the pilot. `1.0` when the pilot and the Consumer B slice (SC3) are done.

### 4.7 Primitive engine policy

Base UI is the primitive layer: shadcn's default since July 2026, and the engine MUI is investing in. All Base UI imports live in L2. Per-component coverage was verified against `@base-ui/react` 1.9.0 (Appendix A); any gap is filled by our own implementation behind the same L2 interface. Radix is not used; the pilot's Radix-based shadcn components migrate through the L2 wrappers.

## 5. Tokens and theming (L1)

- **Names:** shadcn's set (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, `--sidebar-*`) so shadcn components from any registry fit alongside ours.
- **Extensions:** `--success`, `--warning`, `--info` (each with a foreground), `--motion-duration-{instant,fast,base,slow}`, `--motion-ease-{standard,emphasized,decelerate,accelerate}`, `--elevation-{1..4}`, `--density-*`, `--z-*`, `--chart-1..8` plus sequential and diverging ramps.
- **Colour:** OKLCH values. The categorical chart palette is checked for contrast and colour-vision-deficiency separation in both modes.
- **Modes:** light and dark via `.dark` / `[data-theme]` with a `prefers-color-scheme` default and a no-flash snippet for SSR.
- **`createTheme({ primary, radius, density, font })`** emits the CSS variables. It replaces MUI's `createTheme`.
- **Density:** `data-density="compact | comfortable | spacious"` on a root element changes control heights and padding.
- **Typography:** variable Inter by default, type-scale tokens, a `Typography` component mapping variants to semantic elements.
- **Locale:** a `LocaleProvider` (default `en-NZ`, week starts Monday, configurable) drives labels, `Intl` number and date formatting, and date-fns locale. Logical CSS properties give RTL support.
- **Migration helper:** `muiThemeToTokens(theme)` produces starter CSS from a MUI theme object; `tokensToMuiTheme()` lets mixed MUI and `@azmr/ui` screens match visually during coexistence.

## 6. Motion

- **CSS-first.** Transitions key off `data-*` state attributes (including Base UI's `data-starting-style` / `data-ending-style`); durations and easings come from tokens. Animate only `transform`, `opacity`, `clip-path` and `grid-template-rows`.
- **`<Transition>`** wraps React's `<ViewTransition>` (stable in React 19.3) for route, list and shared-element transitions. It feature-detects and degrades to a no-op; the pilot upgrades to 19.3.
- **`@azmr/ui/motion`** is an optional `motion`-based module (via `LazyMotion`) for layout animation, springs and gestures: drag-to-dismiss drawer, sortable lists, number tickers.
- **Reduced motion:** a global `@media (prefers-reduced-motion: reduce)` collapses durations to near zero and drops transforms except opacity. `useReducedMotion()` is exported, and every animated component has a test for it.
- **Presets:** fade, scale, slide (four directions), collapse, staggered list, skeleton shimmer, success check draw, indeterminate progress, number count-up, page transition, toast stack.

## 7. Icons

- `@azmr/ui/icons` exports `<Icon name="..." />` plus named exports. **Lucide** (MIT) is the default set; an optional **Tabler** pack (MIT, ~5,000 icons) shares the same API; `registerIcons()` accepts custom SVGs.
- Size tokens (`xs`..`xl`), `strokeWidth`, `spin`; decorative by default (`aria-hidden`), `aria-label` makes it meaningful. Icons are server-safe.
- `react-icons` is **not** bundled wholesale: it is a meta-package of many sets with differing licences, and it only tree-shakes through exact subpath imports.
- A data file maps MUI icon names (including the `Rounded`/`Outlined` variants) to our icons; the codemod uses it and lists unmapped names.

## 8. Components and conventions

### 8.1 Phase 1: core components (L2/L3)

- **Layout:** `Stack`, `Grid` (CSS grid with responsive `cols`), `Container`, `Separator`, `AspectRatio`, `ScrollArea`.
- **Typography:** `Typography`, `Heading`, `Text`, `Link`, `Code`, `Kbd`.
- **Actions:** `Button` (variants, sizes, `loading`, `loadingText`, icon slots, `render`), `IconButton`, `ButtonGroup`, `Toggle` / `ToggleGroup`, `SplitButton`.
- **Display:** `Card`, `Badge`/`Chip` (removable), `Avatar`, `Alert`, `Skeleton`, `Progress` (linear and circular), `Spinner`, `EmptyState`.
- **Disclosure and overlays:** `Accordion`, `Collapsible`, `Tabs`, `Tooltip`, `Popover`, `HoverCard`, `Dialog`, `AlertDialog` (confirm), `Drawer`/`Sheet`, `Menu` (dropdown and context).
- **Navigation and data:** `Breadcrumb`, `Pagination`, `Stepper`, static semantic `Table`.
- **Feedback:** `Toast` (typed success/error/info/warning, promise-aware).

### 8.2 Phase 2: forms and inputs

- **Controls:** `Input`, `Textarea`, `NumberField`, `MoneyField`, `Select`, `Combobox` (async and multi), `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `DatePicker`, `DateTimePicker`, `TimePicker`, `DateRangePicker` (with presets such as "last 30 days"), `FileUpload`, `RichTextEditor`, `SignaturePad`, `PinInput`.
- **`Field`** composes label, description, error and required marker around any control, wiring `id`, `aria-describedby`, `aria-invalid` and `aria-errormessage` automatically; errors are announced through a live region.
- **Refs:** `ref` is the real `<input>` (React 19 ref-as-prop; a `forwardRef` shim covers React 18). Hence `react-hook-form`'s `register()` works without `Controller`, and no `inputRef`, `InputProps` or `inputComponent` is needed.
- **Value API:** text inputs keep the native `onChange(event)`. `NumberField`, `MoneyField`, `Select`, `Combobox` and the date controls use typed `onValueChange(value, details)` where the value is a `number | null`, `Date | null` or the real option value, never a formatted string. Controlled and uncontrolled forms are both supported.
- **Debounce is built in:** `debounceMs` on text, number, money and search inputs. `onValueChange` fires debounced; `onCommit` fires immediately on blur or Enter and flushes any pending debounce; `data-pending` exposes the waiting state. `useDebouncedValue` and `useDebouncedCallback` are exported.
- **`NumberField` / `MoneyField`:** `min`, `max`, `step`, `clamp`, `locale`, `currency`, `allowNegative`, `decimalScale`, grouping separators, paste handling, wheel guard; formatting through `Intl.NumberFormat`.
- **Pickers:** `react-day-picker` 10 plus `@date-fns/tz`, inside `Popover`. Date-only values are local dates, with no hidden UTC shift. Locale, min/max, disabled dates and week start are configurable.
- **Validation:** components are form-library agnostic. First-class adapters: `@azmr/ui/rhf` (React Hook Form 7) and `@azmr/ui/zod` (Zod schema to `FieldDef`). A TanStack Form adapter comes later.
- **Rich text** output is sanitised before it is rendered.

### 8.3 Phase 3: app blocks (L4)

- **Shell:** `AppShell` (header, collapsible sidebar, content, mobile drawer, persisted state), `Sidebar`, `NavigationMenu` driven by a `NavigationConfig` (items, groups, dividers, icons, badges, `allow(ctx)`), `PageHeader`, auto-generated `Breadcrumbs`, `AccountMenu`, a `SignIn` block.
- **Providers:** `NotificationsProvider` / `useNotifications` (typed toasts, dedupe, auto-dismiss) and `DialogsProvider` / `useDialogs` (imperative alert, confirm and prompt).
- **App-level:** `ErrorBoundary` with a reporting hook, `PageLoader`, `SessionExpiryWarning` (idle countdown with extend and sign-out), `SyncStatus` (offline queue progress), `UpdatePrompt` ("new version available"), `OfflineBanner`, `EntityPicker` / async `Combobox`, `LauncherCards` (config-driven dashboard cards: title, description, icon, colour, `href` or `onClick`, sections with responsive columns).
- **Access control** (`@azmr/ui/access`, server-safe): `RouteAccessRule` types and `getRouteAccessRule(pathname)` for middleware (first match wins), plus `usePermissions()` and `<PermissionGuard>` backed by `@azmr/policycore`. **Hiding a navigation item is not authorization**: docs and examples must always pair it with route-level and API enforcement.

## 9. Data grid (Phase 4, L4)

- **Engine:** TanStack Table v9 and TanStack Virtual (optional peers), wrapped in our tokens, motion and a11y.
- **Server-side first:** `{ page, pageSize, sort[], filter, search }` map to the `DataSource`. A client-side mode serves small datasets.
- **v1 features:** typed columns (text, number, money, date, boolean, enum chip, actions, custom); single and multi sort; column filters plus quick search; server pagination and virtual or infinite scrolling; column visibility and resizing; density; row selection (checkbox, shift-range) with a bulk-action bar; row actions; inline editing with commit and rollback and optimistic UI; loading, empty and error states; sticky header; CSV export and print view; URL-state sync (page, sort, filter); keyboard navigation; a responsive card mode on narrow screens.
- **After v1:** column pinning, grouping, aggregation, tree data, master-detail, Excel export, saved views.
- **Accessibility:** a static table uses `table`; the interactive grid uses `grid`; `aria-sort`; roving `tabindex`.

## 10. Dynamic layer (Phase 5, L5)

### 10.1 Contracts (TypeScript sketch)

```ts
interface DataSource<T, Id extends string | number = string | number> {
  getMany(q: { page: number; pageSize: number; sort?: SortSpec[]; filter?: FilterSpec;
               search?: string; signal?: AbortSignal }): Promise<{ items: T[]; totalCount: number }>;
  getOne(id: Id, opts?: { signal?: AbortSignal }): Promise<T>;
  createOne?(values: Partial<T>): Promise<T>;
  updateOne?(id: Id, values: Partial<T>): Promise<T>;
  deleteOne?(id: Id): Promise<void>;
  deleteMany?(ids: Id[]): Promise<void>;
  aggregate?(q: AggregateSpec): Promise<AggregateResult>;   // used by charts, section 11
}

interface FieldDef<T> {
  name: keyof T & string;
  label: string;
  type: "text" | "number" | "money" | "date" | "datetime" | "boolean"
      | "enum" | "relation" | "richtext" | "custom";
  required?: boolean;
  schema?: ZodType;                         // validation
  visibleIf?: (values: Partial<T>) => boolean;
  disabledIf?: (values: Partial<T>) => boolean;
  access?: { read?: Rule; write?: Rule };   // field-level permissions
  column?: Partial<GridColumn<T>>;          // grid overrides
  render?: FieldRenderer<T>;                // custom renderer
}

interface DataModel<T> { idField: keyof T & string; fields: FieldDef<T>[]; labels?: Labels }
```

### 10.2 Components and behaviour

- `<Crud.Provider dataSource model>` with `<Crud.List>`, `<Crud.Create>`, `<Crud.Edit>`, `<Crud.Show>` and `<Crud.Form>`.
- **Routing-agnostic** through a small router adapter: Next.js App Router, React Router 7+, TanStack Router.
- **URL state** for list pages; breadcrumb integration; delete confirmation; success and error notifications.
- **Cache** with in-flight de-duplication, prefix invalidation (`clearByPrefix`, `invalidate`) and retry configuration.
- **Forms are generated** from `FieldDef` through a type-to-control map, with conditional fields, sections, wizard steps, computed fields and custom renderers.
- **Offline hooks:** an `OfflineStore` adapter interface queues mutations and reports sync status to `SyncStatus`; the library does not choose a storage engine.
- **Adapters:** `restDataSource({ baseUrl, mapRequest, mapResponse })` for `{ items, totalCount, page, pageSize }`-style backends, `supabaseDataSource`, later an `@azmr/db` adapter.

## 11. Charts and dashboards (Phase 6)

- **Engine:** Recharts 3 behind our `Chart` wrappers (the same engine as shadcn's chart pattern). A Phase 6 spike checks tens of thousands of points; if Recharts struggles, a canvas-based engine is added behind the same wrappers.
- **Wrappers add** our tokens, motion with reduced-motion support, and accessibility: keyboard-reachable tooltips, a data-table fallback and text summaries for screen readers.
- **Chart types:** line, bar, area, pie/donut, scatter, composed, sparkline.
- **Dashboard blocks:** KPI and trend-delta cards, chart card with a filter header, PNG and CSV export, consistent loading, empty and error states.
- **Dynamic:** `ChartSpec` plus `DataSource.aggregate()` render a report from configuration, with `DateRangePicker` and filters bound to the spec. The consumer's backend needs matching aggregate endpoints.

## 12. Migration kit and pilot

- **Coexistence:** MUI's single CSS layer (`AppRouterCacheProvider` option `enableCssLayer`) with an ordered layer declaration (`theme, base, mui, components, utilities`) so Tailwind and MUI render in one tree; `tokensToMuiTheme()` keeps mixed screens consistent.
- **Codemods** (jscodeshift / ts-morph), shipped as `@azmr/ui-codemods` and runnable through `@azmr/cli`: (1) `@mui/material` imports to `@azmr/ui/*`; (2) icon imports via the mapping table; (3) static `sx` to `className` with spacing and palette maps, leaving `// TODO(azmr): sx` markers for the rest; (4) MUI `Grid` to our `Grid`; (5) `TextField` to `Field` + `Input`; (6) Toolpad `Crud` to `Crud`. They handle `.jsx` / `.tsx` twins and print a conversion report.
- **Per-consumer order:** tokens, primitives, forms, shell, grid, CRUD; one feature folder at a time.
- **Pilot plan (`app_azmara.io`):** replace its local shadcn components starting with Button, Input and Dialog; adopt the shell after Phase 3; measure Lighthouse before and after; file every defect as a Linear issue.

## 13. Quality, security, performance, docs

- **Tests:** Vitest + Testing Library + user-event; axe-core per component; keyboard tests; reduced-motion tests; SSR `renderToString` tests for server-safe entries; type tests (`expectTypeOf`) including interface-typed rows; Playwright component and visual tests for the grid and shell from Phase 4.
- **Accessibility:** WCAG 2.2 AA, documented keyboard map per component, a manual screen-reader pass per phase.
- **Performance:** `size-limit` budgets in CI, Lighthouse >= 96, virtualization for large lists.
- **Security:** a lint rule bans `dangerouslySetInnerHTML`; rich-text output is sanitised; CSP-friendly (no runtime-injected styles, no `eval`); client-side upload checks are documented as UX, not security; dependency audit and `minimumReleaseAge` stay on in CI.
- **Docs:** every component gets a page on platform.azmara.io with a live demo, a props table generated from the types, accessibility notes and recipes. Demos are executed by the test suite so they cannot rot.
- **Browser support:** evergreen (roughly the last two years); View Transitions degrade gracefully.
- **TypeScript:** built with TS 5.x; consumers verified on TS 5 and 7 in a CI matrix.

## 14. Phases and exit criteria

Sizes are relative (S, M, L). There is no deadline; each phase is built in depth before the next starts.

| Phase | Scope | Exit criteria | Size |
|---|---|---|---|
| 0 Foundation | Tokens and `styles.css`, build config (per-entry `use client`), `cn`, boundary check, size and a11y test harness, docs shell, registry skeleton, Base UI coverage spike, icon system, fixes for PAZM-37/38/40/42 groundwork | Fresh Next 16 + Tailwind 4 fixture app consumes `@azmr/ui` in CI; Button and Input proven end to end | M |
| 1 Core components | Section 8.1; registry published; codemods v1 (imports, icons) | Pilot swaps Button/Input/Dialog; all components pass a11y tests | L |
| 2 Forms and inputs | Section 8.2 incl. debounced Number/Money, date family, Combobox, rich text, adapters | Forms in pilot screens on `Field` + RHF; no `Controller` needed | L |
| 3 App shell | Section 8.3 | Pilot shell + 5 screens migrated (SC1) | M |
| 4 Data grid | Section 9 | Server-side grid in pilot and one Consumer B screen | L |
| 5 Dynamic CRUD | Section 10 | One Consumer B entity on `Crud` in <= 30 lines (SC3) | L |
| 6 Charts and dashboards | Section 11 | A dashboard rendered from `ChartSpec` | M |
| 7 Hardening to 1.0 | Pinning/grouping/Excel decision, perf pass, docs completion, API freeze | SC1-SC6 all met | M |

## 15. Linear structure

Team PAZM, project `@azmr/ui`: one **milestone per phase**; one issue per component or feature, labelled with its layer (`layer:tokens|primitive|component|block|dynamic|infra`) and type (Feature, Improvement, Bug). Each issue's definition of done: implementation, tests (including a11y and reduced motion), docs page, size check, changeset. Key cross-phase dependencies use `blockedBy`. Existing issues PAZM-37, 38, 39, 40, 41, 42 are folded into Phases 0 and 1; PAZM-34 is closed by this spec.

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope far exceeds one person | Strict phase gating, pilot-first, engines instead of rewrites, paid-grid features deferred |
| Base UI changes quickly (1.9 within weeks of 1.0) | Isolation in L2, pinned minor, contract tests per primitive |
| Accessibility regressions | axe in CI, manual screen-reader pass per phase |
| Tailwind v4 does not scan `node_modules` | `@source` in `styles.css`; a fresh-app consumer fixture in CI |
| Consumer backends differ | `DataSource` adapters with `mapRequest` / `mapResponse` |
| TypeScript 7 toolchain differences | CI matrix on TS 5 and 7 |
| Consumer confidentiality | Nothing project-specific in this repo; fixtures are synthetic |
| Docs rot | Docs built from types and executable demos |

## 17. Decisions made

| # | Decision | Reason |
|---|---|---|
| D1 | `@azmr/ui` is a full component library, not "primitives only" | Owner's direction; two real consumers |
| D2 | Leave MUI entirely (no permanent MUI dependency) | Toolpad is archived and not recommended by MUI; patch-based upgrades are fragile |
| D3 | Approach C: npm package primary, shadcn-compatible registry secondary | Single-fix upgrades plus an ownership escape hatch |
| D4 | Base UI as the primitive layer, isolated in L2 | shadcn default since July 2026; MUI's own direction; swappable |
| D5 | shadcn token names, Tailwind v4, CVA, `tailwind-merge` | Compatibility with the shadcn ecosystem |
| D6 | TanStack Table v9 + Virtual for the grid; server-side first | Mature headless engine; matches observed usage |
| D7 | Recharts 3 for charts, behind our wrappers | Default React charting; shadcn pattern; swappable |
| D8 | Lucide default icons, optional Tabler, no wholesale `react-icons` | MIT licences, tree-shaking, one clear API |
| D9 | React Hook Form adapter first, Zod bridge, components form-library agnostic | Widely used; real refs make `register()` work |
| D10 | Docs on platform.azmara.io, no Storybook | One source of truth; demos double as tests |
| D11 | `@azmr/core` is a peer dependency | Avoids duplicate `Signal` copies |
| D12 | MIT licence; default locale `en-NZ` | Matches the rest of the platform and primary audience |

## 18. Items needing the owner's confirmation

1. Package name for codemods: `@azmr/ui-codemods` (default) versus folding into `@azmr/cli`.
2. Whether heavy blocks (grid, charts) should eventually ship as separate packages (`@azmr/ui-grid`, `@azmr/ui-charts`). Default: stay in one package with optional peers until bundle data says otherwise.
3. Registry hosting path `https://platform.azmara.io/r/` (default) versus a dedicated subdomain.

## Appendix A: Base UI coverage (verified 2026-10-15, `@base-ui/react` 1.9.0)

Method: installed the package in a scratch project and read its `exports` map and sources. Facts about the package: MIT licence, `sideEffects: false`, ships ESM (`.mjs`) and CJS, components already carry `"use client"`, and `date-fns` / `@date-fns/tz` are *optional* peers (no install noise). Transition hooks (`data-starting-style` / `data-ending-style`, transition status) exist on every component that animates: Dialog, Popover, Tooltip, Preview Card, Menu, Select, Combobox, Accordion, Collapsible, Tabs, Toast, Drawer, Navigation Menu, Checkbox indicator and Avatar. AlertDialog, ContextMenu and Autocomplete reuse the Dialog, Menu and Combobox internals.

### Planned component to Base UI primitive

| Planned component | Base UI subpath | Status |
|---|---|---|
| Button | `button` | Provided |
| Input | `input` | Provided |
| Field (label, description, error, validity) | `field`, `fieldset`, `form` | Provided: build our `Field` on it for the aria wiring and validity state |
| Checkbox, CheckboxGroup | `checkbox`, `checkbox-group` | Provided |
| RadioGroup | `radio`, `radio-group` | Provided |
| Switch | `switch` | Provided |
| Slider | `slider` | Provided |
| NumberField (base of MoneyField) | `number-field` | Provided (incl. scrub area); money formatting and debounce are ours |
| PinInput | `otp-field` | Provided |
| Select | `select` | Provided |
| Combobox (single, multi, async) | `combobox` | Provided; async `loadOptions` wiring is ours |
| Autocomplete | `autocomplete` | Provided |
| Dialog | `dialog` | Provided |
| AlertDialog | `alert-dialog` | Provided |
| Drawer / Sheet | `drawer` | Provided |
| Popover | `popover` | Provided |
| Tooltip | `tooltip` | Provided |
| HoverCard | `preview-card` | Provided (different name) |
| Menu (dropdown) | `menu` | Provided |
| ContextMenu | `context-menu` | Provided |
| Menubar | `menubar` | Provided (not planned; usable for app menus) |
| Tabs | `tabs` | Provided |
| Accordion, Collapsible | `accordion`, `collapsible` | Provided |
| Toast | `toast` | Provided |
| Progress, Meter | `progress`, `meter` | Provided |
| Avatar | `avatar` | Provided |
| ScrollArea | `scroll-area` | Provided |
| Separator | `separator` | Provided |
| Toggle, ToggleGroup | `toggle`, `toggle-group` | Provided |
| Toolbar | `toolbar` | Provided (useful for grid and editor toolbars) |
| NavigationMenu | `navigation-menu` | Provided |

### No Base UI primitive: our own implementation or another engine

| Component | Plan |
|---|---|
| Calendar, DatePicker, TimePicker, DateTimePicker, DateRangePicker | `react-day-picker` 10 + `@date-fns/tz` (Section 8.2). Base UI has internal `temporal` adapters that suggest a future date module; re-check at Phase 2 start and prefer it if it ships stable. |
| FileUpload, SignaturePad, RichTextEditor | Own implementation (rich text on a separate editor engine, chosen in its spike) |
| Card, Badge/Chip, Alert, Skeleton, Spinner, EmptyState, Typography, Stack/Grid/Container | Plain styled elements, no behaviour needed |
| Table (semantic), Breadcrumb, Pagination, Stepper | Plain semantic markup; Pagination logic reused by the grid |
| Data grid | TanStack Table v9 + Virtual (Section 9) |
| Charts | Recharts 3 (Section 11) |

### Consequences for the plan

- PinInput, HoverCard, Drawer and Menubar need **no** custom primitive work; the corresponding issues shrink to styling, tests and docs.
- `Field` should wrap Base UI's `Field` rather than re-implement id and aria wiring.
- Only date and time controls, file upload, signature and rich text need non-Base-UI engines in Phase 2.
