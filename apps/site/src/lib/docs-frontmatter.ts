import { frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";
import { COMPONENT_GROUPS, COMPONENT_STATUSES } from "./component-taxonomy";

export {
  COMPONENT_GROUPS,
  COMPONENT_STATUSES,
  type ComponentGroup,
  type ComponentStatus,
} from "./component-taxonomy";

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
  /**
   * Other names people search for: the components a page documents under a different name
   * (Modal documents Dialog). Search shows them after the title and ranks an exact match like one.
   */
  aliases: z.array(z.string().min(1)).optional(),
});

export const componentFrontmatter = docsFrontmatter.required({
  description: true,
  group: true,
  status: true,
  since: true,
  interactive: true,
});
