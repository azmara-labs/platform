import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@azmr/ui/table";

const rows = Array.from({ length: 24 }, (_, i) => ({
  id: `CUST-${String(i + 1).padStart(3, "0")}`,
  name: ["Aroha Ngata", "Tane Walker", "Mere Parata", "Hemi Rangi"][i % 4],
  city: ["Hamilton", "Auckland", "Wellington", "Dunedin"][i % 4],
  orders: (i * 7) % 31,
}));

export default function TableSticky() {
  return (
    <Table
      label="Customers (scrollable)"
      stickyHeader
      hoverable
      containerClassName="max-h-64 max-w-xl rounded-md border border-border"
    >
      <TableCaption srOnly>Customers, with their city and order count</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>City</TableHead>
          <TableHead align="right">Orders</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.id}</TableCell>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.city}</TableCell>
            <TableCell numeric>{r.orders}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
