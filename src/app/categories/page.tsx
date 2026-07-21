import { FolderTree } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Categories" };

/** FR-09. Create, edit, reorder, and delete land in Milestone 4. */
export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Categories"
        description="Deleting a category never deletes its prompts; they become uncategorized."
      />
      <EmptyState
        icon={FolderTree}
        title="Category management arrives in Milestone 4."
        description="The six starter categories are seeded with the database migrations."
      />
    </>
  );
}
