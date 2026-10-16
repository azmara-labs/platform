import { Progress } from "@azmr/ui/progress";

export default function ProgressBasic() {
  return (
    <div className="flex max-w-md flex-col gap-5">
      <Progress value={40} showValue aria-label="Upload progress" />
      <Progress value={75} tone="success" size="lg" aria-label="Storage used" />
      <Progress value={90} tone="warning" aria-label="Quota" />
      <Progress value={100} tone="destructive" size="sm" aria-label="Disk full" />
      {/* value={null}: the amount is unknown. It pulses and stays partial, so it never looks done. */}
      <Progress value={null} aria-label="Preparing your export" />
    </div>
  );
}
