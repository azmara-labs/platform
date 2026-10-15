---
"@azmr/ui": minor
---

Add `@azmr/ui/floating`: `Tooltip` (with `TooltipProvider` and the shared `TOOLTIP_DELAY_MS`), `Popover` and `HoverCard`. Collision-aware, portalled above overlays, capped to the available space, and animated with the motion tokens. The tooltip adds `role="tooltip"` and `aria-describedby` on its trigger while open, which Base UI 1.9 omits.
