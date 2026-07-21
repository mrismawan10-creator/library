import { LibraryBig } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getCatalogRows, getHeroPrompt } from "@/lib/data/catalog";

/** Home catalog (FR-01, FR-02). Archived prompts never appear here. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [hero, rows] = await Promise.all([getHeroPrompt(), getCatalogRows()]);

  if (!hero && rows.length === 0) {
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

  return (
    <>
      <PageHeader title="Home" />
      <CatalogView hero={hero} rows={rows} />
    </>
  );
}
