# @azmr/ui Theme Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `@azmr/ui`'s server-safe theme module so a developer can define light and dark mode for every colour role (derive, tint or override), with contrast checked at build time, a Zod schema for stored configs, and three presets.

**Architecture:** Keep `createTheme` as the single pipeline. Move its colour maths into `colour.ts`, add role data (`roles.ts`), a strict config parser (`config.ts`), grey tinting (`tint.ts`) and a contrast table (`contrast.ts`), then make `createTheme` collect per-role `{light, dark}` values, apply tint and overrides, check contrast, and serialise as `light-dark()`. The Zod schema and presets ship as two new server entries so `@azmr/ui/theme` stays small and dependency-free.

**Tech Stack:** TypeScript, Vitest, culori (test oracle), postcss (reads `tokens.css` in tests), Zod 4 (optional peer, used only by the new schema entry), tsup, Changesets, MDX docs.

**Spec:** `docs/superpowers/specs/2026-11-13-theme-schema-design.md`

## Global Constraints

- Work in `packages/ui` (`@azmr/ui`). Run commands from the repo root `D:/Azmara/azmara/platform` with `pnpm --filter @azmr/ui ...`.
- `@azmr/ui/theme` stays server-safe: no React, no browser globals, no new runtime dependency.
- Additive only. Every existing `createTheme` call returns exactly the output it returns today, and the existing tests pass unchanged. Ships as a **minor** changeset for `@azmr/ui`.
- Tokens keep their shadcn names. WCAG 2.2 AA: 4.5:1 for text, 3:1 for the focus ring.
- No raw colour literals outside the theme module and presets; use the existing `conventions-ignore: <reason>` marker where a literal is needed.
- Every value that reaches CSS is parsed against a fixed pattern. No `dangerouslySetInnerHTML`.
- No client code, names or colours anywhere in this repo. The preset company is made up.
- NZ English in docs and messages. Conventional commits (`type: description`, first line under 72 characters), imperative mood, **no Co-Authored-By or AI attribution**.
- The pre-push hook can run out of memory while Docker Supabase is up. Stop Docker first, or run `pnpm turbo run test --concurrency=1` and then `LEFTHOOK_EXCLUDE=test git push`.
- Test helpers and conventions are in `packages/ui/TESTING.md` and `CONVENTIONS.md`. Write the failing test first and watch it fail for the right reason.

## Review Focus

Failure modes the spec implies that a person will hit; each has a pinned test in the task named.

1. **Achromatic brand with tint** (`#000000`, `#ffffff`, `#808080`): no NaN in output, no pink cast from hue 0; the tint is skipped. Task 4.
2. **Hostile or malformed imported JSON**: oversize text, `__proto__` and `constructor` keys, unknown keys, non-string colours, arrays where objects belong, deeply nested input. Must throw `ThemeConfigError`, never crash or pollute. Task 3.
3. **Override in one mode only, and roles with transparency**: the other mode keeps its default (`border`, `input` and `sidebar-border` are transparent in dark mode); `scrim` cannot be overridden. Task 6.
4. **Scope selector injection**: `scope: "}body{display:none"` and similar are rejected. Task 6.
5. **Legacy output drift**: old option sets must produce byte-identical `cssVariables` and `css`. Task 1 records the golden output before anything changes; Task 6 re-checks it.

---

### Task 1: Branch, golden output, and move the colour maths

**Files:**
- Create: `packages/ui/src/theme/colour.ts`, `packages/ui/src/theme/validate.ts`, `packages/ui/src/theme/create-theme.golden.test.ts`
- Modify: `packages/ui/src/theme/create-theme.ts` (imports only), `packages/ui/src/theme/index.ts` (no change expected)
- Commit with the spec and this plan.

