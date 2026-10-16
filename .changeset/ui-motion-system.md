---
"@azmr/ui": minor
---

Add the motion system. `@azmr/ui/styles.css` now includes CSS presets (fade, scale, four slides, collapse, stagger, shimmer, check draw, a page cross-fade) driven by the motion tokens, with a reduced-motion rule for each; new tokens `--motion-stagger-step` and `--motion-duration-ambient`. New entries: `@azmr/ui/presets` (server-safe `Collapse`, which animates `grid-template-rows` and is inert while closed, `Stagger`, `AnimatedCheck`, and the typed `motionPresets` map) and `@azmr/ui/transition` (`Transition`, a feature-detecting wrapper for React's `ViewTransition` that is a no-op until your React has it, and `CountUp`). `useReducedMotion` is exported from `@azmr/ui/hooks`. `Skeleton` gains `shimmer`.
