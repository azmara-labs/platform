import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dedent, demoPreview, returnedJsx, SHOW_WHOLE_UP_TO_LINES } from "./demo-preview";

const long = [
  'import { Button } from "@azmr/ui/button";',
  'import { useState } from "react";',
  "",
  "const items = [",
  ...Array.from({ length: 10 }, (_, i) => `  { id: ${i}, label: "Item ${i}" },`),
  "];",
  "",
  "export default function Example() {",
  "  const [count, setCount] = useState(0);",
  "  return (",
  '    <div className="flex">',
  "      <Button onClick={() => setCount((c) => c + 1)}>Clicked {count}</Button>",
  "    </div>",
  "  );",
  "}",
].join("\n");

describe("demoPreview", () => {
  it("shows a long demo's returned JSX, dedented, and keeps the line count of the whole file", () => {
    const preview = demoPreview(long);
    expect(preview.collapsed).toBe(true);
    expect(preview.totalLines).toBe(long.split("\n").length);
    expect(preview.code).toBe(
      [
        '<div className="flex">',
        "  <Button onClick={() => setCount((c) => c + 1)}>Clicked {count}</Button>",
        "</div>",
      ].join("\n"),
    );
  });

  it("shows a short demo whole", () => {
    const short = "export default function A() {\n  return (\n    <p>Hi</p>\n  );\n}";
    expect(demoPreview(short)).toEqual({ code: short, collapsed: false, totalLines: 5 });
  });

  it("shows the whole file when there is no `return (` in a default export", () => {
    const noJsx = Array.from(
      { length: SHOW_WHOLE_UP_TO_LINES + 5 },
      (_, i) => `const a${i} = ${i};`,
    ).join("\n");
    expect(demoPreview(noJsx).collapsed).toBe(false);
    expect(returnedJsx("export default () => <p />")).toBeUndefined();
  });

  it("takes the component's own return, not a callback's that comes first", () => {
    const source = [
      "export default function Table() {",
      "  const row = (r: string) => {",
      "    return (",
      "      <tr>{r}</tr>",
      "    );",
      "  };",
      "  return (",
      "    <table>",
      "      <tbody>{rows.map(row)}</tbody>",
      "    </table>",
      "  );",
      "}",
    ].join("\n");
    expect(returnedJsx(source)).toBe("<table>\n  <tbody>{rows.map(row)}</tbody>\n</table>");
  });

  it("dedents by the indentation the lines share, ignoring blank lines", () => {
    expect(dedent(["    <a>", "", "      <b />", "    </a>"])).toBe("<a>\n\n  <b />\n</a>");
  });

  it("collapses the real demos it can and never loses the JSX", () => {
    const root = join(import.meta.dirname, "..", "demos");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (entry.endsWith(".demo.tsx")) files.push(path);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(30);
    let collapsed = 0;
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const preview = demoPreview(source);
      if (preview.collapsed) {
        collapsed++;
        // The excerpt is real code from the file, line for line once indentation is ignored.
        const fileLines = new Set(source.split("\n").map((line) => line.trim()));
        for (const line of preview.code.split("\n"))
          expect(fileLines.has(line.trim()), `${file}: ${line}`).toBe(true);
      } else {
        expect(preview.code).toBe(source.trim());
      }
    }
    expect(collapsed).toBeGreaterThan(0);
  });
});
