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
