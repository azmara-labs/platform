/**
 * House spelling: New Zealand English, which follows British spelling (colour, organise, centre).
 * This finds the American forms in prose. It is not a dictionary: it knows the common pairs and the
 * -ize and -yze endings, which is where an American spelling most often slips into British writing.
 */

/** American spellings and the New Zealand spelling to use, as whole words. */
const PAIRS: Record<string, string> = {
  color: "colour",
  colors: "colours",
  colored: "coloured",
  coloring: "colouring",
  colorful: "colourful",
  behavior: "behaviour",
  behaviors: "behaviours",
  favorite: "favourite",
  favorites: "favourites",
  honor: "honour",
  neighbor: "neighbour",
  neighbors: "neighbours",
  flavor: "flavour",
  humor: "humour",
  labor: "labour",
  rumor: "rumour",
  center: "centre",
  centers: "centres",
  centered: "centred",
  centering: "centring",
  gray: "grey",
  grays: "greys",
  catalog: "catalogue",
  analog: "analogue",
  defense: "defence",
  offense: "offence",
  theater: "theatre",
  fulfill: "fulfil",
  fulfillment: "fulfilment",
  enrollment: "enrolment",
  skillful: "skilful",
  canceled: "cancelled",
  canceling: "cancelling",
  labeled: "labelled",
  labeling: "labelling",
  modeled: "modelled",
  modeling: "modelling",
  traveled: "travelled",
  traveling: "travelling",
  signaled: "signalled",
  signaling: "signalling",
  fueled: "fuelled",
  totaled: "totalled",
  levelled: "levelled",
  aluminum: "aluminium",
  sulfur: "sulphur",
  plow: "plough",
  mold: "mould",
  odor: "odour",
  savior: "saviour",
  armor: "armour",
  harbor: "harbour",
  vapor: "vapour",
  glamor: "glamour",
};

/** Words that end in "-ize" or "-yze" in every dialect, so they are not American spellings. */
const NOT_AMERICAN = new Set([
  "size",
  "sizes",
  "sized",
  "sizing",
  "resize",
  "resizes",
  "resized",
  "resizing",
  "oversize",
  "oversized",
  "prize",
  "prizes",
  "seize",
  "seized",
  "capsize",
  "maize",
  "baize",
  "assize",
  "bize",
]);

/** American -ize / -yze words, mapped to the -ise / -yse form: organize becomes organise. */
function britishise(word: string): string | undefined {
  const lower = word.toLowerCase();
  if (NOT_AMERICAN.has(lower)) return undefined;
  const match = /^(.+?)(iz|yz)(e|es|ed|ing|ation|ations|er|ers)$/.exec(lower);
  if (!match) return undefined;
  const [, stem, ending, suffix] = match;
  // A stem that is too short is not a verb root (it would flag "izes").
  if ((stem as string).length < 3) return undefined;
  return `${stem}${ending === "iz" ? "is" : "ys"}${suffix}`;
}

export interface SpellingProblem {
  /** The American word as written. */
  word: string;
  /** What to write instead. */
  use: string;
  /** The line of the file it is on, 1-based. */
  line: number;
}

/**
 * Removes what is not prose: fenced code, inline code, link targets, the URL in an href, and the
 * names of components and props in JSX. Each removed span keeps its newlines, so line numbers hold.
 */
export function prose(mdx: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  return mdx
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank)
    .replace(/`[^`\n]*`/g, blank)
    .replace(/\]\([^)\s]*\)/g, blank)
    .replace(/\b(?:href|src|path|name|file|id|className|type|label)=("[^"]*"|\{[^}]*\})/g, blank)
    .replace(/<\/?[A-Za-z][\w.]*/g, blank);
}

/** The American spellings in an MDX document's prose. */
export function findAmericanSpellings(mdx: string): SpellingProblem[] {
  const problems: SpellingProblem[] = [];
  const lines = prose(mdx).split("\n");
  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(/[A-Za-z]+/g)) {
      const word = match[0];
      const lower = word.toLowerCase();
      // Object.hasOwn: a plain object also has "constructor", "toString" and the like.
      const use = Object.hasOwn(PAIRS, lower) ? PAIRS[lower] : britishise(word);
      if (use) problems.push({ word, use, line: index + 1 });
    }
  }
  return problems;
}
