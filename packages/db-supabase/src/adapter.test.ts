import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseAdapter } from "./adapter.js";

interface FakeResponse {
  data?: unknown;
  error?: PostgrestError | null;
  count?: number | null;
}

interface RecordedCall {
  method: string;
  args: unknown[];
}

/**
 * Minimal hand-rolled fake SupabaseClient. Every chain method (insert,
 * select, delete, eq, neq, ...) records its call and returns the same
 * builder object; the builder is a thenable so `await builder` resolves to
 * the preset `response`, matching supabase-js's own "the query builder IS
 * the promise" shape.
 */
function createFakeClient(response: FakeResponse = { data: [], error: null }) {
  const calls: RecordedCall[] = [];

  const chainMethods = [
    "insert",
    "select",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
  ] as const;

  function makeBuilder() {
    // biome-ignore lint/suspicious/noExplicitAny: fake test double, matching supabase-js's chainable-and-thenable shape
    const builder: any = {};
    for (const method of chainMethods) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      };
    }
    // biome-ignore lint/suspicious/noThenProperty: deliberately mimicking supabase-js's real thenable query-builder shape for this test double
    builder.then = (
      onFulfilled: (v: FakeResponse) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(response).then(onFulfilled, onRejected);
    return builder;
  }

  const from = vi.fn((table: string) => {
    calls.push({ method: "from", args: [table] });
    return makeBuilder();
  });

  return { client: { from } as unknown as SupabaseClient, from, calls };
}

function fakeError(overrides: Partial<PostgrestError> = {}): PostgrestError {
  return {
    name: "PostgrestError",
    message: "boom",
    details: "some details",
    hint: "some hint",
    code: "23505",
    ...overrides,
  } as PostgrestError;
}

describe("SupabaseAdapter — CRUD happy path", () => {
  it("insert calls from(table).insert(row) and resolves when error is null", async () => {
    const { client, from } = createFakeClient({ data: null, error: null });
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.insert("products", { name: "Widget A" })).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("products");
  });

  it("insertMany calls insert once with the full array", async () => {
    const { client, calls } = createFakeClient({ data: null, error: null });
    const adapter = new SupabaseAdapter(client);
    const rows = [{ name: "A" }, { name: "B" }];
    await adapter.insertMany("products", rows);
    const insertCalls = calls.filter((c) => c.method === "insert");
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]?.args[0]).toBe(rows);
  });

  it("insertMany is a no-op for an empty array", async () => {
    const { client, from } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await adapter.insertMany("products", []);
    expect(from).not.toHaveBeenCalled();
  });

  it("getAll returns data from select('*')", async () => {
    const rows = [{ name: "A" }, { name: "B" }];
    const { client, calls } = createFakeClient({ data: rows, error: null });
    const adapter = new SupabaseAdapter(client);
    const result = await adapter.getAll("products");
    expect(result).toBe(rows);
    expect(calls.some((c) => c.method === "select" && c.args[0] === "*")).toBe(true);
  });

  it("getAll returns an empty array when data is null", async () => {
    const { client } = createFakeClient({ data: null, error: null });
    const adapter = new SupabaseAdapter(client);
    expect(await adapter.getAll("products")).toEqual([]);
  });

  it("findWhere with a single eq filter chains select('*').eq(col, val)", async () => {
    const rows = [{ name: "A" }];
    const { client, calls } = createFakeClient({ data: rows, error: null });
    const adapter = new SupabaseAdapter(client);
    const result = await adapter.findWhere("products", [
      { column: "name", operator: "eq", value: "A" },
    ]);
    expect(result).toBe(rows);
    expect(calls).toContainEqual({ method: "select", args: ["*"] });
    expect(calls).toContainEqual({ method: "eq", args: ["name", "A"] });
  });

  it("findWhere with multiple conditions chains all of them", async () => {
    const { client, calls } = createFakeClient({ data: [], error: null });
    const adapter = new SupabaseAdapter(client);
    await adapter.findWhere("products", [
      { column: "inStock", operator: "is", value: true },
      { column: "price", operator: "gt", value: 5 },
    ]);
    expect(calls).toContainEqual({ method: "is", args: ["inStock", true] });
    expect(calls).toContainEqual({ method: "gt", args: ["price", 5] });
  });

  it("truncateTable calls delete({count:'exact'}) with no filter chain", async () => {
    const { client, calls } = createFakeClient({ data: null, error: null, count: 3 });
    const adapter = new SupabaseAdapter(client);
    await adapter.truncateTable("products");
    expect(calls).toContainEqual({ method: "delete", args: [{ count: "exact" }] });
    expect(calls.some((c) => ["eq", "neq", "gt", "in"].includes(c.method))).toBe(false);
  });

  it("deleteWhere calls delete({count:'exact'}) then the filter chain, and returns count", async () => {
    const { client, calls } = createFakeClient({ data: null, error: null, count: 2 });
    const adapter = new SupabaseAdapter(client);
    const changes = await adapter.deleteWhere("products", [
      { column: "inStock", operator: "is", value: false },
    ]);
    expect(changes).toBe(2);
    expect(calls).toContainEqual({ method: "delete", args: [{ count: "exact" }] });
    expect(calls).toContainEqual({ method: "is", args: ["inStock", false] });
  });

  it("close is a no-op that resolves", async () => {
    const { client } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.close()).resolves.toBeUndefined();
  });
});

