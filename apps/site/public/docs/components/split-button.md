# SplitButton

> A primary action with a menu of related actions attached. Button plus DropdownMenu.

Source: https://platform.azmara.io/docs/components/split-button

Group: Inputs · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { SplitButton } from "@azmr/ui/split-button";
import { DropdownMenuItem } from "@azmr/ui/menu";
```

```tsx
"use client";

import { DropdownMenuItem, DropdownMenuSeparator } from "@azmr/ui/menu";
import { SplitButton } from "@azmr/ui/split-button";
import { useState } from "react";

export default function SplitButtonBasic() {
  const [last, setLast] = useState("Nothing saved yet");
  return (
    <div className="flex items-center gap-4">
      <SplitButton
        menuLabel="More save options"
        onClick={() => setLast("Saved")}
        menu={
          <>
            <DropdownMenuItem onClick={() => setLast("Saved as a new file")}>
              Save as…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLast("Saved a copy")}>Save a copy</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLast("Saved and closed")}>
              Save and close
            </DropdownMenuItem>
          </>
        }
      >
        Save
      </SplitButton>
      <SplitButton
        variant="outline"
        menuLabel="More export options"
        menu={<DropdownMenuItem>PDF</DropdownMenuItem>}
      >
        Export
      </SplitButton>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {last}
      </p>
    </div>
  );
}
```

```tsx
<SplitButton
  menuLabel="More save options"
  onClick={save}
  menu={
    <>
      <DropdownMenuItem onClick={saveAs}>Save as…</DropdownMenuItem>
      <DropdownMenuItem onClick={saveCopy}>Save a copy</DropdownMenuItem>
    </>
  }
>
  Save
</SplitButton>
```

The main button runs the common action. The arrow opens a menu of alternatives, so the common case stays one click. `menu` takes any `DropdownMenu` parts: items, separators, groups, even checkbox items.

`menuLabel` is required. The arrow button has no text, so it needs a name ("More save options"), and the types enforce it. The arrow also announces that it opens a menu (`aria-haspopup`, `aria-expanded`).

## Props

| Prop          | Type                                                                                                                           | Default | Required | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- | ------------------------------------------------------------------------------ |
| `children`    | `ReactNode`                                                                                                                    |         | Yes      | The primary action's label.                                                    |
| `menu`        | `ReactNode`                                                                                                                    |         | Yes      | The extra actions: `DropdownMenuItem`s (and groups, separators, and so on).    |
| `menuLabel`   | `string`                                                                                                                       |         | Yes      | Names the arrow button ("More save options"). Required: the arrow has no text. |
| `variant`     | `"link" \| "default" \| "secondary" \| "outline" \| "ghost" \| "destructive" \| "success" \| "warning" \| "info" \| undefined` |         | No       |                                                                                |
| `size`        | `"sm" \| "md" \| "lg" \| undefined`                                                                                            |         | No       |                                                                                |
| `loading`     | `boolean \| undefined`                                                                                                         |         | No       | Shows a spinner on the primary button and ignores it. The menu stays usable.   |
| `loadingText` | `ReactNode`                                                                                                                    |         | No       |                                                                                |
| `startIcon`   | `ReactNode`                                                                                                                    |         | No       |                                                                                |
| `disabled`    | `boolean \| undefined`                                                                                                         |         | No       |                                                                                |
| `className`   | `string`                                                                                                                       |         | No       |                                                                                |

`variant` and `size` apply to both halves, so the pair stays level; filled variants get a divider between them and `outline` shares one border.

- `loading` shows a spinner on the **main button** and ignores it, while the menu stays usable: a slow "Save" should not stop someone choosing "Save as…". `loadingText` and `startIcon` work as on `Button`.
- `disabled` disables **both** halves.

Everything else a `Button` accepts (`onClick`, `type`, `aria-*`) goes to the main button.

## Keyboard

| Key                | Action                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `Tab`              | Moves to the main button, then to the arrow button.                        |
| `Enter` or `Space` | On the main button: runs the primary action. On the arrow: opens the menu. |
| `ArrowDown`        | On the arrow button: opens the menu on its first item.                     |
| `Escape`           | Closes the menu and returns focus to the arrow button.                     |

Once the menu is open it follows the [DropdownMenu keys](https://platform.azmara.io/docs/components/menu.md#keyboard).

## Size

The menu is loaded with the split button, so this entry carries the menu's cost (about the same as `@azmr/ui/menu`). If a page only needs a plain `Button`, import that instead.

## Accessibility

- Two real buttons: the primary action, and the arrow that opens the menu. Tab visits both, in that order.
- The arrow has no text, so `menuLabel` is required and the types enforce it. It becomes the arrow's accessible name ("More save options").
- The arrow carries `aria-haspopup="menu"` and `aria-expanded`, which changes from `false` to `true` while the menu is open.
- `disabled` disables both halves, and `loading` leaves the menu usable. The menu follows the [DropdownMenu](https://platform.azmara.io/docs/components/menu.md#accessibility) semantics.
- The component's tests run axe with the menu closed and open.
