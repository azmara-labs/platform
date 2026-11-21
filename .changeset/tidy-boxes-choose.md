---
"@azmr/ui": minor
---

New entry `@azmr/ui/choice`: `Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup` and `Switch`, built on Base UI. Labels sit beside the control, with a description, an error and a required marker wired to it, and a `size` of `sm`, `md` or `lg` (`lg` is at least 44px tall for touch). A checkbox can be `indeterminate`, and a `CheckboxGroup` can add a "select all". Groups take either `options` or hand-written items, which render the same way. Label, description and option text is always rendered as text, and an option's value is only ever data.

`FormField` now binds these controls for you as controlled fields (a boolean, a string, or a string array). `fieldsFromSchema` describes `z.literal(true)` as `boolean` and an array of an enum as the new `multiselect` field type, with its `options`, in both `@azmr/ui/zod` and `@azmr/ui/effect`.

New server-side validation: `parseFormData(schema, formData)` in `@azmr/ui/zod` and `@azmr/ui/effect` reads a posted `FormData` through the schema's own fields (an unticked checkbox is `false`, a group is an array, unknown keys are ignored) and validates it with the same schema the form uses, so a tampered post is rejected on the server. `formDataToValues` is the first step on its own. The size budget of `@azmr/ui/zod` rises from 1.2 kB to 1.5 kB for this.
