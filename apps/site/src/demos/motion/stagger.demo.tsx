"use client";

import { Button } from "@azmr/ui/button";
import { Stagger } from "@azmr/ui/presets";
import { useState } from "react";

const items = ["Design tokens", "Components", "Accessibility", "Motion", "Docs"];

export default function StaggerDemo() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <Stagger key={run} as="ul" className="flex flex-col gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-border bg-card px-3 py-2">
            {item}
          </li>
        ))}
      </Stagger>
    </div>
  );
}
