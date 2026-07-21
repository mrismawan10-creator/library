import { Heart } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PromptList } from "@/components/prompts/prompt-list";
import { listPrompts } from "@/lib/data/prompts";

export const metadata = { title: "Favorites" };

export const dynamic = "force-dynamic";

/** FR-13. Archived favorites never appear here. */
export default async function FavoritesPage() {
  const prompts = await listPrompts({
    query: { status: "active", favorite: true },
  });

  return (
    <>
      <PageHeader
        title="Favorites"
        description="Prompts you have marked as favorite."
      />
      {prompts.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet."
          description="Tap the heart on any prompt and it will appear here."
          actionLabel="Browse prompts"
          actionHref="/prompts"
        />
      ) : (
        <PromptList prompts={prompts} />
      )}
    </>
  );
}
