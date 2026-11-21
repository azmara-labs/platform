"use client";

import { Checkbox, Switch } from "@azmr/ui/choice";
import { useState } from "react";

export default function ChoiceBasic() {
  const [signed, setSigned] = useState(false);
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Checkbox
        label="Customer has signed"
        description="Tick it once the signed quote is back."
        checked={signed}
        onCheckedChange={setSigned}
      />
      <Checkbox label="Send me a copy" defaultChecked />
      <Checkbox label="Select all" indeterminate />
      <Switch label="Email me about new invoices" description="At most one email a day." />
      <Switch label="Show archived clients" defaultChecked />
      <Checkbox label="Accept the terms" required error="You must accept to continue." />
      <Checkbox label="Not available on this plan" disabled />
    </div>
  );
}
