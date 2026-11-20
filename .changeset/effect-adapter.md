---
"@azmr/ui": minor
---

Add `@azmr/ui/effect`: `effectSchemaResolver` for React Hook Form and `fieldsFromSchema` for field metadata, for forms validated with Effect Schema, alongside the Zod adapter. `effect` 4.1 or later is an optional peer dependency. Every issue is reported on its field path, effectful checks are awaited, and an exception thrown inside a refinement is rethrown rather than shown as a message. The Zod and Effect adapters now share their `FieldDef` type and error mapping, with no change to `@azmr/ui/zod`.
