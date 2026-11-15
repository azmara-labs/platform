# `brandDark` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a theme give dark mode its own brand colour, derived and contrast-adjusted exactly like the light one, so the theme studio (PAZM-138) can offer "one brand colour per mode".

**Architecture:** `brandDark` is an optional colour next to `brand`/`primary`. `createTheme` derives the seven brand roles twice, light half from `brand`, dark half from `brandDark ?? brand`. Everything else (tint, secondary, status colours, overrides) is unchanged. The stored-config parser and the Zod schema accept the key and refuse it without a brand.

**Tech Stack:** TypeScript, Vitest, Zod 4 (`@azmr/ui/theme-schema`), changesets, the docs site's executed examples.

**Spec:** `docs/superpowers/specs/2026-11-15-theme-studio-design.md` (section 4, "`brandDark` is additive"). This is PR 0 of four; the colour input, logo upload and studio get their own plans.

## Global Constraints

- Package `@azmr/ui`, folder `packages/ui/src/theme`. `@azmr/ui/theme` stays dependency-free and server-safe; only `schema.ts` may import `zod`.
- Additive only: `version` stays `1`. Every existing `createTheme` output, and `create-theme.golden.test.ts`, must stay byte-identical (the golden file is not edited).
- `brandDark` is a colour accepted wherever `brand` is: `#rgb`, `#rrggbb`, `oklch(L C H)`, and `{ l, c, h }` in `createTheme` only. Stored configs hold text only.
- It needs a `brand` or `primary` alongside it, as `tint` does.
- Error text (exact): `brandDark needs a brand colour to pair with`.
- Roles that follow `brandDark` (dark half only): `primary`, `primary-foreground`, `primary-text`, `ring`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-ring`. Nothing else follows it, including `tint`.
- A dark override (`dark: { primary: ... }`) still wins over `brandDark`.
- Every value that reaches CSS is parsed, so `brandDark` goes through `parseColour` like `brand`.
- Conventional commits, no AI attribution lines, one commit per task. Branch `feat/PAZM-138-brand-dark` off `main`.
- New Zealand English in prose ("colour").

## Review Focus

- `brandDark` equal to `brand`: output identical to `brand` alone. (Task 1)
- Extreme `brandDark` (`#000000`, `#ffffff`, `#ffff00`): derived and passes `validateTheme` with no issues. (Task 1)
- `brandDark` with `primary` instead of `brand`: works. (Task 1)
- `brandDark` with a `dark.primary` override: the override wins; the other six roles still follow `brandDark`. (Task 1)
- `brandDark: undefined` counts as absent, in `createTheme`, `parseThemeConfig` and the schema. (Tasks 1 to 3)
- CSS-injection strings in `brandDark` are refused like they are in `brand`. (Task 1)

---

### Task 1: Derive the dark half from `brandDark` in `createTheme`

**Files:**
- Modify: `packages/ui/src/theme/create-theme.ts` (the `ThemeOptions` interface near line 55, and `resolveTheme` near lines 402-428)
- Test: `packages/ui/src/theme/create-theme.test.ts` (new `describe` block)

**Interfaces:**
- Produces: `ThemeOptions.brandDark?: string | Oklch`.
- Behaviour: with `brand` (or `primary`) and `brandDark`, for each of the seven roles above, `light-dark(A, B)` has `A` as `brand` alone gives and `B` as `{ brand: brandDark }` alone gives. Without `brandDark` nothing changes.

