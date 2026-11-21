# Choice controls (`@azmr/ui/choice`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup` and `Switch` as the new `@azmr/ui/choice` entry, wired into `Field`, React Hook Form and the schema adapters, safe against injection through labels and option data, and validated on the server through `parseFormData`.

**Architecture:** Base UI primitives are re-exported from new L2 files in `src/primitives/`. One folder, `src/components/choice/`, holds all five components. Groups have ONE render path: `options` is shorthand that renders the same `Checkbox` / `Radio` items a caller can write by hand. A shared `ChoiceRow` (single controls) and `ChoiceGroupShell` (groups) own the label, description, error and size wiring.

**Tech Stack:** React 19, Base UI (`@base-ui/react` checkbox, checkbox-group, radio, radio-group, switch, field, fieldset), cva, Tailwind tokens, Vitest + Testing Library + axe, React Hook Form, zod, Effect Schema.

**Spec:** `docs/superpowers/specs/2026-11-21-choice-controls-design.md` (approved 21 Nov 2026). Issue azmara-labs/platform#300. Branch `feat/ui-choice`.

## Global Constraints

- Entry name `choice`, import path `@azmr/ui/choice`; a `client` entry in `build/entries.json`; also in `package.json` exports and `.size-limit.json`. No new dependencies. No new tokens.
- Base UI is imported only in `src/primitives/` (`base-ui-only-in-primitives`); no raw colours; no `dangerouslySetInnerHTML`; every component takes `className` and passes it through `cn()` last; state styling uses Base UI `data-*` attributes (`data-checked`, `data-indeterminate`, `data-disabled`).
- Sizes: `size?: "sm" | "md" | "lg"`, default `"md"`. `lg` makes the whole label row at least 44px tall (`min-h-11`) without enlarging the visible box.
- Option shape: `{ value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }`. Read field by field; never spread an option or unknown props onto a DOM element.
- Ids come from `useId`, never from option values; no selector strings built from values; selected values compared with `includes` or a `Set`, never used as object keys.
- Indeterminate is Base UI's separate `indeterminate` prop (NOT `checked="indeterminate"`); group select-all uses `parent` and `allValues`.
- RHF binding is always the controlled path. Booleans stay booleans; the string `"false"` is never parsed.
- Server side: `formDataToValues` walks the schema's fields, never the posted keys; a boolean is `true` only for exactly one entry equal to `"on"` or `"true"`; membership is enforced by the schema; the helpers live in server-safe entries (`@azmr/ui/zod`, `@azmr/ui/effect`) with no React import.
- `options` and children are mutually exclusive; the type enforces it.
- Every control needs an accessible name: `label`, `aria-label` or `aria-labelledby` (a `Named`-style union, as in Toggle).
- British/NZ English in copy. Conventional commits (`feat(ui): ...`), no AI attribution lines, one commit per task. Test command: `pnpm --filter @azmr/ui exec vitest run <path>`; types: `pnpm --filter @azmr/ui check-types`; lint: `pnpm check` from the repo root.

## Review Focus

- **A group's value holds a string that is not among its options** (stale selection from a server): the known options render and toggle normally, the unknown value stays in `value` and in `onValueChange` output, nothing throws. (Task 4)
- **RHF field with no default** (`undefined` or `null`): a Checkbox or Switch renders unchecked and never flips from uncontrolled to controlled (no React warning); a group renders empty. (Task 5)
- **Select-all with a disabled option:** the disabled option's state is not changed by select-all, and the parent shows indeterminate correctly. (Task 4)
- **A tampered post** (enum or array member outside the set, `terms=false`, duplicate keys on a single-value field, a `__proto__` key): rejected or ignored on the server, never accepted. (Task 6)
- **Two groups on one page that share option values** (`"a"`, `"b"`): clicking a label in one group never changes the other, and no id is duplicated. (Task 3)

---

### Task 1: Entry, primitives, shared row, Checkbox

**Files:**
- Create: `packages/ui/src/primitives/checkbox.ts`, `checkbox-group.ts`, `radio.ts`, `radio-group.ts`, `switch.ts` (each a one-line re-export with the L2 comment, as `toggle.ts`)
- Create: `packages/ui/src/components/choice/index.ts`, `types.ts`, `variants.ts`, `row.tsx`, `checkbox.tsx`, `checkbox.test.tsx`, `checkbox.ssr.test.tsx`
- Modify: `packages/ui/build/entries.json` (client: `"choice": "src/components/choice/index.ts"`), `packages/ui/package.json` (exports `./choice`, same shape as `./toggle`), `packages/ui/.size-limit.json` (`@azmr/ui/choice`, `dist/choice.js`, limit set in Task 7)

