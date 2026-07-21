"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { CategoryWithCount } from "@/lib/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 * Category management (FR-09).
 *
 * Reordering is up/down buttons rather than drag and drop: the requirement is
 * that the order can be changed, and buttons are operable by keyboard and
 * screen reader without a custom drag implementation.
 */
export function CategoryManager({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CategoryWithCount | null>(
    null,
  );

  const fail = (error: unknown, fallback: string) =>
    toast.error(error instanceof ApiError ? error.message : fallback);

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    try {
      await action();
      router.refresh();
    } catch (error) {
      fail(error, fallback);
    } finally {
      setBusy(false);
    }
  }

  const create = () =>
    run(async () => {
      const name = newName.trim();
      if (!name) return;
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewName("");
      toast.success("Category added");
    }, "Could not add the category.");

  const rename = (id: string) =>
    run(async () => {
      const name = editingName.trim();
      if (!name) return;
      await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setEditingId(null);
      toast.success("Category renamed");
    }, "Could not rename the category.");

  const toggleHome = (category: CategoryWithCount) =>
    run(async () => {
      await apiFetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ show_on_home: !category.show_on_home }),
      });
    }, "Could not update the category.");

  const move = (index: number, direction: -1 | 1) =>
    run(async () => {
      const next = [...categories];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      await apiFetch("/api/categories/reorder", {
        method: "PATCH",
        body: JSON.stringify({ ids: next.map((item) => item.id) }),
      });
    }, "Could not reorder categories.");

  const confirmDelete = () =>
    run(async () => {
      if (!pendingDelete) return;
      await apiFetch(`/api/categories/${pendingDelete.id}`, {
        method: "DELETE",
      });
      setPendingDelete(null);
      toast.success("Category deleted");
    }, "Could not delete the category.");

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex gap-3">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New category name"
          aria-label="New category name"
          className="max-w-xs"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void create();
            }
          }}
        />
        <Button className="min-h-11" disabled={busy || !newName.trim()} onClick={create}>
          Add
        </Button>
      </div>

      <ul className="space-y-2">
        {categories.map((category, index) => (
          <li
            key={category.id}
            className="border-border bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3"
          >
            {editingId === category.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  aria-label={`Rename ${category.name}`}
                  className="max-w-xs"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void rename(category.id);
                    }
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
                <Button size="sm" disabled={busy} onClick={() => rename(category.id)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {category.prompt_count}{" "}
                    {category.prompt_count === 1 ? "prompt" : "prompts"}
                    {category.show_on_home ? "" : " · hidden from home"}
                  </p>
                </div>

                <IconButton
                  label={`Move ${category.name} up`}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Move ${category.name} down`}
                  disabled={busy || index === categories.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={
                    category.show_on_home
                      ? `Hide ${category.name} from home`
                      : `Show ${category.name} on home`
                  }
                  disabled={busy}
                  onClick={() => toggleHome(category)}
                >
                  {category.show_on_home ? (
                    <Eye aria-hidden className="size-4" />
                  ) : (
                    <EyeOff aria-hidden className="size-4" />
                  )}
                </IconButton>
                <IconButton
                  label={`Rename ${category.name}`}
                  disabled={busy}
                  onClick={() => {
                    setEditingId(category.id);
                    setEditingName(category.name);
                  }}
                >
                  <Pencil aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Delete ${category.name}`}
                  disabled={busy}
                  onClick={() => setPendingDelete(category)}
                  destructive
                >
                  <Trash2 aria-hidden className="size-4" />
                </IconButton>
              </>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{pendingDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.prompt_count
                ? `${pendingDelete.prompt_count} ${
                    pendingDelete.prompt_count === 1 ? "prompt" : "prompts"
                  } will become uncategorized. No prompt is deleted.`
                : "This category holds no prompts."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={
        destructive
          ? "text-muted-foreground hover:text-destructive inline-flex size-11 items-center justify-center rounded-lg disabled:opacity-40"
          : "text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center rounded-lg disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}
