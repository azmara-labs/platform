"use client";

import { DropdownMenuItem, DropdownMenuSeparator } from "@azmr/ui/menu";
import { SplitButton } from "@azmr/ui/split-button";
import { useState } from "react";

export default function SplitButtonBasic() {
  const [last, setLast] = useState("Nothing saved yet");
  return (
    <div className="flex items-center gap-4">
      <SplitButton
        menuLabel="More save options"
        onClick={() => setLast("Saved")}
        menu={
          <>
            <DropdownMenuItem onClick={() => setLast("Saved as a new file")}>
              Save as…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLast("Saved a copy")}>Save a copy</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLast("Saved and closed")}>
              Save and close
            </DropdownMenuItem>
          </>
        }
      >
        Save
      </SplitButton>
      <SplitButton
        variant="outline"
        menuLabel="More export options"
        menu={<DropdownMenuItem>PDF</DropdownMenuItem>}
      >
        Export
      </SplitButton>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {last}
      </p>
    </div>
  );
}
