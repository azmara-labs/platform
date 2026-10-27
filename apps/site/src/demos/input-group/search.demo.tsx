"use client";

import { Field } from "@azmr/ui/field";
import { Icon } from "@azmr/ui/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@azmr/ui/input-group";
import { Search, X } from "lucide-react";
import { useRef, useState } from "react";

const CUSTOMERS = ["Aroha Ngata", "Mere Tāwhiri", "James Wilson", "Priya Patel", "Liam O'Connor"];

export default function InputGroupSearch() {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const matches = CUSTOMERS.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Field label="Search customers">
        <InputGroup>
          <InputGroupAddon>
            <Icon icon={Search} />
          </InputGroupAddon>
          <InputGroupInput
            ref={input}
            type="search"
            value={query}
            onValueChange={setQuery}
            placeholder="Name"
          />
          {query ? (
            <InputGroupButton
              size="icon"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                // Back to the input, so the next search starts where the last one did.
                input.current?.focus();
              }}
            >
              <Icon icon={X} />
            </InputGroupButton>
          ) : null}
        </InputGroup>
      </Field>
      <p role="status" className="text-sm text-muted-foreground">
        {matches.length === 1 ? "1 customer" : `${matches.length} customers`}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {matches.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}
