import { PageHeader } from "@/components/layout/page-header";

/** FR-05 / FR-06. Detail view, autosave, and actions are built in Milestone 2. */
export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Prompt" />
      <p className="text-muted-foreground text-sm">
        Detail view for <code className="font-mono">{id}</code> arrives in
        Milestone 2.
      </p>
    </>
  );
}
