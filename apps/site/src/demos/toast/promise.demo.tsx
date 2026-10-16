"use client";

import { Button } from "@azmr/ui/button";
import { toast } from "@azmr/ui/toast";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ToastPromise() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(
            wait(1500).then(() => 12),
            {
              loading: "Exporting…",
              success: (rows) => `Exported ${rows} rows`,
              error: "Export failed",
            },
          )
        }
      >
        Export (succeeds)
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast
            .promise(
              wait(1500).then(() => Promise.reject(new Error("Disk full"))),
              {
                loading: "Exporting…",
                success: "Exported",
                error: (e: Error) => `Export failed: ${e.message}`,
              },
            )
            .catch(() => {})
        }
      >
        Export (fails)
      </Button>
    </div>
  );
}
