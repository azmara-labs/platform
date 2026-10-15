import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving conflicting Tailwind utilities so the last one
 * wins (`cn("p-2", "p-4")` → `"p-4"`). Every component accepts `className` and
 * passes it through `cn` last, so callers can always override a default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
