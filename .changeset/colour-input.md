---
"@azmr/ui": minor
---

Add `ColourInput` to `@azmr/ui/input`: a text field for a hex colour next to a native colour swatch. The text input is the real `<input>`, so `ref`, `register()` and `Field` work as they do for `Input`. Picking a colour writes a lower-case `#rrggbb` and fires `onChange` and `onValueChange` like typing does. It does not validate; pair it with a `Field` error.
