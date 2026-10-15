export interface KeyboardMapRow {
  /** Alternative keys that do the same thing, e.g. `["Enter", "Space"]`. */
  keys: string[];
  /** What happens. */
  action: string;
}

/**
 * A table of keyboard interactions for a component's accessibility section. Rendered as a real
 * table with a caption and column scopes so screen readers announce it properly.
 */
export function KeyboardMap({ rows }: { rows: KeyboardMapRow[] }) {
  return (
    <div className="not-prose my-4 overflow-x-auto rounded-xl border border-fd-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Keyboard interactions</caption>
        <thead className="border-b border-fd-border bg-fd-muted/50">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Key
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.keys.join("+")}:${row.action}`} className="border-t border-fd-border">
              <td className="whitespace-nowrap px-4 py-2">
                {row.keys.map((key, index) => (
                  <span key={key}>
                    {index > 0 && <span className="px-1 text-fd-muted-foreground">or</span>}
                    <kbd className="rounded border border-fd-border bg-fd-muted px-1.5 py-0.5 font-mono text-xs">
                      {key}
                    </kbd>
                  </span>
                ))}
              </td>
              <td className="px-4 py-2">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
