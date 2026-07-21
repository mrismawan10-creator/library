import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Archived" };

/** FR-15. Archived prompts stay restorable and never reach home or search. */
export default function ArchivedPage() {
  return (
    <>
      <PageHeader
        title="Archived"
        description="Hidden from home and search, kept and restorable."
      />
      <EmptyState
        icon={Archive}
        title="Nothing archived."
        description="Archiving a prompt hides it from the catalog without deleting it."
      />
    </>
  );
}
