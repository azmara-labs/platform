"use client";

import { ToggleGroup, ToggleGroupItem } from "@azmr/ui/toggle";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from "lucide-react";
import { useState } from "react";

export default function ToggleGroupBasic() {
  const [align, setAlign] = useState<string[]>(["left"]);
  return (
    <div className="flex flex-col items-start gap-4">
      {/* One at a time (the default). The value is always an array. */}
      <ToggleGroup
        aria-label="Text alignment"
        variant="outline"
        value={align}
        onValueChange={(v) => setAlign(v as string[])}
      >
        <ToggleGroupItem value="left" size="icon" aria-label="Align left">
          <AlignLeft className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" size="icon" aria-label="Align centre">
          <AlignCenter className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" size="icon" aria-label="Align right">
          <AlignRight className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Aligned: {align[0] ?? "nothing"}
      </p>

      {/* Any number at once. */}
      <ToggleGroup aria-label="Text style" variant="outline" multiple defaultValue={["bold"]}>
        <ToggleGroupItem value="bold" size="icon" aria-label="Bold">
          <Bold className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" size="icon" aria-label="Italic">
          <Italic className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" size="icon" aria-label="Underline">
          <Underline className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
