import { Heart } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Favorites" };

/** FR-13. Archived favorites never appear here. */
export default function FavoritesPage() {
  return (
    <>
      <PageHeader
        title="Favorites"
        description="Prompts you have marked as favorite."
      />
      <EmptyState
        icon={Heart}
        title="No favorites yet."
        description="Mark a prompt as favorite and it will appear here."
        actionLabel="Browse prompts"
        actionHref="/prompts"
      />
    </>
  );
}