**Interfaces:**
- Produces (`types.ts`): `type ChoiceSize = "sm" | "md" | "lg"`; `interface ChoiceOption { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }`; `type Named = { label: ReactNode } | { "aria-label": string } | { "aria-labelledby": string }`.
- Produces (`variants.ts`): `choiceVariants` (cva, variant `size` of `ChoiceSize`) for the row, and `boxVariants` for the visible box; both closed unions, no data-driven classes.
- Produces (`row.tsx`): `ChoiceRow(props: { size?: ChoiceSize; label?: ReactNode; description?: ReactNode; error?: ReactNode; required?: boolean; disabled?: boolean; className?: string; children: ReactNode })`: renders `FieldRoot`, a `<label>` wrapping the control and label text beside it, the description under the label, and the error in the same live-region pattern as `Field`. `children` is the Base UI control.
- Produces (`checkbox.tsx`): `CheckboxProps = Named & { size?; description?; error?; required?; indeterminate?: boolean; className?; checked?; defaultChecked?; onCheckedChange?; value?; name?; disabled?; readOnly?; parent?: boolean }` and `Checkbox` (forwardRef to the box element). Outside a group it is standalone; inside a group (Task 4) it takes `value`.

- [ ] **Step 1: Write failing tests** in `checkbox.test.tsx`, named: `"is a checkbox named by its label"` (role checkbox, accessible name equals label text); `"clicking the label toggles it"`; `"Space toggles it and Tab reaches it once"`; `"reports boolean changes, controlled and uncontrolled"`; `"indeterminate shows data-indeterminate and aria-checked=mixed, and a click makes it checked"`; `"description is the accessible description"` (via `aria-describedby`); `"error marks it invalid and shows the message"` (`aria-invalid`, text present); `"required sets aria-required and shows the marker"`; `"disabled and readOnly do not change"`; `it.each` sizes: `sm`, `md`, `lg` where `lg` row has `min-h-11`; `"needs a name (the types enforce it)"` with `@ts-expect-error`; `"passes axe in light and dark"` (render once, then again inside `<div className="dark">`, assert `expectNoA11yViolations` each time).
- [ ] **Step 2: Run to verify failure.** Run: `pnpm --filter @azmr/ui exec vitest run src/components/choice/checkbox.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3: Create the five primitives and the entry registration**, then `types.ts`, `variants.ts`, `row.tsx`. Use `Field.Root`/`Field.Label`/`Field.Description` from the existing `primitives/field.ts` for id wiring where Base UI supports a wrapping label; if it does not give the right name or description for a checkbox, wire `aria-labelledby`/`aria-describedby` with `useId` as `Field`'s function-child path does. The tests decide, not the method.
- [ ] **Step 4: Implement `Checkbox`** in `checkbox.tsx` on `CheckboxPrimitive.Root` with `Checkbox.Indicator` showing a check, or a bar when `indeterminate` (use the existing icon glyphs in `src/icons/glyphs.ts`; add `Check` / `Minus` there only if missing). Export from `index.ts`.
- [ ] **Step 5: Write `checkbox.ssr.test.tsx`** (`// @vitest-environment node`, `expectServerSafe`): renders label, `name="terms"`, `aria-required="true"` with no browser globals.
- [ ] **Step 6: Run** the two test files plus `pnpm --filter @azmr/ui check-types`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(ui): add the choice entry and Checkbox`.

### Task 2: Switch

**Files:** Create `choice/switch.tsx`, `switch.test.tsx`, `switch.ssr.test.tsx`; Modify `choice/index.ts`.

**Interfaces:** Consumes `ChoiceRow`, `Named`, `ChoiceSize`, `boxVariants` from Task 1. Produces `SwitchProps = Named & { size?; description?; error?; required?; className?; checked?; defaultChecked?; onCheckedChange?; name?; value?; disabled?; readOnly? }` and `Switch` (forwardRef).

- [ ] **Step 1: Write failing tests**, named: `"is a switch named by its label"` (role switch); `"Space toggles it, click and label click toggle it"`; `"reports booleans, controlled and uncontrolled"`; `"description, error, required and disabled wire up as Checkbox does"`; `"lg row is at least 44px (min-h-11)"`; `"readOnly does not change"`; `"passes axe in light and dark"`; SSR test with `name`.
- [ ] **Step 2: Run to verify failure,** then **Step 3: implement `Switch`** on `SwitchPrimitive.Root` + `Thumb` inside `ChoiceRow`, **Step 4: run to pass,** **Step 5: Commit** `feat(ui): add Switch`.

### Task 3: Radio and RadioGroup

**Files:** Create `choice/group.tsx` (shared shell), `radio-group.tsx`, `radio-group.test.tsx`, `radio-group.ssr.test.tsx`; Modify `choice/index.ts`.

**Interfaces:**
- Produces (`group.tsx`): `ChoiceGroupShell(props: { label?: ReactNode; description?: ReactNode; error?: ReactNode; required?: boolean; size?: ChoiceSize; className?: string; children: ReactNode })`: a `Fieldset` with `Fieldset.Legend` as the group label, the description under the legend, items, then the error in a polite live region. Also `ChoiceSizeContext` and `useChoiceSize(own?: ChoiceSize): ChoiceSize` (item size wins, then group size, then `"md"`).
- Produces (`radio-group.tsx`): `RadioProps = Named & { value: string; description?; disabled?; size?; className? }` and `Radio`; `RadioGroupProps = ({ label?; "aria-label"?; "aria-labelledby"?; description?; error?; required?; size?; orientation?: "horizontal" | "vertical" (default "vertical"); value?: string; defaultValue?: string; onValueChange?: (value: string) => void; name?; disabled?; readOnly?; className? } & ({ options: readonly ChoiceOption[]; children?: never } | { children: ReactNode; options?: never }))` and `RadioGroup`. A group must also have a name: `label` or `aria-label` or `aria-labelledby`.

- [ ] **Step 1: Write failing tests**, named: `"is a radiogroup named by its legend"`; `"options render the same radios as hand-written children"` (render both, compare roles, names, checked states); `"selecting reports the value string"`; `"Tab enters once; arrows move and select; Home and End jump; arrows wrap"` (`vi.waitFor` around focus assertions, as Toggle's tests do); `"horizontal orientation uses ArrowRight/ArrowLeft"`; `"a radio's description is its accessible description"`; `"a disabled option is skipped by arrows"`; `"error marks the group invalid; required sets aria-required"`; `"group size reaches items and an item can override it"`; `"options={[]} renders the legend and no radios"`; **Review Focus:** `"two groups with the same option values do not cross-wire"` (click label in group A, group B unchanged, `document.querySelectorAll("[id]")` has no duplicate ids); `"passes axe in light and dark"`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `group.tsx`, `Radio` and `RadioGroup`.** `RadioGroup` with `options` maps each option to a `<Radio key={index-safe} value={option.value} label={option.label} description={option.description} disabled={option.disabled} />`, reading fields one by one. Key by array index plus value so duplicate values never collide; in development (`process.env.NODE_ENV !== "production"`) `console.warn` once on duplicate values.
- [ ] **Step 4: Run to pass, SSR test, check-types.** **Step 5: Commit** `feat(ui): add Radio and RadioGroup`.

### Task 4: CheckboxGroup (items, options, select-all)

**Files:** Create `choice/checkbox-group.tsx`, `checkbox-group.test.tsx`, `checkbox-group.ssr.test.tsx`; Modify `choice/checkbox.tsx` (read `useChoiceSize`, accept group context), `choice/index.ts`.

**Interfaces:** Consumes `ChoiceGroupShell`, `useChoiceSize`, `ChoiceOption`. Produces `CheckboxGroupProps` like `RadioGroupProps` but `value?: string[]`, `defaultValue?: string[]`, `onValueChange?: (value: string[]) => void`, plus `allValues?: readonly string[]` (for hand-written children with a `parent` checkbox) and `selectAllLabel?: ReactNode` (with `options`: renders a first `parent` checkbox with `allValues` taken from the enabled options). `CheckboxGroup` (forwardRef).

- [ ] **Step 1: Write failing tests**, named: `"is a group named by its legend"`; `"options match hand-written Checkbox children"`; `"toggling reports a string array"`; `"Tab visits each checkbox; Space toggles"`; `"selectAllLabel adds a Select all that checks all, is indeterminate for some, and unchecks all"`; `"a hand-written parent checkbox with allValues behaves the same"`; **Review Focus:** `"an unknown value in value is kept"` (value `["a","zzz"]` with options a, b: toggle b, `onValueChange` gets `["a","zzz","b"]` in some order containing all three); `"select-all leaves a disabled option unchanged"`; `"options={[]} renders no checkboxes and no tab stop"`; `"passes axe in light and dark"`; SSR test.
- [ ] **Step 2: Run to verify failure.** **Step 3: Implement `CheckboxGroup`** on `CheckboxGroupPrimitive` inside `ChoiceGroupShell`; `options` renders `Checkbox` items exactly as the hand-written form does. For the disabled-select-all rule, compute `allValues` from enabled options only; if Base UI's parent still changes disabled items, wrap `onValueChange` to restore the disabled options' previous membership.
- [ ] **Step 4: Run to pass, check-types.** **Step 5: Commit** `feat(ui): add CheckboxGroup with select-all`.

### Task 5: Form adapters (RHF and schema)

**Files:** Modify `components/rhf/form.tsx`, `components/shared/field-def.ts`, `components/zod/fields.ts`, `components/effect/fields.ts`; Test: `rhf/form.test.tsx` (add), `zod/zod.test.ts` (add), `effect/fields.test.ts` and `effect/parity.test.tsx` (add).

**Interfaces:**
- Produces: `FormFieldProps.bind?: "value" | "checked"` (default `"value"`). With `controlled` and `bind="checked"`, `ControlledField` clones the child with `checked: Boolean(field.value)` and `onCheckedChange: chain(child.props.onCheckedChange, field.onChange)` instead of `value` / `onValueChange`; `name`, `ref`, `onBlur`, `disabled` as before. Groups use the default (`value` as `string[]`, `onValueChange`); a `null`/`undefined` field value becomes `[]` for groups (child gets `value: field.value ?? []`).
- Produces: `FieldType` gains `"multiselect"`. Zod: `z.array(z.enum([...]))` (and optional wrappers) gives `type: "multiselect"` and `options` from the element enum; `.meta({ control: "switch" })` on a boolean arrives unchanged in `meta` (the Switch hint). Effect: `Schema.Array` of literals maps the same way; `parity.test.tsx` must stay green with the new case added.

- [ ] **Step 1: Write failing tests**, named: `"FormField bind=checked passes a real boolean to a Checkbox and submits true/false"` (submit values `{ terms: true }` then `{ terms: false }`, never `"on"`, never `"false"`); `"FormField with a Switch"`; `"FormField with a CheckboxGroup submits a string array"`; `"FormField with a RadioGroup submits the chosen string"`; **Review Focus:** `"a checkbox field with no default renders unchecked and logs no controlled/uncontrolled warning"` (spy on `console.error`); `"a group field with no default renders empty"`; `"errors from the resolver show on a choice control and mark it invalid"`; zod: `"boolean, enum and array-of-enum describe as boolean, enum and multiselect with options"`, `"meta control switch passes through"`; effect: the same plus the parity case.
- [ ] **Step 2: Run to verify failure.** **Step 3: Implement** the `bind` branch in `ControlledField` and the two adapter mappings. If the Effect AST for arrays cannot be mapped cleanly, leave Effect unchanged, delete its parity case, and record that in the PR description.
- [ ] **Step 4: Run** `pnpm --filter @azmr/ui exec vitest run src/components/rhf src/components/zod src/components/effect` and check-types. **Step 5: Commit** `feat(ui): bind choice controls in FormField and the schema adapters`.

### Task 6: Server-side validation (`formDataToValues`, `parseFormData`)

**Files:**
- Create: `packages/ui/src/components/shared/form-data.ts`, `shared/form-data.test.ts`, `zod/parse-form-data.ts`, `zod/parse-form-data.test.ts`, `choice/choice.form.test.tsx`
- Modify: `zod/index.ts` (export both), `effect/index.ts` (export `formDataToValues`; add `effect/parse-form-data.ts` and its test only if Effect's decode API allows the same result shape), `packages/ui/.size-limit.json` (read the `@azmr/ui/zod` and `@azmr/ui/effect` sizes; do not widen without saying so)

**Interfaces:**
- Consumes: `FieldDef`, `FieldType` (including `"multiselect"` from Task 5) from `shared/field-def.ts`; `issuesToFieldErrors` from `shared/field-errors.ts`; `toFieldErrors` from `zod/resolver.ts`.
- Produces: `formDataToValues(formData: FormData, fields: readonly FieldDef[]): Record<string, unknown>`; `parseFormData<Schema extends z.ZodObject>(schema: Schema, formData: FormData): Promise<{ success: true; data: z.output<Schema> } | { success: false; errors: FieldErrors }>`. Both server-safe: no React, no browser globals, and `zod/index.ts` and `effect/index.ts` stay `server` entries (`verify-dist` enforces it).

- [ ] **Step 1: Write failing tests** in `shared/form-data.test.ts`, named: `"boolean is false when absent and true for exactly on or true"`; `"boolean passes any other string through so the schema rejects it"` (`"false"`, `"1"`, `"yes"`, `""` stay as strings); `"boolean with two entries is passed through, not true"`; `"multiselect is every string entry for the name, files dropped"`; `"enum and other fields are the single string, undefined when absent, undefined when a file"`; `"keys not in the fields are ignored"` (including `__proto__` and `constructor`; result has no such own keys and `Object.prototype` is unchanged); `"the result has a null prototype or only own schema keys"` (assert `Object.keys(result)` equals the field names that had a value). In `zod/parse-form-data.test.ts`, named: `"accepts a valid post and returns parsed data"`; `"rejects an enum value outside the set, with the error on that field"`; `"rejects an array member outside the set"`; `"rejects terms=false for z.literal(true)"`; `"rejects a missing required checkbox"`; `"rejects duplicate keys on a single-value enum field"` (two entries for `plan` reach the schema as an array, so `z.enum` fails; the first entry is never silently taken); `"ignores unknown keys"`; `"runs with no browser globals"` (`// @vitest-environment node` in a separate `parse-form-data.ssr.test.ts`, plus a no-`react`-import check like `effect/resolver.ssr.test.ts`). In `choice/choice.form.test.tsx`, named: `"a real form with a Checkbox, Switch, RadioGroup and CheckboxGroup posts what parseFormData expects"` (render inside `<form>`, tick things, `new FormData(form)`, assert `parseFormData` returns `{ terms: true, notify: false, plan: "pro", tags: ["a","b"] }`) and `"unticked controls post nothing"`.
- [ ] **Step 2: Run to verify failure.** Run: `pnpm --filter @azmr/ui exec vitest run src/components/shared/form-data.test.ts src/components/zod src/components/choice/choice.form.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `formDataToValues`** by iterating `fields` (never the FormData keys), switching on `field.type` as the spec's rules say. **Implement `parseFormData`** as: `fieldsFromSchema(schema)` → `formDataToValues` → `schema.safeParseAsync` → success or `toFieldErrors(issues)`. If `choice.form.test.tsx` shows a control does not post correctly (a group item without the group's `name`, a switch posting when off), fix the control, not the test.
- [ ] **Step 4: Effect.** Mirror `parseFormData` in `effect/parse-form-data.ts` using the decode call `effect/resolver.ts` already uses. If that cannot give the same `{ success, data | errors }` result, export only `formDataToValues` from `@azmr/ui/effect` and say so in the PR.
- [ ] **Step 5: Run** the new tests, `pnpm --filter @azmr/ui exec vitest run src/components/zod src/components/effect`, and check-types. Expected: PASS.
- [ ] **Step 6: Commit** `feat(ui): validate posted forms on the server with parseFormData`.

### Task 7: Hostile-input suite

**Files:** Create `choice/choice.security.test.tsx`, `choice/choice.security.ssr.test.tsx` (`// @vitest-environment node`).

