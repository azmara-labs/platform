# Icon

> Renders Lucide, Tabler or your own SVG with consistent size, stroke, motion and accessibility. A Server Component.

Source: https://platform.azmara.io/docs/components/icon

Group: Data display · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Icon } from "@azmr/ui/icons";
import { Search } from "lucide-react";

<Icon icon={Search} />
```

```tsx
import { Icon } from "@azmr/ui/icons";
import { Bell, LoaderCircle, Search } from "lucide-react";

export default function IconBasic() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <Icon icon={Search} size="xs" />
        <Icon icon={Search} size="sm" />
        <Icon icon={Search} size="md" />
        <Icon icon={Search} size="lg" />
        <Icon icon={Search} size="xl" />
        <Icon icon={Search} size={40} />
      </div>
      <div className="flex items-center gap-4">
        {/* Decorative by default; aria-label makes it a labelled image. */}
        <Icon icon={Bell} aria-label="Notifications" size="lg" />
        <Icon icon={Bell} size="lg" strokeWidth={1} />
        <Icon icon={Bell} size="lg" strokeWidth={2.5} />
        {/* spin keeps moving under reduced motion: a frozen loader reads as a hung page. */}
        <Icon icon={LoaderCircle} size="lg" spin aria-label="Loading" />
      </div>
    </div>
  );
}
```

`Icon` takes the icon component you pass it, so only the icons you import are bundled (this is tested). Lucide is the default set; Tabler and your own SVG components work through the same `icon` prop with no adapter. Sizes `xs` to `xl` follow the size tokens, and a number is a pixel size.

An icon is **decorative by default** (`aria-hidden`). Give it `aria-label` or `aria-labelledby` to make it a labelled image. `spin` is for loaders and, like `Spinner`, keeps moving under reduced motion.

## By name

```tsx
import { Icon } from "@azmr/ui/icons/lucide";

export default function IconNamed() {
  return (
    <div className="flex items-center gap-4">
      <Icon name="house" size="lg" />
      <Icon name="circle-alert" size="lg" aria-label="Warning" />
      <Icon name="trash-2" size="lg" aria-label="Delete" />
      <Icon name="chevrons-up-down" size="lg" />
    </div>
  );
}
```

The curated set at `@azmr/ui/icons/lucide` gives about 60 everyday icons by Lucide's own kebab-case names, with the names type-checked. For your own typed set use `createIconSet`, and for custom SVGs `registerIcons`:

```tsx
import { createIconSet, registerIcons } from "@azmr/ui/icons";

export const { Icon } = createIconSet({ check: Check, "my-logo": MyLogo });

registerIcons({ "my-logo": MyLogo }); // global, untyped names: <Icon name="my-logo" />
```

An unknown name renders nothing and warns once in development; it never crashes a page.

## Props

| Prop              | Type                                                          | Default | Required | Description                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon`            | `IconComponent \| undefined`                                  |         | No       | The icon to render: a Lucide or Tabler icon, or your own SVG component.                                                                                     |
| `name`            | `string`                                                      |         | No       | Looks the icon up in the registry (`registerIcons`). `icon` wins when both are given.                                                                       |
| `size`            | `number \| "xs" \| "sm" \| "md" \| "lg" \| "xl" \| undefined` |         | No       | `xs` .. `xl` follow the size tokens; a number is a pixel size. Default `md`.                                                                                |
| `spin`            | `boolean \| undefined`                                        |         | No       | Turns the icon into a loading indicator. It keeps spinning under reduced motion.                                                                            |
| `strokeWidth`     | `string \| number \| undefined`                               |         | No       |                                                                                                                                                             |
| `aria-label`      | `string`                                                      |         | No       | Decorative by default (`aria-hidden`). Give `aria-label` or `aria-labelledby` to make the icon meaningful: it then has `role="img"` and an accessible name. |
| `aria-labelledby` | `string`                                                      |         | No       | Identifies the element (or elements) that labels the current element.                                                                                       |
| `className`       | `string`                                                      |         | No       |                                                                                                                                                             |

Any other SVG attribute passes through. `className` is merged last, so `size-8` replaces the size token.

## Migrating from Material icons

`@azmr/ui/icons/mui-map` maps over 300 `@mui/icons-material` names (including the `Outlined`, `Rounded`, `Sharp` and `TwoTone` variants) to Lucide and Tabler, and lists the common ones it deliberately does not map. The migration codemod uses it.

## Accessibility

- Decorative icons are hidden from assistive technology; meaningful ones are `role="img"` with a name.
- An icon-only button is named by the labelled icon inside it, or by the button's own `aria-label`.
- Licences: Lucide is ISC, Tabler is MIT. `react-icons` is deliberately not bundled.
