import { frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

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

/**
 * Frontmatter for every docs page. The extra fields are optional here because the guide, security
 * and package pages do not use them; `componentFrontmatter` below is what a component page must
 * satisfy, and `component-pages.test.ts` enforces it.
 */
export const docsFrontmatter = frontmatterSchema.extend({
  /** Navigation group on the component index. */
  group: z.enum(COMPONENT_GROUPS).optional(),
  /** Maturity badge on the component index. */
  status: z.enum(COMPONENT_STATUSES).optional(),
  /** The @azmr/ui version that first shipped this component, e.g. "0.2.0". */
  since: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "a version such as 0.2.0")
    .optional(),
  /** True when the component takes keyboard input, so the page must show a keyboard map. */
  interactive: z.boolean().optional(),
});

export const componentFrontmatter = docsFrontmatter.required({
  description: true,
  group: true,
  status: true,
  since: true,
  interactive: true,
});