- [ ] **Step 1: Write the failing tests** in a new `describe("createTheme: brandDark", ...)`. Helpers: `BRAND_VARS` = the seven variables (`--primary`, `--primary-foreground`, `--primary-text`, `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-ring`); `halves(value)` splits `light-dark(oklch(...), oklch(...))` with `/^light-dark\((oklch\([^)]*\)), (oklch\([^)]*\))\)$/`. Tests, by name:
  - `"light half from brand and dark half from brandDark for every brand role"`: with `{ brand: "#1E88E5", brandDark: "#0F4C5C" }`, for each `BRAND_VARS`, light half equals that of `createTheme({ brand: "#1E88E5" })` and dark half equals that of `createTheme({ brand: "#0F4C5C" })`.
  - `"equal to brand gives the same output as brand alone"`: `createTheme({ brand: X, brandDark: X }).cssVariables` deep-equals `createTheme({ brand: X }).cssVariables` for `X = "#1E88E5"`.
  - `"works with primary instead of brand"`: `{ primary: "#1E88E5", brandDark: "#0F4C5C" }` equals the `brand` version.
  - `"leaves tint, secondary and status roles alone"`: for `{ brand, tint: "brand", secondary: "#808080", success: "#2E7D32" }` the variables outside `BRAND_VARS` are identical with and without `brandDark`.
  - `"derives and passes contrast for extreme dark colours"`: for `"#000000"`, `"#ffffff"`, `"#ffff00"`, `validateTheme({ brand: "#1E88E5", brandDark: c })` is `[]` and `createTheme` does not throw.
  - `"a dark.primary override wins over brandDark"`: `{ brand, brandDark, dark: { primary: "#112233" } }` has `--primary` dark half `oklch` of `#112233` and the other six roles' dark halves still equal the `brandDark`-only ones.
  - `"needs a brand"`: `createTheme({ brandDark: "#0F4C5C" })` and `validateTheme({ brandDark: "#0F4C5C" })` throw `ThemeConfigError` with message containing `brandDark needs a brand colour to pair with`.
  - `"undefined counts as absent"`: `createTheme({ brand, brandDark: undefined })` deep-equals `createTheme({ brand })`.
  - `"refuses CSS injection"`: for each string the existing injection test uses for `brand` (reuse its list), `createTheme({ brand: "#1E88E5", brandDark: s })` throws.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/theme/create-theme.test.ts`
Expected: the new tests FAIL (brandDark ignored, or a type error on the unknown option); existing tests pass.

- [ ] **Step 3: Implement.** Add `brandDark?: string | Oklch` to `ThemeOptions` with a doc comment ("A separate brand colour for dark mode, derived and adjusted like `brand`. Needs `brand` or `primary`."). In `resolveTheme`, parse `options.brandDark` with `parseColour(options.brandDark, "brandDark")` when defined, throw `ThemeConfigError(["brandDark needs a brand colour to pair with"])` when it is defined and `brandInput` is undefined, and compute the dark halves of `primary`, `primary-foreground`, `primary-text`, `ring`, `sidebar-primary`, `sidebar-primary-foreground` and `sidebar-ring` from `darkBrand = parsed brandDark ?? brand`. `brandColour` (used for tint) stays the light brand.

- [ ] **Step 4: Run to verify they pass, and that nothing else moved**

Run: `pnpm -F @azmr/ui exec vitest run src/theme`
Expected: all theme tests PASS, including `create-theme.golden.test.ts` untouched.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/create-theme.ts packages/ui/src/theme/create-theme.test.ts
git commit -m "feat: let createTheme take a separate dark mode brand colour (PAZM-138)"
```

### Task 2: Accept `brandDark` in a stored config

**Files:**
- Modify: `packages/ui/src/theme/config.ts` (`ColourOption` near line 11, `ThemeConfig` near line 27, `TOP_LEVEL_KEYS` and `COLOUR_KEYS` near lines 177-205, the "tint needs a brand" check in `parseThemeConfig`)
- Test: `packages/ui/src/theme/config.test.ts`

**Interfaces:**
- Consumes: `ThemeOptions.brandDark` from Task 1.
- Produces: `ThemeConfig.brandDark?: string`; `parseThemeConfig` keeps it in its output.

