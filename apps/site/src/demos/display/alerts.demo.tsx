"use client";

import { Alert, AlertDescription, AlertTitle } from "@azmr/ui/display";
import { useState } from "react";

export default function DisplayAlerts() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Alert variant="info">
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your trial ends in 3 days.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes are live.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Plan renews tomorrow</AlertTitle>
        <AlertDescription>Update your card to avoid an interruption.</AlertDescription>
      </Alert>
      {/* The Alert does not hide itself: you own that state. */}
      {!dismissed && (
        <Alert variant="destructive" onDismiss={() => setDismissed(true)}>
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>We could not charge the card on file.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
