import { Skeleton } from "@/components/ui/skeleton";

/** Shared loading state (PRD §11). */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
