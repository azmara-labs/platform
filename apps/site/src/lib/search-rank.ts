// Re-orders Fumadocs' static search results so the page someone means comes first. Orama scores
// every section and matches prefixes, so a page that mentions "button" a dozen times (or
// `buttonVariants`) outranks the page titled "Button", and "focus trap" ranks pages full of
// "focusable" above the one that describes a focus trap. Pages are ranked by:
//   1. the title, or one of the page's aliases, is the query;
//   2. the title or an alias has every word of the query;
//   3. some section has the query as a whole phrase;
//   4. everything else, in Orama's order.
// Within a tier Orama's order is kept. See PAZM-141.

/** One search result, as Fumadocs' search clients return them (only the fields used here). */
export interface RankedResult {
  type: string;
  content: string;
  url: string;
}

/**
 * Lower case, highlight markup and punctuation removed and CamelCase split, so "`Button`" and
 * "button" compare equal and "DropdownMenu" reads as "dropdown menu".
 */
export function normaliseText(text: string): string {
  return text
    .replace(/<\/?mark>/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const hasWord = (text: string, word: string) => ` ${text} `.includes(` ${word} `);

export function rankResults<T extends RankedResult>(results: readonly T[], query: string): T[] {
  const q = normaliseText(query);
  if (q === "") return [...results];
  const words = q.split(" ");

  // Fumadocs lists each page's result, then that page's matching sections, page by page.
  // A page result reads "Title" or, with aliases, "Title (Alias, Alias)" (see app/api/search).
  const groups: { names: string[]; items: T[] }[] = [];
  for (const result of results) {
    if (result.type === "page" || groups.length === 0) {
      const names = result.content.split(/[(),]/).map(normaliseText).filter(Boolean);
      groups.push({ names, items: [result] });
    } else {
      groups.at(-1)?.items.push(result);
    }
  }

  const tier = ({ names, items }: (typeof groups)[number]) => {
    if (names.includes(q)) return 0;
    if (names.some((name) => words.every((word) => hasWord(name, word)))) return 1;
    if (items.some((item) => ` ${normaliseText(item.content)} `.includes(` ${q} `))) return 2;
    return 3;
  };

  return groups
    .map((group, index) => ({ group, index, tier: tier(group) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .flatMap(({ group }) => group.items);
}
