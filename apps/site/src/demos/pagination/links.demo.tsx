import { Pagination } from "@azmr/ui/pagination";

// Link mode: every page is a real link, so it works without JavaScript and in a Server Component.
// `hrefFor` would normally build a URL like `/items?page=${p}`; here it points at the demo itself.
export default function PaginationLinks() {
  return (
    <div className="flex flex-col gap-6">
      <Pagination page={1} pageCount={5} hrefFor={(p) => `#page-${p}`} label="Short list" />
      <Pagination page={10} pageCount={42} hrefFor={(p) => `#page-${p}`} label="Long list" />
    </div>
  );
}
