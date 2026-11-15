# `ColourInput` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic, accessible colour input to `@azmr/ui`: a text field for a hex colour next to a native colour swatch, usable inside `Field` and with react-hook-form `register()`.

**Architecture:** `ColourInput` is the existing `Input` (the real `<input>`, so `ref` and `register()` work) plus a native `<input type="color">` swatch in a small wrapper. Picking a colour writes the lower-case `#rrggbb` into the text input and dispatches a real `input` event on it, so the text input's own `onChange` and `onValueChange` fire through one path, controlled or not. It does no validation; invalid state comes from `Field` or `aria-invalid`.

**Tech Stack:** React 19, Base UI `Input` via `src/primitives/input.ts`, Tailwind v4 tokens, Vitest with Testing Library, axe, react-hook-form.

**Spec:** `docs/superpowers/specs/2026-11-15-theme-studio-design.md` (section 5.2, item 1). This is PR 1 of four.

## Global Constraints

- Lives in the existing `input` entry: file `packages/ui/src/components/input/colour-input.tsx`, exported from `src/components/input/index.ts` and from `src/index.ts`. No new entry, no change to `build/entries.json` or `package.json` exports. It is a client component like `Input`.
- Generic: nothing theme-specific, no import from `src/theme`. No raw colours in styles (`CONVENTIONS.md`, `no-raw-colour`); a colour literal in code needs `conventions-ignore: <reason>` on that line.
- `ref` is the text input. Every prop of `InputProps` passes to the text input except `type`, `className` and `children`. New prop: `swatchLabel?: string`, default `"Choose a colour"`.
- `className` goes through `cn()` last, on the outer wrapper (layout and width); the text input keeps the `Input` styles.
- Picker output is always lower-case `#rrggbb`. Typed text is passed through unchanged.
- The swatch follows the text only for `#rgb` and `#rrggbb` (any case). Anything else (empty, `oklch(...)`, `red`) leaves the swatch showing nothing for the value: it carries `data-empty` and reduced opacity.
- Controls are at least as tall as the density control height token and at least 44px wide for the swatch; both show the full-strength focus ring; `disabled` disables both.
- Tab order is DOM order: swatch, then text input. The label from `Field` is for the text input.
- No `dangerouslySetInnerHTML`. Docs and copy in New Zealand English ("colour").
- Conventional commits, no AI attribution lines, one commit per task. Branch `feat/PAZM-138-colour-input` off `main`.
- Do not widen the `input` size budget without saying so in the PR; read the number from `pnpm --filter @azmr/ui size`.

## Review Focus

- Controlled with a parent that ignores the change: the text keeps the parent's value, `onValueChange` still reports the pick. (Task 1)
- `register()` with `defaultValues`: the swatch shows the default on first paint, and a pick updates the form value and marks it dirty. (Task 2)
- A 3-digit hex, upper-case hex and a value with surrounding spaces: the swatch handles them without throwing. (Task 1)
- Reset of a form (`reset()` with a new value) moves the swatch. (Task 2)
- Server render with no browser globals. (Task 2)
- Disabled and `readOnly`: neither control changes the value. (Task 1)

---

### Task 1: `ColourInput` behaviour

**Files:**
- Create: `packages/ui/src/components/input/colour-input.tsx`
- Modify: `packages/ui/src/components/input/index.ts`, `packages/ui/src/index.ts` (add `ColourInput`, `type ColourInputProps`)
- Test: `packages/ui/src/components/input/colour-input.test.tsx`

**Interfaces:**
- Consumes: `Input`, `InputProps` from `./input.js`; `cn` from `../../lib/cn.js`; test helpers `renderUi`, `setupUser` from `../../test-utils/index.js`.
- Produces:
  ```ts
  export interface ColourInputProps extends Omit<InputProps, "type" | "children"> {
    /** The swatch's accessible name. @default "Choose a colour" */
    swatchLabel?: string;
  }
  export const ColourInput: ForwardRefExoticComponent<ColourInputProps & RefAttributes<HTMLInputElement>>;
  ```
  Markup: an outer `<div data-slot="colour-input">` containing `<input type="color" data-slot="colour-input-swatch">` then the text `<input type="text">`.

