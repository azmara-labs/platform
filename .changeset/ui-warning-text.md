---
"@azmr/ui": patch
---

Add a `--warning-text` token (and `text-warning-text`): a warning colour that is readable as text on the page and on cards in light and dark (the yellow `--warning` and the near-black `--warning-foreground` are surface colours, and the latter was unreadable as text on the dark theme). `Text tone="warning"` now uses it. Contrast of all four semantic tone colours as text on the background and card is now tested in both modes.
