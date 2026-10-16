import { Stepper } from "@azmr/ui/stepper";

const steps = [
  { label: "Account", description: "Your details" },
  { label: "Plan", description: "Choose a plan" },
  { label: "Payment" },
  { label: "Confirm" },
];

export default function StepperBasic() {
  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={steps} current={1} label="Sign-up progress" />
      <div className="flex flex-wrap gap-12">
        <Stepper steps={steps} current={2} orientation="vertical" label="Vertical progress" />
        <Stepper
          steps={[
            { label: "Upload" },
            { label: "Validate", status: "error", description: "2 rows failed" },
            { label: "Import" },
          ]}
          current={1}
          orientation="vertical"
          label="Import progress"
        />
      </div>
    </div>
  );
}
