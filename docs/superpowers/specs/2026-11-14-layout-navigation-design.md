# @azmr/ui Layout and Navigation — Design Spec

- **Date:** 2026-11-14
- **Status:** Draft for review
- **Owner:** Alshafaraz Gazi
- **Package:** `@azmr/ui` (`packages/ui`): new server-safe `@azmr/ui/navigation` and client `@azmr/ui/shell` entries
- **Tracking:** Jira epic PAZM-127; this spec is PAZM-139. Builds on `2026-10-15-azmr-ui-design.md` (section on the shell) and `2026-11-13-theme-schema-design.md` (sidebar roles and `ThemeConfig.branding`). Existing tickets it absorbs rather than duplicates: PAZM-67, 70, 71, 72, 73, 74.

## 1. Purpose

Business apps such as the Azmara ERP (Finance, HCM, Inventory and Warehouse, Project Management, CRM and more) are made of **modules**, and each organisation subscribes to some of them. A person needs to see which modules their organisation has, move between them in one step, and always know where they are. They also need to see, without being nagged, which modules they could try.

This spec defines the application shell that does that: a top bar with an **app launcher**, a sidebar for the current module's pages, an account menu, and navigation that is **generated from one route definition**, so adding a page adds its menu entry, its breadcrumb and its access rule together. It replaces Toolpad's `DashboardLayout` (Toolpad is deprecated).

The reference for the launcher is the app switcher used by Atlassian and Microsoft 365: a grid button in the top bar opens a panel with the organisation at the top, then the apps the organisation has, then apps it could add, with a "Manage list" action at the bottom.

## 2. Goals, non-goals, anti-goals

### Goals

| # | Goal |
|---|---|
| L1 | One route definition drives the sidebar, the top bar, breadcrumbs, the command palette and server-side route rules. |
| L2 | An **app launcher** lists the organisation's modules, shows modules it does not have as "Try now" or "Upgrade", and handles trials, overflow and ordering. |
| L3 | Three layouts from one config, chosen by a prop: `combined` (top bar and sidebar, the default for module apps), `sidebar`, and `topbar` (for sites with no modules). |
| L4 | Entitlements (the organisation's plan) and permissions (the user's role) decide what appears. Hiding is a convenience; **enforcement is server-side and mandatory**. |
| L5 | Account menu and sign-in button that work with any auth provider. |
| L6 | The sidebar's collapsed state is remembered and rendered by the server, so there is no flash. |
| L7 | Keyboard-complete, landmarks and skip link, reduced-motion aware, WCAG 2.2 AA. |
| L8 | Nothing in the package is specific to one app, company or framework. |

### Non-goals

- A permissions engine, or a billing and trial system. The shell shows what it is told and calls back when someone asks to try a module. The app decides, and the server grants.
- The command palette itself (PAZM-71). The shell gives it a data contract (the route manifest).
- Theming. The shell reads the sidebar roles and `branding` from the theme schema.
- A visual page builder.

### Anti-goals (a failure even if it works)

- A module appearing as available to someone whose organisation has no access, or a page link shown that the server would refuse and the shell never explains.
- The shell granting a trial or any access on the client.
- A layout that flashes, shifts, or slows the dashboard: the Azmara app's dashboard loads in about 157 ms today and must not regress.
- Navigation that only a mouse can use.

## 3. Current state

- `@azmr/ui` has no shell. PAZM-67 (AppShell, Sidebar, drawer), PAZM-70 (NavigationConfig and NavigationMenu), PAZM-71 (CommandPalette), PAZM-72 (horizontal NavigationMenu), PAZM-73 (AccountMenu and SignIn) and PAZM-74 (top bar and layout variants) exist as backlog tickets.
- The Azmara app's shell (`src/components/layout/AppShell.tsx`, about 200 lines) hard-codes two navigation lists, one for staff and one for customers. Staff items are grouped by module (CRM, Finance, Organization), and an item carries an optional `feature` string; the app hides items whose feature is not in the organisation's enabled features. It runs on a local copy of the shadcn Sidebar. There is no module switcher, no top bar and no route definition: each new page needs a manual edit to the list.
- The app already has plan-based entitlements (plans and features, and a trial grant), a server-side `requireAdmin`/role model, and a zero-trust database. The shell has to sit on top of these, not beside them.

## 4. The model

Three plain-data concepts. All are JSON-compatible types in a server-safe entry, so a Server Component can compute them.

