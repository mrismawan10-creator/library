"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 300;

/**
 * Search box (FR-11).
 *
 * Typing pushes into the URL after a pause rather than on every keystroke, and
 * with `replace` rather than `push` so the back button steps out of the search
 * instead of walking back through every letter typed.
 */
export function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const isTypingRef = useRef(false);

  // Keep in step when the URL changes from elsewhere (a reset, a back button).
  useEffect(() => {
    if (!isTypingRef.current) setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (value === urlQuery) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      isTypingRef.current = false;
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, urlQuery, pathname, router, searchParams]);

  return (
    <div className="relative max-w-md">
      <Search
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => {
          isTypingRef.current = true;
          setValue(event.target.value);
        }}
        placeholder="Search prompts…"
        aria-label="Search prompts"
        className="border-input bg-card h-11 w-full rounded-lg border pr-10 pl-9 text-sm"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            isTypingRef.current = true;
            setValue("");
          }}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
