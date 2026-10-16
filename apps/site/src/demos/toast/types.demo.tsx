"use client";

import { Button } from "@azmr/ui/button";
import { toast } from "@azmr/ui/toast";

export default function ToastTypes() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast("Draft saved")}>
        Plain
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.success("Invoice sent", { description: "Aroha will get it within a minute." })
        }
      >
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.info("New version available")}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Your plan renews tomorrow")}>
        Warning
      </Button>
      {/* Errors are announced urgently (role="alert"); the others politely. */}
      <Button
        variant="outline"
        onClick={() => toast.error("Could not save", { description: "Check your connection." })}
      >
        Error
      </Button>
    </div>
  );
}
