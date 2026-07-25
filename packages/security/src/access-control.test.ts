import { describe, expect, it, vi } from "vitest";
import type { AccessControlSubject, Policy } from "./access-control.js";
import { createAccessControl } from "./access-control.js";

const alice: AccessControlSubject = { id: "alice", roles: ["editor"] };

describe("createAccessControl", () => {
  it("throws on empty resource or action", async () => {
    const ac = createAccessControl();
    await expect(ac.can(alice, { resource: "", action: "read" })).rejects.toThrow(
      "resource and action are required",
    );
    await expect(ac.can(alice, { resource: "invoice", action: "" })).rejects.toThrow(
      "resource and action are required",
    );
  });

  it("grants access on an exact resource+action match", async () => {
    const policy: Policy = { editor: [{ resource: "invoice", action: "read" }] };
    const ac = createAccessControl({ policy });
    const result = await ac.can(alice, { resource: "invoice", action: "read" });
    expect(result.can).toBe(true);
  });

  it("denies access with a reason naming resource and action when nothing matches", async () => {
    const ac = createAccessControl({ policy: { editor: [] } });
    const result = await ac.can(alice, { resource: "invoice", action: "delete" });
    expect(result.can).toBe(false);
    expect(result.reason).toContain("invoice");
    expect(result.reason).toContain("delete");
  });

  it("grants via a wildcard resource rule", async () => {
    const policy: Policy = { editor: [{ resource: "*", action: "read" }] };
    const ac = createAccessControl({ policy });
    const result = await ac.can(alice, { resource: "invoice", action: "read" });
    expect(result.can).toBe(true);
  });

  it("grants via a wildcard action rule", async () => {
    const policy: Policy = { editor: [{ resource: "invoice", action: "*" }] };
    const ac = createAccessControl({ policy });
    const result = await ac.can(alice, { resource: "invoice", action: "delete" });
    expect(result.can).toBe(true);
  });

  it("grants via a wildcard role, including for an anonymous (null) subject", async () => {
    const policy: Policy = { "*": [{ resource: "docs", action: "read" }] };
    const ac = createAccessControl({ policy });
    const result = await ac.can(null, { resource: "docs", action: "read" });
    expect(result.can).toBe(true);
  });

  it("grants when a rule's condition returns true", async () => {
    const policy: Policy = {
      editor: [
        {
          resource: "invoice",
          action: "delete",
          condition: (subject, params) => subject?.id === params?.ownerId,
        },
      ],
    };
    const ac = createAccessControl({ policy });
    const result = await ac.can(alice, {
      resource: "invoice",
      action: "delete",
      params: { ownerId: "alice" },
    });
    expect(result.can).toBe(true);
  });

  it("denies when a rule's condition returns false", async () => {
    const policy: Policy = {
      editor: [
        {
          resource: "invoice",
          action: "delete",
          condition: (subject, params) => subject?.id === params?.ownerId,
        },
      ],
    };
    const ac = createAccessControl({ policy });
    const result = await ac.can(alice, {
      resource: "invoice",
      action: "delete",
      params: { ownerId: "bob" },
    });
    expect(result.can).toBe(false);
  });

  it("grants if any of a multi-role subject's roles match", async () => {
    const policy: Policy = { admin: [{ resource: "invoice", action: "delete" }] };
    const multiRole: AccessControlSubject = { id: "bob", roles: ["editor", "admin"] };
    const ac = createAccessControl({ policy });
    const result = await ac.can(multiRole, { resource: "invoice", action: "delete" });
    expect(result.can).toBe(true);
  });

  it("consults resolve only when the static policy does not already grant", async () => {
    const resolve = vi.fn().mockResolvedValue(true);
    const policy: Policy = { editor: [{ resource: "invoice", action: "read" }] };
    const ac = createAccessControl({ policy, resolve });

    const granted = await ac.can(alice, { resource: "invoice", action: "read" });
    expect(granted.can).toBe(true);
    expect(resolve).not.toHaveBeenCalled();

    const fallenThrough = await ac.can(alice, { resource: "invoice", action: "delete" });
    expect(fallenThrough.can).toBe(true);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("normalizes a boolean return from resolve into an AccessCheckResult", async () => {
    const ac = createAccessControl({ resolve: async () => false });
    const result = await ac.can(alice, { resource: "invoice", action: "read" });
    expect(result.can).toBe(false);
  });

  it("flips the no-match outcome when defaultEffect is 'allow'", async () => {
    const ac = createAccessControl({ defaultEffect: "allow" });
    const result = await ac.can(alice, { resource: "invoice", action: "read" });
    expect(result.can).toBe(true);
  });

  it("fires onDecision with source 'policy' for a static grant", async () => {
    const onDecision = vi.fn();
    const policy: Policy = { editor: [{ resource: "invoice", action: "read" }] };
    const ac = createAccessControl({ policy, onDecision });
    await ac.can(alice, { resource: "invoice", action: "read" });
    expect(onDecision).toHaveBeenCalledWith(
      expect.objectContaining({ source: "policy", result: { can: true } }),
    );
  });

  it("fires onDecision with source 'default' for a deny with no matching rule or resolver", async () => {
    const onDecision = vi.fn();
    const ac = createAccessControl({ onDecision });
    await ac.can(alice, { resource: "invoice", action: "read" });
    expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({ source: "default" }));
  });

  it("fires onDecision with source 'resolve' when the resolver decides", async () => {
    const onDecision = vi.fn();
    const ac = createAccessControl({ resolve: async () => true, onDecision });
    await ac.can(alice, { resource: "invoice", action: "read" });
    expect(onDecision).toHaveBeenCalledWith(
      expect.objectContaining({ source: "resolve", result: { can: true } }),
    );
  });

  it("treats a throwing condition as a deny, not an unhandled error", async () => {
    const policy: Policy = {
      editor: [
        {
          resource: "invoice",
          action: "delete",
          condition: () => {
            throw new Error("boom");
          },
        },
      ],
    };
    const ac = createAccessControl({ policy });
    const result = await ac.can(alice, { resource: "invoice", action: "delete" });
    expect(result.can).toBe(false);
  });

  it("treats a rejecting resolve as a deny, not an unhandled rejection", async () => {
    const ac = createAccessControl({ resolve: async () => Promise.reject(new Error("boom")) });
    const result = await ac.can(alice, { resource: "invoice", action: "read" });
    expect(result.can).toBe(false);
  });

  it("sanitises newline-containing resource/action in the denial reason", async () => {
    const ac = createAccessControl();
    const result = await ac.can(alice, { resource: "invoice\ninjected", action: "read" });
    expect(result.reason).not.toContain("\n");
  });
});
