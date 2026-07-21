import { LibraryBig } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PromptList } from "@/components/prompts/prompt-list";
import { listPrompts } from "@/lib/data/prompts";

export const metadata = { title: "All Prompts" };

/** Always reflects the current database rather than a build-time snapshot. */
export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const prompts = await listPrompts({ status: "active" });

  return (
    <>
      <PageHeader
        title="All Prompts"
        description="Every active prompt, newest first."
      />
      {prompts.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title="No prompts yet."
          description="Prompts you save will be listed here."
          actionLabel="Add your first prompt"
          actionHref="/prompts/new"
        />
      ) : (
        <PromptList prompts={prompts} />
      )}
    </>
  );
}
