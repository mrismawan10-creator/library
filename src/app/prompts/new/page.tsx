import Link from "next/link";
import { Sparkles } from "lucide-react";
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
        action={
          <Link
            href="/image-to-prompt"
            className="border-border text-foreground hover:border-primary/50 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors"
          >
            <Sparkles aria-hidden className="size-4" />
            From an image
          </Link>
        }
      />
      <PromptForm categories={categories} />
    </>
  );
}

export const dynamic = "force-dynamic";
