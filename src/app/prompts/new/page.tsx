import { PageHeader } from "@/components/layout/page-header";
import { PromptForm } from "@/components/prompts/prompt-form";
import { listCategories } from "@/lib/data/categories";

export const metadata = { title: "Add Prompt" };

/** FR-04. Categories are loaded on the server so the form renders ready to use. */
export default async function NewPromptPage() {
  const categories = await listCategories();

  return (
    <>
      <PageHeader
        title="Add Prompt"
        description="Title, prompt text, and output type are required."
      />
      <PromptForm categories={categories} />
    </>
  );
}

export const dynamic = "force-dynamic";
