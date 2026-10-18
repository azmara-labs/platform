# ScrollArea

> A scrollable region with token-styled scrollbars that is keyboard-focusable and named. Built on Base UI.

Source: https://platform.azmara.io/docs/components/scroll-area

Group: Layout · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { ScrollArea } from "@azmr/ui/scroll-area";
```

```tsx
import { ScrollArea } from "@azmr/ui/scroll-area";

const items = Array.from({ length: 24 }, (_, i) => `Customer ${i + 1}`);

export default function ScrollAreaBasic() {
  return (
    <div className="flex flex-col gap-6">
      {/* Tab to focus it, then the arrow keys and Page Up/Down scroll. It needs a name. */}
      <ScrollArea aria-label="Customers" className="h-48 w-64 border border-border">
        <ul className="p-3 text-sm">
          {items.map((item) => (
            <li key={item} className="border-b border-border py-2 last:border-b-0">
              {item}
            </li>
          ))}
        </ul>
      </ScrollArea>

      {/* Horizontal, with the scrollbar always visible. */}
      <ScrollArea
        aria-label="Wide table"
        orientation="horizontal"
        scrollbar="always"
        className="w-64 border border-border"
      >
        <p className="w-[40rem] whitespace-nowrap p-3 pb-5 text-sm">
          A long line of content that is wider than the area it sits in, so it scrolls sideways.
        </p>
      </ScrollArea>
    </div>
  );
}
```

Give the area a size (`h-48`, `max-h-96`, `w-64`) with `className` and put long content inside. The scrollbars are styled from tokens and fade in on hover and while scrolling (`scrollbar="always"` keeps them visible, `orientation` picks vertical, horizontal or both). They only mount when something overflows; `keepMounted` keeps them in the DOM so layout never jumps.

## Why it needs a name

A scrollable region has to be reachable with the keyboard, otherwise a keyboard user cannot scroll it at all. The viewport is therefore a focusable `role="region"`, and a focusable region needs an accessible name: pass `aria-label`, or `aria-labelledby` pointing at a heading. TypeScript requires one of them.

Use a `ScrollArea` when you want consistent scrollbars. For simple overflow, plain CSS `overflow: auto` is fine, and modern browsers already make scrollable regions focusable.

## Props

| Prop                | Type                                                | Default | Required | Description                                                                                                                   |
| ------------------- | --------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `orientation`       | `"vertical" \| "horizontal" \| "both" \| undefined` |         | No       | Which scrollbars to show. Default `vertical`.                                                                                 |
| `scrollbar`         | `"always" \| "hover" \| undefined`                  |         | No       | `hover` (default) fades the scrollbar in on hover and while scrolling, like the desktop platforms; `always` keeps it visible. |
| `keepMounted`       | `boolean \| undefined`                              |         | No       | Keep the scrollbars in the DOM even when nothing overflows, so layout never jumps.                                            |
| `viewportClassName` | `string`                                            |         | No       | Classes for the scrollable viewport (padding, for example); `className` styles the root.                                      |
| `viewportRef`       | `Ref<HTMLDivElement> \| undefined`                  |         | No       | A ref to the scrollable element, to read or set the scroll position.                                                          |
| `className`         | `string`                                            |         | No       |                                                                                                                               |
| `children`          | `ReactNode`                                         |         | No       |                                                                                                                               |

`className` styles the root; `viewportClassName` styles the scrollable element (padding, for example). `ref` is the root and `viewportRef` is the scrollable element, to read or set the scroll position.

## Accessibility

- The viewport is a focusable `role="region"` with the name you provide.
- Scrollbars fade with the motion tokens, so they stop animating under `prefers-reduced-motion`.
- The focus ring is full strength and inset, so it is never clipped by the area's edge.

| Key                         | Action                                           |
| --------------------------- | ------------------------------------------------ |
| `Tab`                       | Moves focus to the scrollable region.            |
| `ArrowDown` or `ArrowUp`    | Scrolls the region vertically.                   |
| `ArrowRight` or `ArrowLeft` | Scrolls horizontally when it overflows that way. |
| `PageDown` or `PageUp`      | Scrolls by a page.                               |
| `Home` or `End`             | Scrolls to the start or end.                     |
