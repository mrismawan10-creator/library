"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  commitRows,
  enrichRows,
  parseImportFile,
} from "@/lib/import/client";
import { IMPORT_TEMPLATE_FILENAME } from "@/lib/import/constants";
import type {
  EnrichedRow,
  ImportResult,
  ParsedPromptRow,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { ReviewTable } from "./review-table";

type Stage = "upload" | "processing" | "review" | "importing" | "result";

/** A duplicate row skips AI entirely and is marked without a model call. */
function duplicateRow(row: ParsedPromptRow): EnrichedRow {
  return {
    sourceRow: row.sourceRow,
    promptText: row.promptText,
    title: "",
    description: "",
    categoryName: "Uncategorized",
    categoryMatchType: "existing",
    outputType: "Other",
    aiModel: null,
    tags: [],
    variablesEnabled: false,
    coverMode: "SYSTEM_DEFAULT",
    reviewStatus: "DUPLICATE",
    warnings: [
      row.duplicateInDb
        ? "Already in the library."
        : "Duplicated earlier in the file.",
    ],
  };
}

export function ImportWizard({ categories }: { categories: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState<EnrichedRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [retrying, setRetrying] = useState(false);

  function reset() {
    setStage("upload");
    setFile(null);
    setRows([]);
    setSelected(new Set());
    setResult(null);
    setProgress({ done: 0, total: 0 });
  }

  async function process() {
    if (!file) return;
    setStage("processing");
    try {
      const parsed = await parseImportFile(file);

      // Duplicates skip AI; the rest go to enrichment.
      const dupes = parsed.rows.filter(
        (r) => r.duplicateInFile || r.duplicateInDb,
      );
      const toEnrich = parsed.rows.filter(
        (r) => !r.duplicateInFile && !r.duplicateInDb,
      );

      setProgress({ done: 0, total: toEnrich.length });
      const enriched = toEnrich.length
        ? await enrichRows(toEnrich, (done, total) =>
            setProgress({ done, total }),
          )
        : [];

      const all = [...enriched, ...dupes.map(duplicateRow)].sort(
        (a, b) => a.sourceRow - b.sourceRow,
      );
      setRows(all);
      // Pre-select the ready rows only (doc §14: errors unselected by default).
      setSelected(
        new Set(
          all.filter((r) => r.reviewStatus === "READY").map((r) => r.sourceRow),
        ),
      );
      setStage("review");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not process the file.",
      );
      setStage("upload");
    }
  }

  async function retryFailed() {
    const failed = rows.filter((r) => r.reviewStatus === "ERROR");
    if (failed.length === 0) return;
    setRetrying(true);
    try {
      const redone = await enrichRows(
        failed.map((r) => ({
          sourceRow: r.sourceRow,
          promptText: r.promptText,
          duplicateInFile: false,
          duplicateInDb: false,
        })),
        () => {},
      );
      const byRow = new Map(redone.map((r) => [r.sourceRow, r]));
      setRows((current) =>
        current.map((r) => byRow.get(r.sourceRow) ?? r),
      );
      toast.success("Retried failed rows");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  async function confirmImport() {
    const chosen = rows.filter((r) => selected.has(r.sourceRow));
    if (chosen.length === 0) {
      toast.error("Select at least one row to import.");
      return;
    }
    setStage("importing");
    try {
      const res = await commitRows(chosen);
      setResult(res);
      setStage("result");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Import failed.");
      setStage("review");
    }
  }

  const updateRow = (sourceRow: number, patch: Partial<EnrichedRow>) =>
    setRows((current) =>
      current.map((r) => (r.sourceRow === sourceRow ? { ...r, ...patch } : r)),
    );

  const toggle = (sourceRow: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(sourceRow)) next.delete(sourceRow);
      else next.add(sourceRow);
      return next;
    });

  // ---- Stages ----

  if (stage === "upload") {
    return (
      <div className="max-w-xl space-y-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
          }}
          className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center"
        >
          <FileUp aria-hidden className="text-muted-foreground size-8" />
          <p className="text-sm">
            Drag an .xlsx file here, or choose one.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          {file ? (
            <p className="text-muted-foreground text-xs">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={process} disabled={!file}>
            Validate and generate metadata
          </Button>
          <Link
            href={`/${IMPORT_TEMPLATE_FILENAME}`}
            download
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
          >
            <Download aria-hidden className="size-4" />
            Download Excel template
          </Link>
        </div>

        <p className="text-muted-foreground text-xs">
          The importer reads only the <code>Prompts_Input</code> sheet and its{" "}
          <code>prompt_text</code> column. Everything else is generated by AI and
          shown for review before anything is saved.
        </p>
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <div className="max-w-xl space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          <span aria-live="polite">
            {progress.total === 0
              ? "Reading file and checking duplicates…"
              : `Generating metadata… ${progress.done}/${progress.total}`}
          </span>
        </div>
        {progress.total > 0 ? (
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all"
              style={{
                width: `${Math.round((progress.done / progress.total) * 100)}%`,
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (stage === "importing") {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        <span aria-live="polite">Importing…</span>
      </div>
    );
  }

  if (stage === "result" && result) {
    return (
      <div className="max-w-xl space-y-6">
        <div className="surface-glass space-y-2 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Import completed</h2>
          <dl className="text-muted-foreground grid grid-cols-2 gap-1 text-sm">
            <Line label="Created" value={result.created} />
            <Line label="Skipped" value={result.skipped} />
            <Line label="Duplicates" value={result.duplicates} />
            <Line label="Failed" value={result.failed} />
            <Line label="New categories" value={result.categoriesCreated} />
          </dl>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/prompts">View imported prompts</Link>
          </Button>
          <Button variant="outline" onClick={reset}>
            Start another import
          </Button>
        </div>
      </div>
    );
  }

  // review
  return (
    <div className="space-y-6">
      <ReviewTable
        rows={rows}
        categories={categories}
        selected={selected}
        onToggle={toggle}
        onUpdateRow={updateRow}
        onSelectAllReady={() =>
          setSelected(
            new Set(
              rows
                .filter((r) => r.reviewStatus === "READY")
                .map((r) => r.sourceRow),
            ),
          )
        }
        onDeselectAll={() => setSelected(new Set())}
        onRetryFailed={retryFailed}
        retrying={retrying}
      />

      <datalist id="import-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={confirmImport} disabled={selected.size === 0}>
          Confirm import ({selected.size})
        </Button>
        <Button variant="ghost" onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
