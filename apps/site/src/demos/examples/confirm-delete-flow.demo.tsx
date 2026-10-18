"use client";

import { Button, IconButton } from "@azmr/ui/button";
import { EmptyState } from "@azmr/ui/display";
import { Icon } from "@azmr/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@azmr/ui/modal";
import { toast } from "@azmr/ui/toast";
import { FileText, FolderOpen, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const INITIAL = [
  "Quarterly report.pdf",
  "Team photo.png",
  "Brand guidelines.pdf",
  "Budget 2027.xlsx",
];

// Deleting is the flow that most needs care: a menu opens a confirmation, the confirmation says
// what will be lost, and the result is a toast that can undo it. Each step is its own component
// doing one job, and they share one piece of state, the list.
export default function ConfirmDeleteFlow() {
  const [files, setFiles] = useState(INITIAL);
  // The file waiting for an answer. Setting it opens the dialog; clearing it closes it.
  const [pending, setPending] = useState<string | null>(null);
  // The last delete. A new object each time, so deleting the same file twice still counts.
  const [removed, setRemoved] = useState<{ name: string } | null>(null);
  const list = useRef<HTMLUListElement>(null);

  // The row that opened the menu is gone after a delete, so say where focus goes next: the list.
  useEffect(() => {
    if (removed) list.current?.focus();
  }, [removed]);

  function remove(name: string) {
    const index = files.indexOf(name);
    setFiles((all) => all.filter((file) => file !== name));
    setRemoved({ name });
    setPending(null);
    toast(`Deleted “${name}”`, {
      // A stable id means a second delete of the same file replaces the toast instead of stacking.
      id: `deleted-${name}`,
      action: {
        label: "Undo",
        onClick: () =>
          setFiles((all) => {
            if (all.includes(name)) return all;
            const next = [...all];
            next.splice(Math.min(index, next.length), 0, name);
            return next;
          }),
      },
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      {/* A label for the list, not a heading: a heading here would skip a level on the page. */}
      <p id="files-heading" className="m-0 text-base font-semibold">
        Files
      </p>
      {files.length === 0 ? (
        <EmptyState
          icon={<Icon icon={FolderOpen} size="xl" />}
          title="No files"
          description="Everything has been deleted. Undo from the notification, or reset the list."
          action={
            <Button size="sm" variant="outline" onClick={() => setFiles(INITIAL)}>
              Reset the list
            </Button>
          }
        />
      ) : (
        <ul
          ref={list}
          tabIndex={-1}
          aria-labelledby="files-heading"
          className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-border p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {files.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Icon icon={FileText} className="text-muted-foreground" />
                {name}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <IconButton
                      icon={<Icon icon={MoreHorizontal} />}
                      label={`Actions for ${name}`}
                      variant="ghost"
                      size="sm"
                    />
                  }
                />
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => toast(`Downloading “${name}”`)}>
                    Download
                  </DropdownMenuItem>
                  {/* The dialog is a sibling of the menu, so it outlives the menu closing. */}
                  <DropdownMenuItem variant="destructive" onClick={() => setPending(name)}>
                    Delete…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pending}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It is removed for everyone with access. You can undo this for a few seconds
              afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Focus starts on Cancel, so pressing Enter by reflex cannot delete anything. */}
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && remove(pending)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
