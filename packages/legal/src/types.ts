/** A place a document is published, so one document can say what differs between them. */
export type Site = "app" | "website";

export interface Processor {
  name: string;
  purpose: string;
  /** What is sent to them. */
  data: string;
  /** Where it is held, as far as we control it. */
  location: string;
  /** The sites that use them. */
  sites: readonly Site[];
  /**
   * What proves the code uses them: a package in package.json, an env var, or a host the site's
   * source contacts (for a service called by URL, with no package). Give at least one.
   */
  evidence: {
    dependency?: string;
    env?: string;
    /** A domain, e.g. "open-meteo.com". It covers its subdomains, such as "api.open-meteo.com". */
    host?: string;
  };
}

export interface PolicySection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  list?: readonly string[];
}

export interface PolicyDocument {
  lastUpdated: string;
  /** Where privacy requests and questions go. */
  contact: string;
  sections: readonly PolicySection[];
  processors: readonly Processor[];
}
