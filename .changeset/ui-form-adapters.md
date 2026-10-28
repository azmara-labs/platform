---
"@azmr/ui": minor
---

Add the form adapters. `@azmr/ui/rhf` (React Hook Form 7, optional peer): `Form` (a `noValidate` form with `FormProvider` and `handleSubmit`), `FormField` (a `Field` that registers its control with `register()`, so there is no `Controller`, shows the field's error and required state, and switches to `useController` with `controlled` or `render` for controls without an input ref) and `FormErrorSummary`. `@azmr/ui/zod` (Zod 4, optional peer, server-safe): `zodResolver` (async refinements, parsed output, nested and array paths, `root` for object-level issues, `criteriaMode: "all"`) and `fieldsFromSchema`/`fieldFromSchema`, which describe a schema's fields (label, control type, required, limits, enum options, metadata) for generated forms. `ErrorSummary` now lists errors in the order their fields appear on the page, with form-level errors first.
