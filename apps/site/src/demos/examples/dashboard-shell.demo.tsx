"use client";

import { Avatar } from "@azmr/ui/avatar";
import { Breadcrumbs } from "@azmr/ui/breadcrumb";
import { Button } from "@azmr/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@azmr/ui/disclosure";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@azmr/ui/display";
import { Icon } from "@azmr/ui/icons";
import { Grid } from "@azmr/ui/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import { Progress } from "@azmr/ui/progress";
import { CreditCard, LayoutDashboard, RefreshCw, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

const STATS = [
  { label: "Revenue", value: "$48,200", change: "+12%", tone: "success" as const },
  { label: "Customers", value: "1,284", change: "+38", tone: "success" as const },
  { label: "Open invoices", value: "17", change: "+4", tone: "warning" as const },
  { label: "Churn", value: "1.9%", change: "-0.3%", tone: "success" as const },
];

const ACTIVITY = [
  "Hemi Te Rangi upgraded to Enterprise",
  "Invoice INV-204 was paid by Aroha Ngata",
  "Tane Smith's card failed",
  "Mere Walker started a trial",
];

// A dashboard shell is a navigation list, a top bar and a content area. The navigation marks the
// current page with aria-current, and the content area is a labelled region, so a screen reader
// user can jump to either. Real apps would use their router's links where these use #.
export default function DashboardShell() {
  const [page, setPage] = useState("overview");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, [loading]);

  const current = NAV.find((item) => item.id === page) ?? NAV[0];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="grid md:grid-cols-[13rem_1fr]">
        <nav
          aria-label="Dashboard"
          className="border-b border-border bg-muted/40 p-3 md:border-r md:border-b-0"
        >
          <ul className="m-0 flex list-none flex-row gap-1 p-0 md:flex-col">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={page === item.id ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage(item.id);
                  }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium"
                >
                  <Icon icon={item.icon} />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-label={current?.label} className="flex min-w-0 flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs
              label="You are here"
              items={[{ label: "Acme", href: "#acme" }, { label: current?.label ?? "" }]}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                startIcon={<Icon icon={RefreshCw} />}
                loading={loading}
                loadingText="Refreshing"
                onClick={() => setLoading(true)}
              >
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button type="button" className="rounded-full">
                      <Avatar name="Aroha Ngata" size="sm" />
                    </button>
                  }
                />
                <DropdownMenuContent>
                  {/* A label has to sit inside a group, which is also how it is announced. */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>aroha@example.co.nz</DropdownMenuLabel>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Sign out</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <h2 className="m-0 text-xl font-semibold">{current?.label}</h2>

          <Grid minItemWidth="9rem" gap={4} aria-busy={loading}>
            {STATS.map((stat) => (
              <Card key={stat.label}>
                <CardHeader>
                  <CardDescription>{stat.label}</CardDescription>
                  {loading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <CardTitle className="text-2xl">{stat.value}</CardTitle>
                  )}
                </CardHeader>
                <CardContent>
                  {!loading && <Badge variant={stat.tone}>{stat.change}</Badge>}
                </CardContent>
              </Card>
            ))}
          </Grid>
          <p className="sr-only" aria-live="polite">
            {loading ? "Refreshing figures" : "Figures are up to date"}
          </p>

          <Tabs defaultValue="usage">
            <TabsList aria-label="Details">
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="usage" className="flex max-w-md flex-col gap-4 py-4">
              <Progress value={72} showValue aria-label="Storage used" />
              <Progress value={91} tone="warning" aria-label="Seats used" />
            </TabsContent>
            <TabsContent value="activity" className="py-4">
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {ACTIVITY.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
