export interface SandboxResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * A capability handler. Runs on the host (real Node process) — never inside
 * the isolate. `args` is UNTRUSTED: it crosses the isolate boundary from
 * sandboxed code, so it is typed `unknown` and MUST be validated at runtime
 * by the handler (see capabilities.ts for the pattern). The return value
 * must be JSON-safe (JsonValue) — functions, class instances, Buffers,
 * Dates, and Maps/Sets do not survive the boundary.
 *
 * May be sync or async — but against the REAL isolated-vm engine (sandbox.ts),
 * only synchronous handlers are currently supported: a handler that returns
 * a Promise throws a clear error there rather than silently misbehaving.
 * True non-blocking async capabilities need a worker_threads + Atomics.wait
 * bridge, tracked separately (see ATLAS decision D018), not implemented yet.
 * The node:vm dev/CI fallback (sandbox-fallback.ts) has no such limitation —
 * it runs in the same process/heap, so async handlers work there today.
 */
export type SandboxCapability = (args: unknown) => JsonValue | Promise<JsonValue>;

export interface SandboxRunOptions {
  /**
   * Map of capability name (the identifier it will appear as inside the
   * sandbox's global scope) -> handler. Omit or pass {} for the default,
   * zero-capability sandbox — identical to today's behavior.
   *
   * Inside sandboxed code, call a capability as `await <name>(args)`.
   */
  capabilities?: Record<string, SandboxCapability>;
}
