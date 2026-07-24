"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Area } from "react-easy-crop";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { Button } from "@/components/ui/button";
import { CoverCropDialog } from "./cover-crop-dialog";

/**
 * Cover actions on the detail page (FR-08): upload or replace, remove, and
 * reset to the category template. Upload opens the 2:3 crop dialog first.
 */
export function CoverControls({
  promptId,
  hasCategory,
  coverSource,
}: {
  promptId: string;
  hasCategory: boolean;
  coverSource: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const hasUpload = coverSource === "upload";

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
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

      const response = await fetch(`/api/prompts/${promptId}/cover`, {
        method: "POST",
        body, // no Content-Type: the browser sets the multipart boundary
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiError(
          data?.error?.message ?? "Upload failed.",
          response.status,
        );
      }

      toast.success("Cover updated");
      setFile(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function mutate(
    path: string,
    method: "POST" | "DELETE",
    success: string,
    fallback: string,
  ) {
    setBusy(true);
    try {
      const response = await fetch(path, { method });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiError(data?.error?.message ?? fallback, response.status);
      }
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={pickFile}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {hasUpload ? "Replace cover" : "Upload cover"}
        </Button>

        {hasUpload ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              mutate(
                `/api/prompts/${promptId}/cover`,
                "DELETE",
                "Cover removed",
                "Could not remove the cover.",
              )
            }
          >
            Remove
          </Button>
        ) : null}

        {hasCategory && coverSource !== "category_template" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              mutate(
                `/api/prompts/${promptId}/cover/reset`,
                "POST",
                "Reset to category template",
                "Could not reset the cover.",
              )
            }
          >
            Use category template
          </Button>
        ) : null}
      </div>

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
