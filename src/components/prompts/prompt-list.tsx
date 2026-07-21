import Link from "next/link";
import type { PromptCard } from "@/lib/schemas";

/**
 * A plain list of prompts, enough to navigate the library while the poster
 * catalog with hero and category rows is built in Milestone 3.
 *
 * It renders the server-side excerpt only. The full prompt text is never part
 * of a list payload (PRD §14).
 */
export function PromptList({ prompts }: { prompts: PromptCard[] }) {
  return (
    <ul className="max-w-3xl space-y-3">
      {prompts.map((prompt) => (
        <li key={prompt.id}>
          <Link
            href={`/prompts/${prompt.id}`}
            className="border-border bg-card hover:border-primary/50 block rounded-xl border p-4 transition-colors"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="truncate text-base font-medium">{prompt.title}</h2>
              <span className="text-muted-foreground shrink-0 text-xs">
                {prompt.output_type}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
              {prompt.excerpt}
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              {prompt.category_name ?? "Uncategorized"} · used{" "}
              {prompt.usage_count}×
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
