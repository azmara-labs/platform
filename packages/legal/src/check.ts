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
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  } = input;
  const problems: string[] = [];
  const ours = document.processors.filter((p) => p.sites.includes(site));

  for (const processor of ours) {
    const { dependency, env } = processor.evidence;
    if (!dependency && !env) problems.push(`${processor.name}: no evidence given`);
    if (dependency && !(dependency in dependencies)) {
      problems.push(`${processor.name}: the policy names it but ${dependency} isn't a dependency`);
    }
    if (env && !new RegExp(`^${escapeRegExp(env)}=`, "m").test(envExample)) {
      problems.push(`${processor.name}: the policy names it but ${env} isn't in the env example`);
    }
  }

  const covered = new Set(ours.map((p) => p.evidence.dependency));
  for (const dependency of serviceDependencies) {
    if (dependency in dependencies && !covered.has(dependency)) {
      problems.push(`${dependency} is used but no processor in the policy covers it`);
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
