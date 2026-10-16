import { Icon } from "@azmr/ui/icons/lucide";

export default function IconNamed() {
  return (
    <div className="flex items-center gap-4">
      <Icon name="house" size="lg" />
      <Icon name="circle-alert" size="lg" aria-label="Warning" />
      <Icon name="trash-2" size="lg" aria-label="Delete" />
      <Icon name="chevrons-up-down" size="lg" />
    </div>
  );
}
