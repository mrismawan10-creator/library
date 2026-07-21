import { PageHeader } from "@/components/layout/page-header";
import { CategoryManager } from "@/components/categories/category-manager";
import { listCategoriesWithCounts } from "@/lib/data/categories";

export const metadata = { title: "Categories" };

export const dynamic = "force-dynamic";

/** FR-09. Deleting a category never deletes its prompts. */
export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();

  return (
    <>
      <PageHeader
        title="Categories"
        description="Rename, reorder, hide from home, or delete. Deleting a category leaves its prompts in place as uncategorized."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
