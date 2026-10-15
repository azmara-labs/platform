---
"@azmr/ui": minor
---

Add `Button`, `Input` and `Spinner`, built on Base UI primitives, the design tokens and CVA variants.

- `Button`: variants `default | secondary | outline | ghost | destructive | link`, sizes `sm | md | lg | icon`, `loading` / `loadingText` / `startIcon` / `endIcon`, `type="button"` by default, `render` for links. A loading button ignores activation but stays focusable. Icon-only buttons are type-checked to require `aria-label` or `aria-labelledby`.
- `Input`: `ref` is the real `<input>`, so `react-hook-form`'s `register()` works with no `Controller`; native `onChange` and typed `onValueChange`; density-token height and padding; full-strength focus ring.
- `Spinner`: decorative by default or a labelled status; stays animated under reduced motion.
- New subpaths `@azmr/ui/button`, `@azmr/ui/input`, `@azmr/ui/spinner` (client entries) and root exports for all three, plus `buttonVariants`.
- `@base-ui/react` and `class-variance-authority` become dependencies. Tree-shaking is budget-tested: importing only `useSignal` from the root costs 0.1 kB.
