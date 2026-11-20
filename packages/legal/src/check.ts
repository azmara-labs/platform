import type { PolicyDocument, Site } from "./types.js";

export interface DriftInput {
  document: PolicyDocument;
  /** The site whose code is being checked. */
  site: Site;
  /** `dependencies` from that site's package.json. */
  dependencies: Readonly<Record<string, string>>;
  /** The text of its `.env.local.example`. */
  envExample: string;
  /** Service SDKs the site uses, each of which must be a named processor. */
  serviceDependencies?: readonly string[];
  /** Packages that would contradict the policy's cookie and tracking statement. */
  trackerPattern?: RegExp;
  /**
   * The site's source files as path to text. Needed to check a processor's `host` evidence, and
   * to find services the site calls by URL.
   */
  sources?: Readonly<Record<string, string>>;
  /**
   * Hosts the source may mention without being a processor, such as the site's own domain and
   * plain links. Giving this list (with `sources`) turns on the check for hosts the source
   * contacts that the policy doesn't name, so every other host has to be a processor.
   */
  allowedHosts?: readonly string[];
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A host is covered by a domain when it is that domain or one of its subdomains. */
const isCoveredBy = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

/** Hosts that never leave the visitor's own machine. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

/** Every host named in a URL in the source, with the first file it appears in. */
function findHosts(sources: Readonly<Record<string, string>>): Map<string, string> {
  const found = new Map<string, string>();
  for (const [path, text] of Object.entries(sources)) {
    for (const match of text.matchAll(/https?:\/\/([a-z0-9][a-z0-9.-]*)/gi)) {
      const host = match[1]?.toLowerCase().replace(/\.$/, "");
      if (host && !found.has(host)) found.set(host, path);
    }
  }
  return found;
}

/**
 * What in the policy no longer matches the code. An empty list means it still does. A pure
 * function over text, so any site can run it in its own test suite.
 */
export function findPolicyDrift(input: DriftInput): string[] {
  const {
    document,
    site,
    dependencies,
    envExample,
    serviceDependencies = [],
    trackerPattern,
    sources,
    allowedHosts,
  } = input;
  const problems: string[] = [];
  const ours = document.processors.filter((p) => p.sites.includes(site));

  for (const processor of ours) {
    const { dependency, env, host } = processor.evidence;
    if (!dependency && !env && !host) problems.push(`${processor.name}: no evidence given`);
    if (dependency && !(dependency in dependencies)) {
      problems.push(`${processor.name}: the policy names it but ${dependency} isn't a dependency`);
    }
    if (env && !new RegExp(`^${escapeRegExp(env)}=`, "m").test(envExample)) {
      problems.push(`${processor.name}: the policy names it but ${env} isn't in the env example`);
    }
    if (host) {
      if (!sources) {
        problems.push(
          `${processor.name}: its evidence is the host ${host} but no sources were given`,
        );
      } else if (![...findHosts(sources).keys()].some((found) => isCoveredBy(found, host))) {
        problems.push(`${processor.name}: the policy names it but ${host} isn't in the source`);
      }
    }
  }

  const covered = new Set(ours.map((p) => p.evidence.dependency));
  for (const dependency of serviceDependencies) {
    if (dependency in dependencies && !covered.has(dependency)) {
      problems.push(`${dependency} is used but no processor in the policy covers it`);
    }
  }

  if (allowedHosts) {
    if (!sources) {
      problems.push("allowedHosts needs sources to check against");
    } else {
      const known = [
        ...LOCAL_HOSTS,
        ...allowedHosts.map((h) => h.toLowerCase()),
        ...ours.flatMap((p) => (p.evidence.host ? [p.evidence.host.toLowerCase()] : [])),
      ];
      for (const [host, path] of findHosts(sources)) {
        if (!known.some((domain) => isCoveredBy(host, domain))) {
          problems.push(`${host} is contacted in ${path} but no processor in the policy covers it`);
        }
      }
    }
  }

  if (trackerPattern) {
    for (const name of Object.keys(dependencies)) {
      if (trackerPattern.test(name))
        problems.push(`${name} is a tracker the policy doesn't allow for`);
    }
  }
  return problems;
}
