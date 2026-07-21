import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * The shared empty state (PRD §11). Every list surface uses this so the copy
 * and the recovery action stay consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="surface-glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      {Icon ? (
        <Icon aria-hidden className="text-muted-foreground mb-4 size-8" />
      ) : null}
      <h2 className="text-lg font-medium">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          {description}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-medium transition-colors"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
