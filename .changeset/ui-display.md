---
"@azmr/ui": minor
---

Add the display components (`@azmr/ui/display`), all Server Components: `Card` (with Header, Title, Description, Content, Footer), `Badge` (default, secondary, outline and the status variants), `Alert` (info, success, warning, destructive; assertive `role="alert"` for problems and polite `role="status"` otherwise, a default icon per variant, optional labelled dismiss button), `Skeleton` (decorative, pulses, stilled by the reduced-motion rule) and `EmptyState`. The status colours are checked for contrast on the blended tint surface in light and dark, over both the page and a card, from the component class names; this found and fixed a destructive badge at 4.26:1.
