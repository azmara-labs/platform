"use client";

import { Button } from "@azmr/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@azmr/ui/modal";
import { useState } from "react";

export default function AlertDialogBasic() {
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive">Delete project</Button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              Its files and history are removed for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleted(true)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {deleted ? "Project deleted." : "Focus starts on “Keep it”, never on “Delete”."}
      </p>
    </div>
  );
}
