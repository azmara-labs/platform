import { join } from "node:path";
import { readPackages } from "../../lib/package-index";
import { LandingCard } from "./landing-card";

/** Every package, read from its package.json, so a new package or a new description shows up here. */
export function PackageShowcase() {
  const packages = readPackages(join(process.cwd(), "..", "..", "packages"));

  return (
    <section className="w-full bg-fd-card/40">
      <div className="mx-auto max-w-5xl px-8 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Packages</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {packages.map((pkg) => (
            <LandingCard
              key={pkg.slug}
              title={pkg.name}
              description={pkg.description}
              href={pkg.docsUrl}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
