"use client";

import { Button } from "@azmr/ui/button";
import { Collapse } from "@azmr/ui/presets";
import { useId, useState } from "react";

export default function CollapseDemo() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide details" : "Show details"}
      </Button>
      <Collapse id={id} open={open}>
        <p className="text-sm text-muted-foreground">
          This panel animates its height by moving grid-template-rows between 0fr and 1fr, so no
          height is ever measured in JavaScript. While it is closed it is inert: its content cannot
          be focused or read.
        </p>
        <Button size="sm" className="mt-3">
          A focusable control
        </Button>
      </Collapse>
    </div>
  );
}
