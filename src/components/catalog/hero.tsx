"use client";

import Link from "next/link";
import { Copy } from "lucide-react";
import { Cover } from "@/components/covers/cover";
import type { PromptCardWithCover } from "@/lib/schemas";
import { FavoriteButton } from "@/components/prompts/favorite-button";
import { Button } from "@/components/ui/button";

/**
 * The hero prompt (FR-02). Which prompt lands here is decided on the server by
 * the featured → recently used favorite → newest fallback; this only renders it.
 */
export function Hero({
  prompt,
  onCopy,
  isCopying,
}: {
  prompt: PromptCardWithCover;
  onCopy: (id: string) => void;
  isCopying: boolean;
}) {
  return (
    <section
      aria-label="Featured prompt"
      className="surface-glass grid gap-6 rounded-2xl p-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-8"
    >
      <Link href={`/prompts/${prompt.id}`} className="block max-w-40">
        <Cover
          url={prompt.poster_url}
          title={prompt.title}
          categoryName={prompt.category_name}
          categorySlug={prompt.category_slug}
          priority
        />
      </Link>

      <div className="min-w-0 space-y-4">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
            {prompt.is_featured ? "Featured" : "Pick up where you left off"}
          </p>
          <h2 className="text-2xl font-semibold sm:text-3xl">{prompt.title}</h2>
          <p className="text-muted-foreground line-clamp-3 max-w-prose text-sm">
            {prompt.excerpt}
          </p>
          <p className="text-muted-foreground text-xs">
            {prompt.category_name ?? "Uncategorized"} · {prompt.output_type}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="min-h-11"
            disabled={isCopying}
            onClick={() => onCopy(prompt.id)}
          >
            <Copy aria-hidden className="size-4" />
            {isCopying ? "Copying…" : "Copy Prompt"}
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href={`/prompts/${prompt.id}`}>View Prompt</Link>
          </Button>
          <FavoriteButton
            promptId={prompt.id}
            isFavorite={prompt.is_favorite}
          />
        </div>
      </div>
    </section>
  );
}
