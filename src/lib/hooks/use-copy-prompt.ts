"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import type { PromptRow } from "@/lib/schemas";

/**
 * Copy a prompt (FR-07).
 *
 * The whole design turns on one browser rule: Safari on iOS only allows a
 * clipboard write while the user gesture is still alive, and awaiting a fetch
 * kills it. So the fast path never awaits before writing — it hands
 * `ClipboardItem` a *Promise* of the text and lets the browser resolve it
 * inside the gesture it already granted. UAT-11 depends on this.
 *
 * Three layers, in order:
 *   1. ClipboardItem with a promised blob — works on iOS Safari.
 *   2. writeText after the fetch — for browsers without ClipboardItem.
 *   3. a modal with the full text to select by hand — when both are denied.
 *
 * Copy always wins over bookkeeping: the copy-event POST is fired and forgotten,
 * and its failure is swallowed. A copy that happened must never be undone
 * because a counter did not increment.
 */

async function fetchPromptText(id: string): Promise<string> {
  const { prompt } = await apiFetch<{ prompt: PromptRow }>(
    `/api/prompts/${id}`,
  );
  return prompt.prompt_text;
}

function trackCopy(id: string): void {
  void fetch(`/api/prompts/${id}/copy-event`, {
    method: "POST",
    keepalive: true,
  }).catch(() => {
    // Tracking is best-effort by design.
  });
}

export type UseCopyPromptResult = {
  copyPrompt: (id: string) => Promise<void>;
  /** Set when every clipboard path failed; render it for manual selection. */
  fallbackText: string | null;
  clearFallback: () => void;
  copyingId: string | null;
};

export function useCopyPrompt(): UseCopyPromptResult {
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const copyPrompt = useCallback(async (id: string) => {
    setCopyingId(id);

    const supportsClipboardItem =
      typeof window !== "undefined" &&
      typeof ClipboardItem !== "undefined" &&
      Boolean(navigator.clipboard?.write);

    try {
      if (supportsClipboardItem) {
        // Not awaited before the write: that is the whole point.
        const textPromise = fetchPromptText(id);
        const item = new ClipboardItem({
          "text/plain": textPromise.then(
            (text) => new Blob([text], { type: "text/plain" }),
          ),
        });

        await navigator.clipboard.write([item]);
        toast.success("Prompt copied");
        trackCopy(id);
        return;
      }

      const text = await fetchPromptText(id);
      await navigator.clipboard.writeText(text);
      toast.success("Prompt copied");
      trackCopy(id);
    } catch {
      // Clipboard refused, or the fetch inside it failed. Fall back to manual
      // selection rather than leaving the user with nothing.
      try {
        const text = await fetchPromptText(id);
        setFallbackText(text);
      } catch {
        toast.error("Could not load the prompt. Check your connection.");
      }
    } finally {
      setCopyingId(null);
    }
  }, []);

  const clearFallback = useCallback(() => setFallbackText(null), []);

  return { copyPrompt, fallbackText, clearFallback, copyingId };
}
