# @azmr/ui

Accessible React design system built on Base UI and Tailwind v4 tokens: buttons, menus, modals, tables, toasts and more. Components that take a Signal, such as `Grid`, re-render when it changes, with no state management needed.

## Install

```bash
pnpm add @azmr/ui @azmr/core react react-dom
# or
npm install @azmr/ui @azmr/core react react-dom
```

`@azmr/core` is a **peer dependency**: install it yourself so your app and `@azmr/ui` share one copy (two copies give incompatible `Signal` types).

## Styles and design tokens

`@azmr/ui` ships the design tokens and the Tailwind v4 theme mapping in two stylesheets. In your global CSS, pick one:

```css
@import "tailwindcss";
@import "@azmr/ui/styles.css";   /* tokens + global base rules (new app) */
@import "@azmr/ui/classes.css";  /* or one list per component you use */
```

```css
@import "tailwindcss";
@import "@azmr/ui/tokens.css";   /* tokens only (app that already has global styles) */
@import "@azmr/ui/classes/button.css";
```

- **`styles.css`** is `tokens.css` plus two global base rules: the page background and text colour on `body`, and our border and outline colours as the default for every element. Use it in a new app.
- **`tokens.css`** has the same tokens, themes, density, motion and utilities and **changes nothing outside our own classes**. Use it when the app already has global styles: another UI library mid-migration, or a documentation site. Components look right either way.

- **Token names follow shadcn/ui** (`--background`, `--primary`, `--ring`, `--radius`, `--sidebar-*`, ...), so shadcn components from any registry look right next to ours. Azmara adds `--success`, `--warning`, `--info`, `--chart-1` to `--chart-8`, `--motion-*`, `--elevation-*`, `--z-*` and `--density-*`.
- **Utilities** such as `bg-background`, `text-muted-foreground`, `rounded-lg`, `shadow-elevation-2` and `ease-standard` work out of the box. Import the class list for each entry you use (`@azmr/ui/classes/button.css`), or `@azmr/ui/classes.css` for all of them, and Tailwind generates the package's classes. Each list holds exactly the classes that entry uses, so an app pays only for the components it imports.
- **Light and dark** use OKLCH colours with `light-dark()`. The page follows the system by default; force a mode with `class="dark"` / `class="light"` or `data-theme="dark|light"` on any ancestor. No JavaScript, no flash.
- **Density:** set `data-density="compact"` or `"spacious"` on any ancestor to change control heights, padding and row height.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, every `--motion-duration-*` token collapses to `0.01ms` and a safety net shortens other animations. Mark genuinely essential motion with `data-motion="essential"`.
- **Accessibility is tested:** every foreground/background token pair meets WCAG AA text contrast (4.5:1) in both modes, the focus ring and chart colours meet 3:1, and the eight chart colours stay distinguishable under protanopia, deuteranopia and tritanopia simulation.


## Theme, density and locale

**Server layout (Next.js App Router).** Read the stored preference from the cookie on the server and render it into `<html>`, so the first paint is already correct, with no inline script (works under a strict CSP):

```tsx
// app/layout.tsx
import { cookies } from "next/headers";
import { htmlAttributes, parseDensity, parseThemePreference, THEME_COOKIE, DENSITY_COOKIE } from "@azmr/ui/theme";
import { LocaleProvider, ThemeProvider } from "@azmr/ui/react";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = parseThemePreference(jar.get(THEME_COOKIE)?.value);
  const density = parseDensity(jar.get(DENSITY_COOKIE)?.value);
  return (
    <html lang="en-NZ" {...htmlAttributes({ theme, density })}>
      <body>
        <ThemeProvider defaultTheme={theme} defaultDensity={density}>
          <LocaleProvider locale="en-NZ" currency="NZD">{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- `system` (the default) needs no attribute and no JavaScript: the tokens use `light-dark()`, so the page follows the operating system.
- `useTheme()` returns `{ theme, resolvedTheme, setTheme, density, setDensity }`. Changes update `<html>` immediately and are remembered in a cookie (`persist={false}` turns that off).
- Static sites that cannot read cookies on the server can inline `themeInitScript()` instead (add your CSP nonce to the tag).
- `createTheme({ primary, secondary, success, warning, info, destructive, radius, font, density })` turns brand colours (`#rrggbb`, `oklch(L C H)` or `{ l, c, h }`) into token overrides. Every colour option is optional and keeps its default when omitted (`destructive` is the "danger" colour). It guarantees WCAG AA in both modes, adjusting lightness where needed and keeping the hue:
  - each `-foreground` is at least 4.5:1 on its colour, **including on a solid button's hover surface** (a button blends with the page on hover, which can pull a colour that only just passes below 4.5:1; the derivation checks the blend);
  - `success`, `info` and `destructive` are also readable as **text** on the page and on cards (`Text tone`, form errors), and `warning` gets a separate readable `--warning-text`;
  - the focus ring is at least 3:1.
  Input is validated strictly because the output is CSS, and an error names the option that was wrong.

