# Choice controls for @azmr/ui (`@azmr/ui/choice`)

Issue: azmara-labs/platform#300. Branch: `feat/ui-choice`. Date: 21 Nov 2026.
Status: design, awaiting approval. Nothing is built yet.

## Intent and why

Every data-entry app needs four controls the library does not yet have: Checkbox, CheckboxGroup, RadioGroup and Switch. They ship as one new entry, `@azmr/ui/choice`, built on Base UI, wired into `Field` and the form adapters, and usable on a tablet (a 44px touch option). They are also the first controls to arrive after the "layered APIs" decision, so they must work as ready-made props AND as composable parts.

## Goals

- Four controls with WAI-ARIA keyboard behaviour: Space toggles; arrow keys move within a radio group; Tab enters a group once.
- `Field` integration: label, description, error, required.
- Indeterminate checkbox and a group "Select all".
- Group options can carry a description line.
- `size="sm" | "md" | "lg"`; `lg` gives a minimum 44px hit area.
- React Hook Form and schema adapters map booleans and arrays correctly.
- **Server-side validation** (owner requirement, 21 Nov 2026): a server-safe way to turn a posted `FormData` into typed values and validate it against the same schema the form uses, so a tampered submission is rejected on the server, not just hidden by the UI.
- Tests, axe in light and dark, SSR test, docs page, size check, changeset.

## Non-goals

- Nested field paths in `FormData` (`address.city`) and non-choice coercion (numbers, dates): `parseFormData` handles top-level fields and leaves other values as the raw strings the schema sees.

- No new dependencies. No new tokens beyond existing density tokens.
- No Select, Combobox or segmented control (separate issues).
- No data-driven styling, and no raw-HTML labels.

## Anti-goals (would be a failure even if tests pass)

- Any path where option data (value, label, description) becomes markup, an attribute name, a class string, an id or a selector.
- A boolean that can arrive as the string `"false"` and be read as truthy.
- Two rendering paths for groups (options vs composable) that drift apart.

## Constraints from the existing code

