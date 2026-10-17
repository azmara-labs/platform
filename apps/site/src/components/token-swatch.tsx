/**
 * A colour token's two values side by side: light on the left, dark on the right. The values are
 * passed in rather than read from the page's CSS variables, so each half shows its own mode
 * whatever theme the docs are in. Decorative: the values are listed as text in the same row.
 */
export function TokenSwatch({ light, dark }: { light: string; dark: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex overflow-hidden rounded border border-fd-border align-middle"
    >
      <span className="size-6" style={{ background: light }} />
      <span className="size-6" style={{ background: dark }} />
    </span>
  );
}

/** A box with an elevation token's shadow, for the elevation table. Decorative. */
export function ElevationSample({ shadow }: { shadow: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-8 rounded-md bg-fd-background"
      style={{ boxShadow: shadow }}
    />
  );
}
