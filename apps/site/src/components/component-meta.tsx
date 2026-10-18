import Link from "next/link";
import { groupId } from "../lib/component-index";
import type { ComponentGroup, ComponentStatus } from "../lib/component-taxonomy";
import { StatusBadge } from "./status-badge";

/**
 * The line under a component page's title: its maturity, the group it belongs to (a link to that
 * group on the component index), and the @azmr/ui version that first shipped it (a link to the
 * package's changelog). All three come from the page's frontmatter.
 */
export function ComponentMeta({
  group,
  status,
  since,
}: {
  group: ComponentGroup;
  status: ComponentStatus;
  since: string;
}) {
  return (
    <ul
      aria-label="About this component"
      className="not-prose mb-6 flex list-none flex-wrap items-center gap-x-4 gap-y-2 p-0 text-sm text-fd-muted-foreground"
    >
      <li>
        <StatusBadge status={status} />
      </li>
      <li>
        Group:{" "}
        <Link
          href={`/docs/components#group-${groupId(group)}`}
          className="underline underline-offset-2"
        >
          {group}
        </Link>
      </li>
      <li>
        Added in{" "}
        <Link href="/docs/changelog/ui" className="underline underline-offset-2">
          @azmr/ui {since}
        </Link>
      </li>
    </ul>
  );
}
