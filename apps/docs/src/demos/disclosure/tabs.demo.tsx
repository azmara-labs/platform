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