```tsx
import { createTheme } from "@azmr/ui/theme";
const theme = createTheme({
  primary: "#1E88E5",
  success: "#2E7D32",
  destructive: "#D32F2F",
  radius: "0.5rem",
});
// <style>{theme.css}</style>   or   <html style={theme.cssVariables}>
```

**Locale.** `LocaleProvider` defaults to `en-NZ`, `NZD` and a Monday week start. `useLocale()` gives cached `Intl` formatters (`formatNumber`, `formatCurrency`, `formatDate`, `formatDateTime`) and the strings components show (`messages`, overridable). Date-only strings such as `2026-10-15` print that calendar day in every time zone; missing or invalid values format to an empty string instead of throwing.

## Components

Components read the design tokens only (no raw colours), accept `className` (merged last, so it can override defaults), forward `ref` to the real DOM element, and follow the density tokens for height and padding. Import from the root or from a subpath; subpaths and the root are both tree-shakeable.

### Button

```tsx
import { Button } from "@azmr/ui/button";

<Button>Save</Button>
<Button variant="destructive" loading loadingText="Deleting">Delete</Button>
<Button variant="outline" startIcon={<PlusIcon />}>New customer</Button>
<Button size="icon" aria-label="Close"><XIcon /></Button>            {/* icon-only needs a name */}
<Button nativeButton={false} render={<a href="/docs" />}>Docs</Button>   {/* renders a link */}
```

- **Variants:** `default`, `secondary`, `outline`, `ghost`, `destructive`, `success`, `warning`, `info`, `link`. **Sizes:** `sm`, `md` (follows the density token), `lg`, `icon`.
- **`loading`:** shows a spinner, sets `aria-busy`, ignores clicks and keyboard activation, **stays focusable** (keyboard users keep their place). `loadingText` replaces the label while loading; `startIcon` is replaced by the spinner, `endIcon` stays.
- **`type` is `"button"` by default**, so a button inside a form never submits by accident; pass `type="submit"` explicitly.
- **Icon-only buttons are type-checked:** `size="icon"` requires `aria-label` or `aria-labelledby`.

### Input

```tsx
import { Input } from "@azmr/ui/input";
import { useForm } from "react-hook-form";

const { register } = useForm();
<label htmlFor="email">Email</label>
<Input id="email" type="email" {...register("email")} />   {/* no Controller needed */}
```

`ref` is the real `<input>`, so `register()` works directly. Native `onChange` and the typed `onValueChange(value)` both fire. `aria-invalid="true"` styles the invalid state; focus uses a full-strength ring (WCAG 2.2 focus appearance).

### Spinner

`<Spinner />` is decorative; `<Spinner label="Loading customers" />` is announced as a status. It keeps spinning under `prefers-reduced-motion` because a frozen spinner reads as a hung page.

## Icons

`Icon` renders any icon component with consistent size, stroke, motion and accessibility. It is a **Server Component** (no hooks, no `"use client"`), so it works in `loading.tsx`, layouts and Suspense fallbacks.

```tsx
import { Icon } from "@azmr/ui/icons";
import { Search } from "lucide-react";
import { IconBell } from "@tabler/icons-react";   // optional: any set, or your own SVG component

<Icon icon={Search} />                              {/* decorative: aria-hidden */}
<Icon icon={Search} aria-label="Search" size="lg" /> {/* meaningful: role="img" + name */}
<Icon icon={IconBell} strokeWidth={1.5} />
<Icon icon={Loader} spin />                          {/* keeps spinning under reduced motion */}
```

- **Sizes:** `xs`, `sm`, `md` (default), `lg`, `xl` follow the size tokens; a number is a pixel size. `className` merges last, so `className="size-8"` wins.
- **Accessible by default:** decorative (`aria-hidden`) unless you pass `aria-label` or `aria-labelledby`. An icon-only button is named by a labelled icon.
- **Bring any set.** Lucide (ISC) is the default; Tabler (MIT) and your own SVG components work through the same `icon` prop with no adapter. `react-icons` is deliberately not bundled: it mixes licences and only tree-shakes through exact subpath imports.
- **Tree-shaking is tested:** the Icon core bundles no icon at all, and an app that imports one icon bundles that icon only.

**By name.** Three ways, from most to least isolated:

```tsx
// 1. The curated Lucide set, with typed names (about 60 everyday icons; Lucide's own kebab-case names)
import { Icon } from "@azmr/ui/icons/lucide";
<Icon name="circle-alert" />

// 2. Your own typed set: nothing global, only the icons you list are bundled
import { createIconSet } from "@azmr/ui/icons";
export const { Icon } = createIconSet({ check: Check, "my-logo": MyLogo });

// 3. A global registry for custom SVGs (names are untyped strings)
import { registerIcons } from "@azmr/ui/icons";
registerIcons({ "my-logo": MyLogo });   // then <Icon name="my-logo" />
```

