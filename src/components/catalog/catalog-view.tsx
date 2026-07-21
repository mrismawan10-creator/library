"use client";

import type { PromptCard as PromptCardData } from "@/lib/schemas";
import type { CatalogRow } from "@/lib/data/catalog";
import { useCopyPrompt } from "@/lib/hooks/use-copy-prompt";
import { CopyFallbackDialog } from "@/components/prompts/copy-fallback-dialog";
import { Hero } from "./hero";
import { CategoryRow } from "./category-row";

/**
 * The client half of the home catalog.
 *
 * Copy state lives here, once, so the hero and every card share a single
 * clipboard path and a single fallback dialog. The data itself is fetched on
 * the server and passed down.
 */
export function CatalogView({
  hero,
  rows,
}: {
  hero: PromptCardData | null;
  rows: CatalogRow[];
}) {
  const { copyPrompt, fallbackText, clearFallback, copyingId } =
    useCopyPrompt();

  const onCopy = (id: string) => void copyPrompt(id);

  return (
    <div className="space-y-10">
      {hero ? (
        <Hero prompt={hero} onCopy={onCopy} isCopying={copyingId === hero.id} />
      ) : null}

      {rows.map((row) => (
        <CategoryRow
          key={row.key}
          title={row.title}
          prompts={row.prompts}
          seeAllHref={
            row.categorySlug ? `/prompts?category=${row.categorySlug}` : undefined
          }
          onCopy={onCopy}
          copyingId={copyingId}
        />
      ))}

      <CopyFallbackDialog text={fallbackText} onClose={clearFallback} />
    </div>
  );
}
