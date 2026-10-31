"use client";

import { Button } from "@azmr/ui/button";
import { ErrorBoundary } from "@azmr/ui/error-boundary";
import { useState } from "react";

function Report({ broken }: { broken: boolean }) {
  if (broken) throw new Error("Report query failed for customer #4123");
  return <p className="p-6 text-sm">Sales this month: $12,480.00</p>;
}

export default function ErrorBoundaryDemo() {
  const [broken, setBroken] = useState(false);
  const [reported, setReported] = useState(0);

  return (
    <div className="flex max-w-md flex-col gap-4">
      <Button variant="destructive" className="self-start" onClick={() => setBroken(true)}>
        Break the report
      </Button>
      <div className="rounded-md border">
        <ErrorBoundary
          // Your reporting hook: Sentry.captureException, posthog.captureException...
          onError={() => setReported((n) => n + 1)}
          // Try again re-renders the children, so fix the cause first.
          onReset={() => setBroken(false)}
          fallbackProps={{ titleAs: "h3", title: "The report couldn't load" }}
        >
          <Report broken={broken} />
        </ErrorBoundary>
      </div>
      <p className="text-sm text-muted-foreground">Errors reported: {reported}</p>
    </div>
  );
}