**Interfaces:**
- Produces from `colour.ts` (moved verbatim, not renamed): `Oklch`, `toLinearSrgb`, `fromLinearSrgb`, `clampToGamut`, `luminance`, `contrast`, `format`, `lightDark`, `fromHex`, `parseColour(input: string | Oklch, name: string): Oklch`, `shiftUntil`.
- Produces from `validate.ts` (moved verbatim): `assertRadius(radius: string): string`, `assertFont(font: string): string`.
- `create-theme.ts` keeps the derived-colour functions (`lightPair`, `darkPair`, `statusPair`, `warningColours`, `ringFor`, `holdsOnHover`) and re-exports `type Oklch`.

- [ ] **Step 1: Branch and commit the documents.** `git switch -c feat/theme-schema` from `main`, then commit the spec and plan as `docs: add theme schema spec and plan`.
- [ ] **Step 2: Write the characterisation test** `create-theme.golden.test.ts`: `it("keeps the output of existing option sets byte-identical")` over at least these inputs, each asserting `JSON.stringify(createTheme(input).cssVariables)` and `.css` against inline expected strings captured by running the current code once: `{}`, `{ primary: "#1E88E5" }`, `{ primary: "#000000" }`, `{ primary: "#ffffff", secondary: "#808080" }`, `{ primary: "oklch(0.9 0.15 100)", warning: "#FBC02D", success: "#2E7D32", info: "#1E88E5", destructive: "#D32F2F" }`, `{ radius: "0.5rem", font: "Inter, sans-serif", density: "compact" }`.
- [ ] **Step 3: Run it against the unchanged code** and confirm it passes; paste the captured strings into the test. `pnpm --filter @azmr/ui exec vitest run src/theme/create-theme.golden.test.ts` → PASS.
- [ ] **Step 4: Move the functions listed under Interfaces** from `create-theme.ts` into `colour.ts` and `validate.ts` and import them back. No logic edits.
- [ ] **Step 5: Run the whole theme folder and types.** `pnpm --filter @azmr/ui exec vitest run src/theme` and `pnpm --filter @azmr/ui check-types` → all PASS, existing tests unchanged.
- [ ] **Step 6: Commit** `refactor: move colour maths out of create-theme`.

### Task 2: Role list and defaults

**Files:**
- Create: `packages/ui/src/theme/roles.ts`, `packages/ui/src/theme/roles.test.ts`

**Interfaces:**
- Produces: `ROLES` (readonly tuple of the 35 role names below), `type Role`, `type Mode = "light" | "dark"`, `ROLE_DEFAULTS: Readonly<Record<Role, Readonly<Record<Mode, string>>>>` (the CSS value strings from `tokens.css`, alpha values included), `FIXED_ROLES = ["scrim"] as const`, `type OverridableRole = Exclude<Role, "scrim">`, `cssVar(role: Role): string` returning `--${role}`.
- Roles: `background foreground card card-foreground popover popover-foreground scrim primary primary-foreground secondary secondary-foreground muted muted-foreground accent accent-foreground destructive destructive-foreground success success-foreground warning warning-foreground warning-text info info-foreground border input ring sidebar sidebar-foreground sidebar-primary sidebar-primary-foreground sidebar-accent sidebar-accent-foreground sidebar-border sidebar-ring`. Chart colours are not roles.

- [ ] **Step 1: Write failing tests** (read `src/styles/tokens.css` with postcss, as `tokens.test.ts` does): `it("lists exactly the colour tokens in :root, apart from the chart palette")`; `it("has a default for each role in each mode that equals the scoped .light and .dark declarations")` (compare to the `.light, [data-theme="light"]` and `.dark, [data-theme="dark"]` rules); `it("guards against checking nothing")` asserting `ROLES.length === 35`.
- [ ] **Step 2: Run** → FAIL (module missing).
- [ ] **Step 3: Implement `roles.ts`** with the defaults copied from the scoped blocks in `tokens.css` (they are already split per mode).
- [ ] **Step 4: Run** `pnpm --filter @azmr/ui exec vitest run src/theme/roles.test.ts` → PASS. Prove the drift guard by changing one default, seeing FAIL, then reverting.
- [ ] **Step 5: Commit** `feat: add theme role list and defaults`.

### Task 3: Strict config parser

