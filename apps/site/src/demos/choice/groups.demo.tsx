"use client";

import { Checkbox, CheckboxGroup, Radio, RadioGroup } from "@azmr/ui/choice";
import { useState } from "react";

const PLANS = [
  { value: "starter", label: "Starter", description: "One user, up to 10 invoices a month." },
  { value: "team", label: "Team", description: "Five users and quotations." },
  { value: "business", label: "Business", description: "Unlimited users, priority support." },
];

const MODULES = [
  { value: "invoices", label: "Invoices" },
  { value: "quotations", label: "Quotations" },
  { value: "payroll", label: "Payroll", disabled: true, description: "Coming soon." },
  { value: "reports", label: "Reports" },
];

export default function ChoiceGroups() {
  const [plan, setPlan] = useState("team");
  const [modules, setModules] = useState<string[]>(["invoices"]);
  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <RadioGroup
        label="Plan"
        description="You can change it later."
        options={PLANS}
        value={plan}
        onValueChange={setPlan}
      />
      <RadioGroup label="Billing" orientation="horizontal" defaultValue="monthly">
        <Radio value="monthly" label="Monthly" />
        <Radio value="yearly" label="Yearly" description="Two months free." />
      </RadioGroup>
      <CheckboxGroup
        label="Modules"
        options={MODULES}
        selectAllLabel="Select all"
        value={modules}
        onValueChange={setModules}
      />
      <CheckboxGroup label="Notify me by" size="lg" defaultValue={["email"]}>
        <Checkbox value="email" label="Email" />
        <Checkbox value="sms" label="Text message" description="Standard rates apply." />
      </CheckboxGroup>
    </div>
  );
}
