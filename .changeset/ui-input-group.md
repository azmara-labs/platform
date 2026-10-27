---
"@azmr/ui": minor
---

Add `@azmr/ui/input-group`: `InputGroup`, `InputGroupInput`, `InputGroupAddon` and `InputGroupButton` put text, icons and buttons inside an input's border (a currency or unit, a search icon, a clear or copy button). The border and focus ring wrap the whole group and the height follows the density tokens. Text addons join the input's accessible description and icon addons are hidden from screen readers. Buttons are `type="button"` and sit in the tab order after the input. Inside a `Field`, `aria-required` and `aria-errormessage` reach the input, and `InputGroupInput` forwards the real `<input>` ref so `register()` works without a `Controller`.
