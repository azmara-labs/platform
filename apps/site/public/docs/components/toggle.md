# Toggle

> Toggle and ToggleGroup. A button that stays pressed, and a group of them that acts as one control with arrow-key navigation. Built on Base UI.

Source: https://platform.azmara.io/docs/components/toggle

Group: Inputs · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Toggle, ToggleGroup, ToggleGroupItem } from "@azmr/ui/toggle";
```

These are interactive, so they are client components.

## Toggle

```tsx
import { Toggle } from "@azmr/ui/toggle";
import { Bold, Italic } from "lucide-react";

export default function ToggleBasic() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle aria-label="Bold" size="icon">
        <Bold className="size-4" />
      </Toggle>
      <Toggle aria-label="Italic" size="icon" variant="outline" defaultPressed>
        <Italic className="size-4" />
      </Toggle>
      <Toggle variant="outline">Notify me</Toggle>
    </div>
  );
}
```

A button that is either pressed or not, exposed as `aria-pressed`. Use `pressed` and `onPressedChange` to control it, or `defaultPressed` to start on. `variant` is `default` or `outline`, `size` is `sm`, `md` or `lg`.

An icon-only toggle (`size="icon"`) has no text, so it needs an accessible name: the types require `aria-label` or `aria-labelledby`.

Use a toggle for a state that is **on or off right now** (bold, mute, show grid). For a setting that is saved with a form, use a switch or checkbox instead.

## ToggleGroup

```tsx
"use client";

import { ToggleGroup, ToggleGroupItem } from "@azmr/ui/toggle";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from "lucide-react";
import { useState } from "react";

export default function ToggleGroupBasic() {
  const [align, setAlign] = useState<string[]>(["left"]);
  return (
    <div className="flex flex-col items-start gap-4">
      {/* One at a time (the default). The value is always an array. */}
      <ToggleGroup
        aria-label="Text alignment"
        variant="outline"
        value={align}
        onValueChange={(v) => setAlign(v as string[])}
      >
        <ToggleGroupItem value="left" size="icon" aria-label="Align left">
          <AlignLeft className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" size="icon" aria-label="Align centre">
          <AlignCenter className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" size="icon" aria-label="Align right">
          <AlignRight className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Aligned: {align[0] ?? "nothing"}
      </p>

      {/* Any number at once. */}
      <ToggleGroup aria-label="Text style" variant="outline" multiple defaultValue={["bold"]}>
        <ToggleGroupItem value="bold" size="icon" aria-label="Bold">
          <Bold className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" size="icon" aria-label="Italic">
          <Italic className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" size="icon" aria-label="Underline">
          <Underline className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

A named group (`aria-label` or `aria-labelledby` is required) of toggles that behaves as **one control**:

- By default **one item can be pressed at a time**. Pressing the pressed one releases it, so nothing selected is allowed. With `multiple`, any number can be pressed.
- The value is **always an array** of the pressed items' `value`s, even in single mode. Use `value` and `onValueChange` (or `defaultValue`) to control it.
- `variant` and `size` on the group apply to every item unless an item sets its own.
- The items are joined into one control; `attached={false}` keeps them apart, and `orientation="vertical"` stacks them.

## Keyboard

| Key                         | Action                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Tab`                       | Enters the group at a single tab stop, then moves on. Only one item is in the tab order at a time (roving tabindex).      |
| `ArrowRight` or `ArrowLeft` | Moves focus to the next or previous item and wraps (ArrowDown and ArrowUp when vertical). It never changes the selection. |
| `Home` or `End`             | Moves focus to the first or last item.                                                                                    |
| `Space` or `Enter`          | Presses or releases the focused item.                                                                                     |

Disabled items are skipped by the arrow keys, which differs from menus (where disabled items stay focusable).

## Accessibility

- Each item is a real button with `aria-pressed`; the group is `role="group"` with the name you give it.
- The pressed state is shown by background and text colour from tokens, not by colour alone: it is also in `aria-pressed`, so screen readers announce "pressed".
- Focus uses the standard full-strength ring.

## Props

| Prop        | Type                                          | Default | Required | Description                                                               |
| ----------- | --------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `className` | `string`                                      |         | No       |                                                                           |
| `variant`   | `"default" \| "outline" \| undefined`         |         | No       | Applied to every item unless it sets its own.                             |
| `size`      | `"sm" \| "md" \| "lg" \| "icon" \| undefined` |         | No       |                                                                           |
| `attached`  | `boolean \| undefined`                        |         | No       | Join the items into one control (default), or keep them apart with a gap. |