describe("SupabaseAdapter — identifier safety", () => {
  it("throws before calling the client if the table name is unsafe", async () => {
    const { client, from } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await expect(
      adapter.insert("products; drop table products; --", { name: "A" }),
    ).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it("throws before calling the client if a row key is unsafe", async () => {
    const { client, from } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.insert("products", { "bad; key": "A" })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it("throws if a findWhere filter column is unsafe", async () => {
    const { client, from } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await expect(
      adapter.findWhere("products", [{ column: "bad; col", operator: "eq", value: "x" }]),
    ).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it("throws on an empty table name", async () => {
    const { client, from } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.getAll("")).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});

describe("SupabaseAdapter — error surfacing", () => {
  it("insert rejects with a DbAdapterError carrying code/details/hint/cause", async () => {
    const err = fakeError({ code: "23505", message: "duplicate key" });
    const { client } = createFakeClient({ data: null, error: err });
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.insert("products", { name: "A" })).rejects.toMatchObject({
      name: "DbAdapterError",
      code: "23505",
      details: err.details,
      hint: err.hint,
      cause: err,
    });
  });

  it("getAll rejects with a DbAdapterError on error", async () => {
    const err = fakeError({ code: "42P01", message: "relation does not exist" });
    const { client } = createFakeClient({ data: null, error: err });
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.getAll("products")).rejects.toMatchObject({
      name: "DbAdapterError",
      code: "42P01",
      cause: err,
    });
  });

  it("findWhere rejects with a DbAdapterError on error", async () => {
    const err = fakeError();
    const { client } = createFakeClient({ data: null, error: err });
    const adapter = new SupabaseAdapter(client);
    await expect(
      adapter.findWhere("products", [{ column: "name", operator: "eq", value: "A" }]),
    ).rejects.toMatchObject({ name: "DbAdapterError", cause: err });
  });

  it("deleteWhere rejects with a DbAdapterError on error", async () => {
    const err = fakeError();
    const { client } = createFakeClient({ data: null, error: err });
    const adapter = new SupabaseAdapter(client);
    await expect(
      adapter.deleteWhere("products", [{ column: "name", operator: "eq", value: "A" }]),
    ).rejects.toMatchObject({ name: "DbAdapterError", cause: err });
  });
});

describe("SupabaseAdapter — createTable", () => {
  it("always rejects with a DbAdapterError and never calls the client", async () => {
    const { client, from } = createFakeClient();
    const adapter = new SupabaseAdapter(client);
    await expect(adapter.createTable("products", { name: "string" })).rejects.toMatchObject({
      name: "DbAdapterError",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("SupabaseAdapter — filter translation", () => {
  const operatorCases: Array<{
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in";
    value: unknown;
  }> = [
    { operator: "eq", value: "A" },
    { operator: "neq", value: "A" },
    { operator: "gt", value: 5 },
    { operator: "gte", value: 5 },
    { operator: "lt", value: 5 },
    { operator: "lte", value: 5 },
    { operator: "like", value: "%A%" },
    { operator: "ilike", value: "%a%" },
    { operator: "is", value: null },
    { operator: "in", value: ["A", "B"] },
  ];

  it.each(operatorCases)(
    "maps operator '$operator' to the matching builder call",
    async ({ operator, value }) => {
      const { client, calls } = createFakeClient({ data: [], error: null });
      const adapter = new SupabaseAdapter(client);
      await adapter.findWhere("products", [{ column: "col", operator, value }]);
      expect(calls).toContainEqual({ method: operator, args: ["col", value] });
    },
  );

  it("an empty 'in' array still calls .in(col, [])", async () => {
    const { client, calls } = createFakeClient({ data: [], error: null });
    const adapter = new SupabaseAdapter(client);
    await adapter.findWhere("products", [{ column: "name", operator: "in", value: [] }]);
    expect(calls).toContainEqual({ method: "in", args: ["name", []] });
  });
});
