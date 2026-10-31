// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Input } from "../input/input.js";
import { FieldArray } from "./index.js";

describe("FieldArray server-renders without browser globals", () => {
  it("renders the legend, the rows with their buttons, the empty state and the live region", () => {
    const html = expectServerSafe(
      <FieldArray
        legend="Contacts"
        name="contacts"
        items={[{ id: "a", name: "Aroha" }]}
        itemLabel={(index) => `Contact ${index + 1}`}
        onAdd={() => {}}
        onRemove={() => {}}
        onMove={() => {}}
      >
        {(item, row) => (
          <Input aria-label="Name" name={row.name("name")} defaultValue={item.name} />
        )}
      </FieldArray>,
    );
    expect(html).toContain("Contacts");
    expect(html).toContain('name="contacts.0.name"');
    expect(html).toContain('aria-label="Move Contact 1"');
    expect(html).toContain('aria-label="Remove Contact 1"');
    expect(html).toContain('role="status"');

    const empty = expectServerSafe(
      <FieldArray legend="Contacts" items={[]} empty="No contacts yet.">
        {() => null}
      </FieldArray>,
    );
    expect(empty).toContain("No contacts yet.");
  });
});
