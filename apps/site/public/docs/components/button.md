# Button

> Triggers an action. Six variants, density-aware sizes, a loading state that keeps keyboard focus, and an icon-only form the types force you to name.

Source: https://platform.azmara.io/docs/components/button

Group: Inputs · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Button } from "@azmr/ui/button";
```

```tsx
import { Button } from "@azmr/ui/button";

export default function ButtonVariants() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="success">Success</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="info">Info</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  );
}
```

Use `default` for the primary action on a screen, `secondary` and `outline` for supporting ones, `ghost` for toolbars, `destructive` for irreversible actions and `link` for navigation that should read as text. `success`, `warning` and `info` are solid status buttons for confirmations and alerts that need an action; their labels are checked for contrast on the hover surface as well as at rest. The `md` size follows the density token: switch the preview above to Compact or Spacious and it resizes, exactly as it will inside an app that sets `data-density`.

A button is `type="button"` unless you say otherwise, so one inside a form never submits by accident. Pass `type="submit"` to opt in.

## Loading

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { useEffect, useRef, useState } from "react";

export default function ButtonLoading() {
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function save() {
    setSaving(true);
    timer.current = setTimeout(() => setSaving(false), 1500);
  }

  // While loading the button ignores clicks and keys but stays focusable, so a keyboard user
  // keeps their place.
  return (
    <Button loading={saving} loadingText="Saving" onClick={save}>
      Save changes
    </Button>
  );
}
```

`loading` shows a spinner, sets `aria-busy`, and ignores clicks **and** keyboard activation. It stays in the tab order, so a keyboard user who pressed Enter does not lose their place and a screen reader still finds the button. `loadingText` replaces the label while it is busy.

## Icons and links

```tsx
import { Button } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { ArrowRight, Plus, X } from "lucide-react";

export default function ButtonIcons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button startIcon={<Icon icon={Plus} />}>New customer</Button>
      <Button variant="outline" endIcon={<Icon icon={ArrowRight} />}>
        Continue
      </Button>
      {/* An icon-only button needs an accessible name; the types require it. */}
      <Button size="icon" variant="ghost" aria-label="Close">
        <Icon icon={X} />
      </Button>
      {/* Render as a link, with button styling and the right semantics. */}
      <Button
        variant="link"
        nativeButton={false}
        render={<a href="https://platform.azmara.io/docs" />}
      >
        Read the docs
      </Button>
    </div>
  );
}
```

`startIcon` and `endIcon` sit either side of the label; while `loading`, the spinner replaces the start icon. An icon-only button must be given an accessible name: with `size="icon"` TypeScript requires `aria-label` or `aria-labelledby`. To render a link with button styling, pass `render={<a href="..." />}` and `nativeButton={false}`.

## IconButton

```tsx
import { IconButton } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { Pencil, Plus, Trash2 } from "lucide-react";

export default function IconButtonBasic() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* The label is required: it is the button's accessible name. */}
      <IconButton icon={<Icon icon={Plus} />} label="Add item" />
      <IconButton icon={<Icon icon={Pencil} />} label="Edit" variant="outline" />
      <IconButton icon={<Icon icon={Trash2} />} label="Delete" variant="destructive" />
      <IconButton
        icon={<Icon icon={Plus} />}
        label="Add item (small)"
        size="sm"
        variant="secondary"
      />
      <IconButton icon={<Icon icon={Plus} />} label="Saving" loading variant="outline" />
    </div>
  );
}
```

```tsx
import { IconButton } from "@azmr/ui/button";
```

A square button with only an icon, passed as an element: `<IconButton icon={<Icon icon={Plus} />} label="Add item" />`. (An element rather than a component, so it also works from a Server Component.) `label` is **required** and becomes the accessible name: an icon alone cannot be announced, so the types do not let you leave it out (and an empty string throws in development). It is `ghost` by default so a row of them stays quiet, takes the same variants as `Button`, and `loading` swaps the icon for a spinner while keeping the button focusable. `size` is `sm`, `md` (follows the density token) or `lg`.