```ts
type ModuleId = string;

interface RouteNode {
  path: string;                       // "/finance/invoices"
  title: string;                      // menu label and breadcrumb
  icon?: IconName;                    // from the icon map, never markup
  group?: string;                     // section heading in the sidebar
  order?: number;
  badge?: string | number;
  hidden?: boolean;                   // routable, but not in menus (detail pages)
  external?: boolean;                 // `path` is an https URL, not an in-app path
  requires?: { feature?: string; permission?: string; role?: string };
  children?: RouteNode[];
}

interface ModuleDef {
  id: ModuleId;                       // "finance"
  title: string;                      // "Finance"
  icon: IconName;
  description: string;                // the one line shown when it could be tried
  home: string;                       // "/finance"
  feature: string;                    // the entitlement the app maps to this module's status
  routes: RouteNode[];                // this module's pages
}

type ModuleStatus =
  | { state: "enabled" }
  | { state: "trial"; endsAt: string }          // ISO date
  | { state: "available" }                      // not subscribed; can be tried
  | { state: "locked"; reason?: string };       // not available to this organisation

interface ShellContext {
  organisation: { id: string; name: string; logo?: string };
  organisations?: { id: string; name: string; logo?: string }[]; // for the selector
  user?: { name: string; email?: string; image?: string };       // absent = signed out
  modules: Record<ModuleId, ModuleStatus>;
  permissions: ReadonlySet<string>;
  role?: string;
}
```

`defineRoutes({ modules, shared })` builds and validates the manifest once (unique paths, every `requires` is a known shape, links are safe, section 12). `resolveNavigation(manifest, context, pathname)` returns what to render: the current module, the visible launcher entries, the sidebar sections with the active item marked, and the breadcrumbs. It is pure, server-safe and fully unit-tested.

## 5. Anatomy

```
+------------------------------------------------------------------------------+
| [grid] Finance   [ Search or run a command (Ctrl+K) ]   [bell] [?]  [avatar v] |  top bar
+----------------+-------------------------------------------------------------+
| Finance        |  Finance / Invoices                                          |  breadcrumbs
|  Quotations    |  Invoices                                  [ New invoice ]   |  page header
|  Invoices   3  |                                                              |
|  Sales items   |  ...page content...                                          |
|  Accounting    |                                                              |
| Organisation   |                                                              |
|  Members       |                                                              |
| < collapse     |                                                              |
+----------------+-------------------------------------------------------------+
```

- **Top bar** (`banner`): the launcher button, the current module's name and icon, search or the command palette, slots for notifications and help, and the account menu. When signed out, the account slot is a **Sign in** button.
- **Sidebar** (`navigation`): the current module's sections and items, a collapse control, a footer slot. It collapses to an icon rail with tooltips.
- **Content** (`main`): breadcrumbs and a page header (title, description, actions) from the route definition.
- **Narrow screens:** the sidebar becomes a drawer. The launcher and the module's sections both live in it, launcher first.
- **Layouts:** `combined` is the picture above. `sidebar` has no top bar (the launcher moves to the sidebar header). `topbar` has no sidebar and renders the module's top-level routes as a horizontal navigation menu (PAZM-72), for sites with no modules.

## 6. The app launcher

Opened by the grid button. It is a popover on wide screens and a full-width sheet on narrow ones. Content, top to bottom, in the order the reference uses:

1. **Organisation** header: the current organisation's logo and name. If `organisations` has more than one entry, it is a selector; choosing one calls `onSwitchOrganisation(id)` and the app does the switch.
2. **Home**: the dashboard.
3. **Your modules**: every module whose state is `enabled` or `trial`, in the user's own order, each with its icon and name. A trial module carries a small badge ("Trial, 12 days left"). The current module is marked with `aria-current`. If there are more than a set number (default 7), the rest sit behind **N more**.
4. **Try these** (the reference's "Recommended" block): every module in state `available`, with its description and a **Try now** button. Pressing it calls `onTryNow(moduleId)`. The app starts the trial on the server and refreshes the context; the shell shows the module as pending until the context changes, and shows the app's error if the call fails. A `locked` module shows its `reason` and, if the app gives an `onUpgrade`, an **Upgrade** button instead. Modules the user may not even see (no permission to browse them) are not listed.
5. **Manage list**: opens the user's ordering and pinning (drag handle and keyboard move buttons, show or hide). The shell reports changes through `onPreferencesChange(prefs)`; the app stores them per user. The package stores nothing about a user.

Behaviour: opens with the button, Enter or Space; closes with Escape or a click outside, returning focus to the button; arrow keys move through the entries; Home and End jump. It uses the disclosure pattern with a list of links, not an ARIA `menu`, because its entries are navigation links. The grid button has an accessible name ("Apps"). Entries are real links (`href`), so middle-click and "open in new tab" work. States: loading (skeleton rows), empty (only Home), error.

Where the entitlement state comes from is the app's job: it builds `ShellContext.modules` on the server from its plan and trial data. The shell never infers access.

## 7. Navigation inside a module

- The sidebar shows the current module's `routes`, grouped by `group` then `order`, with nested groups that expand (`aria-expanded`), icons, badges, dividers and group headings. The active item is found from the pathname through a router adapter (section 8) and carries `aria-current="page"`; its ancestors expand.
- The current module is **derived from the URL** (the module whose `home` is the longest prefix of the pathname), not stored. A page outside every module (account, organisation settings) belongs to a `shared` set that shows in a bottom section on every module, as the Azmara app's "Organization" group does.
- Collapse: a control and the keyboard shortcut Ctrl+B (configurable) toggle the sidebar; the collapsed state is saved (section 11).
- Items the user is not allowed to see are removed before render, so they are absent from the DOM, not just hidden with CSS.

## 8. The route definition and adapters

One definition, five consumers: the sidebar, the top bar, breadcrumbs (a node's ancestors), the command palette (every visible, allowed node is a "Go to" command) and server route rules (`getRouteAccessRule(pathname)` for middleware, built from the same `requires`). Because they share a source, a page cannot appear in the menu without the rule that protects it, which is the point.

**Hiding is not protection.** `requires` filters the shell. The server must also refuse the request; the docs say so beside every example, and the route rules helper exists so the enforcement is one call away.

Authoring is **explicit**: the app writes `defineRoutes(...)` in one file. Generating it by scanning the framework's file tree (Next's `app/` folder) is attractive but fragile: dynamic segments, route groups and parallel routes do not map cleanly to menu entries. It can come later as an optional generator that writes the same manifest.

**Adapters** give the shell the pathname and link behaviour without importing a framework into the core: a small interface `{ usePathname(), Link }`. Shipped as separate optional entries: `@azmr/ui/shell/next` (Next App Router: `usePathname`, `next/link`, prefetch), and `@azmr/ui/shell/react-router`. A Next App Router example is in the docs.

## 9. Open screens (optional, second phase)

Some systems, notably HR and payroll suites, work through many "process screens" at once, and users switch between them like tabs. The second pattern the owner described is this one. The shell supports it as an optional strip under the top bar: the screens the user has open or recently used (title, module icon, a close button), a "recent" list in the launcher, and a guard against closing a screen with unsaved changes. State is per user and held by the app through `onScreensChange`.

This is my reading of "switch different process screens"; it is not built until confirmed, and phase 1 does not depend on it. The launcher and sidebar already give single-step movement between modules and pages.

## 10. Account menu and sign-in

- `AccountMenu`: avatar and name; items (profile, organisation settings, theme and density, sign out); a footer slot; an impersonation banner slot.
- **Signed out:** the account slot renders `Sign in`, which calls `onSignIn()` or links to a `signInHref`.
- The session is an interface (`{ user: { name, email, image } }`) with `signIn` and `signOut` callbacks, so it works with Auth.js, Supabase or custom auth (PAZM-73).

## 11. Branding, state and persistence

- **Branding** comes from `ThemeConfig.branding` (theme schema): `appName` and the light and dark logos in the top bar and the launcher header. Logos render only through `<img>` and only if the asset reference passed validation; with no logo the shell shows the name as text.
- **Sidebar collapsed state:** a cookie (`azmr-sidebar`, same helpers and rules as the theme cookies), read by the server layout and rendered into the markup, so the first paint is right and strict CSPs work (no inline script).
- **Launcher order, pins and open screens:** per user, owned by the app (`on…Change` callbacks). The package persists nothing about a person.
- **Current module and active page:** from the URL only.

## 12. Security

- Every `path` and `home` in the manifest is validated by `defineRoutes`: an in-app path (starts with `/`, no `//`, no scheme, no control characters) or, for explicitly marked external links, an `https:` URL; external links render with `rel="noopener noreferrer"`.
- Icons are names from the icon map. Titles, descriptions, badges and `reason` are text, never HTML. Nothing in the shell uses `dangerouslySetInnerHTML`.
- The launcher shows only name and description for modules a user could try, and nothing about modules they may not browse.
- `onTryNow`, `onUpgrade`, `onSwitchOrganisation` and `onSignIn` are callbacks: the shell cannot change entitlements, organisations or sessions on its own. A client call cannot grant access; the app's server action must check the user, the organisation and the module before it starts anything. The docs show the server action beside the callback.
- Organisation logos follow the theme schema's asset rules (https or a small raster data URI; no SVG).

## 13. Performance and rendering

- The manifest, `resolveNavigation` and breadcrumbs run on the server. Only the interactive parts are client components: launcher popover, sidebar collapse, drawer, account menu. The page header and breadcrumbs are server components.
- No layout shift: the sidebar width is in the server-rendered markup; the top bar has a fixed height from the density tokens.
- Targets: Lighthouse 96 or better on the Azmara app's migrated routes; its dashboard load time (about 157 ms in production) does not regress; the shell's client JavaScript has a size budget set when the entry is built (`pnpm size`).
- Reduced motion: drawer, popover and collapse transitions use the motion tokens, which already collapse under `prefers-reduced-motion`.

## 14. Accessibility

Landmarks (`banner`, `navigation` with a label per instance, `main`), a skip link as the first focusable element, `aria-current` for the active page and module, a visible focus ring on every control (the `ring` and `sidebar-ring` roles), target sizes of at least 24 px, full keyboard operation (launcher, sidebar groups, drawer, account menu, collapse), focus returned to the opener on close, labels on icon-only buttons, tooltips on the collapsed rail that also appear on focus, forced-colours support, and axe-checked demos. Reading order matches visual order.

## 15. Package surface

| Entry | Kind | Contents |
|---|---|---|
| `@azmr/ui/navigation` | server-safe | `defineRoutes`, `resolveNavigation`, `getRouteAccessRule`, `breadcrumbsFor`, the types in section 4. No React. |
| `@azmr/ui/shell` | client | `AppShell`, `TopBar`, `Sidebar`, `AppLauncher`, `AccountMenu`, `SignInButton`, `PageHeader`, `Breadcrumbs`, the drawer. |
| `@azmr/ui/shell/next`, `@azmr/ui/shell/react-router` | client, optional peers | router adapters (section 8). |

`AppShell` takes the resolved navigation and the context, a `layout` prop (`combined`, `sidebar`, `topbar`), and slots (`brand`, `search`, `actions`, `account`, `sidebarFooter`). Names are indicative; the builder fixes them, including the `IconName` type (the keys of the icon map).

## 16. Delivery slices

Each is its own pull request with its own tests, in this order. Slices 1 and 2 are the minimum for the Azmara app to start.

| Slice | Delivers | Tickets |
|---|---|---|
| 1 | `@azmr/ui/navigation`: manifest, `resolveNavigation`, breadcrumbs, route rules, validation | PAZM-140, PAZM-70 (types and matching) |
| 2 | `AppShell`, `Sidebar`, drawer, skip link, collapse cookie, `PageHeader`, `Breadcrumbs` | PAZM-67 |
| 3 | `TopBar` and the three layouts; horizontal navigation menu | PAZM-74, PAZM-72 |
| 4 | `AppLauncher` with entitlement states, Try now, overflow, Manage list | PAZM-141 |
| 5 | `AccountMenu`, `SignInButton`, session interface | PAZM-73 |
| 6 | Branding slot from `ThemeConfig.branding` | PAZM-142 |
| 7 | Command palette fed by the manifest | PAZM-71 |
| 8 | Open screens strip (only if confirmed) | new ticket |
| 9 | The Azmara app adopts the shell | APP-35 |

## 17. Acceptance criteria

- `resolveNavigation` is covered for: nested groups, active matching on exact and prefix paths, dynamic segments, module derivation from the URL, `shared` pages, every `ModuleStatus`, permissions and features removing items, and an unknown pathname.
- `defineRoutes` rejects duplicate paths, unsafe links (`javascript:`, `//host`, control characters, over-long values) and bad `requires`.
- The launcher is keyboard-tested (open, move, Home, End, Escape, focus return), shows each state, calls `onTryNow` once per press, shows pending and error states, and never lists a module the user may not browse.
- The shell renders on the server with no hydration mismatch and no flash for both collapsed states; layout shift is zero in a Playwright check.
- axe passes on every demo in light and dark, desktop and narrow.
- A route rule built from the same manifest refuses a request the menu would hide (a test that hits both).
- The Azmara app's dashboard load time and Lighthouse score do not regress when it adopts the shell (APP-35).
- Docs: a Next App Router guide that includes the server-side enforcement and the Try now server action; a demo for each layout.

## 18. Calls made while drafting

1. The launcher follows the reference closely (organisation header, Home, modules, overflow, a "try these" block, Manage list), as the owner showed. Unsubscribed modules appear there as **Try now**, and `locked` modules as **Upgrade**.
2. The route definition is written by hand, once; generating it from the file tree is a later option. A manifest is checkable and testable now.
3. The current module is derived from the URL, so deep links and the back button always agree.
4. The package stores nothing per user; the app owns launcher order, pins and open screens.
5. The launcher uses the disclosure pattern with real links, not an ARIA menu.
6. Open screens are a second phase, and my reading of the owner's second pattern needs confirming before it is built.
7. Router adapters are separate optional entries so the core stays framework-free.

## 19. Left to the builder

Component and prop names, the overflow threshold, how `Manage list` is laid out, icon-map coverage, the exact size budgets, cookie attributes (reuse the theme cookie helpers), and how the Next adapter handles prefetching.

## 20. One thing to confirm

Is the second pattern you described ("switch different process screens") the **open screens strip** in section 9: many screens open at once, switched like tabs? If it means something else (for example a menu of workflow steps within a module), say so and section 9 changes. Nothing in slices 1 to 7 depends on it.