An unknown name renders nothing and logs one development warning; it never crashes the page.

**Migrating from `@mui/icons-material`.** `@azmr/ui/icons/mui-map` is plain data: `resolveMuiIcon("SearchOutlined")` returns `{ name: "Search", variant: "outlined", lucide: "search", tabler: "IconSearch" }`. It covers over 300 common Material icons, strips the `Outlined` / `Rounded` / `Sharp` / `TwoTone` variants (and the legacy `Outline` spelling older MUI versions export), maps brand icons to Tabler only (Lucide has none), and lists the common names it deliberately does not map in `unmappedMuiIcons`. Every name in it is checked by tests against the real `@mui/icons-material`, `lucide-react` and `@tabler/icons-react`. The migration codemod uses it and reports anything unmapped instead of guessing.

## Entry points

| Import | Contents | Directive |
|---|---|---|
| `@azmr/ui` | everything (`Grid`, `useSignal`, `cn`) | `"use client"` |
| `@azmr/ui/hooks` | React hooks (`useSignal`, `useDebouncedCallback`, `useDebouncedValue`, `useReducedMotion`, `useUrlTab`) | `"use client"` |
| `@azmr/ui/theme` | server-safe theme helpers: `createTheme`, cookies, `htmlAttributes`, `createLocale` | none, importable from Server Components and middleware |
| `@azmr/ui/react` | `ThemeProvider`, `useTheme`, `LocaleProvider`, `useLocale` | `"use client"` |
| `@azmr/ui/button` | `Button`, `buttonVariants` | `"use client"` |
| `@azmr/ui/input` | `Input`, `Textarea` | `"use client"` |
| `@azmr/ui/input-group` | `InputGroup`, `InputGroupInput`, `InputGroupAddon`, `InputGroupButton` | `"use client"` |
| `@azmr/ui/password-input` | `PasswordInput`, `passwordRequirements`, `defaultPasswordScorer` | `"use client"` |
| `@azmr/ui/number-field` | `NumberField`, `MoneyField`, `numberOrNull` | `"use client"` |
| `@azmr/ui/rhf` | `Form`, `FormField`, `FormErrorSummary` (React Hook Form 7, optional peer) | `"use client"` |
| `@azmr/ui/zod` | `zodResolver`, `fieldsFromSchema`, `fieldFromSchema`, `toFieldErrors` (Zod 4, optional peer) | none, server-safe |
| `@azmr/ui/field` | `Field`, `FieldRoot`, `FieldLabel`, `FieldDescription`, `FieldError` | `"use client"` |
| `@azmr/ui/form` | `Fieldset`, `FieldsetRoot`, `FieldsetLegend`, `FormSection`, `ErrorSummary`, `toErrorSummaryItems` | `"use client"` |
| `@azmr/ui/spinner` | `Spinner` | none, importable from Server Components |
| `@azmr/ui/icons` | `Icon`, `createIconSet`, `registerIcons` | none, importable from Server Components |
| `@azmr/ui/icons/lucide` | `Icon` bound to the curated Lucide set, `lucideIcons` | none, importable from Server Components |
| `@azmr/ui/icons/mui-map` | `resolveMuiIcon`, `muiIconMap`, `unmappedMuiIcons` (migration data) | none, pure data |
| `@azmr/ui/lib` | `cn()` and other server-safe helpers | none, importable from Server Components |

`cn(...classes)` merges class names and resolves conflicting Tailwind utilities, last one wins: `cn("p-2", "p-4")` → `"p-4"`.

## Grid

```tsx
import { Signal } from "@azmr/core";
import { Grid } from "@azmr/ui";

const customers = new Signal([
  { name: "Aroha", balance: 150 },
  { name: "Mere",  balance: 320 },
]);

function App() {
  return (
    <Grid
      signal={customers}
      labels={{ name: "Customer", balance: "Balance ($)" }}
    />
  );
}

// Grid updates automatically
customers.set([...customers.peek(), { name: "Tane", balance: 0 }]);
```

## useSignal

Hook to subscribe any React component to a Signal.

```tsx
import { useSignal } from "@azmr/ui";

function Counter({ count }: { count: Signal<number> }) {
  const value = useSignal(count); // push-based, no polling
  return <span>{value}</span>;
}
```

## Grid Props

| Prop | Type | Description |
|---|---|---|
| `signal` | `Signal<T[]>` | Reactive data source |
| `columns` | `(keyof T)[]` | Optional column order |
| `labels` | `Partial<Record<keyof T, string>>` | Optional column label overrides |
| `emptyMessage` | `string` | Message shown when Signal is empty |

All cell values are rendered through React's JSX escaping — `dangerouslySetInnerHTML` is never used.

## Requirements

- Node.js ≥ 18
- React 18 or 19
- TypeScript ≥ 5 (types included)

## Documentation

Full docs at [platform.azmara.io](https://platform.azmara.io/docs/packages/ui)

## License

MIT © [Azmara Labs](https://azmara.io)
