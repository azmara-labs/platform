---
"@azmr/ui": minor
---

Forms now work with controls from other libraries, and rows can be changed from code.

- `Field` accepts a function child for any control that isn't a Base UI one, such as a Radix (shadcn) Select trigger, a native `<select>` or a third-party date picker. It gets `{ id, aria-labelledby, aria-describedby, aria-invalid, aria-required, aria-errormessage }` to spread on the control, so the label points at it and the description and error describe it. New type: `FieldControlProps`.
- `FormField`'s `render` gets the same props as `control`. Spread them on the element that takes focus. The element `render` returns no longer gets `aria-required` or `aria-errormessage` cloned onto it, because `control` carries them.
- `FormFieldArray` takes `fieldArray`, your own `useFieldArray` result, so other parts of the form can `replace()` or `append()` rows. Its `row.name()` is typed: `row.name("qty")` is `` `lines.${number}.qty` ``, ready for `FormField`'s `name`, and an unknown field fails to compile. In an untyped form it stays a `string`. New type: `FormFieldArrayRow`.
- `NumberField` and `MoneyField` take `groupClassName` for the border, height and radius around the input, and mark their parts with `data-slot` (`number-field`, `number-field-group`, `number-field-input`).
