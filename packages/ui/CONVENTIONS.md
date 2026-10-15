# `@azmr/ui` conventions

These are enforced by `src/conventions.test.ts` (runs in CI as part of `pnpm test`), not by review alone. Each rule has a negative test, and was checked by planting a violation in the real source tree.

## Layers

```
dynamic     Crud.*, generated forms, ChartSpec dashboards, DataSource adapters
blocks      AppShell, DataGrid, providers, app-level blocks
components  Button, Input, Select, Dialog, Table, Card, ...
primitives  thin wrappers around Base UI (the only place Base UI is imported)
styles      tokens (styles.css)
```

- A layer may import itself and any layer **below** it, never above (`layer-boundary`).
- `lib`, `hooks`, `icons` and `motion` are shared foundation modules: every layer may use them, and they may not import any layer.
- Only `src/primitives` may import `@base-ui/react` (`base-ui-only-in-primitives`), so the engine stays swappable.

## No raw colours

Components read design tokens: Tailwind utilities such as `bg-background`, `text-muted-foreground`, `border-border`, or `var(--foreground)` in a style value. Hex, `rgb()`, `hsl()`, `oklch()` and other colour literals are rejected (`no-raw-colour`). Colours are defined once, in `src/styles/styles.css`.

If a literal colour is genuinely required (for example a third-party brand logo), add `conventions-ignore: <reason>` in a comment on that line. The marker exempts colours only: `dangerouslySetInnerHTML` and the import rules have no escape hatch.

## No `dangerouslySetInnerHTML`

Banned everywhere (`no-dangerous-html`). If a component must render rich content, sanitise it first (see the rich-text editor issue) and render through a component that owns the sanitising.

## Class names

- Every component accepts `className` and passes it through `cn()` **last**, so callers can always override a default: `cn("px-3 py-2", variantClasses, className)`.
- State styling uses the `data-*` attributes Base UI exposes (`data-open`, `data-checked`, `data-disabled`, `data-highlighted`, `data-starting-style`, `data-ending-style`).
- Parts are exposed through composition (`Dialog.Content`) and Base UI's `render` prop where polymorphism is needed. No MUI-style `slots` / `slotProps`.

## Variants (CVA)

Variant-heavy components use `class-variance-authority`, added together with the first component that needs it:

```ts
const button = cva("inline-flex items-center rounded-md ...", {
  variants: { variant: { default: "bg-primary text-primary-foreground", destructive: "bg-destructive text-destructive-foreground" } },
  defaultVariants: { variant: "default" },
});
// <button className={cn(button({ variant }), className)} />
```

## Legacy exemptions

`LEGACY` in `conventions.test.ts` lists files that predate the rules and are scheduled for replacement (today: `Grid.tsx`, replaced by the Phase 4 `DataGrid`). Each entry must name its removal condition. New code never goes there.
