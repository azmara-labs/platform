"use client";

import { Button } from "@azmr/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import { useState } from "react";

export default function ContextBasic() {
  const [last, setLast] = useState("Right-click the card, or use the button");
  const choose = (what: string) => () => setLast(what);

  return (
    <div className="flex flex-col items-start gap-3">
      <ContextMenu>
        <ContextMenuTrigger className="flex h-28 w-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Right-click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={choose("Copied")}>Copy</ContextMenuItem>
          <ContextMenuItem onClick={choose("Pasted")}>Paste</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={choose("Deleted")}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* The same actions on a visible button: a context menu must never be the only way in. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Actions
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem onClick={choose("Copied")}>Copy</DropdownMenuItem>
          <DropdownMenuItem onClick={choose("Pasted")}>Paste</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={choose("Deleted")}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {last}
      </p>
    </div>
  );
}
