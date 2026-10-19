import { cn } from "@azmr/ui/lib";
import { highlight } from "fumadocs-core/highlight";

/**
 * A highlighted code block rendered entirely on the server, styled like Fumadocs' code block. The
 * Fumadocs one is a client component (for its copy button), which puts its code on every page that
 * uses it; the landing page shows two short snippets and does not need that.
 */
export async function StaticCodeBlock({ code, lang }: { code: string; lang: string }) {
  return highlight(code, {
    lang,
    defaultColor: false,
    components: {
      pre: ({ className, children, ...props }) => (
        <figure className="shiki not-prose relative overflow-hidden rounded-xl border bg-fd-card text-sm shadow-sm">
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard */}
          <div tabIndex={0} className="fd-scroll-container overflow-auto py-3.5 text-[0.8125rem]">
            <pre {...props} className={cn("w-max min-w-full *:flex *:flex-col", className)}>
              {children}
            </pre>
          </div>
        </figure>
      ),
    },
  });
}
