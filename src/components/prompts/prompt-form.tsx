"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  OUTPUT_TYPES,
  TITLE_MAX_LENGTH,
  parseTagsInput,
  promptFormSchema,
  type CategoryRow,
  type PromptFormValues,
  type PromptRow,
} from "@/lib/schemas";
import { ApiError, apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClassName } from "./field";

/**
 * Create form (FR-04). Validation runs against the shared schema, and the
 * server validates the same rules again — this is the convenience layer, not
 * the guarantee.
 */
export function PromptForm({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      title: "",
      prompt_text: "",
      description: "",
      category_id: "",
      output_type: "Writing",
      ai_model: "",
      tags_input: "",
    },
  });

  const titleLength = (watch("title") ?? "").length;

  async function onSubmit(values: PromptFormValues) {
    try {
      const { prompt } = await apiFetch<{ prompt: PromptRow }>("/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          prompt_text: values.prompt_text,
          description: values.description,
          ai_model: values.ai_model,
          category_id: values.category_id ? values.category_id : null,
          output_type: values.output_type,
          tags: parseTagsInput(values.tags_input ?? ""),
        }),
      });

      toast.success("Prompt saved");
      router.push(`/prompts/${prompt.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          setError(field as keyof PromptFormValues, { message });
        }
      }
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the prompt.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <Field
        label="Title"
        htmlFor="title"
        error={errors.title?.message}
        hint={`${titleLength}/${TITLE_MAX_LENGTH}`}
      >
        <Input
          id="title"
          maxLength={TITLE_MAX_LENGTH}
          aria-invalid={Boolean(errors.title)}
          {...register("title")}
        />
      </Field>

      <Field
        label="Prompt"
        htmlFor="prompt_text"
        error={errors.prompt_text?.message}
        hint="Line breaks are preserved exactly as typed."
      >
        <Textarea
          id="prompt_text"
          rows={12}
          className="font-mono text-sm"
          aria-invalid={Boolean(errors.prompt_text)}
          {...register("prompt_text")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Output type"
          htmlFor="output_type"
          error={errors.output_type?.message}
        >
          <select
            id="output_type"
            className={selectClassName}
            {...register("output_type")}
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
            {...register("category_id")}
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
        <Textarea id="description" rows={3} {...register("description")} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="AI model" htmlFor="ai_model" hint="Optional">
          <Input
            id="ai_model"
            placeholder="e.g. any model"
            {...register("ai_model")}
          />
        </Field>

        <Field
          label="Tags"
          htmlFor="tags_input"
          hint="Separate with commas. Optional."
        >
          <Input
            id="tags_input"
            placeholder="research, outline, indonesian"
            {...register("tags_input")}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-h-11">
          {isSubmitting ? "Saving…" : "Save prompt"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
