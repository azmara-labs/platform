"use client";

import { useTheme } from "@azmr/ui/react";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, density, setDensity } = useTheme();
  return (
    <div className="flex items-center gap-2 text-sm" data-testid="theme-toggle">
      <span data-testid="theme-state">{`${theme}/${resolvedTheme}/${density}`}</span>
      <button
        type="button"
        className="underline"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        toggle theme
      </button>
      <button type="button" className="underline" onClick={() => setDensity("compact")}>
        compact
      </button>
    </div>
  );
}
