"use client";

import { useId, useState } from "react";
import {
  type ComponentItem,
  filterComponents,
  groupComponents,
  groupId,
  STATUS_LABELS,
} from "../lib/component-index";
import {
  COMPONENT_GROUPS,
  type ComponentGroup,
  type ComponentStatus,
} from "../lib/component-taxonomy";

const STATUS_STYLES: Record<ComponentStatus, string> = {
  stable: "border-fd-border text-fd-muted-foreground",
  new: "border-fd-primary/40 bg-fd-primary/10 text-fd-primary",
  beta: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Every component, grouped by purpose, with a text filter and group buttons. All groups show until
 * the visitor filters, so the page is complete without any interaction.
 */
export function ComponentGrid({ items }: { items: ComponentItem[] }) {
  const [group, setGroup] = useState<ComponentGroup | undefined>(undefined);
  const [query, setQuery] = useState("");
  const inputId = useId();

  const visible = filterComponents(items, { group, query });
  const grouped = groupComponents(visible);
  const present = new Set(items.map((item) => item.group));

  return (
    <div className="not-prose flex flex-col gap-6">
      <search className="flex flex-col gap-3">
        <label htmlFor={inputId} className="text-sm font-medium">
          Filter components
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, purpose or group"
          className="w-full max-w-md rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm"
        />
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Filter by group</legend>
          {[undefined, ...COMPONENT_GROUPS.filter((g) => present.has(g))].map((option) => (
            <button
              key={option ?? "all"}
              type="button"
              aria-pressed={group === option}
              onClick={() => setGroup(option)}
              className="rounded-full border border-fd-border px-3 py-1 text-sm aria-pressed:border-fd-primary aria-pressed:bg-fd-primary aria-pressed:text-fd-primary-foreground"
            >
              {option ?? "All"}
            </button>
          ))}
        </fieldset>
      </search>

      <p role="status" className="text-sm text-fd-muted-foreground">
        {visible.length === 1 ? "1 component" : `${visible.length} components`}
      </p>

      {grouped.length === 0 ? (
        <p>No components match. Clear the filter to see them all.</p>
      ) : (
        grouped.map((entry) => (
          <section key={entry.group} aria-labelledby={`group-${groupId(entry.group)}`}>
            <h3 id={`group-${groupId(entry.group)}`} className="mb-3 text-lg font-semibold">
              {entry.group}
            </h3>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {entry.items.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    className="block h-full rounded-lg border border-fd-border bg-fd-card p-4 transition-colors hover:bg-fd-accent"
                  >
                    <h4 className="flex flex-wrap items-center gap-2 font-medium">
                      {item.title}
                      <StatusBadge status={item.status} />
                    </h4>
                    <p className="mt-1 text-sm text-fd-muted-foreground">{item.description}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
