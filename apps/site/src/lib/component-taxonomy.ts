/**
 * The groups and statuses a component page can have. In its own module, with no imports, so the
 * browser bundle of the component index can use them: the frontmatter schema that also needs them
 * imports Node-only code.
 */

/**
 * The navigation groups for component pages. The component index and the sidebar (PAZM-124) and
 * the studio (PAZM-138) group by these, so the list lives in one place.
 */
export const COMPONENT_GROUPS = [
  "Layout",
  "Inputs",
  "Data display",
  "Feedback",
  "Overlays",
  "Navigation",
  "Utils",
] as const;

/**
 * - stable: released, tested and documented. While @azmr/ui is 0.x a breaking change can still
 *   land in a minor release, and it is listed in the changelog.
 * - new:    added or substantially extended in the latest minor release.
 * - beta:   released, but the API is still expected to change.
 */
export const COMPONENT_STATUSES = ["stable", "new", "beta"] as const;

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number];
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];
