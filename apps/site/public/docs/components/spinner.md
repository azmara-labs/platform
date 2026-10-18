# Spinner

> An indeterminate progress indicator that is a Server Component and keeps spinning under reduced motion.

Source: https://platform.azmara.io/docs/components/spinner

Group: Feedback · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Spinner } from "@azmr/ui/spinner";
```

```tsx
import { Spinner } from "@azmr/ui/spinner";

export default function SpinnerBasic() {
  return (
    <div className="flex items-center gap-6">
      {/* Decorative: the surrounding control already says it is busy. */}
      <Spinner />
      <Spinner className="size-6" />
      {/* Announced as a status. */}
      <Spinner className="size-8 text-primary" label="Loading customers" />
    </div>
  );
}
```

`Spinner` is a **Server Component** (no hooks, no `"use client"`), so it works in `loading.tsx` and Suspense fallbacks without a client boundary. Size it with a class (`size-6`); colour follows `currentColor`.

## Decorative or announced

A spinner inside a control that already says it is busy (such as `Button loading`) should be decorative: it is `aria-hidden` by default. A spinner on its own needs a `label`, which makes it a `role="status"` that screen readers announce.

## Reduced motion

Most motion in `@azmr/ui` stops under `prefers-reduced-motion`. A spinner does not: a frozen spinner reads as a hung page, which is worse than motion the user asked to avoid. It is marked `data-motion="essential"` to opt out of the reduced-motion rule.

## Props

| Prop        | Type     | Default | Required | Description                                                                                                                                                                                                                                         |
| ----------- | -------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`     | `string` |         | No       | Accessible name. When set the spinner is announced as a status ("Loading customers"); when omitted it is decorative and hidden from assistive technology (use that when the surrounding control already says it is busy, as `Button loading` does). |
| `className` | `string` |         | No       |                                                                                                                                                                                                                                                     |

Any SVG attribute passes through, and `ref` is the `<svg>`. `className` is merged last: `size-8 text-primary`.

## Accessibility

- Decorative by default, announced only when you give it a `label`.
- No keyboard interaction; it is not focusable.
