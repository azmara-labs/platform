import GithubSlugger from "github-slugger";

/** A docs page: its route, e.g. "/docs/components/button", and its MDX source. */
export interface Page {
  route: string;
  source: string;
}

export interface BrokenLink {
  /** Where the link was found, e.g. "components/button.mdx". */
  from: string;
  link: string;
  reason: string;
}

/** Removes fenced code blocks and inline code, so example snippets are not read as real links. */
export function stripCode(text: string): string {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
}

/** Every markdown link target and `href="..."` value outside code. */
export function extractLinks(text: string): string[] {
  const code = stripCode(text);
  const links: string[] = [];
  for (const m of code.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) links.push(m[1] as string);
  for (const m of code.matchAll(/href=["']([^"']+)["']/g)) links.push(m[1] as string);
  return links;
}

function headingText(raw: string): string {
  return raw
    .replace(/\s*\{#[^}]*\}\s*$/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_]/g, "")
    .trim();
}

/** The anchor ids a page offers: its headings (github-slugger, as Fumadocs does) and explicit ids. */
export function anchors(source: string): Set<string> {
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  let fence: string | null = null;
  for (const line of source.split("\n")) {
    const fenceMatch = /^(```|~~~)/.exec(line);
    if (fenceMatch) {
      fence = fence === null ? (fenceMatch[1] as string) : fence === fenceMatch[1] ? null : fence;
      continue;
    }
    if (fence !== null) continue;
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const custom = /\{#([^}]+)\}\s*$/.exec(heading[1] as string);
      ids.add(custom ? (custom[1] as string) : slugger.slug(headingText(heading[1] as string)));
    }
  }
  for (const m of stripCode(source).matchAll(/\sid=["']([^"']+)["']/g)) ids.add(m[1] as string);
  return ids;
}

/**
 * Checks internal links from `from` against the known pages and routes. External links, mailto
 * links and links outside the site's routes are ignored. `routes` is every valid path (pages plus
 * app routes); `pages` is the subset that has MDX source, used to check anchors.
 */
export function checkLinks(
  from: string,
  links: string[],
  routes: Set<string>,
  pages: Map<string, string>,
  currentRoute: string,
): BrokenLink[] {
  const broken: BrokenLink[] = [];
  for (const link of links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//")) continue;
    const [pathAndQuery = "", hash] = link.split("#") as [string, string | undefined];
    const path = pathAndQuery.split("?")[0] ?? "";
    const route = path === "" ? currentRoute : path === "/" ? "/" : path.replace(/\/$/, "");
    if (!route.startsWith("/")) {
      broken.push({ from, link, reason: "relative link: use an absolute path such as /docs/..." });
      continue;
    }
    if (!routes.has(route)) {
      broken.push({ from, link, reason: "no such page" });
      continue;
    }
    if (hash && hash.length > 0) {
      const source = pages.get(route);
      if (source !== undefined && !anchors(source).has(hash)) {
        broken.push({ from, link, reason: `no heading or id "${hash}" on ${route}` });
      }
    }
  }
  return broken;
}
