"use client";

import { Button, IconButton } from "@azmr/ui/button";
import { Badge, EmptyState } from "@azmr/ui/display";
import { Icon } from "@azmr/ui/icons";
import { Input } from "@azmr/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@azmr/ui/menu";
import { Pagination } from "@azmr/ui/pagination";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@azmr/ui/table";
import { toast } from "@azmr/ui/toast";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Search, SearchX } from "lucide-react";
import { useId, useMemo, useState } from "react";

interface Customer {
  name: string;
  plan: "Starter" | "Business" | "Enterprise";
  status: "Active" | "Trial" | "Overdue";
  monthly: number;
}

const CUSTOMERS: Customer[] = [
  { name: "Aroha Ngata", plan: "Business", status: "Active", monthly: 240 },
  { name: "Mere Walker", plan: "Starter", status: "Trial", monthly: 0 },
  { name: "Hemi Te Rangi", plan: "Enterprise", status: "Active", monthly: 1800 },
  { name: "Tane Smith", plan: "Business", status: "Overdue", monthly: 240 },
  { name: "Rangi Bell", plan: "Starter", status: "Active", monthly: 49 },
  { name: "Kiri Parata", plan: "Business", status: "Active", monthly: 240 },
  { name: "Hana Cooper", plan: "Starter", status: "Overdue", monthly: 49 },
  { name: "Wiremu Tait", plan: "Enterprise", status: "Trial", monthly: 0 },
  { name: "Anika Rao", plan: "Business", status: "Active", monthly: 240 },
  { name: "Ngaio Reid", plan: "Starter", status: "Active", monthly: 49 },
  { name: "Tui Anderson", plan: "Business", status: "Trial", monthly: 0 },
  { name: "Manu Kerr", plan: "Enterprise", status: "Active", monthly: 1800 },
];

const STATUS_TONE = { Active: "success", Trial: "info", Overdue: "destructive" } as const;
const PAGE_SIZE = 5;
const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

type SortKey = "name" | "plan" | "status" | "monthly";

export default function DataTablePage() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "ascending" | "descending" }>({
    key: "name",
    direction: "ascending",
  });
  const [page, setPage] = useState(1);

  // Filter, then sort, then take the page. Each step works on the result of the one before.
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const found = CUSTOMERS.filter(
      (c) => !needle || `${c.name} ${c.plan} ${c.status}`.toLowerCase().includes(needle),
    );
    const factor = sort.direction === "ascending" ? 1 : -1;
    return [...found].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      return (
        (typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y))) * factor
      );
    });
  }, [query, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function sortBy(key: SortKey) {
    setSort((s) => ({
      key,
      direction: s.key === key && s.direction === "ascending" ? "descending" : "ascending",
    }));
    setPage(1);
  }

  function header(key: SortKey, label: string, align?: "right") {
    const active = sort.key === key;
    const arrow = !active ? ArrowUpDown : sort.direction === "ascending" ? ArrowUp : ArrowDown;
    return (
      // aria-sort belongs on the column header, and only on the column that is sorted.
      <TableHead align={align} aria-sort={active ? sort.direction : undefined}>
        <Button
          variant="ghost"
          size="sm"
          className="-mx-2"
          endIcon={<Icon icon={arrow} />}
          onClick={() => sortBy(key)}
        >
          {label}
        </Button>
      </TableHead>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-sm flex-col gap-2">
        <label htmlFor={searchId} className="text-sm font-medium">
          Search customers
        </label>
        <div className="relative">
          <Icon
            icon={Search}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            className="pl-9"
            placeholder="Name, plan or status"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Icon icon={SearchX} size="xl" />}
          title="No customers match"
          description={`Nothing matches “${query}”. Check the spelling or clear the search.`}
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <Table hoverable>
          <TableCaption>Customers, sorted by {sort.key}</TableCaption>
          <TableHeader>
            <TableRow>
              {header("name", "Name")}
              {header("plan", "Plan")}
              {header("status", "Status")}
              {header("monthly", "Monthly", "right")}
              <TableHead align="right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((customer) => (
              <TableRow key={customer.name}>
                <TableHead scope="row" className="font-normal text-foreground">
                  {customer.name}
                </TableHead>
                <TableCell>{customer.plan}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_TONE[customer.status]}>{customer.status}</Badge>
                </TableCell>
                <TableCell numeric>{nzd.format(customer.monthly)}</TableCell>
                <TableCell align="right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <IconButton
                          icon={<Icon icon={MoreHorizontal} />}
                          label={`Actions for ${customer.name}`}
                          variant="ghost"
                          size="sm"
                        />
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => toast(`Opened ${customer.name}`)}>
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast("Email copied")}>
                        Copy email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {rows.length === 0
            ? "0 customers"
            : `Showing ${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + shown.length} of ${rows.length} customers`}
        </p>
        {pageCount > 1 && (
          <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
