"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Autosave (FR-06).
 *
 * Saves 1500 ms after typing stops, not per keystroke. There is no version
 * history in the MVP — a save overwrites the active record — so the status this
 * returns has to be shown prominently and truthfully.
 *
 * Two things it guarantees:
 *
 * - Saves never overlap. A save in flight blocks the next one; edits made while
 *   it runs mark the value dirty again and re-arm the timer, so the last write
 *   always reflects the latest text rather than whichever response landed last.
 * - A failure keeps the caller's state untouched and leaves the status at
 *   "failed" so Retry stays available (UAT-12).
 */

export const AUTOSAVE_DELAY_MS = 1500;

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "failed";

export type UseAutosaveResult = {
  status: SaveStatus;
  /** Writes immediately, cancelling any pending debounce (manual Save). */
  saveNow: () => Promise<boolean>;
  /** True while there are edits that are not safely stored. */
  isDirty: boolean;
};

export function useAutosave<T>({
  value,
  onSave,
  enabled = true,
  delay = AUTOSAVE_DELAY_MS,
}: {
  value: T;
  onSave: (value: T) => Promise<void>;
  enabled?: boolean;
  delay?: number;
}): UseAutosaveResult {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);
  const savedSnapshotRef = useRef(JSON.stringify(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  valueRef.current = value;
  onSaveRef.current = onSave;

  const flush = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;

    const snapshot = JSON.stringify(valueRef.current);
    if (snapshot === savedSnapshotRef.current) {
      setStatus((current) => (current === "failed" ? current : "saved"));
      return true;
    }

    savingRef.current = true;
    setStatus("saving");

    try {
      await onSaveRef.current(valueRef.current);
      savedSnapshotRef.current = snapshot;

      // An edit landed mid-save: stay dirty and let the timer pick it up.
      const stillCurrent = snapshot === JSON.stringify(valueRef.current);
      setStatus(stillCurrent ? "saved" : "unsaved");
      return true;
    } catch {
      setStatus("failed");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, []);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return flush();
  }, [flush]);

  // Debounce: re-armed on every change while the value differs from what is stored.
  useEffect(() => {
    if (!enabled) return;

    const snapshot = JSON.stringify(value);
    if (snapshot === savedSnapshotRef.current) return;

    setStatus((current) => (current === "saving" ? current : "unsaved"));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, delay, flush]);

  const isDirty = status === "unsaved" || status === "saving" || status === "failed";

  // Warn before leaving with work that is not stored (FR-06).
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return { status, saveNow, isDirty };
}
