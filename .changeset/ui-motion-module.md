---
"@azmr/ui": minor
---

Add `@azmr/ui/motion`, an optional module for the `motion` library. `MotionProvider` sets up `LazyMotion` (the animation features load on demand, `dom` by default or `max` for layout animation, drag and reorder) and `MotionConfig reducedMotion="user"`, and is strict by default so the full `motion` component cannot be pulled into your bundle by accident. The module re-exports `m`, `AnimatePresence`, `Reorder`, `animate`, `useAnimate`, `useInView`, `useMotionValue`, `useSpring`, `useTransform` and `useDragControls`, and adds `springs` (`gentle`, `snappy`, `bouncy`).

`motion` is an optional peer dependency (`^14.0.0`, tested against 14.2.0): installing `@azmr/ui` does not install it, and nothing outside this module imports it. The wrapper is about 0.5 kB.
