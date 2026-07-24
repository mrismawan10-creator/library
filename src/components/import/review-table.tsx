"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  OUTPUT_TYPES,
  type EnrichedRow,
  type ReviewStatus,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/components/prompts/field";

/**
 * The review and edit step (doc §14). Every AI-generated field is editable,
 * rows can be selected for import, and error rows are never selected by
 * default. Filters and a summary sit above the table.
 */

type Filter = "ALL" | ReviewStatus;

const STATUS_LABEL: Record<ReviewStatus, string> = {
  READY: "Ready",
  NEEDS_REVIEW: "Needs review",
  DUPLICATE: "Duplicate",
  ERROR: "Error",
};

const STATUS_CLASS: Record<ReviewStatus, string> = {
  READY: "text-primary",
  NEEDS_REVIEW: "text-yellow-400",
  DUPLICATE: "text-muted-foreground",
  ERROR: "text-destructive",
};

export function ReviewTable({
  rows,
  categories,
  selected,
  onToggle,
  onUpdateRow,
  onSelectAllReady,
  onDeselectAll,
  onRetryFailed,
  retrying,
}: {
  rows: EnrichedRow[];
  categories: string[];
  selected: Set<number>;
  onToggle: (sourceRow: number) => void;
  onUpdateRow: (sourceRow: number, patch: Partial<EnrichedRow>) => void;
  onSelectAllReady: () => void;
  onDeselectAll: () => void;
  onRetryFailed: () => void;
  retrying: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<ReviewStatus, number> = {
      READY: 0,
      NEEDS_REVIEW: 0,
      DUPLICATE: 0,
      ERROR: 0,
    };
    for (const row of rows) c[row.reviewStatus] += 1;
    return c;
  }, [rows]);

  const visible = rows.filter(
    (row) => filter === "ALL" || row.reviewStatus === filter,
  );
  const errorCount = counts.ERROR;

  return (
    <div className="space-y-4">
      <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Stat label="Total" value={rows.length} />
        <Stat label="Ready" value={counts.READY} />
        <Stat label="Needs review" value={counts.NEEDS_REVIEW} />
        <Stat label="Duplicate" value={counts.DUPLICATE} />
        <Stat label="Error" value={counts.ERROR} />
        <Stat label="Selected" value={selected.size} />
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "READY", "NEEDS_REVIEW", "DUPLICATE", "ERROR"] as Filter[]).map(
          (f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={
                filter === f
                  ? "bg-primary text-primary-foreground min-h-9 rounded-full px-3 text-xs font-medium"
                  : "border-border text-muted-foreground hover:text-foreground min-h-9 rounded-full border px-3 text-xs"
              }
            >
              {f === "ALL" ? "All" : STATUS_LABEL[f as ReviewStatus]}
            </button>
          ),
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onSelectAllReady}>
            Select all ready
          </Button>
          <Button size="sm" variant="ghost" onClick={onDeselectAll}>
            Deselect all
          </Button>
          {errorCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetryFailed}
              disabled={retrying}
            >
              {retrying ? "Retrying…" : `Retry ${errorCount} failed`}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-left text-xs">
              <th className="w-10 py-2" />
              <th className="w-10 py-2" />
              <th className="py-2 pr-3">Title & prompt</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Tags</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const isOpen = expanded === row.sourceRow;
              const disabled = row.reviewStatus === "ERROR";
              return (
                <RowView
                  key={row.sourceRow}
                  row={row}
                  categories={categories}
                  isOpen={isOpen}
                  disabled={disabled}
                  checked={selected.has(row.sourceRow)}
                  onExpand={() =>
                    setExpanded(isOpen ? null : row.sourceRow)
                  }
                  onToggle={() => onToggle(row.sourceRow)}
                  onUpdate={(patch) => onUpdateRow(row.sourceRow, patch)}
                  statusClass={STATUS_CLASS[row.reviewStatus]}
                  statusLabel={STATUS_LABEL[row.reviewStatus]}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowView({
  row,
  categories,
  isOpen,
  disabled,
  checked,
  onExpand,
  onToggle,
  onUpdate,
  statusClass,
  statusLabel,
}: {
  row: EnrichedRow;
  categories: string[];
  isOpen: boolean;
  disabled: boolean;
  checked: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<EnrichedRow>) => void;
  statusClass: string;
  statusLabel: string;
}) {
  return (
    <>
      <tr className="border-border/60 border-b align-top">
        <td className="py-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            aria-label={`Select row ${row.sourceRow} for import`}
            className="size-4"
          />
        </td>
        <td className="py-3">
          <button
            type="button"
            onClick={onExpand}
            aria-label={isOpen ? "Hide prompt" : "Show prompt"}
            className="text-muted-foreground"
          >
            {isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </td>
        <td className="py-3 pr-3">
          <Input
            value={row.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Title"
            aria-label={`Title for row ${row.sourceRow}`}
            className="mb-1 h-9"
          />
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {row.promptText}
          </p>
        </td>
        <td className="py-3 pr-3">
          <input
            list="import-categories"
            value={row.categoryName}
            onChange={(e) =>
              onUpdate({
                categoryName: e.target.value,
                categoryMatchType: categories.some(
                  (c) => c.toLowerCase() === e.target.value.toLowerCase(),
                )
                  ? "existing"
                  : "proposed",
              })
            }
            aria-label={`Category for row ${row.sourceRow}`}
            className="border-input bg-card h-9 w-36 rounded-lg border px-2 text-sm"
          />
          {row.categoryMatchType === "proposed" && row.categoryName ? (
            <span className="text-primary mt-1 block text-[10px]">
              New category
            </span>
          ) : null}
        </td>
        <td className="py-3 pr-3">
          <select
            value={row.outputType}
            onChange={(e) =>
              onUpdate({ outputType: e.target.value as EnrichedRow["outputType"] })
            }
            aria-label={`Output type for row ${row.sourceRow}`}
            className={`${selectClassName} h-9 w-32`}
          >
            {OUTPUT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="py-3 pr-3">
          <Input
            value={row.tags.join(", ")}
            onChange={(e) =>
              onUpdate({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            aria-label={`Tags for row ${row.sourceRow}`}
            className="h-9 w-40"
          />
        </td>
        <td className="py-3 pr-3">
          <span className={`text-xs font-medium ${statusClass}`}>
            {statusLabel}
          </span>
          {row.warnings.length > 0 ? (
            <ul className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
              {row.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-border/60 border-b">
          <td colSpan={7} className="py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-muted-foreground block text-xs">
                Description
                <textarea
                  value={row.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  rows={3}
                  className="border-input bg-card mt-1 w-full rounded-lg border p-2 text-sm"
                />
              </label>
              <label className="text-muted-foreground block text-xs">
                AI model (optional)
                <Input
                  value={row.aiModel ?? ""}
                  onChange={(e) =>
                    onUpdate({ aiModel: e.target.value || null })
                  }
                  className="mt-1 h-9"
                />
                <span className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.variablesEnabled}
                    onChange={(e) =>
                      onUpdate({ variablesEnabled: e.target.checked })
                    }
                    className="size-4"
                  />
                  Has {"{{variables}}"}
                </span>
              </label>
              <div className="text-muted-foreground sm:col-span-2">
                <p className="mb-1 text-xs">Prompt (unchanged on import)</p>
                <pre className="border-border bg-card max-h-48 overflow-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
                  {row.promptText}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-1">
      <dt>{label}:</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
