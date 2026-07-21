import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Add Prompt" };

/** FR-04. The form is built in Milestone 2. */
export default function NewPromptPage() {
  return (
    <>
      <PageHeader
        title="Add Prompt"
        description="Title, prompt text, and output type are required."
      />
      <p className="text-muted-foreground text-sm">
        The prompt form arrives in Milestone 2.
      </p>
    </>
  );
}
