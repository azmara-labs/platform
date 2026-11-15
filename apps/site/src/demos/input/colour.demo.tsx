"use client";

import { Field } from "@azmr/ui/field";
import { ColourInput } from "@azmr/ui/input";
import { useState } from "react";

export default function InputColour() {
  const [colour, setColour] = useState("#1f7a5c");
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Brand colour" description="Type a hex colour, or tap the swatch to choose one.">
        <ColourInput value={colour} onValueChange={setColour} />
      </Field>
      <p className="text-sm text-muted-foreground">
        Current value: <code>{colour || "none"}</code>
      </p>
    </div>
  );
}
