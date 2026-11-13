# @azmr/ui Theme Schema — Design Spec

- **Date:** 2026-11-13
- **Status:** Draft for review
- **Owner:** Alshafaraz Gazi
- **Package:** `@azmr/ui` (`packages/ui`, the server-safe `@azmr/ui/theme` entry and a new schema entry)
- **Tracking:** none yet (file Jira tickets in project PAZM once this is approved)
- **Builds on:** section 5 of `2026-10-15-azmr-ui-design.md` and the existing `createTheme`

## 1. Purpose

Developers who build apps on `@azmr/ui` need to define a company's look once, for light and dark mode, and have every component follow it. Today `createTheme` does part of this: one brand colour in, accessible primary, status colours, radius, font and density out. It cannot set the page background, card, border, sidebar and other surface colours, and it cannot set a role differently for light and dark.

The first real consumer is a client's field-sales app, an offline-first order-taking app for field reps (a MUI and Toolpad app being moved off Toolpad). Its theme is the example of what goes wrong without a schema: two copies of the theme files, colour scales picked by hand per mode, brand colours used as dark-mode surfaces with nothing checking that text is readable, and components that test `palette.mode === 'dark'` with hard-coded greys. Nobody can tell from the code which colour is "the card".

This spec defines a **theme schema**: a fixed list of named colour roles, each with an explicit light and dark value, produced from a small config and validated.

**Phase 2 (not built here):** a studio where developers build admin forms so business admins can set up their own corporate branding. The schema is designed now so those forms can be generated from it without a rewrite.

## 2. Goals, non-goals, anti-goals

### Goals

| # | Goal |
|---|---|
| T1 | A fixed list of colour **roles**. Components use roles only and never check the mode. |
| T2 | Every role has an explicit light and dark value in the output. |
| T3 | Three ways to define a theme, all on one schema (section 5): derive both modes from one brand colour; tint the greys toward the brand hue; override any role per mode. |
| T4 | Contrast is checked when a theme is built. A theme that makes text unreadable is rejected with a message that names the pair. |
| T5 | The config is plain JSON-serialisable data with a version number, so it can be stored, exported, imported and shared. |
| T6 | The schema is defined once and can drive form generation (`fieldsFromSchema`), so phase 2 reuses it. |
| T7 | Existing `createTheme` calls keep working unchanged. |

### Non-goals

- A theme editor UI, saving themes to a database, or any admin screen (phase 2).
- The application shell, sidebar, top bar and route-generated navigation. That is a separate spec (section 9) that consumes the roles defined here.
- Numbered colour scales (brand 50 to 1000). Components use roles; an app that needs a scale builds it itself.
- Per-component style overrides in the config.
- Loading web fonts from a URL (see section 7).
- A converter from MUI themes. The 2026-10-15 spec already plans `muiThemeToTokens`; this spec does not duplicate it.

### Anti-goals (a failure even if it technically works)

- A theme that passes the schema but has unreadable text, a button label that disappears on hover, or an invisible focus ring.
- Any client's real brand, name or colours appearing in `azmara-labs/platform`. The field-sales app is a client's code; this repo is public. Presets use a made-up company.
- User-supplied values reaching CSS or HTML without strict validation.
- A flash of the wrong theme on first load.

## 3. Current state

`createTheme(options)` in `packages/ui/src/theme/create-theme.ts` (server-safe, no React):

- Inputs: `primary`, `secondary`, `success`, `warning`, `info`, `destructive` (hex, `oklch(...)` or `{ l, c, h }`), `radius`, `font`, `density`.
- Output: `cssVariables`, a `css` string (`:root { ... }`), and `htmlAttributes`. Colours are written as `light-dark(light, dark)`.
- It derives a readable background and foreground for each colour in each mode, including on hover (button backgrounds blend on hover, so the label contrast is checked against the blended colour), plus a focus ring that is visible on every surface.
- Strict validation: colours, radius and font are parsed against fixed patterns and throw on anything else, because the output is CSS.
- Mode preference (`light`, `dark`, `system`) and density live in cookies and are rendered on `<html>` by the server (`htmlAttributes.fromCookies`), so first paint is right and strict CSPs work.

`styles/tokens.css` defines the full token set with shadcn names and neutral defaults.

