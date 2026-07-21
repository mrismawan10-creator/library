import { PageHeader } from "@/components/layout/page-header";
import { TagManager } from "@/components/settings/tag-manager";
import { listTagsWithCounts } from "@/lib/data/tags";

export const metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tags = await listTagsWithCounts();

  return (
    <>
      <PageHeader title="Settings" />

      <section aria-labelledby="tags-heading" className="space-y-4">
        <div>
          <h2 id="tags-heading" className="text-lg font-semibold">
            Tags
          </h2>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            Renaming or deleting a tag never changes a prompt — only the tag and
            its links.
          </p>
        </div>
        <TagManager tags={tags} />
      </section>
    </>
  );
}
