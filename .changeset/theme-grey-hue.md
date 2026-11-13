---
"@azmr/ui": patch
---

Treat `brand` and `primary` as the same colour when both are greys of the same lightness, whatever hue each was given. Before, `oklch(0.6 0 0)` and `oklch(0.6 0 200)` were reported as different colours, though a grey has no hue.
