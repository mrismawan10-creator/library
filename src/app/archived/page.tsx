import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PromptList } from "@/components/prompts/prompt-list";
import { listPrompts } from "@/lib/data/prompts";

export const metadata = { title: "Archived" };

export const dynamic = "force-dynamic";

/** FR-15. Archived prompts stay restorable and never reach home or search. */
export default async function ArchivedPage() {
  const prompts = await listPrompts({ query: { status: "archived" } });

  return (
    <>
      <PageHeader
        title="Archived"
        description="Hidden from home and search, kept and restorable. Open a prompt to restore it."
      />
      {prompts.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nothing archived."
          description="Archiving a prompt hides it from the catalog without deleting it."
        />
      ) : (
        <PromptList prompts={prompts} />
      )}
    </>
  );
}
