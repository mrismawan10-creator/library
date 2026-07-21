import { Suspense } from "react";
import { LibraryBig, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PromptList } from "@/components/prompts/prompt-list";
import { SearchInput } from "@/components/discovery/search-input";
import {
  ActiveFilterChips,
  FilterControls,
} from "@/components/discovery/filter-controls";
import { listPrompts } from "@/lib/data/prompts";
import { listCategories } from "@/lib/data/categories";
import { listTags } from "@/lib/data/tags";
import { hasActiveFilters, promptQuerySchema } from "@/lib/schemas";

export const metadata = { title: "All Prompts" };

export const dynamic = "force-dynamic";

/**
 * Search, filter, and sort (FR-11, FR-12).
 *
 * The query lives entirely in the URL, so this stays a server component: every
 * result set is rendered on the server and is shareable as a link.
 */
export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = promptQuerySchema.parse(raw);

  const [prompts, categories, tags] = await Promise.all([
    listPrompts({ query }),
    listCategories(),
    listTags(),
  ]);

  const filtered = hasActiveFilters(query);
  const activeCategory = categories.find((item) => item.slug === query.category);

  return (
    <>
      <PageHeader
        title={activeCategory ? activeCategory.name : "All Prompts"}
        description={
          activeCategory
            ? (activeCategory.description ?? undefined)
            : "Search across titles, prompt text, descriptions, tags, and models."
        }
      />

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Suspense fallback={null}>
            <SearchInput />
          </Suspense>
          <Suspense fallback={null}>
            <FilterControls categories={categories} tags={tags} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ActiveFilterChips />
        </Suspense>
      </div>

      {prompts.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title="No prompts match your search."
            description="Try a different word, remove a filter, or add a new prompt."
            actionLabel="Add a prompt"
            actionHref="/prompts/new"
          />
        ) : (
          <EmptyState
            icon={LibraryBig}
            title="No prompts yet."
            description="Prompts you save will be listed here."
            actionLabel="Add your first prompt"
            actionHref="/prompts/new"
          />
        )
      ) : (
        <>
          <p className="text-muted-foreground mb-4 text-sm" aria-live="polite">
            {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
          </p>
          <PromptList prompts={prompts} query={query.q} />
        </>
      )}
    </>
  );
}
