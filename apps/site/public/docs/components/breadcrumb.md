# Breadcrumb

> A trail showing where you are and the way back up. Built from parts or from data, collapsible, router-friendly. Server-safe.

Source: https://platform.azmara.io/docs/components/breadcrumb

Group: Navigation · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
  BreadcrumbSeparator, BreadcrumbEllipsis, Breadcrumbs,
} from "@azmr/ui/breadcrumb";
```

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumbs,
} from "@azmr/ui/breadcrumb";

export default function BreadcrumbBasic() {
  return (
    <div className="flex flex-col gap-6">
      {/* From the parts, for full control. */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* From data. The last item is always the current page. */}
      <Breadcrumbs
        label="Breadcrumb from data"
        items={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: "Website relaunch" },
        ]}
      />

      {/* A long trail collapses the middle. */}
      <Breadcrumbs
        label="Collapsed breadcrumb"
        maxItems={4}
        items={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: "Website", href: "/projects/website" },
          { label: "Design", href: "/projects/website/design" },
          { label: "Tokens", href: "/projects/website/design/tokens" },
          { label: "Colours" },
        ]}
      />
    </div>
  );
}
```

A breadcrumb is a `nav` landmark named "Breadcrumb" holding an ordered list. Links go up the hierarchy; the **current page** is plain text marked `aria-current="page"`, never a link. Separators are decorative and hidden from assistive technology. It is a Server Component.

## From parts

Compose `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage` and `BreadcrumbSeparator` for full control. A separator can be any content (`<BreadcrumbSeparator>/</BreadcrumbSeparator>`); the default is a chevron.

## From data

`<Breadcrumbs items={[{ label, href }, ...]} />` builds the same thing. The **last item is always the current page**, whether or not it has an `href`, because it is where you are. An item without an `href` is plain text.

### Long trails

`maxItems` collapses the middle: it keeps the first item, an ellipsis and the last items, `maxItems` in all (the ellipsis counts as one). The ellipsis is announced as "More pages" (change it with `ellipsisLabel`). It is a static mark; for a menu of the hidden pages, wrap `BreadcrumbEllipsis` in a `DropdownMenu` yourself.

## With your router

Pass `renderLink` so links use your router's `Link` (client-side navigation, prefetching) instead of a plain `<a>`:

```tsx
<Breadcrumbs items={items} renderLink={(href) => <NextLink href={href} />} />
```

With the parts, use `<BreadcrumbLink render={<NextLink href="/docs" />}>Docs</BreadcrumbLink>`. The element keeps its own props (the `href`) and gains our styling.

## Props

| Prop            | Type                                                  | Default | Required | Description                                                                                                                                             |
| --------------- | ----------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`         | `readonly BreadcrumbEntry[]`                          |         | Yes      |                                                                                                                                                         |
| `maxItems`      | `number`                                              |         | No       | Collapse a longer trail: keep the first item, an ellipsis, and the last items, `maxItems` in all (the ellipsis counts as one). Default: never collapse. |
| `separator`     | `ReactNode`                                           |         | No       | Replace the chevron between items.                                                                                                                      |
| `renderLink`    | `((href: string) => React.ReactElement) \| undefined` |         | No       | Render your router's `Link`: `renderLink={(href) => <NextLink href={href} />}`.                                                                         |
| `ellipsisLabel` | `string`                                              |         | No       | The ellipsis's spoken name. Default "More pages".                                                                                                       |
| `label`         | `string`                                              |         | No       | The landmark's name. Default "Breadcrumb"; change it for translation, or with two trails on a page.                                                     |

## Accessibility

- A `nav` landmark with an accessible name (default "Breadcrumb"; rename it for translation, or when a page has two trails).
- An ordered list, so the order is announced ("list, 3 items").
- The current page is `aria-current="page"` and not a link.
- Separators are `aria-hidden`.
- Links have a full-strength focus ring.

| Key     | Action                                                                                   |
| ------- | ---------------------------------------------------------------------------------------- |
| `Tab`   | Moves through the links in order. The current page and the separators are not focusable. |
| `Enter` | Follows the focused link.                                                                |
