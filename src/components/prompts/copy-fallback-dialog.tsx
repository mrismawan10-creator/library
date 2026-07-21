"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Last-resort copy path (FR-07): when the clipboard API is unavailable or
 * denied, show the full text pre-selected so it can be copied by hand.
 */
export function CopyFallbackDialog({
  text,
  onClose,
}: {
  text: string | null;
  onClose: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!text) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }, [text]);

  return (
    <Dialog open={Boolean(text)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copy manually</DialogTitle>
          <DialogDescription>
            Your browser blocked clipboard access. The full prompt is selected
            below — press Ctrl/Cmd + C, or long-press to copy.
          </DialogDescription>
        </DialogHeader>
        <textarea
          ref={textareaRef}
          readOnly
          value={text ?? ""}
          rows={14}
          aria-label="Full prompt text"
          className="border-border bg-card w-full rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap"
        />
      </DialogContent>
    </Dialog>
  );
}
