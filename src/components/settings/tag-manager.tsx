"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { TagWithCount } from "@/lib/data/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Tag management (FR-10). Nothing here can touch a prompt: renaming edits the
 * tag row, deleting removes the tag and its links only.
 */
export function TagManager({ tags }: { tags: TagWithCount[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const unusedCount = tags.filter((tag) => tag.prompt_count === 0).length;

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    try {
      await action();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const rename = (id: string) =>
    run(async () => {
      const name = editingName.trim();
      if (!name) return;
      await apiFetch(`/api/tags/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setEditingId(null);
      toast.success("Tag renamed");
    }, "Could not rename the tag.");

  const remove = (tag: TagWithCount) =>
    run(async () => {
      await apiFetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      toast.success("Tag deleted");
    }, "Could not delete the tag.");

  const cleanup = () =>
    run(async () => {
      const { removed } = await apiFetch<{ removed: number }>(
        "/api/tags/cleanup",
        { method: "POST" },
      );
      toast.success(
        removed === 0
          ? "No unused tags to remove"
          : `Removed ${removed} unused ${removed === 1 ? "tag" : "tags"}`,
      );
    }, "Could not clean up tags.");

  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No tags yet. Tags are created when you add them to a prompt.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {unusedCount > 0 ? (
        <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
          <p className="text-muted-foreground text-sm">
            {unusedCount} {unusedCount === 1 ? "tag is" : "tags are"} not used by
            any prompt.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={cleanup}
          >
            Remove unused
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="border-border bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3"
          >
            {editingId === tag.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  aria-label={`Rename ${tag.name}`}
                  className="max-w-xs"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void rename(tag.id);
                    }
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
                <Button size="sm" disabled={busy} onClick={() => rename(tag.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tag.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {tag.prompt_count === 0
                      ? "unused"
                      : `${tag.prompt_count} ${
                          tag.prompt_count === 1 ? "prompt" : "prompts"
                        }`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Rename ${tag.name}`}
                  disabled={busy}
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditingName(tag.name);
                  }}
                  className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center rounded-lg disabled:opacity-40"
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${tag.name}`}
                  disabled={busy}
                  onClick={() => remove(tag)}
                  className="text-muted-foreground hover:text-destructive inline-flex size-11 items-center justify-center rounded-lg disabled:opacity-40"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
