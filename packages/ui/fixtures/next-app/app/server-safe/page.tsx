import { Breadcrumbs } from "@azmr/ui/breadcrumb";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
} from "@azmr/ui/display";
import { Icon as NamedIcon } from "@azmr/ui/icons/lucide";
import { Container, Stack } from "@azmr/ui/layout";
import { Pagination } from "@azmr/ui/pagination";
import { Spinner } from "@azmr/ui/spinner";
import { Stepper } from "@azmr/ui/stepper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@azmr/ui/table";
import { Heading, Text } from "@azmr/ui/typography";

// Only server-safe entries, rendered from a Server Component. The guide promises these cost no
// JavaScript in the browser, so verify-consumer checks this route's client-reference manifest
// lists nothing from @azmr/ui or lucide-react (PAZM-142: lucide-react's icons are client
// components, and five of these entries used to import them).
export default function ServerSafePage() {
  return (
    <Container>
      <Stack gap={4}>
        <Heading level={1}>Server-safe entries</Heading>
        <Text>Every component on this page renders on the server.</Text>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Server-safe" }]} />
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Stepper
              steps={[{ label: "Quote" }, { label: "Invoice" }, { label: "Paid" }]}
              current={1}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>INV-001</TableCell>
                  <TableCell>
                    <Badge variant="success">Paid</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Alert variant="warning">
          <AlertTitle>One invoice is overdue</AlertTitle>
          <AlertDescription>INV-004 was due on 12 October.</AlertDescription>
        </Alert>
        <Chip>Draft</Chip>
        <NamedIcon name="search" aria-label="Search" />
        <Spinner label="Loading" />
        <Pagination page={2} pageCount={10} hrefFor={(page) => `/server-safe?page=${page}`} />
      </Stack>
    </Container>
  );
}
