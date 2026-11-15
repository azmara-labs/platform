# Theme studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ThemeStudio` to `@azmr/ui`: one screen where a business admin sets the app name, a brand colour for light and for dark, and logos, sees a live Light/Dark preview, and gets back a validated `ThemeConfig` that keeps every setting the screen does not show.

**Architecture:** Three files with one job each, plus the entry. `studio-model.ts` is pure logic with no React: it turns a draft (strings) plus the incoming `ThemeConfig` into either a saveable config with its preview variables and colour notes, or field errors, or a developer-setting conflict. `theme-preview.tsx` draws a small made-up app frame from `cssVariables` on its own container. `theme-studio.tsx` is the screen: plain React state, `Field`, `Input`, `ColourInput`, `LogoUpload`, no react-hook-form and no zod. The package returns a config through `onSave`; storing it is the host app's job.

**Tech Stack:** React 19, Tailwind v4 tokens, Vitest with jsdom (canvas stubbed through `logo-upload/test-support.ts`), Testing Library, axe. Real browser check at the end.

**Spec:** `docs/superpowers/specs/2026-11-15-theme-studio-design.md` (sections 5 and 6; section 8 leaves names, props and file layout to the builder). This is PR 3 of four. PRs 0 to 2 (`brandDark`, `ColourInput`, `LogoUpload`) are merged on main.

## Global Constraints

- New entry `theme-studio`: `packages/ui/src/components/theme-studio/` (`index.ts`, `theme-studio.tsx`, `theme-preview.tsx`, `studio-model.ts`, `messages.ts`). A client component. Imports only from `../../theme/index.js` (the server-safe entry) and, for helpers that entry does not export, `../../theme/colour.js` (`parseColour`, `encodedSrgb`) and `../../theme/config.js` (`isDisplayText`, `isAssetRef`, `isColourString`), plus other components. No `react-hook-form`, no `zod`, no new dependency. The dependency-free `@azmr/ui/theme` entry does not change (7.13 kB of 7.5 kB).
- Exports: `ThemeStudio`, `ThemeStudioProps`, `ThemePreview`, `ThemePreviewProps`, `StudioMessages`. The model's functions stay internal. Not added to `src/index.ts` (same as `PasswordInput` and `LogoUpload`).
- Where each choice lands: app name `branding.appName`; light colour `brand`; dark colour `brandDark`; logos `branding.logo` and `branding.logoDark`. If the incoming config has `primary` and no `brand`, the colour is written back to `primary` (they are aliases and giving both is an error).
- Nothing is required: a blank name, colour or logo means "use the app's default". An empty optional value is deleted from the output, never saved as `""`. An emptied `branding` object is deleted unless `favicon` is still there.
- Every other key of the incoming config is copied through untouched: `version`, `name`, `radius`, `font`, `density`, `tint`, `light`, `dark`, the other colours, `branding.favicon`. The studio adds `version: 1` only when the incoming config had none and the output is non-empty.
- A saveable result passes `parseThemeJson(JSON.stringify(config))` and `validateTheme(config)` with no issues. `parseThemeJson` is used so the 131,072 character total is checked too.
- The studio never changes the live page: the preview sets `--*` variables and `color-scheme` on its own container through the `style` prop only. No `dangerouslySetInnerHTML`, no raw colours (`CONVENTIONS.md`), preview colours come only from tokens (`bg-background`, `text-primary-text`, ...).
- Copy is New Zealand English ("colour") and comes from `messages` (props with the English defaults below), the way `LogoUpload` takes its labels. The note under a colour never promises the colour is kept exactly.
- 44px touch targets and focus rings come from the existing controls. A phone-width layout is one column; two columns from the `lg` breakpoint.
- Conventional commits, **no AI attribution lines** (CLAUDE.md overrides any default), one commit per task. Branch `feat/PAZM-138-theme-studio` off `main`. No client names or colours anywhere: the demo and docs use the made-up company Harbour & Pine. Read every number in the PR from run output; set the `theme-studio` size limit to the measured size rounded up to the next 0.5 kB and say so.