- [ ] **Step 1: Write the failing tests** in `config.test.ts`:
  - `"keeps brandDark"`: `parseThemeConfig({ brand: "#1E88E5", brandDark: "#0F4C5C" })` returns an object with both.
  - `"accepts brandDark with primary"`.
  - `"refuses brandDark without a brand"`: throws `ThemeConfigError`, `issues` contains `brandDark needs a brand colour to pair with`.
  - `"refuses a brandDark that is not a colour"`: `brandDark: "red; }"` and `brandDark: 3` each throw with an issue naming `brandDark`.
  - `"brandDark undefined counts as absent"`: `{ brand, brandDark: undefined }` parses and the output has no `brandDark` key.
  - `"a parsed config can be passed to createTheme"`: type-level and runtime: `createTheme(parseThemeConfig({ brand, brandDark }))` does not throw.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/theme/config.test.ts`
Expected: FAIL (`unknown key "brandDark"`).

- [ ] **Step 3: Implement.** Add `"brandDark"` to `ColourOption`, to `ThemeConfig` as `brandDark?: string`, to `TOP_LEVEL_KEYS` and to `COLOUR_KEYS`; add the "needs a brand" issue alongside the tint one, using the exact text in Global Constraints.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm -F @azmr/ui exec vitest run src/theme/config.test.ts && pnpm -F @azmr/ui check-types`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/config.ts packages/ui/src/theme/config.test.ts
git commit -m "feat: accept brandDark in a stored theme config (PAZM-138)"
```

### Task 3: Add `brandDark` to the Zod schema

**Files:**
- Modify: `packages/ui/src/theme/schema.ts` (after the `brand` field near line 53, and a third `.refine` after the tint one near line 97)
- Test: `packages/ui/src/theme/schema.test.ts` (the shared valid and invalid tables)

**Interfaces:**
- Consumes: Task 2's behaviour; the schema must give the same accept or reject answer as `parseThemeConfig` for every row.
- Produces: `ThemeConfigSchema` field `brandDark`, label `"Dark mode brand colour"`, help `"Optional. A separate brand colour for dark mode. Leave empty to use the brand colour."`, so `fieldsFromSchema` returns it with that label.

- [ ] **Step 1: Write the failing tests.** Add rows to the shared tables in `schema.test.ts` (valid: `brand + brandDark`, `primary + brandDark`; invalid: `brandDark` alone, `brandDark` not a colour, `brandDark` with an injection string; undefined case: `{ brand, brandDark: undefined }` valid). Add one test: `fieldsFromSchema(ThemeConfigSchema)` includes `{ name: "brandDark", label: "Dark mode brand colour", type: "text", required: false }`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/theme/schema.test.ts`
Expected: FAIL (unknown key, and no `brandDark` field).

- [ ] **Step 3: Implement** the field with the label and help above, and a refinement `brandDark` needs `brand` or `primary`, with message `brandDark needs a brand colour to pair with` and `path: ["brandDark"]`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm -F @azmr/ui exec vitest run src/theme`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/schema.ts packages/ui/src/theme/schema.test.ts
git commit -m "feat: add brandDark to the theme schema (PAZM-138)"
```

### Task 4: Docs, changeset and full check

**Files:**
- Modify: `apps/site/content/docs/guide/theming.mdx` (a short subsection after the three-ways list, near line 79; also the line near 161 that says what a `tint` needs)
- Create: `.changeset/brand-dark.md` (minor, `@azmr/ui`)
- Test: `apps/site/src/theming-guide.test.ts` runs the `example=` blocks, so the new example is the test.

**Interfaces:**
- Consumes: Tasks 1 to 3.

- [ ] **Step 1: Write the docs example first** as a fenced block `ts example=brand-dark result=darkPrimary`, in the same style as the `example=tint` block: `createTheme({ brand: "#1E88E5", brandDark: "#0F4C5C" })`, reading the `--primary` dark half, with the `// =>` line left for the run to fill. Run `pnpm -F @azmr/site exec vitest run src/theming-guide.test.ts` and confirm it FAILS on the missing or wrong `// =>` value.

- [ ] **Step 2: Fill in the recorded result** from that run's output (copy it, do not compute it by hand). Write the prose: `brandDark` is an optional second brand colour for dark mode, derived and adjusted the same way as `brand`, and it needs a `brand`. Say that `tint` and every other colour keep following `brand`. Update the sentence near line 161 to say a `brandDark` also needs a `brand`.

- [ ] **Step 3: Add the changeset** `.changeset/brand-dark.md`:
```md
---
"@azmr/ui": minor
---

Add `brandDark`, an optional second brand colour for dark mode. `createTheme` derives `primary`, `primary-foreground`, `primary-text`, `ring`, `sidebar-primary`, `sidebar-primary-foreground` and `sidebar-ring` for dark mode from it, and adjusts it for contrast like `brand`. It needs a `brand` or `primary`, and a stored theme and `ThemeConfigSchema` accept it. Output for themes without it does not change.
```

- [ ] **Step 4: Run everything**

Run: `pnpm build && pnpm test && pnpm check-types && pnpm lint`
Expected: all PASS. Read the counts from the output for the PR body; do not quote them from memory.

- [ ] **Step 5: Commit**

```bash
git add apps/site/content/docs/guide/theming.mdx .changeset/brand-dark.md
git commit -m "docs: document brandDark and add the changeset (PAZM-138)"
```
