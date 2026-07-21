"use client";

import { useEffect } from "react";

/** Shared error state with a recovery action (PRD §11, DoD item 10). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="surface-glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <h1 className="text-lg font-medium">Something went wrong.</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        The page could not be loaded. Your saved prompts are unaffected.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
