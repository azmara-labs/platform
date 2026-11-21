import type { ReactNode } from "react";

export type ChoiceSize = "sm" | "md" | "lg";

/** One choice in a group's `options`. Only these four fields are read; nothing else is passed on. */
export interface ChoiceOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** A control must have an accessible name: its own `label`, or an ARIA label. */
export type Named = { label: ReactNode } | { "aria-label": string } | { "aria-labelledby": string };