**Files:**
- Create: `packages/ui/src/theme/config.ts`, `packages/ui/src/theme/config.test.ts`
- Modify: `packages/ui/src/theme/create-theme.ts` (extend `ThemeOptions`, nothing else yet)

**Interfaces:**
- Consumes: `parseColour`, `assertRadius`, `assertFont`, `parseDensity`, `Role`/`OverridableRole`/`ROLES`.
- Extend `ThemeOptions` with optional: `version?: 1`, `name?: string`, `brand?: string | Oklch`, `tint?: number | "brand"`, `light?` and `dark?: Partial<Record<OverridableRole, string | Oklch>>`, `branding?: { appName?: string; logo?: string; logoDark?: string; favicon?: string }`, `scope?: string`.
- Produces: `type ThemeConfig = ThemeOptions`; `class ThemeConfigError extends Error { readonly issues: readonly string[] }`; `MAX_THEME_JSON_CHARS = 16_384`; `TINT_MAX = 0.04`; `TINT_BRAND = 0.015`; `parseThemeConfig(input: unknown): ThemeConfig`; `parseThemeJson(text: string): ThemeConfig`; `isAssetRef(value: unknown): value is string`.
- Rules, all deciding behaviour: unknown keys anywhere are errors; colours in stored config are strings only (hex or `oklch()`); `name` and `branding.appName` are 1 to 80 characters with no control characters; `tint` is a number in `0..TINT_MAX` or `"brand"`; `brand` and `primary` may both appear only if equal as parsed colours; `version`, when present, must be `1`; an asset reference is an `https:` URL of at most 2,048 characters with no credentials, or a `data:image/png|jpeg|webp;base64,` URI of at most 102,400 characters. **SVG is not accepted.** `scrim` in `light` or `dark` is an error. `parseThemeJson` rejects text over `MAX_THEME_JSON_CHARS` before parsing, and rejects non-object roots. Errors are collected into one `ThemeConfigError`.

- [ ] **Step 1: Write failing tests** with these names and assertions: `accepts a minimal config` (`{ version: 1, brand: "#1D4E89" }`); `accepts every field` (one valid value each); `rejects unknown keys at every level` (top level, inside `light`, inside `branding`); `rejects scrim overrides`; `rejects svg and javascript asset references` (`data:image/svg+xml;...`, `javascript:alert(1)`, `http://x`, `https://user:pw@x`); `rejects injection strings in colour, radius, font, name and appName` (`red; } body { display:none`, `url(x)`, `expression(x)`, `</style>`, `"); x`, semicolons); `rejects oversize json before parsing` (17,000 characters); `rejects __proto__ and constructor keys` (JSON text with own `__proto__`), and afterwards `({} as any).polluted` is `undefined`; `rejects arrays, null and non-object roots`; `rejects non-string colours in stored config`; `rejects brand and primary that disagree`; `rejects tint outside 0 to 0.04, NaN and other strings`; `collects all issues in one error`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `config.ts` with the signatures above; build the result as a fresh object from known keys only (no spread of input).
- [ ] **Step 4: Run** `pnpm --filter @azmr/ui exec vitest run src/theme/config.test.ts` and `check-types` → PASS.
- [ ] **Step 5: Commit** `feat: add strict theme config parser`.

### Task 4: Tint

**Files:**
- Create: `packages/ui/src/theme/tint.ts`, `packages/ui/src/theme/tint.test.ts`

**Interfaces:**
- Consumes: `ROLE_DEFAULTS`, `Mode`, `Oklch`, `parseColour`, `clampToGamut`, `format`, and `TINT_BRAND` from `config.ts` (Task 3).
- Produces: `TINT_ROLES` (readonly tuple): `background foreground card card-foreground popover popover-foreground muted muted-foreground accent accent-foreground sidebar sidebar-foreground sidebar-accent sidebar-accent-foreground`; `tintValue(tint: number | "brand"): number` (maps `"brand"` to `TINT_BRAND`); `tintedRoles(brand: Oklch, tint: number): Partial<Record<(typeof TINT_ROLES)[number], Record<Mode, string>>>`.
- Algorithm: for each tint role, parse the opaque default in each mode, keep its lightness, set chroma to `tint` (gamut-clamped) and hue to `brand.h`, format. If `brand.c < 0.02` return `{}` (achromatic brands get no tint). `border`, `input` and `sidebar-border` are never tinted.

