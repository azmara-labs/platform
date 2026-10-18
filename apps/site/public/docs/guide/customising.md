# Customising components

> Four ways to change how a component looks or behaves, from a className override to copying its source with the shadcn CLI.

Source: https://platform.azmara.io/docs/guide/customising

There are four ways to change a component, from lightest to heaviest. Start at the top and move down only when the lighter one cannot do what you need. Every example here is a live demo that the docs tests render, or code that the docs tests run.

## 1. Pass a className

Every component accepts `className` and merges it last with [tailwind-merge](https://github.com/dcastil/tailwind-merge), so a class you pass replaces the default it conflicts with:

```tsx
import { Button } from "@azmr/ui/button";

// `className` is merged last, so each class below replaces the default it conflicts with.
export default function ClassOverride() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button className="rounded-full px-8">Pill, wider</Button>
      <Button variant="outline" className="border-primary text-primary">
        Branded outline
      </Button>
      <Button className="h-14 text-base">Taller</Button>
    </div>
  );
}
```

The merge is the `cn` helper, and you can use it for your own components. It is exported from `@azmr/ui/lib`, which is server-safe:

```ts
import { cn } from "@azmr/ui/lib";

const merged = cn("size-8", "size-10");
// => "size-10"
```

It resolves conflicts per Tailwind utility group, so a wider padding replaces only the padding it conflicts with:

```ts
const padding = cn("px-4 py-2", "px-6");
// => "py-2 px-6"
```

And it accepts strings, arrays, objects and falsy values, like `clsx`:

```ts
const classes = cn("text-sm", false && "hidden", ["font-bold"], { underline: true });
// => "text-sm font-bold underline"
```

Prefer the token utilities (`bg-primary`, `text-muted-foreground`, `border-border`) over raw colours in your overrides, so they follow the theme, dark mode and any [scoped theme](https://platform.azmara.io/docs/guide/theming.md).

## 2. Reuse the button's styles with buttonVariants

When a link or a router component should look like a button, use `buttonVariants`. It returns the button's classes as a string for the `variant` and `size` you ask for, so any element can wear them:

```tsx
"use client";

import { buttonVariants } from "@azmr/ui/button";

// `buttonVariants` returns the button's classes as a string, so any element can look like a button.
// It lives in a client entry, so call it from a Client Component.
export default function LinkAsButton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="#documentation" className={buttonVariants({ variant: "outline" })}>
        Documentation
      </a>
      <a href="#start" className={buttonVariants({ size: "lg" })}>
        Get started
      </a>
    </div>
  );
}
```

`buttonVariants` is exported from `@azmr/ui/button`, which is a client entry, so call it from a Client Component. If the element should also behave like a button (a real `<button>`, a loading state), use `<Button render={<a href="…" />}>` instead; see [Button](https://platform.azmara.io/docs/components/button.md).

## 3. Wrap a component to set defaults

To give your app a house style, wrap the component. Forward `ref` and spread the remaining props, so `className`, `onClick` and `aria-*` still reach the real element:

```tsx
"use client";

import { Button, type ButtonProps } from "@azmr/ui/button";
import { forwardRef } from "react";

/** A Button with house defaults. Whatever a caller passes, including `className` and `ref`, wins. */
const ActionButton = forwardRef<HTMLButtonElement, ButtonProps>(function ActionButton(props, ref) {
  return <Button ref={ref} variant="outline" size="sm" {...props} />;
});

export default function WrappedButton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton>Save draft</ActionButton>
      <ActionButton variant="default">Publish</ActionButton>
      <ActionButton className="rounded-full">Custom shape</ActionButton>
    </div>
  );
}
```

The wrapper's defaults apply only when a caller does not pass the prop, and the wrapper still gets everything the component guarantees: the tokens, the focus ring and the keyboard behaviour.

## 4. Copy the source with the shadcn CLI

When you need to change the structure, not just the style, copy the component into your app and edit it. The same components are published to a shadcn-compatible registry; see [Or copy the source with the shadcn CLI](https://platform.azmara.io/docs/components.md#or-copy-the-source-with-the-shadcn-cli) for the setup.

Today the registry has `button`, `spinner` and a `tokens` item (the density, motion and elevation tokens plus the colours a standard shadcn app lacks). Other components are available from the package only.

The cost of copying is ownership: you take on updates, and fixes that ship in the package do not reach your copy. Keep using the tokens in the copy, so theming and dark mode keep working.

## Which one to use

| You want to                                          | Use                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Change a colour, size, shape or spacing in one place | `className`                                                                               |
| Make a link or a router link look like a button      | `buttonVariants`                                                                          |
| Give every use in your app the same defaults         | A wrapper component                                                                       |
| Change what the component renders or how it behaves  | Copy the source                                                                           |
| Change the whole palette, radius, font or density    | [`createTheme`](https://platform.azmara.io/docs/guide/theming.md), not a component change |
