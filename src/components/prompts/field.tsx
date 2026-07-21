import { Label } from "@/components/ui/label";

/**
 * Label, control, hint, and error wired together so screen readers announce
 * the message with the field it belongs to (PRD §13).
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const describedBy = [
    hint ? `${htmlFor}-hint` : null,
    error ? `${htmlFor}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? (
          <span id={`${htmlFor}-hint`} className="text-muted-foreground text-xs">
            {hint}
          </span>
        ) : null}
      </div>
      <div aria-describedby={describedBy || undefined}>{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared styling for the plain selects used by the prompt forms. */
export const selectClassName =
  "border-input bg-card h-11 w-full rounded-lg border px-3 text-sm";
