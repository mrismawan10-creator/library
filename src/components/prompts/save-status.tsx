"use client";

import { AlertTriangle, Check, Loader2, PencilLine } from "lucide-react";
import type { SaveStatus } from "@/lib/hooks/use-autosave";
import { Button } from "@/components/ui/button";

const LABELS: Record<SaveStatus, string> = {
  idle: "",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
};

/**
 * The autosave indicator (FR-06). Announced politely rather than assertively so
 * it never interrupts typing (PRD §13), and it must stay visible: there is no
 * version history behind it.
 */
export function SaveStatusIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p
        aria-live="polite"
        role="status"
        className={
          status === "failed"
            ? "text-destructive flex items-center gap-2 text-sm"
            : "text-muted-foreground flex items-center gap-2 text-sm"
        }
      >
        {status === "saving" ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : null}
        {status === "saved" ? <Check aria-hidden className="size-4" /> : null}
        {status === "unsaved" ? (
          <PencilLine aria-hidden className="size-4" />
        ) : null}
        {status === "failed" ? (
          <AlertTriangle aria-hidden className="size-4" />
        ) : null}
        {LABELS[status]}
      </p>

      {status === "failed" ? (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
