"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  OUTPUT_TYPES,
  TITLE_MAX_LENGTH,
  formatTagsInput,
  parseTagsInput,
  type CategoryRow,
} from "@/lib/schemas";
import { apiFetch } from "@/lib/api/client";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { useCopyPrompt } from "@/lib/hooks/use-copy-prompt";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Cover } from "@/components/covers/cover";
import { CoverControls } from "./cover-controls";
import { CopyFallbackDialog } from "./copy-fallback-dialog";
import { FavoriteButton } from "./favorite-button";
import { Field, selectClassName } from "./field";
import { SaveStatusIndicator } from "./save-status";
import { PromptActions } from "./prompt-actions";

export type PromptDetailData = {
  id: string;
  title: string;
  prompt_text: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  output_type: string;
  ai_model: string | null;
  status: "active" | "archived";
  is_favorite: boolean;
  is_featured: boolean;
  cover_source: string | null;
  poster_url: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string }[];
};

type Draft = {
  title: string;
  prompt_text: string;
  description: string;
  category_id: string;
  output_type: string;
  ai_model: string;
  tags_input: string;
};

function toDraft(prompt: PromptDetailData): Draft {
  return {
    title: prompt.title,
    prompt_text: prompt.prompt_text,
    description: prompt.description ?? "",
    category_id: prompt.category_id ?? "",
    output_type: prompt.output_type,
    ai_model: prompt.ai_model ?? "",
    tags_input: formatTagsInput(prompt.tags.map((tag) => tag.name)),
  };
}

/**
 * Prompt detail (FR-05) and its editor (FR-06).
 *
 * Opens read-only. Edit turns the fields editable and arms autosave; manual
 * Save forces an immediate write and returns to read-only. A failed save keeps
 * the draft in state so nothing typed is ever lost.
 */
export function PromptDetail({
  prompt,
  categories,
}: {
  prompt: PromptDetailData;
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(prompt));
  const { copyPrompt, fallbackText, clearFallback, copyingId } = useCopyPrompt();

  const save = useCallback(
    async (value: Draft) => {
      await apiFetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: value.title,
          prompt_text: value.prompt_text,
          description: value.description,
          ai_model: value.ai_model,
          category_id: value.category_id ? value.category_id : null,
          output_type: value.output_type,
          tags: parseTagsInput(value.tags_input),
        }),
      });
      router.refresh();
    },
    [prompt.id, router],
  );

  const { status, saveNow } = useAutosave({
    value: draft,
    onSave: save,
    enabled: editing,
  });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function handleManualSave() {
    const ok = await saveNow();
    if (ok) {
      setEditing(false);
      toast.success("Prompt saved");
    } else {
      toast.error("Could not save. Your changes are still here.");
    }
  }

  const tagNames = useMemo(
    () => prompt.tags.map((tag) => tag.name),
    [prompt.tags],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="hidden space-y-3 lg:block">
        <Cover
          url={prompt.poster_url}
          title={prompt.title}
          categoryName={prompt.category_name}
          categorySlug={prompt.category_slug}
          priority
        />
        <CoverControls
          promptId={prompt.id}
          hasCategory={prompt.category_id !== null}
          coverSource={prompt.cover_source}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <header className="space-y-3">
          {prompt.status === "archived" ? (
            <p className="border-border text-muted-foreground inline-flex rounded-full border px-3 py-1 text-xs">
              Archived — hidden from home and search
            </p>
          ) : null}

          {editing ? (
            <Field
              label="Title"
              htmlFor="title"
              hint={`${draft.title.length}/${TITLE_MAX_LENGTH}`}
            >
              <Input
                id="title"
                maxLength={TITLE_MAX_LENGTH}
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </Field>
          ) : (
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {prompt.title}
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {editing ? (
              <>
                <Button className="min-h-11" onClick={handleManualSave}>
                  Save
                </Button>
                <SaveStatusIndicator status={status} onRetry={() => void saveNow()} />
              </>
            ) : (
              <>
                <Button
                  className="min-h-11"
                  onClick={() => {
                    setDraft(toDraft(prompt));
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={copyingId === prompt.id}
                  onClick={() => void copyPrompt(prompt.id)}
                >
                  <Copy aria-hidden className="size-4" />
                  {copyingId === prompt.id ? "Copying…" : "Copy Prompt"}
                </Button>
                <FavoriteButton
                  promptId={prompt.id}
                  isFavorite={prompt.is_favorite}
                />
                <PromptActions
                  promptId={prompt.id}
                  title={prompt.title}
                  status={prompt.status}
                  isFeatured={prompt.is_featured}
                />
              </>
            )}
          </div>
        </header>

        {editing ? (
          <div className="max-w-3xl space-y-6">
            <Field
              label="Prompt"
              htmlFor="prompt_text"
              hint="Line breaks are preserved exactly as typed."
            >
              <Textarea
                id="prompt_text"
                rows={16}
                className="font-mono text-sm"
                value={draft.prompt_text}
                onChange={(event) => update("prompt_text", event.target.value)}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Output type" htmlFor="output_type">
                <select
                  id="output_type"
                  className={selectClassName}
                  value={draft.output_type}
                  onChange={(event) => update("output_type", event.target.value)}
                >
                  {OUTPUT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category" htmlFor="category_id" hint="Optional">
                <select
                  id="category_id"
                  className={selectClassName}
                  value={draft.category_id}
                  onChange={(event) => update("category_id", event.target.value)}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description" htmlFor="description" hint="Optional">
              <Textarea
                id="description"
                rows={3}
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="AI model" htmlFor="ai_model" hint="Optional">
                <Input
                  id="ai_model"
                  value={draft.ai_model}
                  onChange={(event) => update("ai_model", event.target.value)}
                />
              </Field>

              <Field
                label="Tags"
                htmlFor="tags_input"
                hint="Separate with commas."
              >
                <Input
                  id="tags_input"
                  value={draft.tags_input}
                  onChange={(event) => update("tags_input", event.target.value)}
                />
              </Field>
            </div>
          </div>
        ) : (
          <>
            {prompt.description ? (
              <p className="text-muted-foreground max-w-prose text-sm">
                {prompt.description}
              </p>
            ) : null}

            {/* Plain text: line breaks survive storage, display, and clipboard. */}
            <pre className="border-border bg-card max-w-3xl overflow-x-auto rounded-xl border p-5 font-mono text-sm break-words whitespace-pre-wrap">
              {prompt.prompt_text}
            </pre>

            {tagNames.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {tagNames.map((name) => (
                  <li
                    key={name}
                    className="border-border text-muted-foreground rounded-full border px-3 py-1 text-xs"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}

            <dl className="text-muted-foreground grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Meta label="Category" value={prompt.category_name ?? "Uncategorized"} />
              <Meta label="Output type" value={prompt.output_type} />
              <Meta label="AI model" value={prompt.ai_model ?? "Any"} />
              <Meta label="Used" value={`${prompt.usage_count} times`} />
              <Meta
                label="Last used"
                value={
                  prompt.last_used_at
                    ? format(new Date(prompt.last_used_at), "d MMM yyyy, HH:mm")
                    : "Never"
                }
              />
              <Meta
                label="Created"
                value={format(new Date(prompt.created_at), "d MMM yyyy, HH:mm")}
              />
              <Meta
                label="Updated"
                value={format(new Date(prompt.updated_at), "d MMM yyyy, HH:mm")}
              />
            </dl>
          </>
        )}
      </div>

      <CopyFallbackDialog text={fallbackText} onClose={clearFallback} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-24">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
