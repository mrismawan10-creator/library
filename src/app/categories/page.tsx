import { PageHeader } from "@/components/layout/page-header";
import { CategoryManager } from "@/components/categories/category-manager";
import { listCategoriesWithCounts } from "@/lib/data/categories";
import { signCoverUrl } from "@/lib/media/storage";

export const metadata = { title: "Categories" };

export const dynamic = "force-dynamic";

/** FR-09. Deleting a category never deletes its prompts. */
export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();

  // Sign a thumbnail for each category that has a template, for the preview.
  const withTemplates = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      template_url: category.template_cover_path
        ? await signCoverUrl(`${category.template_cover_path}/thumbnail.webp`)
        : null,
    })),
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Rename, reorder, hide from home, or delete. A category can carry a template cover, used by any prompt in it that has no cover of its own. Deleting a category leaves its prompts in place as uncategorized."
      />
      <CategoryManager categories={withTemplates} />
    </>
  );
}
