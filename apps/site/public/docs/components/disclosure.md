# Disclosure

> Accordion, Collapsible and Tabs. Show and hide content with the keyboard maps users expect. Built on Base UI.

Source: https://platform.azmara.io/docs/components/disclosure

Group: Data display · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Collapsible, CollapsibleTrigger, CollapsibleContent,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@azmr/ui/disclosure";
```

These are interactive, so they are client components: import them from a file (or a tree) that is already `"use client"`, or use them from a client page.

## Collapsible

One region that shows and hides. Use it for a single "show more".

```tsx
import { Button } from "@azmr/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@azmr/ui/disclosure";

export default function CollapsibleBasic() {
  return (
    <Collapsible className="max-w-md">
      <CollapsibleTrigger render={<Button variant="outline">Show advanced options</Button>} />
      <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
        Advanced options live here. The panel animates its height and is instant when the visitor
        prefers reduced motion.
      </CollapsibleContent>
    </Collapsible>
  );
}
```

The trigger is a real `<button>` with `aria-expanded` and `aria-controls`. Pass `render={<Button … />}` to use your own element.

## Accordion

A stack of collapsible sections. One section is open at a time; add `multiple` to allow several.

```tsx
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
```

Each trigger sits inside a heading so assistive technology can list the sections. It defaults to an `<h3>`: set `headingLevel` to fit the page outline. `defaultValue` (uncontrolled) or `value` and `onValueChange` (controlled) take an array of item values, even when only one can be open.

## Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@azmr/ui/disclosure";

export default function TabsBasic() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-8">
      <Tabs defaultValue="overview">
        <TabsList aria-label="Account sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="team" disabled>
            Team
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="p-2 text-sm">
          A summary of your account.
        </TabsContent>
        <TabsContent value="billing" className="p-2 text-sm">
          Invoices and payment methods.
        </TabsContent>
        <TabsContent value="team" className="p-2 text-sm">
          Not available on your plan.
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="profile" orientation="vertical">
        <TabsList aria-label="Settings">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="p-2 text-sm">
          Name, photo and contact details.
        </TabsContent>
        <TabsContent value="security" className="p-2 text-sm">
          Password and two-factor sign-in.
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Give the `TabsList` an accessible name with `aria-label`. Tabs are selected **manually** by default: arrows move focus, Enter or Space selects. That is the safer default when a panel is expensive to render or load. Add `activateOnFocus` to `TabsList` to select as you arrow. Disabled tabs stay focusable (and are announced as disabled) so people can discover them; they cannot be selected.

Panels are focusable (`tabindex="0"`), so a keyboard user can reach and scroll a panel that has no controls in it. Only the selected panel is in the DOM unless you pass `keepMounted`.

### Keep the tab in the URL

`useUrlTab` stores the selected tab in a search parameter, so a tab can be linked to and reloaded, and Back restores it.

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@azmr/ui/disclosure";
import { useUrlTab } from "@azmr/ui/hooks";

const VALUES = ["usage", "api"] as const;

export default function TabsUrl() {
  const [tab, setTab] = useUrlTab({ param: "demo-tab", values: VALUES, defaultValue: "usage" });
  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as (typeof VALUES)[number])}>
      <TabsList aria-label="Example">
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>
      <TabsContent value="usage" className="p-2 text-sm">
        Select API, then look at the address bar: <code>?demo-tab=api</code>. Reload, or press Back.
      </TabsContent>
      <TabsContent value="api" className="p-2 text-sm">
        The tab is in the URL, so it can be linked to.
      </TabsContent>
    </Tabs>
  );
}
```

```tsx
const [tab, setTab] = useUrlTab({ values: ["usage", "api"], defaultValue: "usage" });
<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>…</Tabs>
```

- The URL is untrusted input. A value that is not in `values` is ignored and the default is used.
- The default tab has no parameter, so URLs stay clean. Other parameters and the hash are kept.
- `history: "replace"` (default) rewrites the current entry. Use `"push"` if each tab should be a Back step.
- On the server and during hydration it returns the default, so there is no mismatch.
- It is router-agnostic: it reads and writes `window.location` and the History API. In a framework with its own router you can drive `Tabs` from that router's search params instead.

## Motion

Accordion and Collapsible panels animate their **height**. Base UI measures the panel and exposes `--accordion-panel-height` (or `--collapsible-panel-height`); the styles transition from `0` to that height with `--motion-duration-base`. Under `prefers-reduced-motion` those tokens collapse to near zero, so panels open and close instantly.

The original plan was a `grid-template-rows` trick with no JavaScript measuring. Base UI already measures the panel to keep `hidden` and `aria-expanded` correct, and a second mechanism fighting it is how animations get stuck, so the shipped components use Base UI's own height variable.

## Props

| Prop           | Type                                      | Default | Required | Description                                                                 |
| -------------- | ----------------------------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `headingLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` |         | No       | The heading level wrapping the trigger, to fit the page outline. Default 3. |
| `className`    | `string`                                  |         | No       |                                                                             |

The rest are Base UI's props, passed through. `className` on `AccordionContent` and `CollapsibleContent` styles an inner wrapper, so padding never fights the height animation.

## Accessibility

- Accordion triggers are buttons in headings with `aria-expanded` and `aria-controls`.
- Tabs follow the WAI-ARIA tabs pattern: `tablist`, `tab` with `aria-selected`, `tabpanel` with `aria-labelledby`, and a roving tab stop.
- Focus rings are full strength.
- Chevron icons are decorative (`aria-hidden`).

### Accordion keys

| Key                      | Action                                                                            |
| ------------------------ | --------------------------------------------------------------------------------- |
| `Tab`                    | Moves to the next trigger (or the first focusable element in an open panel).      |
| `Enter` or `Space`       | Opens or closes the focused section.                                              |
| `ArrowDown` or `ArrowUp` | Moves focus to the next or previous trigger and wraps. It does not open anything. |
| `Home` or `End`          | Moves focus to the first or last trigger.                                         |

Base UI 1.9 declares `loopFocus` but does not implement arrow navigation for the accordion, so `@azmr/ui` adds it. Keys pressed inside a panel (in a text field, say) are never taken, and a nested accordion handles its own keys.

### Tabs keys

| Key                         | Action                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| `Tab`                       | Enters the tab list at the selected tab, then moves on to the panel.      |
| `ArrowRight` or `ArrowLeft` | Moves focus between tabs and wraps (ArrowDown and ArrowUp when vertical). |
| `Home` or `End`             | Moves focus to the first or last tab.                                     |
| `Enter` or `Space`          | Selects the focused tab (not needed with activateOnFocus).                |
