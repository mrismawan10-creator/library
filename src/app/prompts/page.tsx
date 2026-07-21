import { LibraryBig } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "All Prompts" };

/** FR-01 / FR-12. Listing, search, filter, and sort land in M3–M4. */
export default function PromptsPage() {
  return (
    <>
      <PageHeader
        title="All Prompts"
        description="Every prompt in the library, newest first."
      />
      <EmptyState
        icon={LibraryBig}
        title="No prompts yet."
        description="Prompts you save will be listed here."
        actionLabel="Add your first prompt"
        actionHref="/prompts/new"
      />
    </>
  );
}
