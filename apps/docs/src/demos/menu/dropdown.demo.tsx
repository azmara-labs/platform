"use client";

import { Button } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function DropdownBasic() {
  const [showGrid, setShowGrid] = useState(true);
  const [density, setDensity] = useState("comfortable");
  const [last, setLast] = useState("Nothing chosen yet");

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" endIcon={<Icon icon={ChevronDown} />}>
              Project
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setLast("Saved")}>
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLast("Renamed")}>Rename</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive (needs an owner)</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
            Show grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as string)}>
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setLast("Shared by email")}>Email</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLast("Link copied")}>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setLast("Deleted")}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {last} · grid {showGrid ? "on" : "off"} · {density}
      </p>
    </div>
  );
}
