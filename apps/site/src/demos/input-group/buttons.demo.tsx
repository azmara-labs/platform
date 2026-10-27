"use client";

import { Field } from "@azmr/ui/field";
import { Icon } from "@azmr/ui/icons";
import { InputGroup, InputGroupButton, InputGroupInput } from "@azmr/ui/input-group";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const KEY = "pk_live_7f3a9c21e4b8";

export default function InputGroupButtons() {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string>();

  async function copy() {
    await navigator.clipboard?.writeText(KEY).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Publishable key" description="Safe to use in the browser.">
        <InputGroup>
          <InputGroupInput readOnly value={KEY} className="font-mono" />
          <InputGroupButton size="icon" aria-label={copied ? "Copied" : "Copy key"} onClick={copy}>
            <Icon icon={copied ? Check : Copy} />
          </InputGroupButton>
        </InputGroup>
      </Field>
      <Field label="Discount code">
        <InputGroup>
          <InputGroupInput value={code} onValueChange={setCode} autoComplete="off" />
          <InputGroupButton
            variant="secondary"
            disabled={code.trim() === ""}
            onClick={() => setApplied(code.trim().toUpperCase())}
          >
            Apply
          </InputGroupButton>
        </InputGroup>
      </Field>
      <p role="status" className="text-sm text-muted-foreground">
        {applied ? `${applied} applied.` : ""}
      </p>
    </div>
  );
}
