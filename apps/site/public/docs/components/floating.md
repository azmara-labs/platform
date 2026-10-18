# Floating

> Tooltip, Popover and HoverCard. Surfaces anchored to a trigger, collision-aware, portalled, and animated with the motion tokens. Built on Base UI.

Source: https://platform.azmara.io/docs/components/floating

Group: Overlays · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription, PopoverClose,
  HoverCard, HoverCardTrigger, HoverCardContent,
} from "@azmr/ui/floating";
```

These are interactive, so they are client components. Each one renders its surface in a portal on `document.body`, above overlays (the `--z-tooltip` and `--z-popover` layers), and flips to the other side of the trigger when there is no room. The surface is also capped to the space available, so it never runs off the viewport.

Which one to use:

| You need                                                | Use         |
| ------------------------------------------------------- | ----------- |
| A short label for a control                             | `Tooltip`   |
| Anything interactive (a form, a menu of actions, links) | `Popover`   |
| A preview of a link's target                            | `HoverCard` |

## Tooltip

```tsx
import { Button } from "@azmr/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@azmr/ui/floating";
import { Icon } from "@azmr/ui/icons";
import { Bold, Italic, Underline } from "lucide-react";

const tools = [
  { label: "Bold", icon: Bold, shortcut: "Ctrl+B" },
  { label: "Italic", icon: Italic, shortcut: "Ctrl+I" },
  { label: "Underline", icon: Underline, shortcut: "Ctrl+U" },
] as const;

export default function TooltipBasic() {
  return (
    // One provider: the first tip waits half a second, then its neighbours open at once.
    <TooltipProvider>
      <div className="flex gap-1">
        {tools.map(({ label, icon, shortcut }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              render={
                <Button size="icon" variant="ghost" aria-label={label}>
                  <Icon icon={icon} />
                </Button>
              }
            />
            <TooltipContent>{shortcut}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
```

A tooltip shows on hover and on **keyboard focus**, closes on Escape, and never takes the pointer, so it cannot block what is under it. Put one `TooltipProvider` around a toolbar (or the app): the first tooltip waits `TOOLTIP_DELAY_MS` (500 ms), then its neighbours open at once while one is showing, and moving between them does not replay the animation.

### Touch, and what a tooltip is not

There is no hover on touch, so **a tooltip does not open on touch**. That makes it a convenience for people with a pointer or keyboard, and the rule follows:

- Never put essential information in a tooltip. Use a `Popover` if touch users need it.
- An icon-only button still needs its own accessible name (`aria-label`). The tooltip adds to it, it does not replace it.

While open, the trigger points at the tooltip with `aria-describedby`, and the tooltip has `role="tooltip"`. Base UI 1.9 does neither, so a screen reader would never hear the text; `@azmr/ui` adds it. One consequence: if the tooltip repeats the button's `aria-label` word for word, a screen reader reads it twice. Prefer tooltip text that adds something, such as the shortcut, as in the demo.

## Popover

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@azmr/ui/floating";
import { Input } from "@azmr/ui/input";

export default function PopoverBasic() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Rename</Button>} />
      <PopoverContent align="start">
        <PopoverTitle>Rename project</PopoverTitle>
        <PopoverDescription>Shown to everyone on the team.</PopoverDescription>
        <form className="mt-3 flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
          <Input aria-label="Project name" defaultValue="Website relaunch" />
          <div className="flex justify-end gap-2">
            <PopoverClose render={<Button variant="ghost">Cancel</Button>} />
            <PopoverClose render={<Button type="submit">Save</Button>} />
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
```

Opens on click, Enter or Space. Focus moves into the panel, Tab moves through its content, and Escape or a click outside closes it and returns focus to the trigger. The panel is a `role="dialog"` named by `PopoverTitle` (or `aria-label`) and described by `PopoverDescription`. Use `PopoverClose` for a button that dismisses it.

Inputs inside keep their own keys: arrow keys and typing are never taken by the popover.

## HoverCard

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@azmr/ui/floating";

export default function HoverCardBasic() {
  return (
    <p className="max-w-md text-sm">
      The design was led by{" "}
      <HoverCard>
        <HoverCardTrigger
          href="https://platform.azmara.io/docs"
          className="font-medium underline underline-offset-4"
        >
          Aroha Ngata
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="text-sm font-medium">Aroha Ngata</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Product designer in Hamilton. Leads the design system.
          </p>
        </HoverCardContent>
      </HoverCard>
      . Hover or focus the name to preview; it is a normal link without the card.
    </p>
  );
}
```

The trigger is a real link (`<a>`), so the page works without the card. The card opens on hover and on keyboard focus of the link and closes on Escape. It is not announced as a dialog and does not open on touch, so nothing in it may be the only way to reach something.

## Positioning

Every content component takes `side`, `align`, `sideOffset` (default 6) and `collisionPadding` (default 8, the minimum distance kept from the viewport edge).

| Prop               | Type                                                                                    | Default | Required | Description                                                                              |
| ------------------ | --------------------------------------------------------------------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------- |
| `side`             | `"top" \| "right" \| "bottom" \| "left" \| "inline-start" \| "inline-end" \| undefined` |         | No       | The side of the trigger to open on. It flips to the opposite side when there is no room. |
| `align`            | `"start" \| "center" \| "end" \| undefined`                                             |         | No       | Alignment along that side.                                                               |
| `sideOffset`       | `number`                                                                                |         | No       | Gap between the trigger and the surface, in px. Default 6.                               |
| `collisionPadding` | `number`                                                                                |         | No       | Minimum distance kept from the viewport edge, in px. Default 8.                          |

## Motion

Surfaces fade and scale from the trigger (`transform-origin` follows the trigger through `--transform-origin`) using Base UI's `data-starting-style` and `data-ending-style` and `--motion-duration-fast`. Under `prefers-reduced-motion` the duration tokens collapse to near zero, so surfaces appear and disappear instantly.

## Accessibility

| Key                  | Action                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| `Tab`                | Focusing a tooltip trigger or hover-card link shows its surface; leaving hides it. |
| `Enter` or `Space`   | Opens a popover from its trigger.                                                  |
| `Tab` or `Shift+Tab` | Moves through the content of an open popover.                                      |
| `Escape`             | Closes the open tooltip, popover or hover card. Focus returns to the trigger.      |
