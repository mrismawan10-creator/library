"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, MoreVertical, Star } from "lucide-react";
import { toast } from "sonner";
import type { PromptCard as PromptCardData } from "@/lib/schemas";
import { apiFetch } from "@/lib/api/client";
import { PlaceholderCover } from "@/components/covers/placeholder-cover";
import { FavoriteButton } from "./favorite-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A poster card (FR-03).
 *
 * The cover and title open the detail page; Copy, Favorite, and the menu do
 * not. Everything a pointer can do here has a tap equivalent, and the excerpt
 * shown is the server's — it never reaches the clipboard (PRD §14).
 */
export function PromptCard({
  prompt,
  onCopy,
  isCopying,
}: {
  prompt: PromptCardData;
  onCopy: (id: string) => void;
  isCopying: boolean;
}) {
  const router = useRouter();

  async function setFeatured() {
    try {
      await apiFetch(`/api/prompts/${prompt.id}/feature`, {
        method: "POST",
        body: JSON.stringify({ value: !prompt.is_featured }),
      });
      toast.success(
        prompt.is_featured ? "Removed from featured" : "Set as featured",
      );
      router.refresh();
    } catch {
      toast.error("Could not update featured.");
    }
  }

  async function archive() {
    try {
      await apiFetch(`/api/prompts/${prompt.id}/archive`, { method: "POST" });
      toast.success("Prompt archived");
      router.refresh();
    } catch {
      toast.error("Could not archive the prompt.");
    }
  }

  return (
    <article className="group w-40 shrink-0 sm:w-44">
      <Link
        href={`/prompts/${prompt.id}`}
        className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <PlaceholderCover
          title={prompt.title}
          categoryName={prompt.category_name}
          categorySlug={prompt.category_slug}
          className="transition-transform group-hover:scale-[1.02]"
        />
      </Link>

      <div className="mt-3 space-y-1">
        <Link href={`/prompts/${prompt.id}`} className="block">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">
            {prompt.title}
          </h3>
        </Link>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {prompt.excerpt}
        </p>
        <p className="text-muted-foreground text-[11px]">
          {prompt.output_type}
          {prompt.is_featured ? " · Featured" : ""}
        </p>
      </div>

      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCopy(prompt.id)}
          disabled={isCopying}
          aria-label={`Copy ${prompt.title}`}
          className="text-muted-foreground hover:text-primary inline-flex size-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
        >
          <Copy aria-hidden className="size-5" />
        </button>

        <FavoriteButton
          promptId={prompt.id}
          isFavorite={prompt.is_favorite}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More actions for ${prompt.title}`}
            className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center rounded-lg transition-colors"
          >
            <MoreVertical aria-hidden className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link href={`/prompts/${prompt.id}`}>Open detail</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopy(prompt.id)}>
              Copy prompt
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={setFeatured}>
              <Star aria-hidden className="size-4" />
              {prompt.is_featured ? "Remove featured" : "Set as featured"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={archive}>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
