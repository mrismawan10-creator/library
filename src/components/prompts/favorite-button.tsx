"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Favorite toggle (FR-13). Optimistic, because the whole point is that it feels
 * instant; a failure rolls the icon back and says so.
 */
export function FavoriteButton({
  promptId,
  isFavorite,
  className,
}: {
  promptId: string;
  isFavorite: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [, startTransition] = useTransition();

  async function toggle(event: React.MouseEvent) {
    // The card is a link; favoriting must not navigate.
    event.preventDefault();
    event.stopPropagation();

    const next = !optimistic;
    setOptimistic(next);

    try {
      await apiFetch(`/api/prompts/${promptId}/favorite`, {
        method: "POST",
        body: JSON.stringify({ value: next }),
      });
      startTransition(() => router.refresh());
    } catch {
      setOptimistic(!next);
      toast.error("Could not update favorite.");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-lg transition-colors",
        optimistic
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn("size-5", optimistic && "fill-current")}
      />
    </button>
  );
}
