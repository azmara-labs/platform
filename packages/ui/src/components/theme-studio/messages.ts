/** Every piece of text the theme studio shows. Pass a partial map as `messages` to change any. */
export interface StudioMessages {
  appNameLabel: string;
  appNameHelp: string;
  lightHeading: string;
  darkHeading: string;
  brandLabel: string;
  /** Names the light colour in an error: "{lightColourName} must be a colour such as #1a73e8." */
  lightColourName: string;
  darkColourName: string;
  lightSwatch: string;
  darkSwatch: string;
  darkOptional: string;
  logoLabel: string;
  statusReadable: string;
  /** `{shade}` is the colour links and labels use, as `#rrggbb`. */
  statusAdjusted: string;
  statusDarkDerived: string;
  errorAppName: string;
  /** `{field}` is `lightColourName` or `darkColourName`. */
  errorColour: string;
  errorDarkNeedsLight: string;
  /** `{roles}` lists the theme roles that fail, such as "primary-foreground, primary". */
  conflict: string;
  conflictNoRole: string;
  /** `{issues}` is the library's own text, for the developer. */
  conflictDetails: string;
  save: string;
  saving: string;
  saveFailed: string;
  reset: string;
  preview: string;
  previewMode: string;
  modeLight: string;
  modeDark: string;
  /** `{mode}` is `modeLight` or `modeDark`, in lower case. */
  previewDescription: string;
  /** What the preview header shows when there is no app name. */
  previewAppName: string;
  /** The sample card, link, badge and button in the preview. */
  previewHeading: string;
  previewBody: string;
  previewLink: string;
  previewBadge: string;
  previewButton: string;
}

export const DEFAULT_MESSAGES: StudioMessages = {
  appNameLabel: "App name",
  appNameHelp: "Shown next to your logo.",
  lightHeading: "Light mode",
  darkHeading: "Dark mode",
  brandLabel: "Brand colour",
  lightColourName: "Light mode colour",
  darkColourName: "Dark mode colour",
  lightSwatch: "Choose light mode colour",
  darkSwatch: "Choose dark mode colour",
  darkOptional: "Optional. Leave empty to use your light mode colour, adjusted for dark.",
  logoLabel: "Logo",
  statusReadable: "Readable as it is.",
  statusAdjusted:
    "Adjusted slightly so buttons and text stay readable. Links and labels use {shade}.",
  statusDarkDerived:
    "Uses your light mode colour, adjusted for dark. Links and labels use {shade}.",
  errorAppName: "App name must be 1 to 80 characters, with no control characters.",
  errorColour: "{field} must be a colour such as #1a73e8.", // conventions-ignore: an example colour in the message text, not a style
  errorDarkNeedsLight: "Choose a light mode colour first, or clear this one.",
  conflict:
    "A setting made by a developer conflicts with this change, so it cannot be saved yet. Ask a developer to look at: {roles}.",
  conflictNoRole:
    "A setting made by a developer conflicts with this change, so it cannot be saved yet. Ask a developer to look at it.",
  conflictDetails: "Details for the developer: {issues}",
  save: "Save branding",
  saving: "Saving...",
  saveFailed: "Branding could not be saved. Try again.",
  reset: "Reset",
  preview: "Preview",
  previewMode: "Preview mode",
  modeLight: "Light",
  modeDark: "Dark",
  previewDescription:
    "Preview of the {mode} theme: a header with your logo and app name, a card, a link and a button.",
  previewAppName: "Your app name",
  previewHeading: "Welcome back",
  previewBody: "This is how your colours and logo look in the app.",
  previewLink: "View details",
  previewBadge: "Active",
  previewButton: "Primary action",
};

/** Replace each `{name}` in `template` with its value. A name with no value is left as it is. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}
