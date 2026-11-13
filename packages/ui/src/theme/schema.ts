// Server-safe. The theme config as a Zod schema, for validating stored themes and for generating
// an editing form with `fieldsFromSchema`. Needs `zod` (an optional peer dependency of
// @azmr/ui), which is why it is its own entry and `@azmr/ui/theme` stays dependency-free.
//
// It validates with the same predicates as `parseThemeConfig`, and schema.test.ts holds the two to
// the same answer on a shared table of inputs.
import { z } from "zod";
import { parseColour, sameColour } from "./colour.js";
import { isAssetRef, isColourString, isDisplayText, TINT_MAX } from "./config.js";
import { DENSITIES } from "./preferences.js";
import { isOverridableRole, type OverridableRole, ROLES } from "./roles.js";
import { assertFont, assertRadius } from "./validate.js";

const passes = (check: (value: string) => unknown) => (value: string) => {
  try {
    check(value);
    return true;
  } catch {
    return false;
  }
};

/** An optional field with the label and help text a generated form shows. */
const field = <T extends z.ZodType>(schema: T, label: string, help: string) =>
  schema.optional().meta({ description: label, help });

const colour = z.string().refine(
  isColourString,
  "Use a hex colour or an oklch() colour", // conventions-ignore: the message names the accepted colour syntax
);
const text = z.string().refine(isDisplayText, "Use 1 to 80 characters, with no control characters");
const asset = z
  .string()
  .refine(isAssetRef, "Use an https URL or a PNG, JPEG or WebP data URI (SVG is not accepted)");

const roleColours = z.strictObject(
  Object.fromEntries(
    ROLES.filter(isOverridableRole).map((role) => [role, colour.optional()]),
  ) as Record<OverridableRole, z.ZodOptional<typeof colour>>,
);

const branding = z.strictObject({
  appName: field(text, "App name", "Shown in the header next to the logo."),
  logo: field(asset, "Logo", "An https URL or a small PNG, JPEG or WebP image."),
  logoDark: field(asset, "Logo for dark mode", "Optional. Used instead of the logo in dark mode."),
  favicon: field(asset, "Favicon", "The small icon in the browser tab."),
});

export const ThemeConfigSchema = z
  .strictObject({
    version: field(z.literal(1), "Schema version", "Always 1."),
    name: field(text, "Theme name", "A name for this theme, shown in editors and exports."),
    brand: field(
      colour,
      "Brand colour",
      "Your main colour. Buttons, links and focus rings use it.",
    ),
    primary: field(
      colour,
      "Primary colour",
      "An alias of the brand colour. Give only one of them.",
    ),
    secondary: field(colour, "Secondary colour", "Used by secondary buttons and badges."),
    success: field(colour, "Success colour", "Used for success messages and positive status."),
    warning: field(colour, "Warning colour", "Used for warnings."),
    info: field(colour, "Info colour", "Used for informational messages."),
    destructive: field(colour, "Destructive colour", "Used for errors and dangerous actions."),
    tint: field(
      z.union([z.literal("brand"), z.number().min(0).max(TINT_MAX)]),
      "Surface tint",
      'Makes greys lean toward the brand colour. "brand" is a light tint.',
    ),
    light: field(roleColours, "Light mode colours", "Set individual colours for light mode."),
    dark: field(roleColours, "Dark mode colours", "Set individual colours for dark mode."),
    radius: field(
      z.string().refine(passes(assertRadius), "Use a size in rem or px, such as 0.5rem"),
      "Corner radius",
      "How rounded corners are, in rem or px.",
    ),
    font: field(
      z.string().refine(passes(assertFont), "Use a short list of font names"),
      "Font family",
      "A list of font names. The app must load the fonts itself.",
    ),
    density: field(z.enum(DENSITIES), "Layout density", "How much space controls and rows take."),
    branding: field(branding, "App branding", "The name and images shown in the app header."),
  })
  .refine(
    (config) => {
      if (config.brand === undefined || config.primary === undefined) return true;
      // An invalid colour is reported by its own field; comparing it would throw.
      if (!isColourString(config.brand) || !isColourString(config.primary)) return true;
      return sameColour(parseColour(config.brand, "brand"), parseColour(config.primary, "primary"));
    },
    { message: "brand and primary are different colours; give only brand", path: ["primary"] },
  )
  .refine(
    (config) =>
      config.tint === undefined || config.brand !== undefined || config.primary !== undefined,
    { message: "tint needs a brand colour to lean toward", path: ["tint"] },
  );

/** A theme config as a form or a JSON document supplies it, before validation. */
export type ThemeConfigInput = z.input<typeof ThemeConfigSchema>;
