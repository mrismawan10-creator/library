"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ImageUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api/client";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import type { PromptRow, CategoryRow } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClassName } from "@/components/prompts/field";

type Style = "detailed" | "concise";

/**
 * Image-to-prompt tool. Upload or paste an image, generate a single-paragraph
 * prompt from it with the vision model, edit it, then save it as a library
 * prompt — optionally using the same image as the cover.
 */
export function ImageToPromptTool({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("detailed");
  const [generating, setGenerating] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [useAsCover, setUseAsCover] = useState(true);
  const [saving, setSaving] = useState(false);

  // Object URL for the preview, revoked when the file changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Paste an image from the clipboard anywhere on the page.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const item = [...(event.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/"),
      );
      const pasted = item?.getAsFile();
      if (pasted) accept(pasted);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function accept(chosen: File) {
    if (!chosen.type.startsWith("image/")) {
      toast.error("That is not an image.");
      return;
    }
    if (chosen.size > MAX_UPLOAD_BYTES) {
      toast.error("The image must be 10 MB or smaller.");
      return;
    }
    setFile(chosen);
    setPrompt("");
  }

  async function generate() {
    if (!file) return;
    setGenerating(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("style", style);
      const response = await fetch("/api/image-to-prompt", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError(
          data?.error?.message ?? "Could not generate a prompt.",
          response.status,
        );
      }
      const text: string = data.prompt;
      setPrompt(text);
      // Prefill a title from the first words; the user can refine it.
      setTitle(
        text.split(/\s+/).slice(0, 8).join(" ").slice(0, 120).replace(/[.,]$/, ""),
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not generate a prompt.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Copy failed. Select the text manually.");
    }
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Give the prompt a title.");
      return;
    }
    setSaving(true);
    try {
      const { prompt: created } = await apiFetch<{ prompt: PromptRow }>(
        "/api/prompts",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            prompt_text: prompt,
            output_type: "Image",
            category_id: categoryId || null,
          }),
        },
      );

      // Optionally reuse the source image as the prompt's cover.
      if (useAsCover && file) {
        const body = new FormData();
        body.append("file", file);
        const coverRes = await fetch(`/api/prompts/${created.id}/cover`, {
          method: "POST",
          body,
        });
        if (!coverRes.ok) toast.warning("Prompt saved, but the cover failed.");
      }

      toast.success("Prompt saved");
      router.push(`/prompts/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the prompt.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: image + style + generate */}
      <div className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) accept(dropped);
          }}
          className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected"
              className="max-h-72 w-auto rounded-lg object-contain"
            />
          ) : (
            <>
              <ImageUp aria-hidden className="text-muted-foreground size-8" />
              <p className="text-sm">Drag an image, paste, or choose one.</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => e.target.files?.[0] && accept(e.target.files[0])}
            className="hidden"
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            {file ? "Choose another" : "Choose image"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Style:</span>
          {(["detailed", "concise"] as Style[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              aria-pressed={style === s}
              className={
                style === s
                  ? "bg-primary text-primary-foreground min-h-9 rounded-full px-3 text-xs font-medium"
                  : "border-border text-muted-foreground hover:text-foreground min-h-9 rounded-full border px-3 text-xs"
              }
            >
              {s === "detailed" ? "Detailed" : "Concise"}
            </button>
          ))}
        </div>

        <Button onClick={generate} disabled={!file || generating}>
          {generating ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles aria-hidden className="size-4" />
              Generate prompt
            </>
          )}
        </Button>
      </div>

      {/* Right: result + save */}
      <div className="space-y-4">
        {prompt ? (
          <>
            <Field label="Generated prompt" htmlFor="itp-prompt">
              <Textarea
                id="itp-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                className="text-sm"
              />
            </Field>

            <Field
              label="Title"
              htmlFor="itp-title"
              hint={`${title.length}/120`}
            >
              <Input
                id="itp-title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field label="Category" htmlFor="itp-category" hint="Optional">
              <select
                id="itp-category"
                className={selectClassName}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useAsCover}
                onChange={(e) => setUseAsCover(e.target.checked)}
                className="size-4"
              />
              Use this image as the prompt cover
            </label>

            <div className="flex flex-wrap gap-3">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save as prompt"}
              </Button>
              <Button variant="outline" onClick={copyPrompt}>
                <Copy aria-hidden className="size-4" />
                Copy
              </Button>
              <Button variant="ghost" onClick={generate} disabled={generating}>
                Regenerate
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            The generated prompt will appear here. It is saved with output type
            “Image”.
          </p>
        )}
      </div>
    </div>
  );
}
