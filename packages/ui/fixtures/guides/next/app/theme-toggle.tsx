"use client";

import { Button } from "@azmr/ui/button";
import { useTheme } from "@azmr/ui/react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <Button variant="outline" onClick={() => setTheme(next)}>
      Switch to {next} mode
    </Button>
  );
}
