import { Button } from "@azmr/ui/button";
import { AppShell, NavGroup, NavItem, Sidebar, SidebarFooter, TopBar } from "@azmr/ui/shell";
import { Bell, Home, List, Settings, Users } from "lucide-react";

// The shell is a page frame. To show one inside a docs page it is `embedded` (the page already has a
// main landmark), given a height with --shell-vh, and put in a box with a transform so its edge
// hot zone and peek stay inside the box. `persist={false}` keeps the demo from writing the cookie.
export default function ShellBasic() {
  return (
    <div className="h-[28rem] overflow-hidden rounded-lg border border-border [transform:translateZ(0)]">
      <AppShell
        embedded
        persist={false}
        defaultMode="hidden"
        className="h-full [--shell-vh:28rem]"
        topBar={
          <TopBar
            brand={<span className="font-semibold text-sm">Acme</span>}
            end={
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
            }
          />
        }
        sidebar={
          <Sidebar label="Demo navigation">
            <NavGroup title="Orders">
              <NavItem href="#home" icon={<Home className="size-4" />} current>
                Home
              </NavItem>
              <NavItem href="#orders" icon={<List className="size-4" />} badge={3}>
                My orders
              </NavItem>
            </NavGroup>
            <NavGroup title="Account">
              <NavItem href="#team" icon={<Users className="size-4" />}>
                Team
              </NavItem>
              <NavItem href="#settings" icon={<Settings className="size-4" />}>
                Settings
              </NavItem>
            </NavGroup>
            <SidebarFooter>
              <span className="text-xs">Signed in as Sam</span>
            </SidebarFooter>
          </Sidebar>
        }
      >
        <div className="p-6">
          <p className="font-medium text-sm">Rest the mouse on the left edge.</p>
          <p className="mt-2 max-w-prose text-muted-foreground text-sm">
            The hidden sidebar slides over this content. Click the button at the left of the top bar
            to pin it open, and click again to hide it. On a phone it opens as a drawer.
          </p>
        </div>
      </AppShell>
    </div>
  );
}
