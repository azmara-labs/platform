import { cn } from "../../lib/cn.js";
import { isAssetRef } from "../../theme/config.js";
import { Button } from "../button/index.js";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "../display/index.js";
import { DEFAULT_MESSAGES, fill, type StudioMessages } from "./messages.js";

type PreviewMessages = Pick<
  StudioMessages,
  | "previewDescription"
  | "previewAppName"
  | "previewHeading"
  | "previewBody"
  | "previewLink"
  | "previewBadge"
  | "previewButton"
  | "modeLight"
  | "modeDark"
>;

export interface ThemePreviewProps {
  /** What `createTheme` returned: set on the preview's own box, never on the page. */
  cssVariables: Record<string, string>;
  /** Which half of every `light-dark()` colour to show. */
  mode: "light" | "dark";
  appName?: string;
  /** Shown in light mode, and in dark mode when `logoDark` is missing. */
  logo?: string;
  logoDark?: string;
  messages?: Partial<PreviewMessages>;
  className?: string;
}

/**
 * A small made-up app (header, card, link, badge, button) coloured by a theme. The variables and
 * `color-scheme` go on this box only, so the page around it keeps its own theme. The sample is
 * inert and hidden from assistive technology; a sentence describes it instead.
 */
export function ThemePreview({
  cssVariables,
  mode,
  appName,
  logo,
  logoDark,
  messages,
  className,
}: ThemePreviewProps) {
  const text = { ...DEFAULT_MESSAGES, ...messages };
  const shown = mode === "dark" ? logoDark || logo : logo;
  const name = appName?.trim() || text.previewAppName;
  const modeName = mode === "dark" ? text.modeDark : text.modeLight;
  return (
    <div
      data-slot="theme-preview"
      data-mode={mode}
      style={{ ...cssVariables, colorScheme: mode }}
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-background text-foreground",
        className,
      )}
    >
      <p className="sr-only">{fill(text.previewDescription, { mode: modeName.toLowerCase() })}</p>
      <div inert aria-hidden="true">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 text-card-foreground">
          {shown && isAssetRef(shown) ? (
            <img src={shown} alt="" className="h-8 max-w-32 object-contain" />
          ) : null}
          <span className="truncate font-semibold">{name}</span>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <Card>
            <CardHeader>
              <CardTitle as="p">{text.previewHeading}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">{text.previewBody}</p>
              <p className="text-sm">
                <span className="text-primary-text underline">{text.previewLink}</span>{" "}
                <Badge>{text.previewBadge}</Badge>
              </p>
              <div>
                <Button tabIndex={-1}>{text.previewButton}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
