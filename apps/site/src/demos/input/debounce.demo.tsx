"use client";

import { Field } from "@azmr/ui/field";
import { Input } from "@azmr/ui/input";
import { useState } from "react";

const SUBURBS = [
  "Hamilton East",
  "Hamilton Lake",
  "Hillcrest",
  "Frankton",
  "Rototuna",
  "Chartwell",
];

export default function InputDebounce() {
  const [query, setQuery] = useState("");
  const [searches, setSearches] = useState(0);
  const [saved, setSaved] = useState<string>();
  const matches = SUBURBS.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Suburb" description="Searches 300 ms after you stop typing.">
        <Input
          type="search"
          debounceMs={300}
          onValueChange={(value) => {
            setQuery(value);
            setSearches((count) => count + 1);
          }}
          className="data-[pending]:bg-muted/40"
        />
      </Field>
      <p className="text-sm text-muted-foreground">
        {searches === 1 ? "1 search" : `${searches} searches`}: {matches.join(", ") || "no matches"}
      </p>
      <Field label="Business name" description="Saved when you leave the field or press Enter.">
        <Input defaultValue="Northline Electrical" onCommit={setSaved} />
      </Field>
      <p role="status" className="text-sm text-muted-foreground">
        {saved ? `Saved "${saved}".` : ""}
      </p>
    </div>
  );
}
