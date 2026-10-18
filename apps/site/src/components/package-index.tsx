import { join } from "node:path";
import { PACKAGE_GROUPS, readPackages } from "../lib/package-index";

const idFor = (title: string) => `packages-${title.toLowerCase().replaceAll(" ", "-")}`;

/**
 * The packages overview: every package under packages/, with its description, current version and
 * links, read from its package.json at build time so it cannot go stale. The docs build runs from
 * apps/site, so the packages are two levels up.
 */
export function PackageIndex() {
  const packages = readPackages(join(process.cwd(), "..", "..", "packages"));

  return (
    <div className="not-prose flex flex-col gap-8">
      {PACKAGE_GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={idFor(group.title)}>
          <h2 id={idFor(group.title)} className="mb-3 text-xl font-semibold">
            {group.title}
          </h2>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {packages
              .filter((pkg) => pkg.group === group.title)
              .map((pkg) => (
                <li
                  key={pkg.slug}
                  className="flex flex-col gap-2 rounded-lg border border-fd-border bg-fd-card p-4"
                >
                  <h3 className="flex flex-wrap items-baseline gap-2 font-medium">
                    <a href={pkg.docsUrl} className="underline-offset-2 hover:underline">
                      {pkg.name}
                    </a>
                    <span className="text-xs font-normal text-fd-muted-foreground">
                      v{pkg.version}
                    </span>
                  </h3>
                  <p className="text-sm text-fd-muted-foreground">{pkg.description}</p>
                  <code className="w-fit rounded bg-fd-muted px-2 py-1 text-xs">
                    pnpm add {pkg.name}
                  </code>
                  <p className="flex flex-wrap gap-x-4 text-sm">
                    <a href={pkg.docsUrl}>Docs</a>
                    <a href={pkg.changelogUrl}>Changelog</a>
                    <a href={pkg.npmUrl}>npm</a>
                    <a href={pkg.repoUrl}>Source</a>
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