## Review Focus

- A config with every hidden setting (`radius`, `font`, `density`, `tint`, `light`/`dark` overrides, `favicon`, `name`, the `primary` alias, `version`) comes out unchanged except the keys the admin edited. (Task 2)
- Clearing an optional field removes its key; whitespace-only, 81-character, control-character names and `#12`, `red`, ` #ABC ` colours are handled (trim, accept 3-digit and upper case, refuse the rest). (Task 2)
- A hidden developer setting that conflicts with the new colour, or an incoming config that already fails: Save stays disabled, the message names the role and carries the library's text, and the hidden setting is never dropped or edited. (Task 2, Task 4)
- Saving while a logo is still being prepared, and a logo refused as too big: the old logo stays, the refusal is shown next to the control, and `onSave` never receives a half-prepared value. (Task 1, Task 4)
- The preview never touches `document.documentElement`, and a `color-scheme` on the preview container, not a class, makes `light-dark()` resolve. (Task 3, Task 4)
- The host re-supplying `value` after a save becomes the new baseline for Reset and for "has changes". (Task 4)

---

### Task 1: `LogoUpload` reports when it is busy

The studio must not save while a file is still being shrunk. This is an additive prop on the merged component.

**Files:**
- Modify: `packages/ui/src/components/logo-upload/logo-upload.tsx` (props, effect around the existing `busy` state at ~line 151)
- Modify: `apps/site/content/docs/components/logo-upload.mdx` (props table)
- Test: `packages/ui/src/components/logo-upload/logo-upload.review.test.tsx` (add a `describe`)

**Interfaces:**
- Produces: `LogoUploadProps.onBusyChange?: (busy: boolean) => void`: called with `true` when preparation of a chosen file starts and with `false` once, when the latest choice has finished (fitted, refused or failed). A choice superseded by a newer one does not produce `false`. Not called on unmount.

