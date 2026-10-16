import { Spinner } from "@azmr/ui/spinner";

export default function SpinnerBasic() {
  return (
    <div className="flex items-center gap-6">
      {/* Decorative: the surrounding control already says it is busy. */}
      <Spinner />
      <Spinner className="size-6" />
      {/* Announced as a status. */}
      <Spinner className="size-8 text-primary" label="Loading customers" />
    </div>
  );
}
