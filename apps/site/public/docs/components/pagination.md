# Pagination

> A page control that is real links on the server or buttons for client state, with a stable-width page range the data grid reuses. Server-safe.

Source: https://platform.azmara.io/docs/components/pagination

Group: Navigation · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Pagination, getPageRange } from "@azmr/ui/pagination";
```

## Links

```tsx
import { Pagination } from "@azmr/ui/pagination";

// Link mode: every page is a real link, so it works without JavaScript and in a Server Component.
// `hrefFor` would normally build a URL like `/items?page=${p}`; here it points at the demo itself.
export default function PaginationLinks() {
  return (
    <div className="flex flex-col gap-6">
      <Pagination page={1} pageCount={5} hrefFor={(p) => `#page-${p}`} label="Short list" />
      <Pagination page={10} pageCount={42} hrefFor={(p) => `#page-${p}`} label="Long list" />
    </div>
  );
}
```

Give `Pagination` `hrefFor` and every page is a **real link** (`<a href>`). It works without JavaScript, can be indexed, supports "open in a new tab", and renders in a Server Component. Build the URL from your search params, and pass `renderLink` to use your router's `Link`:

```tsx
<Pagination
  page={page}
  pageCount={pageCount}
  hrefFor={(p) => `/items?page=${p}`}
  renderLink={(href) => <NextLink href={href} />}
/>
```

## Buttons

```tsx
"use client";

import { Pagination } from "@azmr/ui/pagination";
import { useState } from "react";

const PAGE_SIZE = 5;
const ITEMS = Array.from({ length: 47 }, (_, i) => `Item ${i + 1}`);

// Button mode: for client state. `onPageChange` is called with the page that was chosen.
export default function PaginationState() {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(ITEMS.length / PAGE_SIZE);
  const shown = ITEMS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div className="flex flex-col gap-4">
      <ul className="text-sm" aria-live="polite">
        {shown.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
```

Give it `onPageChange` instead and every page is a button, for state held on the client. It is called with the page that was chosen (not when the current page is pressed again). Buttons are `type="button"`, so they never submit a surrounding form.

If you pass both, `hrefFor` wins.

## The current page, and the ends

The current page is filled and marked `aria-current="page"`. Each page control is named "Page 3" so it is clear which page it is, rather than just "3". **Previous** and **Next** are disabled at the ends: a link loses its `href` and is announced as disabled; a button is `disabled`.

## How many pages are shown

With more than seven pages the control shows the first and last page, the current page and one either side, with ellipses between, and it is **always seven long**, so it does not change width as you page. `siblingCount` and `boundaryCount` widen it. A skipped run of exactly one page is shown as that page instead of an ellipsis, since the ellipsis would save no space.

```
page 1 of 10:  1 2 3 4 5 … 10
page 5 of 10:  1 … 4 5 6 … 10
page 10 of 10: 1 … 6 7 8 9 10
```

### getPageRange

The calculation is exported as a pure function, so the data grid and your own paginators can use it:

```ts
getPageRange({ page: 5, pageCount: 10 });
// [1, "start-ellipsis", 4, 5, 6, "end-ellipsis", 10]
```

Out-of-range pages are pinned to an end, and no pages gives an empty list.

## Building blocks

For a custom layout use `PaginationNav`, `PaginationList`, `PaginationItem`, `PaginationLink` (`isActive`, `disabled`, `href` or `onClick`) and `PaginationEllipsis`.

## Props

| Prop            | Type                                                                                                 | Default | Required | Description                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------------- |
| `page`          | `number`                                                                                             |         | Yes      | The current page, 1-based.                                                             |
| `pageCount`     | `number`                                                                                             |         | Yes      |                                                                                        |
| `hrefFor`       | `((page: number) => string) \| undefined`                                                            |         | No       | Link mode: where each page goes. Works in Server Components. Wins over `onPageChange`. |
| `onPageChange`  | `((page: number) => void) \| undefined`                                                              |         | No       | Button mode: called with the page that was chosen. For client state.                   |
| `renderLink`    | `((href: string) => React.ReactElement) \| undefined`                                                |         | No       | Render your router's `Link`: `renderLink={(href) => <NextLink href={href} />}`.        |
| `siblingCount`  | `number`                                                                                             |         | No       | Pages shown either side of the current one. Default 1.                                 |
| `boundaryCount` | `number`                                                                                             |         | No       | Pages always shown at each end. Default 1.                                             |
| `showPrevNext`  | `boolean \| undefined`                                                                               |         | No       | Show Previous and Next. Default true.                                                  |
| `label`         | `string`                                                                                             |         | No       | The landmark's name. Default "Pagination".                                             |
| `labels`        | `{ previous?: string; next?: string; page?: (page: number) => string; more?: string; } \| undefined` |         | No       | Names the controls, for translation.                                                   |

## Accessibility

- A `nav` landmark named "Pagination" (rename it with `label`) containing a list.
- The current page has `aria-current="page"`; pages are named "Page n"; Previous and Next are named "Previous page" and "Next page" (the visible words are hidden on small screens, the names stay).
- The ellipsis is announced as "More pages" and is not focusable.
- Names can be translated with `labels`.

| Key     | Action                                                                      |
| ------- | --------------------------------------------------------------------------- |
| `Tab`   | Moves through the page controls. A disabled Previous or Next is skipped.    |
| `Enter` | Follows a link, or activates a button.                                      |
| `Space` | Activates a button page. (Links respond to Enter only, as native links do.) |
