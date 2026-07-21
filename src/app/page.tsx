import { LibraryBig } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Home catalog (FR-01). The hero and category rows arrive in Milestone 3; until
 * there is data, this is the PRD §11 empty state.
 */
export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <EmptyState
        icon={LibraryBig}
        title="Your prompt library is empty."
        description="Save your first prompt and it will show up here, in Recently Added, and in its category row."
        actionLabel="Add your first prompt"
        actionHref="/prompts/new"
      />
    </>
  );
}
