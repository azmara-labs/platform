import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { PanelLeft } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Button } from "../button/index.js";
import { useShell } from "./shell-context.js";

export interface TopBarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Your logo or app name, after the navigation button. */
  brand?: ReactNode;
  /** A search field or similar. Hidden below `md`, where there is no room for it. */
  start?: ReactNode;
  /** Status and the account menu, at the right edge. */
  end?: ReactNode;
}

/**
 * The bar across the top: it sticks below the device's top inset, and holds the button that pins
 * the sidebar on desktop or opens the drawer on a phone. The button is added for you.
 */
export const TopBar = forwardRef<HTMLElement, TopBarProps>(function TopBar(
  { brand, start, end, className, ...props },
  ref,
) {
  const shell = useShell();
  const { mode, isDesktop, drawerOpen } = shell.state;
  const open = isDesktop ? mode === "pinned" : drawerOpen;
  // A `header` is the page's banner only outside another landmark; embedded, use a plain element.
  const Tag = shell.embedded ? "div" : "header";
  return (
    <Tag
      ref={ref as never}
      data-shell-topbar=""
      className={cn(
        "sticky top-[env(safe-area-inset-top)] z-(--z-sticky) col-span-full flex h-(--shell-topbar-h) items-center gap-3 border-border border-b bg-background px-3",
        className,
      )}
      {...props}
    >
      {shell.hasSidebar ? (
        <Button
          ref={shell.toggleRef}
          data-shell-toggle=""
          variant="ghost"
          size="icon"
          aria-label={open ? shell.labels.closeNav : shell.labels.openNav}
          aria-expanded={open}
          aria-controls={isDesktop ? shell.sidebarId : undefined}
          onClick={shell.toggle}
        >
          <Icon icon={PanelLeft} />
        </Button>
      ) : null}
      {brand ? <div className="flex shrink-0 items-center">{brand}</div> : null}
      {start ? (
        <div data-topbar-start="" className="hidden min-w-0 flex-1 md:block">
          {start}
        </div>
      ) : null}
      {end ? <div className="ms-auto flex shrink-0 items-center gap-2">{end}</div> : null}
    </Tag>
  );
});
