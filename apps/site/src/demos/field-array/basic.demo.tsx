"use client";

import { Field } from "@azmr/ui/field";
import { FieldArray } from "@azmr/ui/field-array";
import { Input } from "@azmr/ui/input";
import { useState } from "react";

type Contact = { id: string; name: string; email: string };

let nextId = 3;
const newContact = (): Contact => ({ id: `contact-${nextId++}`, name: "", email: "" });

export default function FieldArrayBasic() {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: "contact-1", name: "Aroha Ngata", email: "aroha@northline.co.nz" },
    { id: "contact-2", name: "Tama Wiremu", email: "accounts@northline.co.nz" },
  ]);
  const update = (index: number, change: Partial<Contact>) =>
    setContacts(contacts.map((contact, i) => (i === index ? { ...contact, ...change } : contact)));

  return (
    <FieldArray
      legend="Contacts"
      description="Up to five people who get invoices and statements."
      className="w-full max-w-xl"
      items={contacts}
      max={5}
      itemLabel={(index) => `Contact ${index + 1}`}
      empty="No contacts yet. Invoices go to the account email."
      messages={{ add: "Add contact" }}
      onAdd={() => setContacts([...contacts, newContact()])}
      onRemove={(index) => setContacts(contacts.filter((_, i) => i !== index))}
      onMove={(from, to) => {
        const next = [...contacts];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        setContacts(next);
      }}
    >
      {(contact, row) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Name, contact ${row.index + 1}`}>
            <Input
              value={contact.name}
              autoComplete="off"
              onChange={(event) => update(row.index, { name: event.target.value })}
            />
          </Field>
          <Field label={`Email, contact ${row.index + 1}`}>
            <Input
              type="email"
              value={contact.email}
              autoComplete="off"
              onChange={(event) => update(row.index, { email: event.target.value })}
            />
          </Field>
        </div>
      )}
    </FieldArray>
  );
}
