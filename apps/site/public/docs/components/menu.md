# Menu

> DropdownMenu and ContextMenu. Menus of actions with items, checkbox and radio items, groups and submenus. Built on Base UI.

Source: https://platform.azmara.io/docs/components/menu

Group: Overlays · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLinkItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, // …and the same parts as above
} from "@azmr/ui/menu";
```

These are interactive, so they are client components. A menu renders in a portal on the `--z-popover` layer, so one opened from inside a dialog appears above it. It flips when there is no room and scrolls inside the space available.

Use a menu for **actions** (things that happen). For choosing a value in a form, use a select. For showing information, use a popover.

## DropdownMenu

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function DropdownBasic() {
  const [showGrid, setShowGrid] = useState(true);
  const [density, setDensity] = useState("comfortable");
  const [last, setLast] = useState("Nothing chosen yet");

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" endIcon={<Icon icon={ChevronDown} />}>
              Project
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setLast("Saved")}>
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLast("Renamed")}>Rename</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive (needs an owner)</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
            Show grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as string)}>
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setLast("Shared by email")}>Email</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLast("Link copied")}>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setLast("Deleted")}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {last} · grid {showGrid ? "on" : "off"} · {density}
      </p>
    </div>
  );
}
```

### Items

| Part                                                 | What it is                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DropdownMenuItem`                                   | An action. `variant="destructive"` for one that deletes or discards. `disabled` greys it out.                                        |
| `DropdownMenuLinkItem`                               | A real `<a>`, so middle click and "open in new tab" work.                                                                            |
| `DropdownMenuCheckboxItem`                           | Toggles on and off. It stays open when toggled; set `closeOnClick` to change that.                                                   |
| `DropdownMenuRadioGroup` and `DropdownMenuRadioItem` | Exactly one selected.                                                                                                                |
| `DropdownMenuGroup` and `DropdownMenuLabel`          | A named group. The label is not an item, so arrow keys skip it.                                                                      |
| `DropdownMenuSeparator`                              | A divider.                                                                                                                           |
| `DropdownMenuSub`, `…SubTrigger`, `…SubContent`      | A nested menu.                                                                                                                       |
| `DropdownMenuShortcut`                               | A shortcut hint at the end of an item. It is text only: wire up the real shortcut yourself, and add `aria-keyshortcuts` to the item. |

Items keep the menu open when `closeOnClick={false}`.

### Disabled items stay focusable

Following the WAI-ARIA menu pattern, a disabled item is announced as disabled and cannot be run, but arrow keys still land on it. That is deliberate: it lets people find out an action exists, and why it is unavailable if you say so in the label.

## ContextMenu

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import { useState } from "react";

export default function ContextBasic() {
  const [last, setLast] = useState("Right-click the card, or use the button");
  const choose = (what: string) => () => setLast(what);

  return (
    <div className="flex flex-col items-start gap-3">
      <ContextMenu>
        <ContextMenuTrigger className="flex h-28 w-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Right-click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={choose("Copied")}>Copy</ContextMenuItem>
          <ContextMenuItem onClick={choose("Pasted")}>Paste</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={choose("Deleted")}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* The same actions on a visible button: a context menu must never be the only way in. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Actions
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem onClick={choose("Copied")}>Copy</DropdownMenuItem>
          <DropdownMenuItem onClick={choose("Pasted")}>Paste</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={choose("Deleted")}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {last}
      </p>
    </div>
  );
}
```

A context menu opens at the pointer on right click (and, on touch, a long press: Base UI provides that and it is not tested here). Once open it behaves exactly like a dropdown, and it takes the same item parts.

**Use it as an enhancement only.** The trigger area is not focusable, the browser's keyboard route to a context menu needs a focused element, and a long press is easy to miss. So everything in it must be reachable another way, as in the demo, where the same actions are on a visible button.

## Open a dialog from a menu

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@azmr/ui/modal";
import { useState } from "react";

// Open a dialog from a menu item: control the dialog and open it from the item's onClick. The
// dialog sits next to the menu, not inside it, so it survives the menu closing.
export default function MenuOpensDialog() {
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline">More</Button>} />
        <DropdownMenuContent>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleted(true)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {deleted ? "Deleted." : "Choose Delete… to confirm."}
      </p>
    </div>
  );
}
```

Control the dialog and open it from the item's `onClick`. Keep the dialog **next to** the menu rather than inside it: it has to outlive the menu closing. Use this for any action that needs confirmation.

## Keyboard

| Key                               | Action                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Enter` or `Space` or `ArrowDown` | On the trigger: opens the menu on the first item.                                                          |
| `ArrowUp`                         | On the trigger: opens the menu on the last item.                                                           |
| `ArrowDown` or `ArrowUp`          | Moves to the next or previous item and wraps at the ends.                                                  |
| `Home` or `End`                   | Jumps to the first or last item.                                                                           |
| `A–Z`                             | Typeahead: jumps to the item that starts with the letters you type. Letters typed together are one search. |
| `Enter` or `Space`                | Runs the focused item and closes the menu. A checkbox or radio item toggles.                               |
| `ArrowRight`                      | On a submenu trigger: opens the submenu and focuses its first item.                                        |
| `ArrowLeft`                       | In a submenu: closes it and returns to its trigger.                                                        |
| `Escape`                          | Closes the open submenu, or the menu. Focus returns to the trigger.                                        |
| `Tab`                             | Closes the menu and moves on. Focus is never trapped.                                                      |

## Accessibility

- The popup is a `menu`; items are `menuitem`, `menuitemcheckbox` (with `aria-checked`) or `menuitemradio`. The trigger has `aria-haspopup="menu"` and `aria-expanded`.
- A submenu trigger announces `aria-haspopup="menu"` and `aria-expanded`. Its chevron is decorative.
- Check and radio marks are decorative; the state is `aria-checked`.
- Destructive items use the destructive colour as text on the popover surface, which meets the contrast the tokens guarantee.

## Motion

Menus fade and scale from the trigger on `--motion-duration-fast`, and collapse to instant under `prefers-reduced-motion`.

## Props

| Prop        | Type                                      | Default | Required | Description                                                   |
| ----------- | ----------------------------------------- | ------- | -------- | ------------------------------------------------------------- |
| `variant`   | `"default" \| "destructive" \| undefined` |         | No       | `destructive` for an item that deletes or discards something. |
| `className` | `string`                                  |         | No       |                                                               |

| Prop               | Type                                                                                    | Default | Required | Description                                                                              |
| ------------------ | --------------------------------------------------------------------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------- |
| `className`        | `string`                                                                                |         | No       |                                                                                          |
| `side`             | `"top" \| "right" \| "bottom" \| "left" \| "inline-start" \| "inline-end" \| undefined` |         | No       | The side of the trigger to open on. It flips to the opposite side when there is no room. |
| `align`            | `"center" \| "start" \| "end" \| undefined`                                             |         | No       | Alignment along that side.                                                               |
| `sideOffset`       | `number`                                                                                |         | No       | Gap between the trigger and the surface, in px. Default 6.                               |
| `collisionPadding` | `number`                                                                                |         | No       | Minimum distance kept from the viewport edge, in px. Default 8.                          |

The rest are Base UI's props, passed through (`open`, `onOpenChange`, `loopFocus`, `modal`, and so on).
