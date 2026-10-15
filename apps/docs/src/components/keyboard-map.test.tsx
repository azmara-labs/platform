import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KeyboardMap } from "./keyboard-map";

describe("KeyboardMap", () => {
  const html = renderToStaticMarkup(
    <KeyboardMap
      rows={[
        { keys: ["Enter", "Space"], action: "Activates the button." },
        { keys: ["Tab"], action: "Moves focus to the next control." },
      ]}
    />,
  );

  it("renders a real table with a caption and column scopes", () => {
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html.match(/scope="col"/g)).toHaveLength(2);
  });

  it("renders each key in a kbd element and joins alternatives with 'or'", () => {
    expect(html.match(/<kbd/g)).toHaveLength(3);
    expect(html).toContain(">Enter</kbd>");
    expect(html).toContain(">Space</kbd>");
    expect(html).toContain(">or</span>");
  });

  it("renders the actions", () => {
    expect(html).toContain("Activates the button.");
    expect(html).toContain("Moves focus to the next control.");
  });

  it("escapes text instead of treating it as markup", () => {
    const unsafe = renderToStaticMarkup(
      <KeyboardMap rows={[{ keys: ["<b>"], action: "<img src=x onerror=alert(1)>" }]} />,
    );
    expect(unsafe).not.toContain("<img");
    expect(unsafe).not.toContain("<b>");
    expect(unsafe).toContain("&lt;img");
  });
});
