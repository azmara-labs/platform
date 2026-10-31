import { Loading, Spinner } from "@azmr/ui/loading";

export default function LoadingBasic() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-6">
        <Spinner size="xs" />
        <Spinner size="sm" />
        <Spinner size="md" tone="default" />
        <Spinner size="lg" tone="success" />
        <Spinner size="xl" tone="info" />
      </div>
      <div className="flex flex-wrap items-center gap-8">
        <Loading />
        <Loading label="Loading data" tone="default" />
        <Loading label="Loading invoices…" labelPlacement="bottom" size="md" tone="default" />
      </div>
    </div>
  );
}
