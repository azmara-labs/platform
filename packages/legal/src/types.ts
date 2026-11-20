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
  /** What proves the code uses them: a package in package.json, an env var, or both. */
  evidence: { dependency?: string; env?: string };
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
