import { Loading } from "@azmr/ui/loading";

/** Stands in for your logo: any <img>, <svg> or Avatar works. */
function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" className="fill-primary" />
      <path
        d="M9.5 23 16 8.5 22.5 23M12 17.5h8"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

export default function LoadingLogo() {
  return (
    <div className="flex flex-wrap items-end gap-10">
      {/* The ring spins; the logo stays upright and readable. */}
      <Loading logo={<Logo />} label="Loading" labelPlacement="bottom" tone="default" />
      <Loading logo={<Logo />} size="xl" label="Loading data" labelPlacement="bottom" />
      {/* No ring: the logo pulses. */}
      <Loading
        logo={<Logo />}
        animation="pulse"
        size="xl"
        label="Starting up"
        labelPlacement="bottom"
      />
    </div>
  );
}
