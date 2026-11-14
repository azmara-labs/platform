---
"@azmr/ui": minor
---

Add a `primary-text` colour role: the brand colour as text or an icon (`text-primary-text`), derived by `createTheme` like `warning-text` is. It is the brand colour itself when that already reads on the page and on cards in both modes, and otherwise the same hue moved only as far as it takes, so a bright brand such as cyan or yellow stays readable. It is overridable per mode like any role, has a default in `tokens.css`, and is checked against the page and cards by `validateTheme`.

A `createTheme` call that sets `primary` or `brand` now also emits `--primary-text`. Every other variable keeps its value and order.
