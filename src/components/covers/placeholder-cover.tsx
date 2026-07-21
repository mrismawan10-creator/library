import { getPlaceholderCover } from "@/lib/covers/placeholder";
import { cn } from "@/lib/utils";

/**
 * A 2:3 generated cover, used until a prompt has an uploaded cover or a
 * category template (PRD §11 fallback order, §21.8).
 *
 * Rendered as CSS rather than an image: nothing to fetch, nothing to lay out
 * late, and it survives being server-rendered. It is decorative, so the title
 * it shows is the accessible name and the gradient itself is hidden from
 * assistive technology.
 */
export function PlaceholderCover({
  title,
  categoryName,
  categorySlug,
  className,
}: {
  title: string;
  categoryName?: string | null;
  categorySlug?: string | null;
  className?: string;
}) {
  const { backgroundImage } = getPlaceholderCover(title, categorySlug);

  return (
    <div
      role="img"
      aria-label={
        categoryName
          ? `${title} — ${categoryName} placeholder cover`
          : `${title} — placeholder cover`
      }
      style={{ backgroundImage }}
      className={cn(
        "aspect-poster relative flex flex-col justify-end overflow-hidden rounded-xl p-4",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
      />
      <div aria-hidden className="relative">
        {categoryName ? (
          <p className="text-[10px] tracking-[0.12em] text-white/70 uppercase">
            {categoryName}
          </p>
        ) : null}
        <p className="mt-1 line-clamp-3 font-serif text-sm leading-snug font-medium text-white">
          {title}
        </p>
      </div>
    </div>
  );
}
