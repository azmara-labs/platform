---
"@azmr/ui": minor
---

Add `@azmr/ui/number-field`: `NumberField` and `MoneyField` on Base UI's NumberField. They format with `Intl.NumberFormat` for the locale (`LocaleProvider`, en-NZ and NZD without one), report a real `number` or `null` and never a formatted string, clamp to `min`/`max`, support `step`, `allowNegative`, `decimalScale`, `grouping`, `format`, an optional stepper, paste parsing and a wheel guard, and follow the `debounceMs`/`onCommit` contract. `MoneyField` rounds to the currency's minor unit. `register()` works without a `Controller`: `ref` is the named hidden number input, `onChange`/`onBlur` get real DOM events on it, and `numberOrNull` is a ready `setValueAs`. Both fit inside an `InputGroup`.