- [ ] **Step 1: Write the failing tests** in `colour-input.test.tsx`. Helpers: `text = (c) => c.querySelector('input[type="text"]') as HTMLInputElement`, `swatch = (c) => c.querySelector('input[type="color"]') as HTMLInputElement`. A colour is picked with `fireEvent.change(swatch, { target: { value: "#FF8800" } })` (user-event cannot drive a native colour picker). Tests, by name:
  - `"renders a text input and a swatch named Choose a colour"`: both exist; `screen.getByLabelText("Choose a colour")` is the swatch.
  - `"swatchLabel renames the swatch"`.
  - `"the swatch shows a hex value, lower-cased"`: `defaultValue="#1F7A5C"` gives `swatch.value === "#1f7a5c"`, text unchanged.
  - `"expands a 3-digit hex for the swatch only"`: `"#0af"` gives swatch `"#00aaff"`, text still `"#0af"`.
  - `"marks the swatch empty when the text is not a hex colour"`: for `""`, `"red"`, `"oklch(0.5 0.1 200)"`, `"#12345"` the swatch has `data-empty` and the text is unchanged; for `"#123456"` it does not.
  - `"ignores spaces around a hex value for the swatch"`: `" #1f7a5c "` gives swatch `"#1f7a5c"`.
  - `"typing a valid hex moves the swatch"` (user-event, uncontrolled).
  - `"picking sets the text, lower-cased, and fires onChange and onValueChange once each"`: after the pick, text value `"#ff8800"`, `onChange` and `onValueChange` each called once, `onValueChange` first argument `"#ff8800"`.
  - `"controlled: reports a pick but keeps the parent's value until the parent accepts it"`: `value="#112233"`, spy `onValueChange`; after the pick the text is still `"#112233"` and the spy got `"#ff8800"`; rerender with `value="#ff8800"` and the swatch follows.
  - `"disabled disables both controls"`; `"readOnly: a pick does not change the text"` (the swatch is also disabled when `readOnly`).
  - `"ref is the text input"`: a `createRef<HTMLInputElement>()` has `type === "text"`.
  - `"className goes on the wrapper, after the defaults"`.
  - `"passes other attributes to the text input"`: `name`, `placeholder`, `aria-label` land on the text input and not the swatch.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/input/colour-input.test.tsx`
Expected: FAIL, the module `./colour-input.js` does not exist.

- [ ] **Step 3: Implement `ColourInput`** in `colour-input.tsx` with the signature above. Approach: render `Input` with the forwarded ref and your own `onChange` wrapper that tracks the current text for the swatch (seeded from `value ?? defaultValue`, and re-read from the element on mount so react-hook-form defaults written without an event are seen, as `PasswordInput` does). On a swatch `change`, set the text element's value through the native `HTMLInputElement.prototype` `value` setter and dispatch a bubbling `input` event, so React and Base UI report the change as if it were typed. Normalise for the swatch with one small pure function `swatchValue(text: string): string | undefined` (trim, accept `#rgb` and `#rrggbb`, return lower-case `#rrggbb`), kept in the same file. When it returns `undefined`, give the native control a neutral fallback value and set `data-empty`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm -F @azmr/ui exec vitest run src/components/input && pnpm -F @azmr/ui check-types`
Expected: PASS, no type errors. Also run `pnpm -F @azmr/ui exec vitest run src/conventions.test.ts`: PASS (no raw colours).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/input packages/ui/src/index.ts
git commit -m "feat: add ColourInput, a hex field with a native swatch (PAZM-138)"
```

### Task 2: Field, react-hook-form, accessibility and server rendering

**Files:**
- Test: `packages/ui/src/components/input/colour-input.integration.test.tsx`, `packages/ui/src/components/input/colour-input.ssr.test.tsx` (first line `// @vitest-environment node`)
- Modify: `colour-input.tsx` only if a test here exposes a defect.

**Interfaces:**
- Consumes: `ColourInput` (Task 1); `Field` (props `label`, `description`, `error`, `required`, as used in `field.test.tsx`); `useForm` from `react-hook-form`; `expectNoA11yViolations`, `expectServerSafe`.