**Roles `createTheme` cannot set today:** `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `border`, `input`, `scrim`, and the `sidebar`, `sidebar-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border` set. It sets `sidebar-primary` and `sidebar-ring` only as copies of primary and ring. Surfaces are therefore always the neutral defaults, which is why a branded dark mode is impossible today. The builder should confirm this list against `tokens.css`, including whether a chart palette exists.

An existing guide covers scoped themes (`/docs/guide/theming`) and `docs/guide/customising.mdx` points to it.

## 4. Constraints

- Server-safe: the theme entry has no React and no browser globals, and must stay usable from Server Components, route handlers and middleware.
- No new runtime dependency in `@azmr/ui/theme`. Zod is an optional peer used by `@azmr/ui/zod`, so the Zod schema lives in its own entry (see section 5.4).
- Additive only. Existing options, outputs and tests keep working; this ships as a minor version with a changeset.
- Tokens and names stay shadcn-compatible (decision D5 of the 2026-10-15 spec).
- WCAG 2.2 AA: 4.5:1 for text, 3:1 for non-text UI such as the focus ring.
- No raw hex or `rgb()` in components. The existing conventions test stays; colour literals are allowed only in the theme module and presets, with the same `conventions-ignore` marker the module already uses.
- NZ English in docs and messages.

## 5. The design

### 5.1 Roles

The role list is the shadcn token set already in `tokens.css`, grouped:

| Group | Roles |
|---|---|
| Page and surfaces | `background`, `foreground`, `card` and `card-foreground`, `popover` and `popover-foreground`, `muted` and `muted-foreground`, `accent` and `accent-foreground` |
| Actions | `primary` and `primary-foreground`, `secondary` and `secondary-foreground` |
| Status | `success`, `warning`, `info`, `destructive`, each with a `-foreground`, plus `warning-text` |
| Lines and focus | `border`, `input`, `ring` |
| Overlay | `scrim` |
| Sidebar | `sidebar`, `sidebar-foreground`, `sidebar-primary` and `-foreground`, `sidebar-accent` and `-foreground`, `sidebar-border`, `sidebar-ring` |

Radius, font and density stay separate options as they are today.

### 5.2 The config (illustrative shape, final names are the builder's)

```ts
type ThemeConfig = {
  version: 1;
  name?: string;                       // shown in editors and exports
  brand: Colour;                       // seeds primary and the derived surfaces
  secondary?: Colour;
  success?: Colour; warning?: Colour; info?: Colour; destructive?: Colour;
  tint?: number | "brand";             // chroma added to greys, hue from the brand
  light?: Partial<Record<Role, Colour>>;   // explicit per-role overrides, light mode
  dark?:  Partial<Record<Role, Colour>>;   // explicit per-role overrides, dark mode
  radius?: string; font?: string; density?: Density;
  branding?: { appName?: string; logo?: AssetRef; logoDark?: AssetRef; favicon?: AssetRef };
};
```

`primary` is accepted as an alias for `brand` so existing `createTheme({ primary })` calls are unchanged.

### 5.3 Three ways to define a theme, one pipeline

1. **Derive (the neutral look).** Only `brand` (or `primary`) is given. Surfaces stay the neutral greys from `tokens.css`; the brand appears on primary actions, the focus ring and the active sidebar item. Light and dark are both generated. This is exactly today's output, so existing callers see no change. Surface roles are emitted only when `tint` or an override asks for them.
2. **Tint.** `tint` makes every neutral grey lean toward the brand hue by a small chroma, so the app feels on-brand without coloured panels.
3. **Override.** `light` and `dark` set any role explicitly, for example a deep navy dark background with a lighter blue primary. Overrides replace the derived value for that role and mode only.

The mockups reviewed on 13 Nov 2026 showed these as options A, B and C; the owner liked all three, so none is the default to the exclusion of the others. The default when only `brand` is given is derive.

### 5.4 Where the schema lives

- A Zod schema for `ThemeConfig`, with `.describe()` text on each field (label and help text), exported from its own entry, for example `@azmr/ui/theme-schema`. It uses the field metadata so `fieldsFromSchema` can generate a form in phase 2.
- `createTheme` keeps its own dependency-free validation. A **parity test** feeds both the same valid and invalid inputs and fails if they disagree. This is the one place the schema could drift, so the test is required, not optional.
- `createTheme` accepts the `ThemeConfig` shape (and the old options). A second function, `validateTheme(config)`, returns a structured list of issues (role, mode, pair, measured ratio, required ratio) instead of throwing, for editors. `createTheme` throws on the same issues.

### 5.5 Contrast rules

Checked in both modes, after overrides are applied:

| Check | Minimum |
|---|---|
| `foreground` on `background`, `card-foreground` on `card`, `popover-foreground` on `popover` | 4.5:1 |
| `muted-foreground` on `muted`, on `background` and on `card` | 4.5:1 |
| each `*-foreground` on its colour (primary, secondary, accent, status), including the hover blend the module already models | 4.5:1 |
| status colours and `warning-text` used as text on `background` and `card` | 4.5:1 |
| `sidebar-foreground` on `sidebar`, `sidebar-accent-foreground` on `sidebar-accent`, `sidebar-primary-foreground` on `sidebar-primary` | 4.5:1 |
| `ring` against `background`, `card` and `sidebar` | 3:1 |

`border`, `input`, `sidebar-border` and `scrim` are **not** contrast-checked in phase 1. The default tokens do not meet 3:1 for borders today (`--input` is `oklch(0.922 0 0)` on white), and in dark mode they carry transparency (`oklch(1 0 0 / 12%)`), which the colour parser does not accept. Checking them would reject the defaults. Making form-control borders meet WCAG 1.4.11 is a separate change to the tokens. For the same reason `scrim` cannot be overridden and the transparent dark defaults of `border`, `input` and `sidebar-border` are kept unless overridden with an opaque colour.

Derived values are adjusted until they pass, as today. An **explicit override that fails is an error**, not silently changed, because the developer asked for that exact colour. The message names the role, mode, both colours and the ratio.

### 5.6 Output

As today: `cssVariables`, a `css` string with `light-dark()`, and `htmlAttributes`. Two additions:

- Each variable is still written as `light-dark(light, dark)`. When a role is overridden for one mode only, the other half is that role's default from `tokens.css`, so the theme module needs those defaults as data. A test compares that data with `tokens.css` and fails if they drift.
- An option to scope the output to a selector (for example a container), for previews and multi-tenant pages. The existing scoped-theme guide shows the pattern.
- The CSS and the `<html>` attributes must be usable under a strict CSP. **Correction after review:** this section first said that variables set through a `style` prop need no nonce. That is wrong: a nonce cannot be put on an attribute, so under `style-src 'self' 'nonce-…'` (no `'unsafe-inline'`) the browser blocks a server-rendered `style` attribute. The route that works under a strict policy is a `<style nonce>` element holding `theme.css`; the `style` prop needs `style-src-attr 'unsafe-inline'`. The docs say so.

### 5.7 Presets

Three presets ship as data, one per look in 5.3, built on a made-up company (the builder names it and picks the brand colour). Each is a valid `ThemeConfig`, is shown in both modes in the docs, and is covered by the contrast tests. They double as the examples in the theming guide.

## 6. Phase 2 (studio), shaped now, built later

Developers build admin forms with `@azmr/ui/rhf` and `fieldsFromSchema(ThemeConfigSchema)`; business admins fill them in; the saved JSON goes through `createTheme` on the server. To keep that possible:

- Every `ThemeConfig` field has a label and help text in the schema.
- Colour fields need a colour input. If `@azmr/ui` has none by then, that is a separate component ticket.
- Preview uses the scoped output (5.6) so a form can preview a theme without changing the page.
- Saving a theme per organisation is the host app's concern. The `DbAdapter` work (`azmara-labs/platform` issues #255 to #257) is relevant there; this spec does not depend on it.

## 7. Security

- Every value that reaches CSS is parsed against a fixed pattern. `ThemeConfig` adds no free-text CSS.
- `appName` is plain text, length-capped, and rendered as text only.
- Logo and favicon are asset references, not raw markup. Allowed forms: an `https:` URL, or a `data:` URI of PNG, JPEG or WebP under a size cap. **SVG is not accepted as an inline value**; if SVG is allowed at all it is rendered only through an `<img>` element, never inlined. The builder decides whether SVG is allowed in phase 1 and documents it.
- `font` stays a font-family list matched by the existing pattern. Loading font files from a URL is out of scope for phase 1; the app loads its own fonts and names them in `font`.
- Imported JSON is untrusted. Import runs the same validation, rejects unknown keys, and enforces a maximum size.
- Tests include CSS-injection strings in every colour, radius, font and name field (semicolons, `url(`, `expression(`, closing braces, `</style>`).

## 8. A client's field-sales app as the proving ground

The field-sales app (a client's PWA, studied locally and never copied) is the real consumer. The requirement it exposes: a branded dark mode (navy page, lighter blue actions) that is still readable and defined in one place. Option 3 (override) must express that.

Rules for working with its code: read it to learn requirements; build generic parts here; no client code, names, colours or data in this repo. The app adopting the schema happens in its own repo.

### The Azmara app (second consumer, and the phase 2 home)

The Azmara app (`app_azmara.io`) is a multi-tenant SaaS ERP in the Atlassian mould: Finance, HCM, Inventory and Warehouse, Project Management, CRM and more, with modules switched on per organisation by plan. It already pilots `@azmr/ui` (buttons, inputs, forms, loading and error states). Checked on 13 Nov 2026:

- It does **not** call `createTheme`. Its tokens are hand-written in `src/app/globals.css`, built on its own cyan (`--color-primary-*`) and graphite scales, with charcoal `--primary-foreground` on cyan in both modes. The override layer (5.3) must be able to express that; adopting the schema there is a separate pull request in the app repo after this ships.
- It defines a role the package does not have: `--primary-text` (a brand-coloured text and icon colour that stays readable on the page, like `warning-text`). It is used across the app. **Decision:** not added in this change, because deriving it would change the output of existing `createTheme({ primary })` calls. The app keeps declaring it itself, which works because `createTheme` only emits the variables it is given. A `primary-text` role is a follow-up.
- Roles are plain colours, so an app that builds roles from `var(--color-primary-600)` references would give those up and supply colours (or a brand colour) instead. The numbered-scale non-goal stands: the app may keep its scales for its own components.
- Phase 2 lands here: each organisation stores a `ThemeConfig` (JSON), org admins edit it on a settings page in the app's `org` module, the server validates it with `parseThemeJson` and `validateTheme`, and the layout renders it for that organisation. Writes are limited to org admins, in line with the app's zero-trust database rules. The theme must be read in the same parallel fetch as the user and organisation so the dashboard's load time does not regress.
- Because the editors are business admins, not developers, the contrast gate matters most here: it is what stops an admin saving a theme with unreadable text.

## 9. Related work, separate spec: layout and navigation

The owner also needs a fluid, dynamic layout: a sidebar menu or top bar generated from routes, an account menu, and a sign-in button, replacing Toolpad's `DashboardLayout`. This is a separate project. Its requirements, recorded here so they are not lost:

- Navigation generated from a route definition, rendered as a sidebar or a top bar (switchable), with a mobile drawer, grouping, icons, badges and permission filtering.
- An account menu and a sign-in button as slots in the header.
- Branding slot (app name and logo) fed by `ThemeConfig.branding`.
- Collapsed state remembered with no flash on load.

The 2026-10-15 spec already plans `AppShell`, `Sidebar`, `NavigationMenu` driven by a `NavigationConfig`, `AccountMenu` and a `SignIn` block, and Jira PAZM-67 covers AppShell, Sidebar and the mobile drawer. The new parts are route-generated navigation and the top-bar variant. That spec starts after this one, because it depends on the sidebar roles defined in 5.1.

## 10. Acceptance criteria

- The Zod schema, `validateTheme`, and the extended `createTheme` exist, with the parity test passing.
- Every preset passes every contrast check in section 5.5 in both modes, and a planted failing override is rejected with the specified message.
- An override that sets a role in one mode only leaves the other mode derived.
- `createTheme({ primary, radius, font, density })` produces the same output as before for the existing test cases; the existing tests pass unchanged.
- CSS-injection tests (section 7) pass for every string field, including imported JSON.
- No raw colour literals appear outside the theme module and presets (existing conventions test).
- Docs: the theming guide gains the schema, the three ways to define a theme, the presets in both modes, and the CSP note. Demos are rendered and axe-checked by the docs tests.
- A changeset (minor) for `@azmr/ui`.

## 11. Left to the builder

Entry and function names, exact field names, how `tint` maps to chroma, the derivation of each surface from the brand, the logo and favicon size caps, whether SVG logos are allowed in phase 1, the preset company and colours, whether a chart palette is part of the roles, and the sequence of pull requests.

## 12. Calls made while drafting (for the owner to check)

1. Phase 1 stays developer-facing (the owner's words); the studio is phase 2.
2. Presets use a made-up company, not a client's colours, because the repo is public. This is my call.
3. An explicit override that fails contrast is an error, not an auto-fix. This is my call.
4. The Zod schema lives in its own entry, with a parity test, so `@azmr/ui/theme` gains no dependency. This is my call.
5. Font files by URL and SVG logos are out of phase 1 by default. This is my call.
6. Layout and navigation are a separate spec, written after this one. Because the Azmara app is a multi-module ERP, that spec needs two-level navigation (a module switcher, then sections and pages), filtered by the organisation's plan entitlements and the user's permissions.
7. `primary-text` (used by the Azmara app) stays an app-level token for now, to keep existing `createTheme` output unchanged.