- [ ] **Step 1: Write the tests.** One `PAYLOADS` array: `` `"><img src=x onerror=alert(1)>` ``, `<script>alert(1)</script>`, `</script><script>alert(1)</script>`, `__proto__`, `constructor`, `javascript:alert(1)`, a 10,000-character string, a string with `‮` (direction override), and an empty string. Run each through every control as: option `value`, option `label`, option `description`, group `label`, and single-control `label`/`description`/`error`. For each, assert: (a) rendered text equals the literal payload (`textContent`), (b) `container.querySelectorAll("img, script, iframe, style")` is empty, (c) no element has an attribute starting `on`, (d) option `{ value, label, onClick: ..., dangerouslySetInnerHTML: ... , href }` extra fields never appear as attributes (cast through `unknown` in the test), (e) selecting the payload value reports exactly that string and leaves other options' state unchanged, (f) a `__proto__` value does not add keys to `Object.prototype` (`({} as Record<string, unknown>).polluted` stays undefined; check `Object.keys(Object.prototype)` unchanged). Server-render variant: `expectServerSafe` output contains the escaped payload (`&lt;`, `&quot;`) and never an unescaped `<img` or `<script`.
- [ ] **Step 1b: Add posted-data payloads** to the server-side tests from Task 6: each `PAYLOAD` as an enum value, as an array member, and as a field NAME in the `FormData`; the result never contains an unexpected key, and an out-of-set value is rejected by `parseFormData`, not accepted.
- [ ] **Step 2: Add a duplicate-values test:** two options with the same `value` log one development warning and neither throws nor swallows an item.
- [ ] **Step 3: Run** both files, plus `pnpm --filter @azmr/ui exec vitest run src/conventions.test.ts` (the conventions test scans the new files and must pass unchanged). If any assertion fails, fix the component, not the test.
- [ ] **Step 4: Commit** `test(ui): hostile-input suite for the choice controls`.