- [ ] **Step 1: Write failing tests:** `maps "brand" to 0.015 and passes numbers through`; `keeps lightness and takes the brand hue` (culori: each tinted colour has the default's lightness ±0.001 and hue within 1° of the brand's); `skips achromatic brands` (`#000000`, `#ffffff`, `#808080` give `{}`; no NaN anywhere); `never tints border, input or sidebar-border`; `stays inside sRGB at the maximum tint` (culori `inGamut` for every output, every brand in the shared BRANDS list copied from `create-theme.test.ts`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `... vitest run src/theme/tint.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat: add grey tinting toward the brand hue`.

### Task 5: Contrast checks

**Files:**
- Create: `packages/ui/src/theme/contrast.ts`, `packages/ui/src/theme/contrast.test.ts`

**Interfaces:**
- Consumes: `Role`, `Mode`, `ROLE_DEFAULTS`, `parseColour`, `contrast`.
- Produces: `interface ThemeIssue { role: Role; against: Role; mode: Mode; ratio: number; required: number; message: string }`; `TEXT_PAIRS` and `NON_TEXT_PAIRS` tables; `checkContrast(resolved: ReadonlyMap<Role, Record<Mode, string>>): ThemeIssue[]`.
- Tables: `TEXT_PAIRS` (4.5) = the 15 foreground/background pairs in the "WCAG contrast of token pairs" block of `src/styles/tokens.test.ts`, plus the tone-as-text pairs from the "semantic tone colours as text" block there, plus `card-foreground` is already included; add `muted-foreground` on `card` only if the defaults pass it. `NON_TEXT_PAIRS` (3.0) = `ring` on `background`, `card` and `sidebar`. `message` reads like `muted-foreground on muted (dark): 3.8:1, needs 4.5:1`. A pair is skipped when either colour carries alpha (the parser rejects it).

- [ ] **Step 1: Write failing tests:** `passes for the default tokens in both modes` (map built from `ROLE_DEFAULTS`; expects `[]`); `reports a failing pair with role, mode, measured and required ratios` (planted: `foreground` equal to `background`); `reports every failing pair, not just the first`; `skips pairs involving transparent colours without throwing`; `uses 3:1 for the ring and 4.5:1 for text`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** If a pair that is not in `tokens.test.ts` fails on the defaults, remove it and add a line to section 11 of the spec.
- [ ] **Step 4: Run** `... vitest run src/theme/contrast.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat: add theme contrast checks`.

### Task 6: The pipeline, `createTheme`, `validateTheme`, scope

**Files:**
- Modify: `packages/ui/src/theme/create-theme.ts`, `packages/ui/src/theme/index.ts`
- Test: `packages/ui/src/theme/create-theme.roles.test.ts` (new); existing tests and the Task 1 golden test stay as they are.

**Interfaces:**
- Consumes everything from Tasks 1 to 5.
- Produces (exported from `@azmr/ui/theme`): `validateTheme(options: ThemeOptions): ThemeIssue[]`; `class ThemeContrastError extends Error { readonly issues: readonly ThemeIssue[] }`; `ThemeConfigError`, `parseThemeConfig`, `parseThemeJson`, `ROLES`, `type Role`, `type Mode`, `type ThemeIssue`. `createTheme(options?: ThemeOptions): Theme` keeps its signature.
- Behaviour: internally collect `Map<Role, Record<Mode, string>>` while keeping today's insertion order, then write each as `light-dark(light, dark)`. Order of precedence per role and mode: derived value, then tint, then explicit `light`/`dark` override. When a role is overridden in one mode only, the other half is the derived value if one exists, else `ROLE_DEFAULTS`. `brand` is read as `primary`. `scope` must match `/^(?::root|[.#][A-Za-z_][\w-]*|\[data-[a-z-]+(?:="[\w-]+")?\])$/` and replaces `:root` in `css`; invalid scope throws `ThemeConfigError`. `createTheme` runs `checkContrast` on the full map (missing roles filled from `ROLE_DEFAULTS`) and throws `ThemeContrastError` **only when the options contain `tint`, `light` or `dark`**; legacy-only options skip the check because their derivation is already tested. `validateTheme` always checks.

- [ ] **Step 1: Write failing tests** in `create-theme.roles.test.ts`: `a brand-only config still emits only brand-derived variables` (no surface roles in `cssVariables`); `tint adds surface roles that lean toward the brand hue`; `a dark override leaves the light half at the default` (`--background` is `light-dark(<default light>, <override>)`); `a light override of a derived role keeps the derived dark half` (`primary`); `border keeps its transparent dark default unless overridden with an opaque colour`; `scrim override throws ThemeConfigError`; `an override that fails contrast throws ThemeContrastError naming role, mode and ratio`; `validateTheme returns the same issues without throwing`; `legacy options with a failing derived pair do not throw`; `brand and primary give identical output`; `scope replaces :root`; `rejects scope injection` (`"}body{display:none"`, `":root,body"`, `"a b"`, `""`); `css never contains a semicolon or brace from user input beyond the generated ones` (scan output for the injection fixtures from Task 3); `every BRANDS entry with tint "brand" produces a theme with no contrast issues` (shared list from `create-theme.test.ts`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** by refactoring the existing assignments into `set(role, light, dark)`; do not change derivation logic.
- [ ] **Step 4: Run the theme folder:** `pnpm --filter @azmr/ui exec vitest run src/theme` → all PASS including the golden test; then `check-types`.
- [ ] **Step 5: Commit** `feat: define themes per role for light and dark mode`.

### Task 7: Zod schema entry and parity

**Files:**
- Create: `packages/ui/src/theme/schema.ts`, `packages/ui/src/theme/schema.test.ts`
- Modify: `packages/ui/build/entries.json` (`server`: `"theme-schema": "src/theme/schema.ts"`), `packages/ui/package.json` (`exports["./theme-schema"]` with `types` first, mirroring `./theme`), `packages/ui/.size-limit.json` (budget entry for `dist/theme-schema.js`, set to measured size plus about 10 percent).

**Interfaces:**
- Consumes: `parseThemeConfig`, `ROLES`, `TINT_MAX`, zod.
- Produces: `ThemeConfigSchema` (strict `z.object`) and `type ThemeConfigInput = z.input<typeof ThemeConfigSchema>`. Every field carries `.describe("<label>")` and `.meta({ help: "<one sentence>" })`; colour fields are strings validated by the same parser as `parseThemeConfig`; `light` and `dark` are strict objects over the overridable roles; `branding` fields use `isAssetRef`.

- [ ] **Step 1: Write failing tests:** `parity: schema and parseThemeConfig agree on every fixture` (one shared table of at least 25 valid and invalid inputs reusing Task 3's, expect `ThemeConfigSchema.safeParse(x).success === (try parseThemeConfig(x) ok)`); `fieldsFromSchema(ThemeConfigSchema) yields a labelled field for brand, radius, font, density and tint` (import from `../components/zod/index.js`); `the schema entry is server-safe` (`// @vitest-environment node`, `expectServerSafe`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** and register the entry.
- [ ] **Step 4: Build and verify.** `pnpm --filter @azmr/ui build` (includes `verify-dist`) → PASS, zod stays external; `pnpm --filter @azmr/ui size` → PASS; `pnpm --filter @azmr/ui exec vitest run src/theme src/package-manifest.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat: add theme config Zod schema entry`.

### Task 8: Presets

**Files:**
- Create: `packages/ui/src/theme/presets.ts`, `packages/ui/src/theme/presets.test.ts`
- Modify: `packages/ui/build/entries.json` (`server`: `"theme-presets": "src/theme/presets.ts"`), `packages/ui/package.json` exports, `.size-limit.json`.

**Interfaces:**
- Produces: `THEME_PRESETS: { neutral: ThemeConfig; tinted: ThemeConfig; branded: ThemeConfig }`, each with `version: 1` and `name`, for a **made-up company** ("Harbourline", brand `#0F4C5C`). `neutral` = brand only; `tinted` = brand and `tint: "brand"`; `branded` = brand plus `light` and `dark` overrides (deep teal sidebar in light; deep teal page and card surfaces with a lighter teal primary in dark). Choose override values that pass `checkContrast`.

- [ ] **Step 1: Write failing tests:** `each preset parses with parseThemeConfig and the Zod schema`; `each preset builds with createTheme without throwing`; `each preset has no contrast issues in either mode` (via `validateTheme` and an independent culori check on the text pairs); `branded sets a different background in light and dark`; `uses only the Harbourline palette` (an allowlist of the preset's own colours, not a denylist of anyone else's).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** and register the entry. **Step 4: Build, verify, size** as in Task 7 → PASS.
- [ ] **Step 5: Commit** `feat: add three theme presets`.

### Task 9: Docs, demos and changeset

**Files:**
- Modify: `apps/site/content/docs/guide/theming.mdx`
- Create: demos registered the same way as `customising/class-override` (search for that name to find the registry); `.changeset/<short-name>.md`
- Possibly modify: whatever the site's entry-point coverage test reports.

- [ ] **Step 1: Add sections to `theming.mdx`:** "Define a whole theme" (the config), "Three ways to define a theme" (derive, tint, override, each with a runnable ```ts example=… result=…``` block in the page's existing style), "Presets" (a demo showing each preset in light and dark), "Contrast errors" (the exact error text), "Export and import" (`parseThemeJson`), "Strict CSPs" (apply variables through a `style` prop first; a `<style>` element needs a nonce), and "Scoping a theme".
- [ ] **Step 2: Add the demos** so the docs tests render and axe-check them.
- [ ] **Step 3: Write the changeset:** `@azmr/ui` minor, "Define themes per role for light and dark mode: tint, per-mode overrides, contrast checks, a Zod schema (`@azmr/ui/theme-schema`) and presets (`@azmr/ui/theme-presets`)."
- [ ] **Step 4: Run everything:** `pnpm turbo run test --concurrency=1`, `pnpm lint`, `pnpm --filter @azmr/ui check-types`, `pnpm audit --audit-level=high --ignore-registry-errors`. Expected: all PASS. If the site's entry-point coverage test names the two new entries, add them to the docs it checks and re-run.
- [ ] **Step 5: Commit** `docs: document theme schema and presets`, then push the branch and open a PR to `main` titled `feat: theme schema for light and dark mode`. Do not merge: wait for CI and read the review comment first.

---

## Self-review notes

- **Spec coverage:** T1 roles (Task 2), T2 explicit light and dark (Task 6), T3 three ways (Tasks 4, 6), T4 contrast (Tasks 5, 6), T5 serialisable config (Task 3), T6 Zod schema (Task 7), T7 legacy unchanged (Tasks 1, 6); presets (Task 8); security (Task 3 and 6 tests); docs and changeset (Task 9). Not built, by design: editor UI, persistence, shell and navigation (separate spec), web fonts by URL, SVG logos.
- **Spec change made while planning:** section 5.5 no longer checks `input` against `background`; the defaults fail it and dark values are transparent. Recorded in the spec.
- **Follow-ups, not in this plan:** adopt the schema in the Azmara app (its own PR; replaces the hand-written tokens in `globals.css`, keeps its own `--primary-text`, and must show visual parity with e2e and axe); add a `primary-text` role; the phase 2 org-admin theme form and per-organisation storage; the layout and navigation spec (two-level, module-aware).
- **Plan decisions the spec left to the builder:** tint values (`"brand"` = 0.015, maximum 0.04), asset caps (2,048 URL characters, 102,400 data-URI characters), SVG not allowed, stored configs use colour strings only, chart palette is not a role, presets live in their own entry, contrast errors throw only when tint or overrides are used.
