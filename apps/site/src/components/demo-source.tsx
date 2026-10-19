"use client";

import { type ReactNode, useId, useState } from "react";

type State = "excerpt" | "loading" | "full" | "error";

const control =
  "rounded-md border border-fd-border px-3 py-1.5 font-medium transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring";

/**
 * A long demo's source: the excerpt rendered on the server (`children`), and the full file on
 * request. The full file is not in the page; it is fetched from public/demos (written at build time
 * by scripts/build-demo-sources.mts) when someone asks to see or copy it. "Open as text" works
 * without JavaScript.
 */
export function DemoSource({
  name,
  totalLines,
  children,
}: {
  name: string;
  totalLines: number;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>("excerpt");
  const [html, setHtml] = useState<string>();
  const [message, setMessage] = useState("");
  const regionId = useId();
  const base = `/demos/${name}`;

  async function toggle() {
    if (state === "loading") return;
    if (state === "full") {
      setState("excerpt");
      setMessage("Showing the excerpt.");
      return;
    }
    if (html) {
      setState("full");
      setMessage(`Showing all ${totalLines} lines.`);
      return;
    }
    setState("loading");
    setMessage("Loading the full source…");
    try {
      const response = await fetch(`${base}.html`);
      if (!response.ok) throw new Error(String(response.status));
      setHtml(await response.text());
      setState("full");
      setMessage(`Showing all ${totalLines} lines.`);
    } catch {
      setState("error");
      setMessage("Could not load the full source. Open it as text instead.");
    }
  }

  async function copy() {
    try {
      const response = await fetch(`${base}.txt`);
      if (!response.ok) throw new Error(String(response.status));
      await navigator.clipboard.writeText(await response.text());
      setMessage("Copied the full source.");
    } catch {
      setMessage("Could not copy. Open the source as text and copy it from there.");
    }
  }

  return (
    <div className="my-4">
      <div id={regionId}>
        {state === "full" && html ? (
          <figure className="shiki not-prose relative my-0 overflow-hidden rounded-xl border bg-fd-card text-sm shadow-sm">
            <section
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard
              tabIndex={0}
              aria-label={`Full source of the ${name} demo`}
              className="fd-scroll-container max-h-[600px] overflow-auto py-3.5 text-[0.8125rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-ring [&_code]:flex [&_code]:flex-col [&_pre]:w-max [&_pre]:min-w-full"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time output of our own highlighter from our own demo files, served from this site
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </figure>
        ) : (
          children
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          className={control}
          aria-expanded={state === "full"}
          aria-controls={regionId}
          aria-busy={state === "loading"}
          onClick={toggle}
        >
          {state === "full" ? "Show the excerpt" : `Show full source (${totalLines} lines)`}
        </button>
        <button type="button" className={control} onClick={copy}>
          Copy full source
        </button>
        <a href={`${base}.txt`} className="text-fd-muted-foreground underline underline-offset-4">
          Open as text
        </a>
        <span role="status" className="text-fd-muted-foreground">
          {message}
        </span>
      </div>
    </div>
  );
}
