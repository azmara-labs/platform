/**
 * Shared tooltip timing. Hovering waits `TOOLTIP_DELAY_MS` before a tooltip shows, so sweeping
 * the pointer across a toolbar does not flash every tip; once one is showing, its neighbours
 * open at once (Base UI's provider handles that grouping). Closing is immediate.
 */
export const TOOLTIP_DELAY_MS = 500;
export const TOOLTIP_CLOSE_DELAY_MS = 0;
