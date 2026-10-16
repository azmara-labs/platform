"use client";

import { Button } from "@azmr/ui/button";
import { toast } from "@azmr/ui/toast";
import { useState } from "react";

export default function ToastActions() {
  const [items, setItems] = useState(["Quarterly report", "Team photo"]);

  function remove(name: string) {
    setItems((all) => all.filter((n) => n !== name));
    toast(`Deleted “${name}”`, {
      // The same id replaces the toast instead of stacking another.
      id: `deleted-${name}`,
      action: {
        label: "Undo",
        onClick: () => setItems((all) => (all.includes(name) ? all : [...all, name])),
      },
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((name) => (
          <li key={name} className="flex items-center gap-3">
            {name}
            <Button size="sm" variant="ghost" onClick={() => remove(name)}>
              Delete
            </Button>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted-foreground">Nothing left.</li>}
      </ul>
    </div>
  );
}
