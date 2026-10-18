import { COMPONENT_GROUPS, type ComponentGroup, type ComponentStatus } from "./component-taxonomy";

/** One component page, as the component index shows it. Read from the page's frontmatter. */
export interface ComponentItem {
  title: string;
  description: string;
  url: string;
  group: ComponentGroup;
  status: ComponentStatus;
  /** The @azmr/ui version that first shipped it. */
  since: string;
}

export interface ComponentGroupItems {
  group: ComponentGroup;
  items: ComponentItem[];
}

export interface ComponentFilter {
  /** Only this group, or every group when left out. */
  group?: ComponentGroup | undefined;
  /** Matches the title, description or group, ignoring case. Blank matches everything. */
  query?: string | undefined;
}

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

export function filterComponents(
  items: ComponentItem[],
  { group, query }: ComponentFilter = {},
): ComponentItem[] {
  const needle = normalise(query ?? "");
  return items.filter((item) => {
    if (group !== undefined && item.group !== group) return false;
    if (needle === "") return true;
    return normalise(`${item.title} ${item.description} ${item.group}`).includes(needle);
  });
}

/** Groups in the order of `COMPONENT_GROUPS`, components by title, empty groups left out. */
export function groupComponents(items: ComponentItem[]): ComponentGroupItems[] {
  return COMPONENT_GROUPS.map((group) => ({
    group,
    items: items
      .filter((item) => item.group === group)
      .sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((entry) => entry.items.length > 0);
}

/** An id for a group's section, e.g. "Data display" becomes "data-display". */
export function groupId(group: ComponentGroup): string {
  return group.toLowerCase().replaceAll(" ", "-");
}

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  stable: "Stable",
  new: "New",
  beta: "Beta",
};
