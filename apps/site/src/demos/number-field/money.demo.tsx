"use client";

import { Field } from "@azmr/ui/field";
import { InputGroup, InputGroupAddon } from "@azmr/ui/input-group";
import { MoneyField, NumberField } from "@azmr/ui/number-field";
import { useState } from "react";

const GST = 0.15;
const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

export default function NumberFieldMoney() {
  const [rate, setRate] = useState<number | null>(95);
  const [hours, setHours] = useState<number | null>(7.5);
  const subtotal = (rate ?? 0) * (hours ?? 0);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Hourly rate" description="Excluding GST.">
        <MoneyField name="rate" min={0} value={rate} onValueChange={setRate} />
      </Field>
      <Field label="Hours">
        <InputGroup>
          <NumberField
            name="hours"
            min={0}
            step={0.25}
            decimalScale={2}
            value={hours}
            onValueChange={setHours}
          />
          <InputGroupAddon>hours</InputGroupAddon>
        </InputGroup>
      </Field>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{nzd.format(subtotal)}</dd>
        <dt className="text-muted-foreground">GST (15%)</dt>
        <dd>{nzd.format(subtotal * GST)}</dd>
        <dt className="font-medium">Total</dt>
        <dd className="font-medium">{nzd.format(subtotal * (1 + GST))}</dd>
      </dl>
    </div>
  );
}
