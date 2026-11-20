---
"@azmr/ui": minor
---

Add `AppShell`, `TopBar`, `Sidebar`, `NavGroup`, `NavItem`, `SidebarFooter` and `useAppShell` in a new `@azmr/ui/shell` entry, and `readSidebarMode` in a new server-safe `@azmr/ui/shell-state` entry. The sidebar can be pinned or hidden, peeks open when the mouse rests on the left edge, and becomes a drawer below a breakpoint. The choice is remembered in the `azmr-sidebar` cookie and rendered by the server. `DrawerContent` gains an optional `contentClassName` for the wrapper around its children.
