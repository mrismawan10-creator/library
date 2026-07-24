"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Area } from "react-easy-crop";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { CoverCropDialog } from "@/components/prompts/cover-crop-dialog";

/**
 * Upload or remove a category's template cover (FR-08, FR-09). A small 2:3
 * preview doubles as the upload trigger; the same crop dialog as prompt covers
 * handles positioning.
 */
export function CategoryTemplateControl({
  categoryId,
  categoryName,
  templateUrl,
}: {
  categoryId: string;
  categoryName: string;
  templateUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    if (chosen.size > MAX_UPLOAD_BYTES) {
      toast.error("The image must be 10 MB or smaller.");
      return;
    }
    setFile(chosen);
  }

  async function upload(crop: Area) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("crop", JSON.stringify(crop));
      const response = await fetch(`/api/categories/${categoryId}/cover`, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiError(data?.error?.message ?? "Upload failed.", response.status);
      }
      toast.success("Template cover set");
      setFile(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}/cover`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiError(data?.error?.message ?? "Could not remove.", response.status);
      }
      toast.success("Template removed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={pickFile}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={
          templateUrl
            ? `Replace template cover for ${categoryName}`
            : `Add template cover for ${categoryName}`
        }
        title={templateUrl ? "Replace template" : "Add template"}
        className="border-border hover:border-primary/50 relative h-16 w-11 shrink-0 overflow-hidden rounded-md border disabled:opacity-40"
      >
        {templateUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={templateUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <ImagePlus
            aria-hidden
            className="text-muted-foreground absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2"
          />
        )}
      </button>

      {templateUrl ? (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive text-xs underline-offset-2 hover:underline disabled:opacity-40"
        >
          Remove
        </button>
      ) : null}

      <CoverCropDialog
        file={file}
        open={file !== null}
        onCancel={() => setFile(null)}
        onConfirm={upload}
        busy={busy}
      />
    </div>
  );
}
