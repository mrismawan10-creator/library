import { LibraryBig } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PromptList } from "@/components/prompts/prompt-list";
import { listPrompts } from "@/lib/data/prompts";
import { listCategories } from "@/lib/data/categories";

export const metadata = { title: "All Prompts" };

/** Always reflects the current database rather than a build-time snapshot. */
export const dynamic = "force-dynamic";

/**
 * FR-01. `?category=` is what the catalog's "See all" links point at; the full
 * filter and sort UI arrives in Milestone 4.
 */
export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [prompts, categories] = await Promise.all([
    listPrompts({ status: "active", categorySlug: category }),
    category ? listCategories() : Promise.resolve([]),
  ]);

  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <>
      <PageHeader
        title={activeCategory ? activeCategory.name : "All Prompts"}
        description={
          activeCategory
            ? activeCategory.description ?? undefined
            : "Every active prompt, newest first."
        }
      />
      {prompts.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title={activeCategory ? "Nothing in this category yet." : "No prompts yet."}
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
