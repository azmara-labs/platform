"use client";

import { Button } from "@azmr/ui/button";
import { type ReactNode, useState } from "react";

type ThemeChoice = "site" | "light" | "dark";
type DensityChoice = "comfortable" | "compact" | "spacious";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "site", label: "Site" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const DENSITIES: { value: DensityChoice; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 items-center gap-1 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={option.value === value ? "secondary" : "ghost"}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </fieldset>
  );
}

/**
 * Frames a live demo and lets the reader preview it in light or dark and at each density. The
 * choices apply to the preview only, through `data-theme` / `data-density` on its wrapper, which
 * is how an app would scope them too, so the switcher exercises the real tokens.
 */
export function DemoFrame({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>("site");
  const [density, setDensity] = useState<DensityChoice>("comfortable");

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-fd-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border bg-fd-muted/50 px-3 py-2">
        <Choice label="Preview theme" options={THEMES} value={theme} onChange={setTheme} />
        <Choice label="Preview density" options={DENSITIES} value={density} onChange={setDensity} />
      </div>
      <div
        data-theme={theme === "site" ? undefined : theme}
        data-density={density === "comfortable" ? undefined : density}
        className="bg-background p-6 text-foreground"
      >
        {children}
      </div>
    </div>
  );
}
