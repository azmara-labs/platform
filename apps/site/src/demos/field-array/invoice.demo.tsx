"use client";

import { Button } from "@azmr/ui/button";
import { Input } from "@azmr/ui/input";
import { MoneyField, NumberField, numberOrNull } from "@azmr/ui/number-field";
import { Form, FormErrorSummary, FormField, FormFieldArray } from "@azmr/ui/rhf";
import { zodResolver } from "@azmr/ui/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const GST_RATE = 0.15;
const COLUMNS = "gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_6rem]";
const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

const line = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  quantity: z.number("Enter a quantity").positive("Enter a quantity above 0"),
  unitPrice: z.number("Enter a unit price").min(0, "Enter a price of $0 or more"),
});

const schema = z.object({
  lines: z.array(line).min(1, "Add at least one line").max(20, "Use 20 lines or fewer"),
});

type InvoiceInput = z.input<typeof schema>;
type InvoiceOutput = z.output<typeof schema>;
type LineInput = InvoiceInput["lines"][number];

/** A line's amount in cents, so totals add up exactly. */
const lineCents = (value: Partial<LineInput> | undefined) =>
  Math.round((value?.quantity ?? 0) * (value?.unitPrice ?? 0) * 100);

function totals(lines: Partial<LineInput>[]) {
  const subtotal = lines.reduce((sum, value) => sum + lineCents(value), 0);
  const gst = Math.round(subtotal * GST_RATE);
  return { subtotal, gst, total: subtotal + gst };
}

function LineAmount({ index, label }: { index: number; label: string }) {
  const value = useWatch<InvoiceInput, `lines.${number}`>({ name: `lines.${index}` });
  return (
    <output
      aria-label={`${label} amount`}
      className="flex h-9 items-center justify-end tabular-nums"
    >
      {nzd.format(lineCents(value) / 100)}
    </output>
  );
}

export default function FieldArrayInvoice() {
  const [saved, setSaved] = useState<string>();
  const form = useForm<InvoiceInput, unknown, InvoiceOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      lines: [
        { description: "Callout fee", quantity: 1, unitPrice: 95 },
        { description: "Labour (hours)", quantity: 2.5, unitPrice: 88 },
      ],
    },
    shouldFocusError: false,
  });

  return (
    <Form
      form={form}
      onSubmit={(values) =>
        setSaved(
          `Saved ${values.lines.length} lines, ${nzd.format(totals(values.lines).total / 100)} incl. GST.`,
        )
      }
      className="flex w-full max-w-3xl flex-col gap-6"
    >
      <FormErrorSummary />
      <FormFieldArray<InvoiceInput, "lines">
        name="lines"
        legend="Line items"
        description="Prices exclude GST."
        itemLabel={(index) => `Line ${index + 1}`}
        max={20}
        newItem={() => ({ description: "", quantity: 1, unitPrice: 0 })}
        messages={{ add: "Add line" }}
        className="[&_[data-slot=field-array-row]]:items-start"
        header={
          <div className={`hidden sm:grid ${COLUMNS}`}>
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span className="text-end">Amount</span>
          </div>
        }
        footer={(lines) => {
          const { subtotal, gst, total } = totals(lines);
          return (
            <dl className="ms-auto grid w-full max-w-64 grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{nzd.format(subtotal / 100)}</dd>
              <dt className="text-muted-foreground">GST (15%)</dt>
              <dd>{nzd.format(gst / 100)}</dd>
              <dt className="font-medium">Total</dt>
              <dd className="font-medium">{nzd.format(total / 100)}</dd>
            </dl>
          );
        }}
      >
        {(_, row) => {
          // Wide screens show the column headings instead of a label on every field; each field
          // keeps its full name ("Line 2 Qty") for screen readers.
          const label = (text: string) => (
            <>
              <span className="sr-only">{row.label} </span>
              <span className="sm:sr-only">{text}</span>
            </>
          );
          return (
            <div className={`grid ${COLUMNS}`}>
              <FormField name={row.name("description")} label={label("Description")}>
                <Input autoComplete="off" />
              </FormField>
              <FormField
                name={row.name("quantity")}
                label={label("Qty")}
                rules={{ setValueAs: numberOrNull }}
              >
                <NumberField min={0} decimalScale={2} />
              </FormField>
              <FormField
                name={row.name("unitPrice")}
                label={label("Unit price")}
                rules={{ setValueAs: numberOrNull }}
              >
                <MoneyField min={0} />
              </FormField>
              <div className="flex flex-col gap-1.5">
                <span aria-hidden="true" className="text-sm font-medium leading-none sm:hidden">
                  Amount
                </span>
                <LineAmount index={row.index} label={row.label} />
              </div>
            </div>
          );
        }}
      </FormFieldArray>
      <div className="flex items-center gap-3">
        <Button type="submit">Save invoice</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {saved ?? ""}
        </p>
      </div>
    </Form>
  );
}
