import { PlaceholderCover } from "./placeholder-cover";
import { cn } from "@/lib/utils";

/**
 * The one cover surface (FR-08 fallback tail).
 *
 * When a signed URL is present it renders the image; otherwise it renders the
 * generated placeholder. Callers never branch on this — resolution already
 * happened on the server, and a null URL simply means "use the placeholder".
 */
export function Cover({
  url,
  title,
  categoryName,
  categorySlug,
  priority = false,
  className,
}: {
  url: string | null;
  title: string;
  categoryName?: string | null;
  categorySlug?: string | null;
  /** The hero image is eager; catalog thumbnails are lazy. */
  priority?: boolean;
  className?: string;
}) {
  if (!url) {
    return (
      <PlaceholderCover
        title={title}
        categoryName={categoryName}
        categorySlug={categorySlug}
        className={className}
      />
    );
  }

  return (
    // Signed URLs are short-lived and per-request; next/image's caching and
    // optimizer proxy fight that, so a plain lazy <img> is the right tool.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={categoryName ? `${title} — ${categoryName} cover` : `${title} cover`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "aspect-poster w-full rounded-xl object-cover",
        className,
      )}
    />
  );
}
