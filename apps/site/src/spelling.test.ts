import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { findAmericanSpellings, prose } from "./lib/spelling";

// The house spelling is New Zealand English, which follows British spelling. This finds American
// forms (color, behavior, organize) in the docs' prose. Code, link targets and component names are
// left alone, because `color` is a CSS property and `items-center` is a class.

const contentDir = join(import.meta.dirname, "..", "content", "docs");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".mdx")) out.push(full);
  }
  return out;
}

const words = (text: string) => findAmericanSpellings(text).map((p) => `${p.word}>${p.use}`);

describe("findAmericanSpellings", () => {
  it("finds the common American spellings and says what to write instead", () => {
    expect(words("The color of the behavior near the center.")).toEqual([
      "color>colour",
      "behavior>behaviour",
      "center>centre",
    ]);
  });

  it("finds -ize and -yze words in any form, and keeps the case it was given", () => {
    expect(words("We organize, Customizing and optimization; analyze it. Organized.")).toEqual([
      "organize>organise",
      "Customizing>customising",
      "optimization>optimisation",
      "analyze>analyse",
      "Organized>organised",
    ]);
  });

  it("does not flag words that end in -ize in every dialect, or the British forms", () => {
    expect(
      words("Resize the size of the prize. Organise and customise, in colour, at the centre."),
    ).toEqual([]);
  });

  it("does not flag a word that is only a key of a plain object", () => {
    expect(
      words("The constructor, toString and valueOf are inherited, and hasOwnProperty."),
    ).toEqual([]);
  });

  it("leaves code, link targets and JSX names alone", () => {
    const mdx = [
      "Set `color` and `items-center`.",
      "",
      "```css",
      ".x { color: gray; text-align: center; }",
      "```",
      "",
      'See [the page](/docs/color-center) and <Demo name="color/center" />.',
      '<a href="/docs/gray">link</a>',
    ].join("\n");
    expect(words(mdx)).toEqual([]);
  });

  it("keeps line numbers while it skips code", () => {
    const mdx = ["Fine.", "```", "color", "```", "A color here."].join("\n");
    expect(findAmericanSpellings(mdx)).toEqual([{ word: "color", use: "colour", line: 5 }]);
  });
});

describe("prose", () => {
  it("blanks what is not prose without moving the text that is", () => {
    const out = prose("a `b` c\n```\nd\n```\ne");
    expect(out.split("\n")).toHaveLength(5);
    expect(out.trim().split(/\s+/)).toEqual(["a", "c", "e"]);
  });
});

describe("the docs", () => {
  // The changelogs are generated from the packages' CHANGELOG files, which are history: they are not
  // rewritten, so they are not checked.
  const files = walk(contentDir).filter(
    (file) => !relative(contentDir, file).startsWith("changelog"),
  );

  it("finds the pages (guards against scanning nothing)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("use New Zealand spelling in their prose", () => {
    const problems = files.flatMap((file) =>
      findAmericanSpellings(readFileSync(file, "utf8")).map(
        (p) =>
          `${relative(contentDir, file).replaceAll("\\", "/")}:${p.line} ${p.word}, write ${p.use}`,
      ),
    );
    expect(problems).toEqual([]);
  });
});
