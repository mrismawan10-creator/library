import { notFound } from "next/navigation";
import { getPrompt } from "@/lib/data/prompts";
import { listCategories } from "@/lib/data/categories";
import { NotFoundError } from "@/lib/data/errors";
import { PromptDetail } from "@/components/prompts/prompt-detail";
import { uuidSchema } from "@/lib/schemas";

/** FR-05 / FR-06. The full prompt text is loaded here, never in list queries. */
export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  try {
    const [prompt, categories] = await Promise.all([
      getPrompt(id),
      listCategories(),
    ]);

    return (
      <PromptDetail
        prompt={{
          id: prompt.id,
          title: prompt.title,
          prompt_text: prompt.prompt_text,
          description: prompt.description,
          category_id: prompt.category_id,
          category_name: prompt.category_name,
          category_slug: prompt.category_slug,
          output_type: prompt.output_type,
          ai_model: prompt.ai_model,
          status: prompt.status,
          usage_count: prompt.usage_count,
          last_used_at: prompt.last_used_at,
          created_at: prompt.created_at,
          updated_at: prompt.updated_at,
          tags: prompt.tags.map((tag) => ({ id: tag.id, name: tag.name })),
        }}
        categories={categories}
      />
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return { title: "Prompt" };

  try {
    const prompt = await getPrompt(id);
    return { title: prompt.title };
  } catch {
    return { title: "Prompt" };
  }
}
