/**
 * The indicator colour per tone. `token` names the design token the colour comes from; a test
 * checks it has 3:1 contrast against both the track and the page in light and dark. Warning uses
 * `warning-text`, not the yellow `warning` surface colour, which is far too faint on a light track.
 * Its own module so `LoadingBar` can share the tones without importing Progress.
 */
export const progressTones = {
  default: { token: "primary", indicator: "bg-primary", ring: "text-primary" },
  success: { token: "success", indicator: "bg-success", ring: "text-success" },
  warning: { token: "warning-text", indicator: "bg-warning-text", ring: "text-warning-text" },
  destructive: { token: "destructive", indicator: "bg-destructive", ring: "text-destructive" },
  info: { token: "info", indicator: "bg-info", ring: "text-info" },
} as const;

export type ProgressTone = keyof typeof progressTones;
