# Effect Schema Form Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@azmr/ui/effect`, a server-safe entry that lets an app validate a React Hook Form with an Effect Schema: `effectSchemaResolver(schema)` for errors and `fieldsFromSchema(schema)` for field metadata, matching what `@azmr/ui/zod` does today.

**Architecture:** Pull what the Zod adapter does that is not about Zod (the `FieldDef` type, turning a list of issues into React Hook Form errors) into a small shared core, with the Zod tests as the safety net. Build the Effect resolver on Effect's own Standard Schema bridge (`Schema.toStandardSchemaV1`), which already returns every issue with a clean path, and the metadata reader on the schema's AST. Prove the two adapters agree with parity tests through a real form.

**Tech Stack:** `effect` 4.1.4 (optional peer), `react-hook-form` 7, vitest (jsdom and node), tsup, size-limit, Fumadocs MDX.

**Spec:** GitHub issue azmara-labs/platform#293 (API and acceptance criteria), the existing adapter in `packages/ui/src/components/zod/` (the behaviour to match), and `docs/superpowers/specs/2026-10-15-azmr-ui-design.md` (principles in section 3). Where the issue is wrong about Effect, "What I verified" and "Decisions" say what this plan does instead.

## What I verified (Effect 4.1.4, installed and probed on 2026-11-20)

- **`Schema.decodeUnknownEither` does not exist.** The issue's wording is from Effect 3. Version 4 has `decodeUnknownResult`, `decodeUnknownExit`, `decodeUnknownEffect`, `decodeUnknownPromise` and `decodeUnknownSync`. The last published 3.x is 3.22.5 (`prev` tag).
- **`Schema.toStandardSchemaV1(schema)["~standard"].validate(input)`** returns every issue as `{ message, path }` with paths like `["tags", 0, "label"]`, and the decoded value on success (a `NumberFromString` field gave `42`). A filter with no path gives `path: []`.
- **Field metadata is on the AST.** `schema.fields[name].ast`: `_tag` is `"String"`, `"Number"`, `"Boolean"` or `"Union"`; `ast.context.isOptional` is true for `Schema.optional`; `ast.checks[].annotations.meta.representation` is `{ id: "effect/schema/isMinLength", payload: { minLength: 1 } }` (also `isMaxLength` and `isBetween` with `{ minimum, maximum }`); `Schema.Literals([...])` is a `Union` of literals; `NullOr` is a `Union` with a null member; `title` and `description` are annotations.
- **A struct-level filter reports a field with `{ path, issue }`**, not `{ path, message }` (my first probe got that wrong and crashed). `message` annotations belong on the filter that fails, or on the schema for type errors.
- **Messages:** Effect's defaults are English sentences ("Expected a value with a length of at least 1"). The Zod adapter takes its messages from Zod in the same way. `@azmr/ui` has a `LocaleProvider` but **no catalogue of form error messages**, so the issue's "otherwise from the locale's form messages" has nothing to refer to.
- Nothing in the platform repo depends on `effect` yet.

## Decisions (defaults used; each is cheap to change)

