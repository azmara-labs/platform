# @azmr/ui

React components wired to reactive Signals. The `Grid` component re-renders automatically when its Signal changes — no state management needed.

## Install

```bash
pnpm add @azmr/ui @azmr/core react react-dom
# or
npm install @azmr/ui @azmr/core react react-dom
```

`@azmr/core` is a **peer dependency**: install it yourself so your app and `@azmr/ui` share one copy (two copies give incompatible `Signal` types).

## Styles and design tokens

`@azmr/ui` ships one stylesheet with the design tokens and the Tailwind v4 theme mapping. In your global CSS:

```css
@import "tailwindcss";
@import "@azmr/ui/styles.css";
```

- **Token names follow shadcn/ui** (`--background`, `--primary`, `--ring`, `--radius`, `--sidebar-*`, ...), so shadcn components from any registry look right next to ours. Azmara adds `--success`, `--warning`, `--info`, `--chart-1` to `--chart-8`, `--motion-*`, `--elevation-*`, `--z-*` and `--density-*`.
- **Utilities** such as `bg-background`, `text-muted-foreground`, `rounded-lg`, `shadow-elevation-2` and `ease-standard` work out of the box. The stylesheet includes an `@source` rule, so Tailwind scans the package's classes inside `node_modules`.
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
- `createTheme({ primary, radius, font, density })` turns a brand colour (`#rrggbb`, `oklch(L C H)` or `{ l, c, h }`) into token overrides. It guarantees WCAG AA: `--primary-foreground` on `--primary` is at least 4.5:1 and the focus ring at least 3:1, in both modes, adjusting lightness where needed and keeping the hue. Input is validated strictly because the output is CSS.

```tsx
import { createTheme } from "@azmr/ui/theme";
const theme = createTheme({ primary: "#1E88E5", radius: "0.5rem" });
// <style>{theme.css}</style>   or   <html style={theme.cssVariables}>
```

**Locale.** `LocaleProvider` defaults to `en-NZ`, `NZD` and a Monday week start. `useLocale()` gives cached `Intl` formatters (`formatNumber`, `formatCurrency`, `formatDate`, `formatDateTime`) and the strings components show (`messages`, overridable). Date-only strings such as `2026-10-15` print that calendar day in every time zone; missing or invalid values format to an empty string instead of throwing.

## Entry points

| Import | Contents | Directive |
|---|---|---|
| `@azmr/ui` | everything (`Grid`, `useSignal`, `cn`) | `"use client"` |
| `@azmr/ui/hooks` | React hooks (`useSignal`) | `"use client"` |
| `@azmr/ui/theme` | server-safe theme helpers: `createTheme`, cookies, `htmlAttributes`, `createLocale` | none, importable from Server Components and middleware |
| `@azmr/ui/react` | `ThemeProvider`, `useTheme`, `LocaleProvider`, `useLocale` | `"use client"` |
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

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
