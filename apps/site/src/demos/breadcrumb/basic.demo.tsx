import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumbs,
} from "@azmr/ui/breadcrumb";

export default function BreadcrumbBasic() {
  return (
    <div className="flex flex-col gap-6">
      {/* From the parts, for full control. */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* From data. The last item is always the current page. */}
      <Breadcrumbs
        label="Breadcrumb from data"
        items={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: "Website relaunch" },
        ]}
      />

      {/* A long trail collapses the middle. */}
      <Breadcrumbs
        label="Collapsed breadcrumb"
        maxItems={4}
        items={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: "Website", href: "/projects/website" },
          { label: "Design", href: "/projects/website/design" },
          { label: "Tokens", href: "/projects/website/design/tokens" },
          { label: "Colours" },
        ]}
      />
    </div>
  );
}
