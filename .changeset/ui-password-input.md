---
"@azmr/ui": minor
---

Add `@azmr/ui/password-input`: `PasswordInput` with a show/hide toggle (a button with `aria-pressed` and a fixed "Show password" name), an optional strength meter (`strength`, with a small length-first default scorer or your own, such as zxcvbn-ts) and an optional requirement checklist (`requirements`, with ready-made `passwordRequirements`) whose changes are announced politely. `autoComplete` defaults to `current-password`, paste is never blocked, and the password is hidden again when its form submits so password managers offer to save it. The `ref` is the real `<input>`, so `register()` works without a `Controller`.