- [ ] **Step 1: Write the failing tests** in a new `describe("LogoUpload: onBusyChange")`, using `stubBrowser` and the existing helpers: `"reports true then false around a good upload"`; `"reports false after a refused file"` (GIF bytes); `"stays busy while a second file supersedes the first and reports false once"` (record the calls: exactly `[true, false]`); `"is not called when nothing is chosen"`.
- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/logo-upload/logo-upload.review.test.tsx`
Expected: FAIL (the callback is never called).
- [ ] **Step 3: Implement** the prop in `logo-upload.tsx`: call it from the same place `busy` is set, keeping the latest callback in a ref so an inline function does not re-run effects. Add the row to the docs props table.
- [ ] **Step 4: Run to verify they pass**, then `pnpm -F @azmr/ui exec vitest run src/components/logo-upload` and `pnpm -F @azmr/ui check-types`.
Expected: PASS, all `logo-upload` tests green.
- [ ] **Step 5: Commit** `feat: add onBusyChange to LogoUpload (PAZM-138)`.

---

### Task 2: `studio-model` and `messages`

**Files:**
- Create: `packages/ui/src/components/theme-studio/messages.ts`, `studio-model.ts`
- Test: `packages/ui/src/components/theme-studio/studio-model.test.ts`

**Interfaces:**
- Consumes: from `../../theme/index.js` `createTheme`, `validateTheme`, `parseThemeJson`, `ThemeConfigError`, `ThemeContrastError`, `type ThemeConfig`; from `../../theme/colour.js` `parseColour`, `encodedSrgb`, `clampToGamut`; from `../../theme/config.js` `isDisplayText`, `isAssetRef`.
- Produces (`messages.ts`):
  ```ts
  export interface StudioMessages { /* every key below, all strings */ }
  export const DEFAULT_MESSAGES: StudioMessages;
  export function fill(template: string, values: Record<string, string>): string; // replaces {name}
  ```
  Keys and English defaults: `appNameLabel` "App name"; `appNameHelp` "Shown next to your logo."; `lightHeading` "Light mode"; `darkHeading` "Dark mode"; `brandLabel` "Brand colour"; `lightSwatch` "Choose light mode colour"; `darkSwatch` "Choose dark mode colour"; `darkOptional` "Optional. Leave empty to use your light mode colour, adjusted for dark."; `logoLabel` "Logo"; `statusReadable` "Readable as it is."; `statusAdjusted` "Adjusted slightly so buttons and text stay readable. Links and labels use {shade}."; `statusDarkDerived` "Uses your light mode colour, adjusted for dark. Links and labels use {shade}."; `errorAppName` "App name must be 1 to 80 characters, with no control characters."; `errorColour` "{field} must be a colour such as #1a73e8."; `errorDarkNeedsLight` "Choose a light mode colour first, or clear this one."; `conflict` "A setting made by a developer conflicts with this change, so it cannot be saved yet. Ask a developer to look at: {roles}."; `conflictDetails` "Details for the developer: {issues}"; `save` "Save branding"; `saving` "Saving..."; `saveFailed` "Branding could not be saved. Try again."; `reset` "Reset"; `preview` "Preview"; `previewMode` "Preview mode"; `modeLight` "Light"; `modeDark` "Dark"; `previewDescription` "Preview of the {mode} theme: a header with your logo and app name, a card, a link and a button."
- Produces (`studio-model.ts`):
  ```ts
  export interface StudioDraft { appName: string; brand: string; brandDark: string; logo: string; logoDark: string } // "" = empty
  export type StudioField = "appName" | "brand" | "brandDark";
  export interface ColourNote { mode: "light" | "dark"; kind: "readable" | "adjusted" | "dark-derived"; shade: string } // shade: #rrggbb of the --primary-text role in that mode
  export type StudioResult =
    | { ok: true; config: ThemeConfig; cssVariables: Record<string, string>; notes: ColourNote[] }
    | { ok: false; errors: Partial<Record<StudioField, string>>; conflict?: { roles: string[]; issues: string[] } };
  export function draftFromConfig(config?: ThemeConfig): StudioDraft;
  export function evaluateDraft(base: ThemeConfig | undefined, draft: StudioDraft, messages?: StudioMessages): StudioResult;
  export function isDirty(base: ThemeConfig | undefined, draft: StudioDraft): boolean; // draft differs from draftFromConfig(base)
  ```

- [ ] **Step 1: Write the failing tests** (made-up fixtures only). By name:
  - `draftFromConfig`: `"reads brand, brandDark, appName and both logos"`, `"reads the primary alias when there is no brand"`, `"gives empty strings for a missing config"`.
  - Round trip: `"a config with every hidden setting survives unchanged"`: base has `version: 1`, `name`, `radius`, `font`, `density`, `tint`, `light: { background: ... }`, `dark: { ... }` (overrides that pass `validateTheme` with the base brand), `branding.favicon`, plus `secondary`; edit only name and brand; `expect(result.config).toEqual({ ...base, brand: <new>, branding: { ...base.branding, appName: <new> } })`. `"writes back to primary when the config used the primary alias"`. `"adds version 1 only when missing and the output is not empty"`.
  - Empties: `"clearing the dark colour and dark logo removes brandDark and logoDark"` (no `""` anywhere in `JSON.stringify`), `"removes branding when it ends up empty but keeps it with a favicon"`, `"trims names and colours; accepts #ABC and upper case; stores the colour as typed after trimming"`.
  - Field errors (`ok: false`, no config): `"a whitespace-only name is treated as empty"` (ok, no `appName` key), `"refuses an 81 character name and a name with a control character"`, `"refuses #12, red and oklch(2 0 0) for the light colour"` (message from `errorColour` with `{field}` = "Light mode colour"), `"refuses a bad dark colour naming Dark mode colour"`, `"refuses a dark colour with no light colour"` (`errorDarkNeedsLight` on `brandDark`).
  - Notes: `"a colour that is used as it is reads readable"` (choose a mid-dark blue that `createTheme` leaves alone in light: derive the expected from `createTheme` in the test, do not hard-code), `"a pale colour reads adjusted and quotes the library's primary-text shade as hex"` (assert the shade equals the hex of the `--primary-text` light value from `createTheme(config)`), `"an empty dark colour gives a dark-derived note"`, `"no brand colour gives no notes"`. Include one pin: `"createTheme writes light-dark(a, b) for --primary and --primary-text"` so a library format change fails here.
  - Conflicts: `"a hidden override that fails contrast with the new colour blocks, names the role, quotes the library message and never drops the override"`: build the base so `validateTheme(base)` is `[]` and `validateTheme({...base, brand})` is not (check both in the test first); result `ok: false`, `conflict.roles` contains the role, `conflict.issues` contains the issue's `message`. `"an incoming config that already fails is blocked the same way"`. `"a pale yellow with no overrides is adjusted, not blocked"` (ok, `validateTheme(result.config)` is `[]`).
  - Size: `"a config over the theme JSON limit is blocked"` (three max-size logos plus a long favicon).
  - `isDirty`: `"is false for the draft read from the config and true after any field changes"`.
- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/theme-studio/studio-model.test.ts`
Expected: FAIL, modules do not exist.
- [ ] **Step 3: Implement** `messages.ts` and `studio-model.ts`. Order inside `evaluateDraft`: (1) field checks: `isDisplayText` for a non-empty name, `parseColour(text, ..., "text")` in try/catch for colours, dark-without-light; any error returns `{ ok: false, errors }` and stops. (2) Build the config from a structured copy of `base` (never mutate it). (3) `parseThemeJson(JSON.stringify(config))` and `validateTheme(config)` inside try/catch (`ThemeConfigError` gives `issues` strings; a `ThemeIssue` gives `message` and its `role` and `against`); any failure is a `conflict` (the admin's own fields were already checked, so what is left is a hidden setting or an incoming problem). (4) `createTheme(config)` for `cssVariables`; a `ThemeContrastError` here is also a conflict. (5) Notes: split `light-dark(a, b)` on the first `, ` (oklch text has no commas), convert the role value to `#rrggbb` with `parseColour` then `clampToGamut` then `encodedSrgb`; `readable` when both `--primary` and `--primary-text` for that mode equal the typed colour as hex, else `adjusted`; the dark note is `dark-derived` when `brandDark` is empty.
- [ ] **Step 4: Run to verify they pass**, then `pnpm -F @azmr/ui check-types`. Mutation check, once: change the output to drop `branding.favicon` and watch the round-trip test fail, then undo.
Expected: PASS.
- [ ] **Step 5: Commit** `feat: add the theme studio model (PAZM-138)`.

---

### Task 3: `ThemePreview`

**Files:**
- Create: `packages/ui/src/components/theme-studio/theme-preview.tsx`
- Test: `theme-preview.test.tsx`, `theme-preview.ssr.test.tsx` (same folder)

**Interfaces:**
- Consumes: `messages.ts` (`previewDescription`, `modeLight`, `modeDark`, `fill`); `Card`, `Badge` from `../display/index.js`; `Button` from `../button/index.js`.
- Produces:
  ```ts
  export interface ThemePreviewProps {
    cssVariables: Record<string, string>;
    mode: "light" | "dark";
    appName?: string;
    logo?: string;      // used in light mode, and in dark when logoDark is missing
    logoDark?: string;
    messages?: Pick<StudioMessages, "previewDescription" | "modeLight" | "modeDark">;
    className?: string;
  }
  export function ThemePreview(props: ThemePreviewProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests:** `"sets the theme variables and color-scheme on its own container only"` (assert on the container's `style`; if jsdom drops `color-scheme`, assert on `renderServer` output and note it in the ledger; `document.documentElement.getAttribute("style")` stays empty); `"color-scheme follows mode"`; `"uses logoDark in dark and falls back to logo"`; `"renders an img only for a data:image png/jpeg/webp or https value"` (a `javascript:` and an SVG data URI render no img); `"shows the app name and a placeholder when there is none"` (made-up text, no empty heading); `"the sample is inert and aria-hidden, and a visually hidden sentence describes it"` (the sentence uses `fill(previewDescription, { mode })`); `"has no axe violations in light and dark"`; SSR: `"renders with no browser globals"` (`expectServerSafe`).
- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/theme-studio/theme-preview`
Expected: FAIL, module does not exist.
- [ ] **Step 3: Implement** `ThemePreview`: a container `div` with `style={{ ...cssVariables, colorScheme: mode }}`, `bg-background text-foreground`, rounded border from tokens; a visually hidden `<p>` description; the sample inside a `div` with `inert` and `aria-hidden`: header (logo `<img>` guarded by the same pattern as `LogoUpload`'s preview, name), a `Card` with a heading, a paragraph, a link-styled `span` using `text-primary-text` and underline, a `Badge`, and a primary `Button`. Do not use `<a>` or `<button>` elements that are tab stops: inert covers them, and a test asserts no element in the sample is focusable.
- [ ] **Step 4: Run to verify they pass**, then `pnpm -F @azmr/ui check-types`.
Expected: PASS.
- [ ] **Step 5: Commit** `feat: add ThemePreview (PAZM-138)`.

---

### Task 4: `ThemeStudio` and its entry

**Files:**
- Create: `packages/ui/src/components/theme-studio/theme-studio.tsx`, `index.ts`
- Test: `theme-studio.test.tsx`, `theme-studio.ssr.test.tsx` (same folder)

**Interfaces:**
- Consumes: Task 1 `onBusyChange`; Task 2 `evaluateDraft`, `draftFromConfig`, `isDirty`, `DEFAULT_MESSAGES`, `fill`, `StudioMessages`; Task 3 `ThemePreview`; `Field`, `Input`, `ColourInput`, `LogoUpload`, `Button`, `Alert`, `ToggleGroup`/`ToggleGroupItem`.
- Produces:
  ```ts
  export interface ThemeStudioProps {
    /** The current theme, or none. Reset returns to it. A new value (after a save) becomes the new baseline. */
    value?: ThemeConfig;
    /** Called with the validated config. May return a promise; a rejection shows `saveFailed`. */
    onSave: (config: ThemeConfig) => void | Promise<void>;
    /** Disable every control, for example while the host loads the theme. */
    disabled?: boolean;
    messages?: Partial<StudioMessages>;
    className?: string;
  }
  export function ThemeStudio(props: ThemeStudioProps): JSX.Element;
  ```
  `index.ts` also exports `ThemePreview`, `ThemePreviewProps`, `StudioMessages`.

Behaviour to build (the tests below pin it): draft state from `draftFromConfig(value)`; `evaluateDraft` on every change; the preview shows the last `ok` result's `cssVariables` (kept in state, never cleared by an invalid draft; with no good result yet it shows the library defaults from `createTheme({})`); a field's error appears once it has been blurred; **Save** is disabled unless the draft is dirty, the result is `ok`, no logo is being prepared (`onBusyChange`) and no save is running; Reset restores the baseline and clears touched state and is disabled when not dirty; the conflict shows in an `Alert variant="warning"` above the buttons whenever it exists, even before any edit, with `conflictDetails` below it; each colour's note is the `Field` description; the two colour boxes are `fieldset`s with a legend; the Light/Dark control is a single-select `ToggleGroup` that ignores a release (always one pressed). Layout: one column, `lg:grid-cols-2` with the preview sticky from `lg`.

- [ ] **Step 1: Write the failing tests** (made-up company Harbour & Pine; `stubBrowser` from `../logo-upload/test-support.js` for uploads). By name:
  - Basics: `"shows empty fields and no notes for no value"`; `"shows the incoming name, colours and logos"`; `"uses distinct swatch names for the light and dark colours"`.
  - Live preview: `"typing a valid colour updates the preview variables straight away"`; `"typing an invalid colour keeps the last good preview and shows the error after blur"` (error text names "Light mode colour", the field is aria-invalid, the preview variables are unchanged); `"the toggle switches the preview to dark and sets color-scheme dark on the preview container only"`; `"the live page is untouched"` (`document.documentElement` has no `--primary` and no `color-scheme` style, before and after toggling).
  - Notes: `"shows Readable or the adjusted sentence with the shade under each colour"`; `"an empty dark colour says it uses the light colour, adjusted for dark"`.
  - Save: `"Save is disabled until something changes"`; `"Save calls onSave once with a config that passes parseThemeJson and validateTheme"`; `"a config with hidden developer settings comes back with them unchanged"`; `"an unreadable result cannot be saved"` (hidden override conflict: Save disabled, the alert names the role and quotes the library text, `onSave` not called, and typing a colour that no longer conflicts re-enables it); `"an incoming theme that already fails shows the conflict before any edit"`; `"a rejected onSave shows the failure message and keeps the draft"`; `"Save is disabled while a logo is being prepared"` (hold the stubbed decode open, drop a file, assert disabled, release, assert enabled).
  - Logo: `"a logo that cannot fit is reported next to the control and the old logo stays"` (stub `toDataURL` always too long; the alert text is the `cannot-fit` message; `onSave` after another edit still carries the old logo); `"choosing a logo updates the preview and the saved config"`; `"removing the dark logo deletes logoDark from the saved config"`.
  - Reset and baseline: `"Reset restores the incoming value and clears errors"`; `"a new value prop after a save becomes the baseline: Save disabled again and Reset keeps the new value"`.
  - Keyboard: `"can be completed with the keyboard alone"` (Tab to name, type, Tab to the light colour, type, Tab past the swatch and logo to Save, Enter) and `"the Light/Dark toggle moves with the arrow keys and always keeps one pressed"`.
  - A11y and server: `"has no axe violations with the preview in light and in dark, and with an error and a conflict showing"`; SSR `"renders with no browser globals"` (`expectServerSafe`) and `"renders a conflict from the first paint"`.
- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/theme-studio/theme-studio`
Expected: FAIL, module does not exist.
- [ ] **Step 3: Implement** `theme-studio.tsx` and `index.ts` to the behaviour above. `LogoUpload` goes in a `Field` with a function child (`{(control) => <LogoUpload {...control} .../>}`), and so does each `ColourInput`. Reset on a new `value`: keep the previous serialised `value` in state and replace the draft when it changes (set state during render, no effect).
- [ ] **Step 4: Run to verify they pass**, then `pnpm -F @azmr/ui exec vitest run src/components/theme-studio src/components/logo-upload` and `pnpm -F @azmr/ui check-types`.
Expected: PASS.
- [ ] **Step 5: Commit** `feat: add ThemeStudio (PAZM-138)`.

---

### Task 5: Register the entry, docs, demo, size, changeset

**Files:**
- Modify: `packages/ui/build/entries.json` (client: `"theme-studio": "src/components/theme-studio/index.ts"`), `packages/ui/package.json` (exports, same shape as `logo-upload`), `packages/ui/.size-limit.json`, `packages/ui/README.md`, `apps/site/content/docs/components/meta.json`, `apps/site/content/docs/guide/server-components.mdx`, `apps/site/content/docs/guide/accessibility-reference.mdx` (copy how the `logo-upload` row was added: `git log -p -S"Logo upload" -- apps/site/content/docs/guide/accessibility-reference.mdx`), `apps/site/content/docs/guide/theming.mdx` (link from "Store and share a theme" or the intro of "A different brand colour for dark mode")
- Create: `apps/site/content/docs/components/theme-studio.mdx` (`group: Inputs`, `status: new`, `since: 0.14.0`, `interactive: true`), `apps/site/src/demos/theme-studio/studio.demo.tsx` (register in `names.ts`, `lazy.tsx`, `registry.ts`), `.changeset/theme-studio.md` (`"@azmr/ui": minor`)

**Interfaces:**
- Consumes: Task 4 `ThemeStudio`.

- [ ] **Step 1: Write the failing tests:** the site's own tests already enforce registration (`demos.test.tsx`, `lazy-demos.test.ts`) and docs structure; run them first with only the new demo file added so they fail on the missing registration.

Run: `pnpm -F @azmr/site test` after adding `theme-studio/studio` to `names.ts` only.
Expected: FAIL, the demo is not in the registry or lazy map.
- [ ] **Step 2: Implement the demo and registration.** The demo holds the saved config in state, starts from a made-up Harbour & Pine config that includes hidden settings (`radius`, `density`, a `tint`), and prints the returned JSON below the studio so the round trip is visible. Register in `names.ts`, `lazy.tsx`, `registry.ts`.
- [ ] **Step 3: Write the docs page.** Sections: Usage (demo); What it shows and what it keeps (the hidden settings pass through untouched); Wire it into your app (store the JSON, validate again on the server with `parseThemeJson` and `validateTheme`, render it in your layout; never trust the browser's copy); What the studio leaves out (secondary and status colours, tint, radius, font, density, role overrides, colour mode, SVG logos, saving); When Save is disabled (the developer-setting conflict); Props table (`value`, `onSave`, `disabled`, `messages`, `className`); Accessibility; Keyboard. State plainly that it does not save, fetch, or apply the theme. Link it from the theming guide.
- [ ] **Step 4: Register the entry and set the size.** `pnpm -F @azmr/ui build`, then `pnpm -F @azmr/ui size`; add the `.size-limit.json` entry at the measured size rounded up to the next 0.5 kB, and record the measured number for the PR. Confirm `@azmr/ui/theme` is still 7.13 kB and no other limit moved. Add README, meta, server-components, accessibility-reference rows and the changeset (describe `ThemeStudio`, `ThemePreview`, and `LogoUpload`'s new `onBusyChange`).
- [ ] **Step 5: Run everything and commit**

Run: `pnpm test` (read the counts), `pnpm build`, `pnpm check-types`, `pnpm lint`, `pnpm -F @azmr/ui size`.
Expected: all pass. If `form.test.tsx` "lists schema errors in the summary..." fails, rerun `pnpm -F @azmr/ui test` once: it is a known flake under the combined run (ATLAS-QUEUE), and say so in the PR.
Commit `feat: add the theme studio docs, demo and entry (PAZM-138)`.

---

### Task 6: Real-browser check

No code unless it finds a bug (then fix test-first and commit). Build the docs site (`pnpm -F @azmr/site build`), serve it on a free local port, and in Chrome on the theme studio page:

- [ ] Type a colour: the preview changes at once and the page around it does not. Toggle Dark: the preview flips, the page does not.
- [ ] A pale yellow shows the adjusted sentence with a shade; the preview button is still readable.
- [ ] A deep navy as the dark colour is adjusted, not refused.
- [ ] A 2000 x 2000 transparent PNG becomes the light logo and shows in the preview; a 12 MB file and an SVG named `.png` are refused with the right message and the old logo stays.
- [ ] Save prints JSON in the demo that includes the hidden `radius`, `density` and `tint`.
- [ ] Tab through with the keyboard only; focus rings are visible in light and dark.
- [ ] Look at the layout in a desktop-width window and, with devtools device emulation if the tool allows it, a phone width. The window-resize tool does not change the real viewport (memory note), so a phone-width result is reported as not checked, and the user is asked to look on a real phone.

Then: review package, whole-branch review on the most capable model available (say so in the PR if a weaker model had to be used), one fix pass for Critical and Important only, push with `LEFTHOOK_EXCLUDE=test`, PR body with numbers read from the run output, wait for CI, read the `claude-review` comment, and merge under the standing rule. Do not merge release PR #275.
