import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import Link from "next/link";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-8 pt-20 pb-16 text-center">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        The reactive, local-first stack that treats security as architecture, not an afterthought.
      </h1>
      <p className="max-w-2xl text-lg text-fd-muted-foreground">
        A TypeScript monorepo, published as <code>@azmr/*</code> on npm. The reactive core —
        signals, queries, UI — is an independent branch you can use on its own. Every persistence,
        policy, and AI package builds on <code>@azmr/security</code> instead of bolting compliance
        on afterward.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/docs"
          className="rounded-md bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:opacity-90"
        >
          Read the docs
        </Link>
        <Link
          href="/docs/guide/introduction"
          className="rounded-md border border-fd-border px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
        >
          Get started
        </Link>
      </div>
      <div className="w-full max-w-md text-left">
        <DynamicCodeBlock
          lang="bash"
          code="pnpm add @azmr/core"
          options={{ themes: { light: "github-light", dark: "github-dark" } }}
        />
      </div>
    </section>
  );
}