For a tooltip on an icon button, wrap it in a `Tooltip`, and keep the `label` too: a tooltip is not an accessible name on touch devices.

## ButtonGroup

```tsx
import { Button, ButtonGroup } from "@azmr/ui/button";

export default function ButtonGroupBasic() {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ButtonGroup aria-label="Page navigation">
        <Button variant="outline">Previous</Button>
        <Button variant="outline">Today</Button>
        <Button variant="outline">Next</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Export format" orientation="vertical">
        <Button variant="outline">PDF</Button>
        <Button variant="outline">CSV</Button>
        <Button variant="outline">Excel</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Spaced actions" attached={false}>
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </ButtonGroup>
    </div>
  );
}
```

```tsx
import { ButtonGroup } from "@azmr/ui/button";
```

A named group (`role="group"`, with `aria-label` or `aria-labelledby` required) of related buttons, joined into one control: inner corners squared, one shared border, and the hovered or focused button raised so its focus ring is never hidden by a neighbour. `orientation="vertical"` stacks them, and `attached={false}` keeps them apart with a gap.

It is **only a grouping**: Tab still visits every button. If the buttons should act as one control with arrow keys and a pressed state, use [ToggleGroup](https://platform.azmara.io/docs/components/toggle.md). If one of them opens a menu, use [SplitButton](https://platform.azmara.io/docs/components/split-button.md).

## Props

| Prop          | Type                                                                                                                           | Default | Required | Description                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`     | `"default" \| "secondary" \| "outline" \| "ghost" \| "destructive" \| "success" \| "warning" \| "info" \| "link" \| undefined` |         | No       | Visual style. `default` is the primary action; use `destructive` for irreversible ones.                                                                                 |
| `size`        | `"sm" \| "md" \| "lg" \| "icon" \| undefined`                                                                                  |         | No       | `md` follows the density token, so it grows or shrinks with `data-density`. `icon` is a square button for an icon alone and requires `aria-label` or `aria-labelledby`. |
| `loading`     | `boolean \| undefined`                                                                                                         |         | No       | Show a spinner, mark the button busy and ignore activation. It stays focusable.                                                                                         |
| `loadingText` | `ReactNode`                                                                                                                    |         | No       | Replaces the label while `loading`.                                                                                                                                     |
| `startIcon`   | `ReactNode`                                                                                                                    |         | No       | Shown before the label; replaced by the spinner while `loading`.                                                                                                        |
| `endIcon`     | `ReactNode`                                                                                                                    |         | No       | Shown after the label.                                                                                                                                                  |

Everything a native button accepts passes through (`onClick`, `type`, `disabled`, `aria-*`, `ref`, ...), plus these from the underlying primitive:

| Prop                    | Type                       | Description                                                                               |
| ----------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `render`                | `ReactElement` or function | Render a different element (such as `<a>`) with the button's behaviour and styles.        |
| `nativeButton`          | `boolean`                  | Set to `false` when `render` is not a native `<button>`.                                  |
| `focusableWhenDisabled` | `boolean`                  | Keep a disabled button in the tab order. `loading` does this for you.                     |
| `className`             | `string`                   | Merged last, so it can override defaults: `className="h-12"` replaces the default height. |

## Accessibility

- It is a real `<button>` (or the element you `render`), so it has the right role, name from its content, and disabled semantics with no ARIA added.
- Focus uses a full-strength ring that meets WCAG 2.2 focus appearance; the same ring is used on every control.
- `loading` communicates busy state with `aria-busy` rather than changing the label silently.

| Key                | Action                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `Enter` or `Space` | Activates the button. Ignored while loading.                        |
| `Tab`              | Moves focus to the button. A loading button stays in the tab order. |
| `Shift` or `Tab`   | Moves focus to the previous control.                                |