1. **Standard Schema bridge, not Either.** The resolver calls `toStandardSchemaV1(...).validate` (async, so effectful filters work, like Zod's `safeParseAsync`).
2. **`type` of each error is the constant `"validate"`.** Standard Schema issues carry no code; Zod's adapter uses Zod's code (`too_small`, ...). The error summary uses messages, not types. Walking Effect's `Issue` tree to recover a code is possible later.
3. **Messages come from the schema** (Effect's default text, or a `message` annotation), the same as the Zod adapter. A locale message catalogue is a separate piece of work for both adapters.
4. **No `options` argument yet** (the issue lists one without saying what is in it). Add `parseOptions` when someone needs `onExcessProperty`.
5. **Peer `effect: ^4.1.0`, optional**, like `zod`. Effect 3 is not supported: its Schema API is different.
6. **Not planned, but made cheap by Task 1:** one generic `standardSchemaResolver` for Zod, Valibot, ArkType and Effect, since all implement Standard Schema.

## Global Constraints

- `@azmr/ui/effect` is a **server entry** (`build/entries.json`, `server`): no React, no `"use client"`; `scripts/verify-dist.mjs` enforces it. It imports only types from `react-hook-form`.
- `effect` is an optional peer dependency (`peerDependencies` and `peerDependenciesMeta.optional`, as `zod` is) and a dev dependency for tests. It must never end up inside `dist` (tsup externalises peers) and `dist/zod.js` and the root must not reference it.
- Names in the new entry match the Zod entry (`fieldsFromSchema`, `fieldFromSchema`) so switching is one import path. `FieldDef` and `FieldType` keep one definition, shared.
- The public behaviour of `@azmr/ui/zod` does not change: its 176-line test file passes unchanged before and after Task 1.
- Commits are conventional, imperative, first line under 72 characters, with **no AI attribution lines**. A minor changeset for `@azmr/ui` is required. Docs use New Zealand English.
- Run with `pnpm -F @azmr/ui ...`. Do not add `effect` anywhere a package that does not use it would pull it in.

## Review Focus

1. **An issue path that is not a field.** An error at `["nope"]`, or a path through a union, must still reach the form (summary and `root`), never throw.
2. **Path segments that are not plain strings.** Standard Schema allows `{ key }` objects and symbols; numbers must produce arrays for `FieldArray` the way the Zod adapter does.
3. **A transform and an empty field.** `NumberFromString` fed `""` (what a cleared input holds) must be an error on that field, not a crash; a valid value must arrive decoded at `onSubmit`.
4. **A filter that throws, or a rejected promise.** An unexpected exception in a refinement must surface (not be swallowed into a blank error), and must not leave the form submitting forever.
5. **Effect not installed.** An app that imports `@azmr/ui/zod` or `@azmr/ui/rhf` must not load `effect`; the built `zod.js`, `rhf.js` and the root must not mention it.

---

### Task 1: Shared core for the form adapters

**Files:**
- Create: `packages/ui/src/components/shared/field-def.ts`, `packages/ui/src/components/shared/field-errors.ts`
- Test: `packages/ui/src/components/shared/field-errors.test.ts`
- Modify: `packages/ui/src/components/zod/fields.ts`, `packages/ui/src/components/zod/resolver.ts` (use the core), `packages/ui/src/components/zod/index.ts` (exports unchanged)

**Interfaces:**
- Produces:
  - `field-def.ts`: `export type FieldType`, `export interface FieldDef<Name extends string = string>` (moved unchanged from `zod/fields.ts`) and `export function sentenceCase(key: string): string`.
  - `field-errors.ts`: `export interface FormIssue { path: readonly PropertyKey[]; code: string; message: string }` and `export function issuesToFieldErrors<Values extends FieldValues = FieldValues>(issues: readonly FormIssue[], criteriaMode?: "firstError" | "all"): FieldErrors<Values>` (the body of today's `toFieldErrors`, including `setIn`/`getIn` and `root`).
- `@azmr/ui/zod` still exports `FieldDef`, `FieldType`, `fieldFromSchema`, `fieldsFromSchema`, `toFieldErrors`, `zodResolver` with identical behaviour.

- [ ] **Step 1: Run the safety net first.** `pnpm -F @azmr/ui exec vitest run src/components/zod`. Expected: PASS (176 lines of existing tests). Note the count.
- [ ] **Step 2: Write the failing tests** in `field-errors.test.ts` for the core directly: `issuesToFieldErrors([{ path: ["name"], code: "x", message: "Enter a name" }])` gives `{ name: { type: "x", message: "Enter a name" } }`; a path `["tags", 0, "label"]` gives `tags` as an array with `[0].label`; an empty path goes to `root`; two issues on one path keep the first under `"firstError"` and collect `types: { x: [a, b] }` under `"all"`; a path `[Symbol.for("k")]` and a numeric key are stringified without throwing; a path through an existing leaf (`["a"]` then `["a", "b"]`) does not throw. Add `sentenceCase("invoiceEmail")` is `"Invoice email"` and `sentenceCase("first_name")` is `"First name"`.
- [ ] **Step 3: Run** `pnpm -F @azmr/ui exec vitest run src/components/shared/field-errors.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 4: Move the code.** Create the two shared modules from the existing code; make `zod/fields.ts` import `FieldDef`, `FieldType`, `sentenceCase` and re-export the types; make `zod/resolver.ts`'s `toFieldErrors` map each `z.core.$ZodIssue` to a `FormIssue` and call `issuesToFieldErrors`.
- [ ] **Step 5: Run** `pnpm -F @azmr/ui exec vitest run src/components/zod src/components/shared`, then `pnpm -F @azmr/ui test`. Expected: PASS, with the Zod count from Step 1 unchanged.
- [ ] **Step 6: Commit** `refactor(ui): share the form adapters' field and error code`.

---

### Task 2: The Effect resolver and its entry

**Files:**
- Create: `packages/ui/src/components/effect/resolver.ts`, `packages/ui/src/components/effect/index.ts`
- Test: `packages/ui/src/components/effect/resolver.test.ts`, `packages/ui/src/components/effect/resolver.ssr.test.ts`
- Modify: `packages/ui/build/entries.json` (`"effect": "src/components/effect/index.ts"` under `server`), `packages/ui/package.json` (`./effect` export with types first; `effect` in `peerDependencies` as `^4.1.0`, in `peerDependenciesMeta` as optional, and in `devDependencies` as `^4.1.4`), `packages/ui/.size-limit.json` (`@azmr/ui/effect`, limit set after the first build), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `FormIssue`, `issuesToFieldErrors` (Task 1).
- Produces: `export function effectSchemaResolver<S extends Schema.Codec<unknown, FieldValues, never, never>>(schema: S): Resolver<S["Encoded"], unknown, S["Type"]>`. Read the real `Schema.Codec` type parameters from `node_modules/effect/dist/Schema.d.ts` and add an `expectTypeOf` check that a schema with required services is rejected.
- Also export `toFormIssues(issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }>): FormIssue[]` (Standard Schema issues to `FormIssue`, `code: "validate"`).

- [ ] **Step 1: Write the failing tests** (`resolver.test.ts`, node-safe, calling the resolver directly with `{ criteriaMode }` as React Hook Form does). Use the issue's schema (`name: NonEmptyTrimmedString`, `invoiceEmail: optional(String with a pattern)`) plus `age` (`isBetween` 18 to 99) and `tags: Array(Struct({ label: NonEmptyString }))`:
  - valid input returns `{ values: <decoded>, errors: {} }`, and a `NumberFromString` field arrives as a number (`"42"` gives `42`).
  - invalid input returns every error, not the first: `name`, `invoiceEmail`, `age`, `tags[0].label`, `tags[2].label`, with `tags` an array.
  - messages are Effect's text by default, and a `message` annotation on the failing filter replaces it.
  - a struct-level filter returning `{ path: ["b"], issue: "b must equal a" }` lands on `b`; one returning a plain string lands on `root`.
  - an async filter (returns a promise) is awaited.
  - `criteriaMode: "all"` collects both messages of one field under `types`.
  - Review Focus 1 to 4: an issue at an unknown path reaches the errors object; a `{ key: "x" }` path segment and a numeric one become field names; `NumberFromString` given `""` is an error on that field; a filter that throws rejects the resolver's promise with that error.
  - `resolver.ssr.test.ts` (`// @vitest-environment node`): importing the module and calling the resolver works with no `window`, and the module source imports nothing from `react`.
- [ ] **Step 2: Run** `pnpm -F @azmr/ui exec vitest run src/components/effect`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement `effectSchemaResolver` and `toFormIssues`** in `resolver.ts`: build `Schema.toStandardSchemaV1(schema)` once; on each call `await standard["~standard"].validate(values)`; on `issues` return `{ values: {}, errors: issuesToFieldErrors(toFormIssues(result.issues), options.criteriaMode) }`; otherwise `{ values: result.value, errors: {} }`. Do not catch exceptions.
- [ ] **Step 4: Wire the entry** (`entries.json`, `package.json`, size-limit, `pnpm install` for the lockfile). `pnpm -F @azmr/ui build`. Expected: passes `verify-dist`; `dist/effect.js` exists with no `"use client"`; it `import`s `effect` rather than containing it (check its size is a few kB); `grep -c effect dist/zod.js dist/rhf.js dist/index.js` is 0 (Review Focus 5, added as a test in Task 4).
- [ ] **Step 5: Run** `pnpm -F @azmr/ui test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(ui): add effectSchemaResolver in a new @azmr/ui/effect entry`.

---

### Task 3: Field metadata from an Effect schema

**Files:**
- Create: `packages/ui/src/components/effect/fields.ts`
- Test: `packages/ui/src/components/effect/fields.test.ts`
- Modify: `packages/ui/src/components/effect/index.ts`

**Interfaces:**
- Consumes: `FieldDef`, `FieldType`, `sentenceCase` (Task 1).
- Produces: `export function fieldFromSchema<Name extends string>(name: Name, schema: Schema.Top): FieldDef<Name>` and `export function fieldsFromSchema<Fields extends Schema.Struct.Fields>(schema: Schema.Struct<Fields>): FieldDef<Extract<keyof Fields, string>>[]`. Also re-export the types `FieldDef` and `FieldType` from the entry, so a user imports everything from `@azmr/ui/effect`.

- [ ] **Step 1: Write the failing tests** (one table, assertions on the whole `FieldDef`):
  - `Schema.NonEmptyString` is `{ type: "text", required: true, min: 1 }`; with `isMaxLength(5)` it gains `max: 5`.
  - `Schema.Number` with `isBetween({ minimum: 18, maximum: 99 })` is `{ type: "number", min: 18, max: 99 }`; an exclusive `isGreaterThan` sets no `min` (never claim a wrong limit).
  - `Schema.optional(...)` and `NullOr(...)` are `required: false`; `Schema.Boolean` is `type: "boolean"`; `Schema.Literals(["admin", "user"])` is `{ type: "enum", options: ["admin", "user"] }`.
  - label is the `title` annotation, else sentence case of the key (`invoiceEmail` gives `"Invoice email"`); a `fieldType: "money"` annotation overrides the type; other annotation values land in `meta`.
  - `fieldsFromSchema` keeps field order and is the same shape the Zod adapter gives for the equivalent schema (the table includes the Zod equivalent and asserts equality).
  - a field whose AST this adapter does not recognise is `{ type: "custom" }`, never a throw.
- [ ] **Step 2: Run** `pnpm -F @azmr/ui exec vitest run src/components/effect/fields.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions by reading `schema.ast`: unwrap a `Union` of one real member plus null/undefined, read `ast.context?.isOptional`, and map the `representation.id` values `effect/schema/isMinLength`, `isMaxLength`, `isGreaterThanOrEqualTo`, `isLessThanOrEqualTo` and `isBetween` to `min` and `max`. Keep the id table in one constant so an Effect upgrade is a one-line fix, and add one contract test per id that fails loudly if Effect renames it.
- [ ] **Step 4: Run** `pnpm -F @azmr/ui exec vitest run src/components/effect`, then `pnpm -F @azmr/ui test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): derive field metadata from an Effect schema`.

---

### Task 4: Parity with the Zod adapter, through a real form

**Files:**
- Test: `packages/ui/src/components/effect/parity.test.tsx`, `packages/ui/src/components/effect/entry.test.ts`

**Interfaces:**
- Consumes: `effectSchemaResolver` (Task 2), `zodResolver` and `z`, `Form`, `FormField`, `FormErrorSummary`, `FormFieldArray` from `@azmr/ui/rhf`, `useForm` from `react-hook-form`.

- [ ] **Step 1: Write the failing tests.** A helper renders the same form twice, once with `zodResolver(zodSchema)` and once with `effectSchemaResolver(effectSchema)`, where both schemas carry the same explicit messages. For each case submit the same invalid input and assert the **same field errors, the same error-summary text and the same focus target**:
  - a flat signup form (business, email, budget) submitted empty.
  - nested objects and a `FormFieldArray` with errors on rows 0 and 2.
  - optional and nullable fields left blank (no error), and a cleared optional number.
  - a refinement on the whole struct: with a `path` it lands on that field; without one it lands in `root` and the summary.
  - a transform: the decoded value (a number) reaches `onSubmit` in both.
  - `entry.test.ts`: reads `dist/zod.js`, `dist/rhf.js` and `dist/index.js` and asserts none mention `"effect"`, and that `package.json` lists `effect` as an optional peer (Review Focus 5).
- [ ] **Step 2: Run** `pnpm -F @azmr/ui exec vitest run src/components/effect/parity.test.tsx src/components/effect/entry.test.ts`. Expected: FAIL where the adapters differ or `dist` is stale; build first (`pnpm -F @azmr/ui build`) so `entry.test.ts` reads current files.
- [ ] **Step 3: Fix real differences at their source** (in the resolver or the shared core), not in the tests. Every difference found is either fixed or written into "Decisions" with its reason.
- [ ] **Step 4: Run** `pnpm -F @azmr/ui test`. Expected: PASS.
- [ ] **Step 5: Commit** `test(ui): prove the Effect and Zod form adapters agree`.

---

### Task 5: Docs, size, changeset and verification

**Files:**
- Modify: `apps/site/content/docs/guide/forms.mdx`, `apps/site/content/docs/guide/server-components.mdx` (list `@azmr/ui/effect` with the other server entries), `apps/site/src/content.test.ts` (`pageFor`: `effect` to `/docs/guide/forms`), `packages/ui/.size-limit.json`
- Create: `.changeset/effect-adapter.md` (minor, `@azmr/ui`), `apps/site/src/demos/forms/effect-signup.demo.tsx` (registered in `apps/site/src/demos/registry.ts`, then `pnpm -F @azmr/site exec tsx scripts/build-lazy-demos.mts`)

- [ ] **Step 1: Write the docs.** In `forms.mdx` add a section "With Effect Schema": install (`pnpm add effect react-hook-form`), the issue's example corrected to current Effect (`Schema.check(Schema.isPattern(...))`), `effectSchemaResolver` and `fieldsFromSchema`, how errors and messages behave (Decisions 2 and 3, including that messages are the schema's own), a note that Effect 3 is not supported, and a line that the entry is server-safe. The page must show the import path `@azmr/ui/effect` (the site test checks it).
- [ ] **Step 2: Run the site tests** `pnpm -F @azmr/site test`. Expected: any failure names the convention missed (the demo registry, the guide's entry list, `pageFor`); fix each in the file it names.
- [ ] **Step 3: Verify everything.** `pnpm -F @azmr/ui test`, `pnpm -F @azmr/ui check-types`, `pnpm -F @azmr/ui build`, `pnpm -F @azmr/ui size`, `pnpm -F @azmr/ui verify:consumer`, `pnpm -F @azmr/site test`, `pnpm lint`. Expected: all pass; `size` reports `@azmr/ui/effect` within its limit.
- [ ] **Step 4: Commit** `docs(ui): document the Effect Schema adapter and add a changeset`.

## Self-review notes

- **Spec coverage:** resolver with all errors and nested and array paths (Tasks 2 and 4), field metadata (Task 3), messages (Decision 3, tested), peer dependency and tree-shaking (Task 2 Step 4 and Task 4 `entry.test.ts`), parity tests, nested objects, arrays, optional and nullable, transforms, whole-struct refinements (Task 4), docs with a React Hook Form example, size check and changeset (Task 5).
- **Where the issue is not followed, and why:** `decodeUnknownEither` (does not exist in Effect 4), the `options` argument (Decision 4), and "the locale's form messages" (no such catalogue exists, for either adapter).
- **Type consistency:** `FormIssue`, `issuesToFieldErrors`, `FieldDef`, `sentenceCase` are defined in Task 1 and used under the same names in Tasks 2 and 3.
- **Not covered, on purpose:** a generic Standard Schema resolver, an error-code walk of Effect's `Issue` tree, a message catalogue.
