import { describe, expect, it, vi } from "vitest";
import type { SecretsAdapter } from "./secrets.js";
import { createLocalEnvSecretsAdapter, createSecretsManager } from "./secrets.js";

describe("createLocalEnvSecretsAdapter", () => {
  it("returns the value of an existing env var", async () => {
    process.env.TEST_SECRET_A = "shh";
    const adapter = createLocalEnvSecretsAdapter();
    await expect(adapter.get("TEST_SECRET_A")).resolves.toBe("shh");
    delete process.env.TEST_SECRET_A;
  });

  it("returns undefined for a missing env var", async () => {
    delete process.env.TEST_SECRET_MISSING;
    const adapter = createLocalEnvSecretsAdapter();
    await expect(adapter.get("TEST_SECRET_MISSING")).resolves.toBeUndefined();
  });

  it("applies a configured prefix", async () => {
    process.env.AZMARA_SECRET_DB_PASSWORD = "hunter2";
    const adapter = createLocalEnvSecretsAdapter({ prefix: "AZMARA_SECRET_" });
    await expect(adapter.get("DB_PASSWORD")).resolves.toBe("hunter2");
    delete process.env.AZMARA_SECRET_DB_PASSWORD;
  });

  it("does not find an unprefixed var when a prefix is configured", async () => {
    process.env.DB_PASSWORD = "unprefixed";
    const adapter = createLocalEnvSecretsAdapter({ prefix: "AZMARA_SECRET_" });
    await expect(adapter.get("DB_PASSWORD")).resolves.toBeUndefined();
    delete process.env.DB_PASSWORD;
  });
});

describe("createSecretsManager — get", () => {
  it("returns the adapter's value", async () => {
    const adapter: SecretsAdapter = { get: vi.fn().mockResolvedValue("value") };
    const manager = createSecretsManager({ adapter });
    await expect(manager.get("K")).resolves.toBe("value");
  });

  it("returns undefined for a missing secret by default", async () => {
    const adapter: SecretsAdapter = { get: vi.fn().mockResolvedValue(undefined) };
    const manager = createSecretsManager({ adapter });
    await expect(manager.get("K")).resolves.toBeUndefined();
  });

  it("throws naming the key when required is true and the secret is missing", async () => {
    const adapter: SecretsAdapter = { get: vi.fn().mockResolvedValue(undefined) };
    const manager = createSecretsManager({ adapter });
    await expect(manager.get("K", { required: true })).rejects.toThrow('"K"');
  });

  it("does not throw when required is true and the secret is present", async () => {
    const adapter: SecretsAdapter = { get: vi.fn().mockResolvedValue("value") };
    const manager = createSecretsManager({ adapter });
    await expect(manager.get("K", { required: true })).resolves.toBe("value");
  });

  it("calls the adapter on every get when caching is disabled (default)", async () => {
    const get = vi.fn().mockResolvedValue("value");
    const manager = createSecretsManager({ adapter: { get } });
    await manager.get("K");
    await manager.get("K");
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("serves a cached value within the TTL without calling the adapter again", async () => {
    const get = vi.fn().mockResolvedValue("value");
    const manager = createSecretsManager({ adapter: { get }, cacheTtlMs: 10_000 });
    await manager.get("K");
    await manager.get("K");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("clearCache forces the next get to re-query the adapter", async () => {
    const get = vi.fn().mockResolvedValue("value");
    const manager = createSecretsManager({ adapter: { get }, cacheTtlMs: 10_000 });
    await manager.get("K");
    manager.clearCache();
    await manager.get("K");
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("createSecretsManager — onAccess", () => {
  it("fires with outcome 'hit' when a value is found", async () => {
    const onAccess = vi.fn();
    const manager = createSecretsManager({
      adapter: { get: vi.fn().mockResolvedValue("value") },
      onAccess,
    });
    await manager.get("K");
    expect(onAccess).toHaveBeenCalledWith({ key: "K", outcome: "hit" });
  });

  it("fires with outcome 'miss' when no value is found", async () => {
    const onAccess = vi.fn();
    const manager = createSecretsManager({
      adapter: { get: vi.fn().mockResolvedValue(undefined) },
      onAccess,
    });
    await manager.get("K");
    expect(onAccess).toHaveBeenCalledWith({ key: "K", outcome: "miss" });
  });

  it("fires with outcome 'cache' on a cached hit, and never includes the value", async () => {
    const onAccess = vi.fn();
    const manager = createSecretsManager({
      adapter: { get: vi.fn().mockResolvedValue("top-secret-value") },
      cacheTtlMs: 10_000,
      onAccess,
    });
    await manager.get("K");
    await manager.get("K");
    expect(onAccess).toHaveBeenLastCalledWith({ key: "K", outcome: "cache" });
    for (const call of onAccess.mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain("top-secret-value");
    }
  });
});
