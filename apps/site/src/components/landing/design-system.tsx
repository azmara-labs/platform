import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@azmr/ui/display";
import { Stepper } from "@azmr/ui/stepper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@azmr/ui/table";
import Link from "next/link";

const invoices = [
  { id: "INV-001", status: "Paid", variant: "success", amount: "$250.00" },
  { id: "INV-002", status: "Pending", variant: "info", amount: "$1,250.00" },
  { id: "INV-004", status: "Overdue", variant: "destructive", amount: "$90.00" },
] as const;

const steps = [{ label: "Quote" }, { label: "Invoice" }, { label: "Paid" }];

/**
 * The design system, shown rather than described. The preview is real `@azmr/ui` components, all
 * from server-safe entries (see /docs/guide/server-components), so it renders on the server and
 * adds no JavaScript to the landing page. No link here prefetches: see LandingCard.
 */
export function DesignSystem({ componentCount }: { componentCount: number }) {
  return (
    <section className="w-full">
      <div className="mx-auto grid max-w-5xl gap-10 px-8 py-16 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-sm text-fd-primary">@azmr/ui</p>
          <h2 className="text-3xl font-bold tracking-tight">
            A design system on Base UI and Tailwind v4 tokens
          </h2>
          <p className="text-fd-muted-foreground">
            {componentCount} components with live demos, every one checked with axe in CI. Theme it
            with CSS variables, copy a component into your app with the shadcn registry, or import
            it from the package. The preview on this page is the real package, rendered on the
            server.
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            <li>Keyboard and screen reader behaviour built on Base UI primitives</li>
            <li>
              Tokens for colour, spacing and density, with light and dark themes, no JavaScript
            </li>
            <li>Server-safe entries cost no JavaScript in the browser</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              prefetch={false}
              href="/docs/components"
              className="rounded-md bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-colors hover:opacity-90"
            >
              Browse components
            </Link>
            <Link
              prefetch={false}
              href="/docs/guide/why-azmr-ui"
              className="rounded-md border border-fd-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
            >
              Why @azmr/ui
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>October invoices</CardTitle>
            <CardDescription>Northline Electrical Ltd</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Stepper steps={steps} current={1} label="Invoice progress" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableHead scope="row" className="font-normal text-foreground">
                      {invoice.id}
                    </TableHead>
                    <TableCell>
                      <Badge variant={invoice.variant}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell numeric>{invoice.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Alert variant="warning">
              <AlertTitle>One invoice is overdue</AlertTitle>
              <AlertDescription>INV-004 was due on 12 October.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