### Task 8: Docs, size limit, changeset, release checks

**Files:** Create `apps/site/content/docs/components/choice.mdx`, `apps/site/src/demos/choice/basic.demo.tsx`, `groups.demo.tsx`, `form.demo.tsx`, `.changeset/<slug>.md`; Modify `apps/site/content/docs/components/meta.json`, `apps/site/src/demos/names.ts`, `registry.ts`, `lazy.tsx`, `packages/ui/.size-limit.json`, and `packages/ui/README.md` / `registry/` listings if they enumerate entries (mirror what `toggle` has).

- [ ] **Step 1: Write the docs page** (frontmatter like `number-field.mdx`: `title: Choice controls`, `group: Inputs`, `status: new`, `interactive: true`, aliases `checkbox, radio, switch, toggle, select all`). Sections: Usage (import line), the four controls with `<Demo name="choice/..." />`, indeterminate and select-all (and the `checked="indeterminate"` difference from the issue's sketch), composing items by hand, sizes and the 44px `lg`, forms with `bind="checked"` and groups, keyboard map, and a Security note (the UI is not a trust boundary; labels are text, not HTML) with a server-action example: `const result = await parseFormData(schema, formData); if (!result.success) return { errors: result.errors };`, plus the `formDataToValues` rules table. Register the three demos in `names.ts`, `registry.ts` and `lazy.tsx` exactly as `number-field/basic` is, and add `"choice"` to `meta.json`.
- [ ] **Step 2: Build and measure.** Run: `pnpm --filter @azmr/ui build` then `pnpm --filter @azmr/ui size`. Read the `@azmr/ui/choice` size from the output and set its limit about 10% above it; do not widen any other budget. Run `pnpm --filter @azmr/ui verify:consumer`, `verify:registry` and `verify:guides`; fix what they flag.
- [ ] **Step 3: Add the changeset:** `@azmr/ui: minor`, one paragraph naming the five exports and the form-adapter additions (`bind`, `multiselect`). Do NOT bump versions by hand.
- [ ] **Step 4: Full gate.** Run `pnpm check`, `pnpm --filter @azmr/ui check-types`, `pnpm --filter @azmr/ui test`, `pnpm audit:deps`. Expected: all green.
- [ ] **Step 5: Commit** `docs(ui): choice controls page, demos and changeset`. Then push `feat/ui-choice` and open one PR to `main` (no stacking), body listing the deviation (`indeterminate` prop), the test counts read from the run output, and the measured entry size.

---

## Self-review (spec coverage)

- Four controls, keyboard map, `Field` wiring, indeterminate and select-all, option descriptions, sizes with 44px `lg`: Tasks 1 to 4. Composable items AND `options` through one path: Tasks 3 and 4.
- RHF controlled path, booleans stay booleans, schema mappings, Switch hint: Task 5. Effect adapter conditional, as the spec allows.
- Every injection requirement (no raw HTML, no spreading, `useId` ids, `Set`/`includes`, closed cva unions, duplicate warning, hostile payloads client and server): Tasks 1 to 4 build it, Task 6 proves it.
- Server-side validation (`formDataToValues`, `parseFormData`, real-form round trip, tamper tests): Task 6, with hostile posted data in Task 7. `options={[]}` is still tested in Tasks 3 and 4 though no longer a Review Focus line.
- Tests, axe light and dark, SSR, docs, size check, changeset: Tasks 1 to 8. Entry registration in three places: Task 1 and Task 8.
- Calls I made (spec left to builder): one shared `choice/` folder; `ChoiceRow` and `ChoiceGroupShell` as the shared wrappers; `bind="checked"` as the RHF mechanism; `"multiselect"` as the new `FieldType`.
