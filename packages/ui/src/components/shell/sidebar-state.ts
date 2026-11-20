// Server-safe: no React, no "use client". A server layout reads the sidebar's remembered mode
// from the Cookie header and passes it to the client shell, so the first paint is already right.

import { readCookie, serializeCookie } from "../../theme/preferences.js";

export const SIDEBAR_COOKIE = "azmr-sidebar";

/** `pinned` takes layout space beside the content; `hidden` takes none and peeks on hover. */
export const SIDEBAR_MODES = ["pinned", "hidden"] as const;
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

/** Accept only a known mode; anything else (a tampered cookie included) gives the fallback. */
export function parseSidebarMode(value: unknown, fallback: SidebarMode = "pinned"): SidebarMode {
  return typeof value === "string" && (SIDEBAR_MODES as readonly string[]).includes(value)
    ? (value as SidebarMode)
    : fallback;
}

/** The remembered mode from a `Cookie` header, `pinned` when there is none or it is not valid. */
export function readSidebarMode(cookieHeader: string | null | undefined): SidebarMode {
  return parseSidebarMode(readCookie(cookieHeader, SIDEBAR_COOKIE));
}

/** The `Set-Cookie` / `document.cookie` string that remembers a mode, with the theme cookies' options. */
export function serializeSidebarMode(
  mode: SidebarMode,
  options: { secure?: boolean } = {},
): string {
  return serializeCookie(SIDEBAR_COOKIE, mode, options);
}
