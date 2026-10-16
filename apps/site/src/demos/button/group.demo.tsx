import { Button, ButtonGroup } from "@azmr/ui/button";

export default function ButtonGroupBasic() {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ButtonGroup aria-label="Page navigation">
        <Button variant="outline">Previous</Button>
        <Button variant="outline">Today</Button>
        <Button variant="outline">Next</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Export format" orientation="vertical">
        <Button variant="outline">PDF</Button>
        <Button variant="outline">CSV</Button>
        <Button variant="outline">Excel</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Spaced actions" attached={false}>
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </ButtonGroup>
    </div>
  );
}
