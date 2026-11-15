"use client";

import type { ThemeConfig } from "@azmr/ui/theme";
import { ThemeStudio } from "@azmr/ui/theme-studio";
import { useState } from "react";

// What a host app might already have stored. The studio shows the name, colour and logo, and
// carries `radius`, `density` and `tint` through a save without showing them.
const STORED: ThemeConfig = {
  version: 1,
  brand: "#0f4c5c",
  radius: "0.75rem",
  density: "compact",
  tint: 0.01,
  branding: { appName: "Harbour & Pine" },
};

/** Long image strings are shortened so the saved JSON stays readable. */
const short = (_key: string, value: unknown) =>
  typeof value === "string" && value.length > 48 ? `${value.slice(0, 40)}...` : value;

export default function ThemeStudioDemo() {
  const [saved, setSaved] = useState<ThemeConfig>(STORED);
  return (
    <div className="flex w-full flex-col gap-6">
      <ThemeStudio value={saved} onSave={setSaved} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">What your app would store</p>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">
          {JSON.stringify(saved, short, 2)}
        </pre>
      </div>
    </div>
  );
}
