import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@azmr/ui/disclosure";

export default function AccordionBasic() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-8">
      <Accordion defaultValue={["billing"]} aria-label="Billing questions">
        <AccordionItem value="billing">
          <AccordionTrigger>How does billing work?</AccordionTrigger>
          <AccordionContent>
            You are billed monthly in NZD. Invoices are emailed on the first of each month.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="cancel">
          <AccordionTrigger>Can I cancel at any time?</AccordionTrigger>
          <AccordionContent>
            Yes. Your plan runs to the end of the period you paid for.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="legacy" disabled>
          <AccordionTrigger>Legacy plans (unavailable)</AccordionTrigger>
          <AccordionContent>Not shown.</AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* `multiple` lets several sections stay open at once. */}
      <Accordion multiple defaultValue={["a", "b"]} aria-label="Release notes">
        <AccordionItem value="a">
          <AccordionTrigger headingLevel={4}>New</AccordionTrigger>
          <AccordionContent>Tabs, accordion and collapsible.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger headingLevel={4}>Fixed</AccordionTrigger>
          <AccordionContent>Scoped themes now work when light-dark() is lowered.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