- Base UI is imported only in `src/primitives/` (L2). Add `checkbox.ts`, `checkbox-group.ts`, `radio-group.ts`, `switch.ts` there. Components live in `src/components/choice/` (or one folder per control, matching the repo's convention) with an `index.ts`, cva variants and `forwardRef`.
- A new entry is registered in `build/entries.json`, `package.json` exports and `.size-limit.json`, and checked by the consumer verification script.
- `Field` has parts (FieldRoot, FieldLabel, FieldDescription, FieldError) and a function-child form (`FieldControlProps`). Its label sits above the control, which does not suit these controls (see below).
- `src/conventions.test.ts` already bans `dangerouslySetInnerHTML` and literal colours; the new files must pass it unchanged.
- Toggle sets the accessible-name pattern: a `Named` type that requires a label or `aria-label` / `aria-labelledby`.
- The `rhf` adapter's `FormField` has `controlled` and `render` paths; the `zod` adapter's `fieldsFromSchema` already has FieldType `"boolean"` and `"enum"`.

## Approaches considered

1. **Options only** (as sketched in the issue). Smallest, but cannot express custom layouts. Rejected by the owner.
2. **Options and composable parts as two separate implementations.** Flexible but doubles the surface to secure and test, and they drift. Rejected.
3. **Composable parts as the one implementation; `options` is shorthand that renders those parts.** One render path, one place to secure. **Chosen.**

## Design (as decided)

### API

```ts
import { Checkbox, CheckboxGroup, Radio, RadioGroup, Switch } from "@azmr/ui/choice";
```

- `<Checkbox label checked onCheckedChange indeterminate? description? size? />`. Standalone, or an item inside `CheckboxGroup` (then it takes a `value`).
- `<CheckboxGroup label value onValueChange options? size? />` and `<RadioGroup label value onValueChange orientation options? size? />`. Pass `options` OR children, never both; the type enforces it. Children are `Checkbox` / `Radio` items. An option is `{ value, label, description?, disabled? }`.
- `<Radio value label description? disabled? />` is the new item for `RadioGroup`.
- `<Switch label checked onCheckedChange description? size? />`.
- **Deviation from the issue:** indeterminate is Base UI's separate `indeterminate` prop, not `checked="indeterminate"`. Group "Select all" uses Base UI's `parent` checkbox and `allValues`. The docs page and the issue note this. Base UI's `onCheckedChange` / `onValueChange` also pass an event-details second argument; the wrappers pass it through.

### Layout and Field wiring

- Checkbox, Radio and Switch put the label beside the control, with the description under the label.
- Groups use `Fieldset` plus a legend for the group label, with the error under the group.
- They connect to `Field` for description, error and required (aria ids, `aria-invalid`, `aria-required`), but through their own wiring because `Field`'s label-above layout does not fit.
- `size="lg"` makes the whole label row at least 44px tall without enlarging the visible box. Library-wide 36px controls remain a known gap (PAZM-149), not part of this work.

### Forms

- All four use the controlled path in RHF `FormField`, not `register()`. A native checkbox through `register()` submits `"on"` or a string; controlled values stay real booleans and string arrays.
- Schema adapter: boolean maps to Checkbox (Switch by hint), enum to RadioGroup, array-of-enum to CheckboxGroup. Options are derived from the schema enum so a tampered submission fails server-side validation. Array-of-enum currently maps to `"custom"`; extend `FieldType` as needed.
- The Effect adapter gets the same mappings if its structure allows; otherwise note it in the PR as a follow-up.

### Security (injection) requirements

- Labels and descriptions are `ReactNode`; React escapes them. No raw-HTML path exists, and the conventions test covers the new files.
- Option objects are read field by field (`value`, `label`, `description`, `disabled`). Never spread option objects or unknown props onto DOM elements.
- Ids come from `useId`; never from option values. No selector strings are built from values. Values appear only in `value` attributes (escaped by React).
- Selected values are compared with array `includes` or a `Set`; never used as object keys (`__proto__` safe).
- The adapter never parses `"false"` / `"true"` strings; it coerces explicitly.
- Variant classes come only from closed cva unions; no data-driven class strings.
- Duplicate option values: warn in development; keys must not collide.
- Server-side validation is part of this work (next section); the docs say the UI is not a trust boundary and show the server call.
- Hostile-input tests, client and server-render, with payloads: `"><img src=x onerror=alert(1)>`, `<script>`, `</script>`, `__proto__`, `constructor`, `javascript:alert(1)`, duplicate values, a 10,000-character string, and unicode direction-override characters. Assert: no injected elements or attributes, no handler attributes, no change to the selection model, and the rendered text equals the literal input.

### Server-side validation

Native form posts are awkward for choice controls: an unticked checkbox or switch sends nothing, and a group sends the same key several times. So:

- `formDataToValues(formData, fields)`, server-safe and React-free (`src/components/shared/form-data.ts`), exported from `@azmr/ui/zod` and `@azmr/ui/effect`. It walks the schema's `FieldDef`s, never the keys in the posted data, so unknown keys (including `__proto__`) are ignored. Rules: `boolean` is `true` only for exactly one entry equal to `"on"` or `"true"`, `false` when absent, and any other string is passed through untouched so the schema rejects it; `multiselect` is `getAll(name)` strings only (file entries dropped); `enum` and everything else is the single string, `undefined` when absent or a file, and the array of strings when the key was posted more than once (so the schema rejects it; the first entry is never silently taken).
- `parseFormData(schema, formData)` in `@azmr/ui/zod` (and `@azmr/ui/effect` if its structure allows): runs `formDataToValues`, then the schema (`safeParseAsync`), and returns `{ success: true, data }` or `{ success: false, errors }` with the same error shape the resolver gives React Hook Form. Enum and array-of-enum membership is therefore enforced by the schema on the server.
- The controls must submit correctly from a real `<form>`: Base UI's hidden inputs post `name` with the item's `value` (checkbox and switch post only when checked; each group item posts under the group's `name`). A test builds `new FormData(form)` from rendered controls and round-trips it through `parseFormData`.
- Tamper tests: an out-of-set enum, an out-of-set array member, `terms=false`, duplicate keys on a single-value field, a file entry, unknown keys, and a `__proto__` key. Each is rejected or ignored, never accepted.

### Tests and docs

- Unit tests per control (keyboard, controlled and uncontrolled, indeterminate, group select-all, disabled, readOnly, required).
- axe in light and dark; an SSR test per control; RHF and schema adapter tests including boolean and array mapping.
- Docs page with the hostile-input note and the `checked="indeterminate"` deviation; size-limit entry; changeset (minor).

## Left to the builder

- Folder layout inside `components/` (one folder vs a shared `choice/`), file naming, and exact cva class names, following Toggle.
- Whether the Effect adapter mapping fits in this PR.
- The size-limit number for the entry, measured after the build.
- Exact copy for docs and dev-warning messages.

## Open

None that block building. Approval of this document is the gate to the plan.
