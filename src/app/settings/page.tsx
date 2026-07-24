import Link from "next/link";
import { Download } from "lucide-react";
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

      <section aria-labelledby="backup-heading" className="mt-12 space-y-4">
        <div>
          <h2 id="backup-heading" className="text-lg font-semibold">
            Backup
          </h2>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            Export the whole library as JSON, including archived prompts. No
            secrets or binary covers are included.
          </p>
        </div>
        <Link
          href="/export"
          className="border-border text-foreground hover:border-primary/50 inline-flex min-h-11 items-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors"
        >
          <Download aria-hidden className="size-4" />
          Go to export
        </Link>
      </section>
    </>
  );
}
