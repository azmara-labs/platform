import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@azmr/ui/table";

const invoices = [
  { id: "INV-001", status: "Paid", amount: 250 },
  { id: "INV-002", status: "Pending", amount: 1250 },
  { id: "INV-003", status: "Paid", amount: 480.5 },
  { id: "INV-004", status: "Overdue", amount: 90 },
];

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

export default function TableBasic() {
  const total = invoices.reduce((sum, i) => sum + i.amount, 0);
  return (
    <Table striped hoverable className="max-w-xl">
      <TableCaption>Invoices for October</TableCaption>
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
            <TableCell>{invoice.status}</TableCell>
            <TableCell numeric>{nzd.format(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell numeric>{nzd.format(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
