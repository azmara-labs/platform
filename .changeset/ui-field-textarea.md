---
"@azmr/ui": minor
---

Add `Field` (`@azmr/ui/field`) and `Textarea` (`@azmr/ui/input`). `Field` wraps one control with a label, description, error and required marker on Base UI's Field, and wires `id`, `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-errormessage` and `aria-required`; errors are announced through a polite live region. Pass `errors.<name>?.message` from React Hook Form as `error`. `FieldRoot`, `FieldLabel`, `FieldDescription` and `FieldError` compose custom layouts. `Textarea` forwards the real `<textarea>` ref and has an `autoResize` option.
