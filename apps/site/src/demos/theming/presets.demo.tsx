import { Button } from "@azmr/ui/button";
import { createTheme } from "@azmr/ui/theme";
import { THEME_PRESETS } from "@azmr/ui/theme-presets";

const MODES = ["light", "dark"] as const;

// Each panel is its own theme scope. The variables go on the same element as `data-theme`,
// because a scope re-declares every colour token and would otherwise hide the theme's colours.
export default function Presets() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.values(THEME_PRESETS).flatMap((preset) =>
        MODES.map((mode) => (
          <div
            key={`${preset.name}-${mode}`}
            data-theme={mode}
            style={createTheme(preset).cssVariables}
            className="flex overflow-hidden rounded-lg border border-border bg-background text-foreground"
          >
            <nav
              aria-label={`${preset.name}, ${mode}`}
              className="flex w-28 flex-col gap-1 bg-sidebar p-3 text-sidebar-foreground text-sm"
            >
              <span className="rounded-md bg-sidebar-primary px-2 py-1 text-sidebar-primary-foreground">
                Orders
              </span>
              <span className="rounded-md px-2 py-1">Customers</span>
              <span className="rounded-md bg-sidebar-accent px-2 py-1 text-sidebar-accent-foreground">
                Reports
              </span>
            </nav>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="font-medium">{preset.name}</p>
              <p className="text-muted-foreground text-sm">{mode} mode</p>
              <Button>Save</Button>
            </div>
          </div>
        )),
      )}
    </div>
  );
}
