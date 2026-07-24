"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PromptCardWithCover } from "@/lib/schemas";
import { PromptCard } from "@/components/prompts/prompt-card";

/**
 * One horizontal row of the catalog (FR-01).
 *
 * Embla handles the desktop arrows; the track stays natively scrollable so
 * touch and keyboard work even before the carousel hydrates. Empty rows never
 * reach this component — they are dropped by the query.
 */
export function CategoryRow({
  title,
  prompts,
  seeAllHref,
  onCopy,
  copyingId,
}: {
  title: string;
  prompts: PromptCardWithCover[];
  seeAllHref?: string;
  onCopy: (id: string) => void;
  copyingId: string | null;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              See all
            </Link>
          ) : null}
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => emblaApi?.scrollPrev()}
            className="text-muted-foreground hover:text-foreground hidden size-11 items-center justify-center rounded-lg lg:inline-flex"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => emblaApi?.scrollNext()}
            className="text-muted-foreground hover:text-foreground hidden size-11 items-center justify-center rounded-lg lg:inline-flex"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-4">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onCopy={onCopy}
              isCopying={copyingId === prompt.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
