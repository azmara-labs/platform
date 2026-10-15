# @azmr/ui

React components wired to reactive Signals. The `Grid` component re-renders automatically when its Signal changes — no state management needed.

## Install

```bash
pnpm add @azmr/ui @azmr/core react react-dom
# or
npm install @azmr/ui @azmr/core react react-dom
```

`@azmr/core` is a **peer dependency**: install it yourself so your app and `@azmr/ui` share one copy (two copies give incompatible `Signal` types).

## Entry points

| Import | Contents | Directive |
|---|---|---|
| `@azmr/ui` | everything (`Grid`, `useSignal`, `cn`) | `"use client"` |
| `@azmr/ui/hooks` | React hooks (`useSignal`) | `"use client"` |
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
