// The four status colours as component styles. Class names are spelled out in full for the
// Tailwind scanner, and status-contrast.test.ts reads the alpha from these very strings to check
// contrast on the blended surface in both modes.
export const STATUS = {
  info: {
    token: "info",
    textToken: "info",
    alert: "border-info/30 bg-info/10",
    badge: "border-transparent bg-info/15 text-info",
    icon: "text-info",
  },
  success: {
    token: "success",
    textToken: "success",
    alert: "border-success/30 bg-success/10",
    badge: "border-transparent bg-success/15 text-success",
    icon: "text-success",
  },
  warning: {
    token: "warning",
    textToken: "warning-text",
    alert: "border-warning/40 bg-warning/10",
    badge: "border-transparent bg-warning/15 text-warning-text",
    icon: "text-warning-text",
  },
  destructive: {
    token: "destructive",
    textToken: "destructive",
    alert: "border-destructive/30 bg-destructive/10",
    badge: "border-transparent bg-destructive/10 text-destructive",
    icon: "text-destructive",
  },
} as const;

export type StatusVariant = keyof typeof STATUS;
