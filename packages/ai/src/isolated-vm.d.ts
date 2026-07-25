/**
 * Ambient fallback types for isolated-vm.
 *
 * isolated-vm is an optionalDependency (native module, no prebuilt binary
 * for every platform/Node combination - see sandbox-runner.ts). When its
 * native build fails, pnpm skips installing it entirely, and with it goes
 * its real type declarations. Without this file, that breaks `tsc --noEmit`
 * on sandbox.ts in any environment where the build failed - not just local
 * Windows dev, but plain ubuntu-latest CI runners too.
 *
 * TypeScript only falls back to this ambient declaration when it can't
 * resolve the real module. When isolated-vm is genuinely installed, its own
 * (more complete) types are used instead and this file is ignored.
 *
 * Covers only the subset of the API sandbox.ts actually uses.
 */
declare module "isolated-vm" {
  interface IsolateOptions {
    memoryLimit?: number;
  }

  interface TransferOptions {
    copy?: boolean;
    externalCopy?: boolean;
    reference?: boolean;
    promise?: boolean;
  }

  interface Reference {
    set(key: string, value: unknown, options?: TransferOptions): Promise<boolean>;
    derefInto(): unknown;
  }

  interface Context {
    global: Reference;
  }

  interface RunOptions extends TransferOptions {
    timeout?: number;
  }

  interface CallbackOptions {
    sync?: boolean;
    async?: boolean;
    ignored?: boolean;
  }

  class Callback {
    constructor(fn: (...args: unknown[]) => unknown, options?: CallbackOptions);
  }

  class Script {
    run(context: Context, options?: RunOptions): Promise<unknown>;
  }

  class Isolate {
    constructor(options?: IsolateOptions);
    createContext(): Promise<Context>;
    compileScript(code: string): Promise<Script>;
    dispose(): void;
  }

  const ivm: { Isolate: typeof Isolate; Callback: typeof Callback };
  export default ivm;
  export { Isolate, Callback };
}
