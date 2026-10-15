import { Progress } from "@azmr/ui/progress";

export default function ProgressCircular() {
  return (
    <div className="flex items-center gap-6">
      <Progress variant="circular" size="sm" value={30} aria-label="Sync" />
      <Progress variant="circular" value={65} showValue tone="info" aria-label="Profile complete" />
      <Progress
        variant="circular"
        size="lg"
        value={90}
        showValue
        tone="success"
        aria-label="Tasks done"
      />
      <Progress variant="circular" value={null} aria-label="Loading" />
    </div>
  );
}
