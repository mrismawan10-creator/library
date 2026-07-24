import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { buildExportBundle } from "@/lib/data/export";

export const metadata = { title: "Export" };

export const dynamic = "force-dynamic";

/** FR-18. The download itself is served by /api/export/json. */
export default async function ExportPage() {
  const bundle = await buildExportBundle();

  return (
    <>
      <PageHeader
        title="Export"
        description="Download the whole library as JSON, including archived prompts. Covers are represented by path and metadata only — never binary data — and secrets are never exported."
      />

      <div className="surface-glass max-w-xl space-y-4 rounded-2xl p-6">
        <dl className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
          <Stat label="Prompts" value={bundle.prompts.length} />
          <Stat label="Categories" value={bundle.categories.length} />
          <Stat label="Tags" value={bundle.tags.length} />
          <Stat
            label="Archived included"
            value={bundle.prompts.filter((p) => p.status === "archived").length}
          />
        </dl>

        <a
          href="/api/export/json"
          download
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors"
        >
          <Download aria-hidden className="size-4" />
          Download JSON
        </a>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
