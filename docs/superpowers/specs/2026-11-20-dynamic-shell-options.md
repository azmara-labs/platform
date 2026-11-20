# Making the shell dynamic: options (for decision)

**Status:** options and a recommendation, not a decision. Raised by the owner on 2026-11-20 while the AppShell plan was being built (`docs/superpowers/plans/2026-11-20-app-shell.md`, issue #292).

## What was asked

- The shell's parts, including its buttons, should be replaceable and changeable through props, in a better way than MUI does it.
- Base UI's own props should reach the DOM, added in **layers** rather than hidden behind our API.
- The design studio will let people build layouts by drag and drop, so a shell has to be describable as data and editable by moving things around.
- Find the most dynamic and reusable option we can, within the library's rules.

## The rules we already have

From `2026-10-15-azmr-ui-design.md`:

- **P2:** "Real DOM, real refs. No synthetic-event shims, no `inputComponent`-style indirection." This argues against MUI's `slots` and `components`.
- **P4:** "Composition for primitives, configuration for the dynamic layer only."
- **Layers** (section 4.1): L2 primitives (the only layer that imports Base UI), L3 components, L4 blocks (`AppShell` is here), L5 dynamic (configuration, `ChartSpec`, `DataSource`). A layer imports only from layers below it.
- No `dangerouslySetInnerHTML`; hiding UI is never presented as authorisation.

## How the two reference libraries do it

| | MUI | Base UI |
|---|---|---|
| Replace a part | `slots={{ toggle: MyToggle }}` | `render={<MyToggle />}` or `render={(props, state) => ...}` on the part itself |
| Change a part's props | `slotProps={{ toggle: { ... } }}` | Props go straight on the part |
| State for styling | `sx` and theme overrides | `className` and `style` can be functions of state; `data-*` state attributes |
| Cost | A parallel prop tree per component; refs and DOM props pass through an indirection | None: the part is the element |

We already use the Base UI style: `NavItem` and `BreadcrumbLink` take `render`.

## Options

**A. Composition with `render` on every part.** The shell is a set of exported parts (`AppShell.TopBar`, `.Toggle`, `.Sidebar`, `.NavItem`, ...). To change the toggle, you render your own `<AppShell.Toggle render={<MyButton />} />`, or leave it out and call `useAppShell()` yourself. A JSX tree maps one-to-one onto a JSON tree.
- For: no indirection (P2), type-safe, nothing to learn beyond Base UI.
- Against: the apps write the JSX; nothing is data yet.

**B. MUI-style `slots` and `slotProps`.** A typed record of replaceable parts.
- For: flat, easy to describe in a studio.
- Against: the indirection P2 rules out; two ways to do one thing alongside `render`; props get split across two places.

**C. Layers (recommended).** Three layers, each passing its extra props down to the layer below, so Base UI's props always reach the element:
1. **Headless behaviour** (L2/L3): the state, the peek, the cookie, the drawer, with parts that take `render` and expose state as `data-*` attributes. No look of its own.
2. **Styled parts** (L4): what exists now (`AppShell`, `TopBar`, `Sidebar`, `NavItem`), built from layer 1. Each part forwards `...props` and `render`.
3. **Spec renderer** (L5, the only configuration layer, which satisfies P4): `<ShellFromSpec spec={...} registry={...} />` turns a serialisable `ShellSpec` into layer 2.
- For: matches the layers we already have, keeps composition for developers and configuration for the studio, and each layer is usable alone.
- Against: more to build, spread over three steps.

**D. Configuration only** (items arrays, as the layout spec's `NavigationConfig` does).
- For: simplest for the studio.
- Against: the least flexible. Good as a supplement inside layer 3, not as the only way.

## Making it work for drag and drop

A `ShellSpec` is data, validated with zod like `ThemeConfig` is:

```ts
interface ShellSpec {
  layout: "combined" | "sidebar" | "topbar";
  topBar: { brand?: Node; start?: Node[]; end?: Node[] };
  sidebar?: { label: string; groups: { title?: string; items: Node[] }[] };
}
interface Node { id: string; type: string; props?: Record<string, unknown> }   // type: "button", "search", "account-menu", "custom:<id>"
```

- **A registry maps `type` to a component and a zod schema for its props.** The studio draws a property panel from the schema; `@azmr/ui/rhf` already has `fieldsFromSchema`, so it comes nearly free.
- **Dragging is a tree edit:** move a node between `start` and `end`, or reorder within a list. Keyboard move buttons come with it, as the launcher design already requires.
- **No code in the data.** A button's click is an `action: "export-orders"` id, not a function. The app registers handlers by id and receives `onAction(id, node)`. That keeps a stored spec safe to load.
- **Unknown or invalid nodes** render a visible placeholder in the studio and nothing in production, so an old spec never breaks a page.
- **Text is text.** No HTML in props. Icons are names from the icon map.
- **Hiding is not protection.** A node a user may not see is also refused by the server; the docs repeat this beside each example.

## What this means for the plan being executed

- **Nothing built so far needs undoing.** `AppShell`, `TopBar` and the sidebar parts are layer 2 and take nodes today.
- **One real gap:** the top bar's toggle button is added by `TopBar` and cannot be replaced or moved. A small change fixes it and fits any option: export it as `AppShell.Toggle` (taking `render`), and let `TopBar` take `toggle={false}` or a node. Proposed for Task 6, or straight after.
- **Not in issue #292:** the headless layer and `ShellFromSpec`. They are a separate piece of work, best done after layout-navigation slice 1 (the route manifest), since a spec's sidebar items should come from it.

## Decisions needed

1. Option C (layers) as the direction? (Recommended.)
2. Add `AppShell.Toggle` with `render` to this branch, or leave the shell as built and do it with the headless layer?
3. Is the studio's shell editor in `@azmr/ui` (L5) or in the Design Studio app, with only the spec and registry in the library? (Recommended: spec, registry and renderer in the library; the editor UI in the studio.)
4. File the headless layer and `ShellFromSpec` as new issues after #292 merges?
