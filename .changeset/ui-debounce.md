---
"@azmr/ui": minor
---

Add the debounce contract to `Input`: `debounceMs` delays `onValueChange`, `onCommit` fires on blur or Enter (not while an input method is composing) after sending any waiting value, `data-pending` marks a waiting value, a waiting value is dropped on unmount, and an unchanged value is never reported or committed twice. The native `onChange` stays immediate, so `register()` is unaffected. `@azmr/ui/hooks` now exports `useDebouncedCallback` (stable, with `flush`, `cancel` and `isPending`) and `useDebouncedValue`.
