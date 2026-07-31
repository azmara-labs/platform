import { Signal } from "@azmr/core";
import { describe, expect, it } from "vitest";
import { query } from "./query.js";

const customers = [
  { name: "Aroha", balance: 150, active: true },
  { name: "Tane", balance: 0, active: false },
  { name: "Mere", balance: 320, active: true },
  { name: "Hemi", balance: -10, active: false },
];

describe("query — where", () => {
  it("filters by predicate", () => {
    const result = query(customers)
      .where((c) => c.balance > 0)
      .select();
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toContain("Aroha");
    expect(result.map((c) => c.name)).toContain("Mere");
  });

  it("chains multiple where clauses", () => {
    const result = query(customers)
      .where((c) => c.balance > 0)
      .where((c) => c.active)
      .select();
    expect(result).toHaveLength(2);
  });

  it("returns empty array when nothing matches", () => {
    const result = query(customers)
      .where((c) => c.balance > 1000)
      .select();
    expect(result).toHaveLength(0);
  });

  it("rejects string predicates", () => {
    expect(() => query(customers).where("balance > 0" as never)).toThrow(TypeError);
  });
});

describe("query — orderBy", () => {
  it("sorts ascending by balance", () => {
    const result = query(customers)
      .orderBy((a, b) => a.balance - b.balance)
      .select();
    expect(result[0]?.name).toBe("Hemi");
    expect(result[result.length - 1]?.name).toBe("Mere");
  });

  it("sorts descending by balance", () => {
    const result = query(customers)
      .orderBy((a, b) => b.balance - a.balance)
      .select();
    expect(result[0]?.name).toBe("Mere");
  });

  it("rejects non-function comparator", () => {
    expect(() => query(customers).orderBy("balance" as never)).toThrow(TypeError);
  });
});

describe("query — limit / offset", () => {
  it("limits results", () => {
    const result = query(customers).limit(2).select();
    expect(result).toHaveLength(2);
  });

  it("offsets results", () => {
    const all = query(customers).select();
    const offset = query(customers).offset(2).select();
    expect(offset).toEqual(all.slice(2));
  });

  it("combines limit and offset", () => {
    const result = query(customers).offset(1).limit(2).select();
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe(customers[1]?.name);
  });

  it("throws on negative limit", () => {
    expect(() => query(customers).limit(-1)).toThrow(RangeError);
  });

  it("throws on negative offset", () => {
    expect(() => query(customers).offset(-1)).toThrow(RangeError);
  });
});

describe("query — count / first", () => {
  it("counts matching rows", () => {
    expect(
      query(customers)
        .where((c) => c.balance > 0)
        .count(),
    ).toBe(2);
  });

  it("returns first match", () => {
    const result = query(customers)
      .where((c) => c.balance > 0)
      .first();
    expect(result).toBeDefined();
    expect(result?.balance).toBeGreaterThan(0);
  });

  it("returns undefined when no match", () => {
    expect(
      query(customers)
        .where((c) => c.balance > 9999)
        .first(),
    ).toBeUndefined();
  });

  it("does not permanently limit the builder — select() after first() still returns the full result set", () => {
    const q = query(customers);
    q.first();
    expect(q.select()).toHaveLength(customers.length);
  });

  it("first() still respects an explicit .limit() set before it, without changing what it means afterwards", () => {
    const q = query(customers).limit(2);
    expect(q.first()).toBeDefined();
    expect(q.select()).toHaveLength(2); // the explicit limit(2), not limit(1) from first()
  });
});

describe("query — does not mutate source", () => {
  it("original array is unchanged after sort", () => {
    const original = [...customers];
    query(customers)
      .orderBy((a, b) => a.balance - b.balance)
      .select();
    expect(customers).toEqual(original);
  });
});

describe("query — Signal source", () => {
  it("reads from a Signal", () => {
    const sig = new Signal(customers);
    const result = query(sig)
      .where((c) => c.active)
      .select();
    expect(result).toHaveLength(2);
  });

  it("reflects Signal updates", () => {
    const sig = new Signal(customers);
    sig.set([{ name: "New", balance: 500, active: true }]);
    const result = query(sig)
      .where((c) => c.active)
      .select();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("New");
  });
});
