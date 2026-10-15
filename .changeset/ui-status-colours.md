---
"@azmr/ui": minor
---

Status colours in buttons and in `createTheme`.

- `Button` gains `success`, `warning` and `info` variants (`destructive` was already the "danger" button).
- `createTheme` now accepts `secondary`, `success`, `warning`, `info` and `destructive` alongside `primary`. Each is derived to be AA in both modes. Labels stay at least 4.5:1 on a solid button's **hover** surface, checked with the same gamma-space blend a browser uses (this also tightens `primary`: a brand colour that only just passed at rest could fall below 4.5:1 on hover). `success`, `info` and `destructive` are also readable as text on the page and on cards, and `warning` gets a readable `--warning-text`. Errors name the option that was wrong.
- The default light `success` colour is slightly darker: its button label measured 4.46:1 on hover.
- Hover contrast of every solid Button variant is now tested over the page and a card in both modes.
