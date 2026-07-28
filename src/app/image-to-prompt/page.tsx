import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { ImageToPromptTool } from "@/components/image-to-prompt/image-to-prompt-tool";
import { isAiConfigured } from "@/lib/ai/client";
import { listCategories } from "@/lib/data/categories";

export const metadata = { title: "Image to Prompt" };

export const dynamic = "force-dynamic";

/** Generate a prompt from an image with a vision model, then save it. */
export default async function ImageToPromptPage() {
  if (!isAiConfigured()) {
    return (
      <>
        <PageHeader title="Image to Prompt" />
        <EmptyState
          icon={Sparkles}
          title="AI is not configured yet."
          description="This tool reads an image with an AI vision model. Set AI_API_KEY (and optionally AI_VISION_MODEL) on the server to enable it."
        />
      </>
    );
  }

  const categories = await listCategories();

  return (
    <>
      <PageHeader
        title="Image to Prompt"
        description="Upload or paste an image and generate a prompt that could recreate it. Edit it, then save it to your library."
      />
      <ImageToPromptTool categories={categories} />
    </>
  );
}
