"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Archive, restore, and permanent delete (FR-15, FR-16).
 *
 * Delete is irreversible and there is no restore, so it always goes through a
 * confirmation that names the prompt being destroyed.
 */
export function PromptActions({
  promptId,
  title,
  status,
  isFeatured,
}: {
  promptId: string;
  title: string;
  status: "active" | "archived";
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reportFailure(error: unknown, fallback: string) {
    toast.error(error instanceof ApiError ? error.message : fallback);
  }

  async function toggleArchive() {
    const archiving = status === "active";
    setBusy(true);
    try {
      await apiFetch(
        `/api/prompts/${promptId}/${archiving ? "archive" : "restore"}`,
        { method: "POST" },
      );
      toast.success(archiving ? "Prompt archived" : "Prompt restored");
      startTransition(() => router.refresh());
    } catch (error) {
      reportFailure(error, "Could not update the prompt.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await apiFetch(`/api/prompts/${promptId}`, { method: "DELETE" });
      setConfirmOpen(false);
      toast.success("Prompt deleted");
      router.replace("/prompts");
      router.refresh();
    } catch (error) {
      reportFailure(error, "Could not delete the prompt.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * FR-14: only one prompt is featured at a time, and an archived one never is.
   * The swap itself happens inside a database transaction.
   */
  async function toggleFeatured() {
    setBusy(true);
    try {
      await apiFetch(`/api/prompts/${promptId}/feature`, {
        method: "POST",
        body: JSON.stringify({ value: !isFeatured }),
      });
      toast.success(isFeatured ? "Removed from featured" : "Set as featured");
      startTransition(() => router.refresh());
    } catch (error) {
      reportFailure(error, "Could not update featured.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending;

  return (
    <>
      {status === "active" ? (
        <Button
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          onClick={toggleFeatured}
        >
          {isFeatured ? "Unfeature" : "Set as featured"}
        </Button>
      ) : null}

      <Button
        variant="outline"
        className="min-h-11"
        disabled={disabled}
        onClick={toggleArchive}
      >
        {status === "active" ? "Archive" : "Restore"}
      </Button>

      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive min-h-11"
        disabled={disabled}
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}” permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the prompt, its tag links, and its custom cover. It
              cannot be undone and there is no restore. Archive instead if you
              only want it out of the way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
