import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Export" };

/** FR-18. The JSON export is built in Milestone 5. */
export default function ExportPage() {
  return (
    <>
      <PageHeader
        title="Export"
        description="Download the whole library as JSON, including archived prompts. Covers are represented by path and metadata, never as binary data, and secrets are never exported."
      />
      <p className="text-muted-foreground text-sm">
        Export arrives in Milestone 5.
      </p>
    </>
  );
}