- [ ] **Step 1: Write the failing tests**, by name:
  - `"Field labels the text input, not the swatch"`: `getByLabelText("Brand colour")` is the text input; the swatch still has its own name.
  - `"Field description and error describe the text input"` and `"an error sets aria-invalid on the text input"`.
  - `"register() works with defaultValues"`: a harness with `useForm({ defaultValues: { brand: "#1F7A5C" } })` and `<ColourInput {...register("brand")} />`: the swatch shows `#1f7a5c` on first render; a pick updates `getValues("brand")` to `"#ff8800"` and sets `dirtyFields.brand`.
  - `"reset() moves the swatch"`: `reset({ brand: "#0F4C5C" })` gives swatch `"#0f4c5c"`.
  - `"has no axe violations"` for a bare field, inside `Field`, and when disabled.
  - Keyboard: `"Tab moves from the swatch to the text input"`.
  - SSR: `"server-renders both controls with no browser globals"` using `expectServerSafe`, asserting the html contains `type="color"`, `type="text"` and the default value.

- [ ] **Step 2: Run to verify** which fail

Run: `pnpm -F @azmr/ui exec vitest run src/components/input/colour-input.integration.test.tsx src/components/input/colour-input.ssr.test.tsx`
Expected: tests that Task 1's code already satisfies PASS; any failure is a defect in `ColourInput` to fix in Step 3. If none fail, say so in the ledger (the coverage is the deliverable).

- [ ] **Step 3: Fix any defect found** in `colour-input.tsx`, minimally.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm -F @azmr/ui exec vitest run src/components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/input
git commit -m "test: cover ColourInput with Field, react-hook-form, axe and server rendering (PAZM-138)"
```

### Task 3: Docs, changeset and full check

**Files:**
- Create: `apps/site/src/demos/input/colour.demo.tsx` (registered the way the other `input/*.demo.tsx` files are; follow `lazy.tsx` and `demos.test.tsx`), `.changeset/colour-input.md` (minor, `@azmr/ui`)
- Modify: `apps/site/content/docs/components/input.mdx` (a "## Colour input" section after "## Textarea" with `<Demo name="input/colour" />`, a short prop list for `swatchLabel`, and the "With react-hook-form" pattern), the Accessibility list and `KeyboardMap` rows there; `packages/ui/README.md` entry row for `@azmr/ui/input` to list `ColourInput`; `packages/ui/.size-limit.json` only if the budget fails.

**Interfaces:**
- Consumes: Tasks 1 and 2.

- [ ] **Step 1: Write the demo and the docs section**, then run the site tests: `pnpm -F @azmr/site exec vitest run` and read which docs tests (component pages, demos, type tables, spelling) object. Expected first run: FAIL on whatever the new section is missing (for example the demo not registered).

- [ ] **Step 2: Make the site tests pass.** The demo shows a labelled `Field` with a `ColourInput` seeded with a made-up brand colour and a line that echoes the current value. Keyboard rows: `Tab` moves between the swatch and the text field; `Enter` or `Space` on the swatch opens the browser's colour picker. Say in the Accessibility list that the component does not validate, so pair it with a `Field` error.

- [ ] **Step 3: Add the changeset** `.changeset/colour-input.md`:
```md
---
"@azmr/ui": minor
---

Add `ColourInput` to `@azmr/ui/input`: a text field for a hex colour next to a native colour swatch. The text input is the real `<input>`, so `ref`, `register()` and `Field` work as they do for `Input`. Picking a colour writes a lower-case `#rrggbb` and fires `onChange` and `onValueChange` like typing does. It does not validate; pair it with a `Field` error.
```

- [ ] **Step 4: Run everything**

Run: `pnpm build && pnpm test && pnpm check-types && pnpm lint && pnpm --filter @azmr/ui size`
Expected: all PASS, size within budget. Read the counts from the output for the PR body.

- [ ] **Step 5: Commit**

```bash
git add apps/site packages/ui/README.md .changeset/colour-input.md
git commit -m "docs: document ColourInput and add the changeset (PAZM-138)"
```
