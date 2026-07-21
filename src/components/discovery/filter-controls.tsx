"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import {
  OUTPUT_TYPES,
  SORT_LABELS,
  SORT_OPTIONS,
  type CategoryRow,
  type TagRow,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { selectClassName } from "@/components/prompts/field";

/**
 * Filter and sort controls (FR-12).
 *
 * All state is read from and written to the URL, so filters survive a reload,
 * can be shared, and never drift from what the server rendered. On mobile the
 * same panel opens in a drawer.
 */
export function FilterControls({
  categories,
  tags,
}: {
  categories: CategoryRow[];
  tags: TagRow[];
}) {
  return (
    <>
      <div className="hidden lg:block">
        <FilterPanel categories={categories} tags={tags} />
      </div>

      <div className="lg:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" className="min-h-11">
              <SlidersHorizontal aria-hidden className="size-4" />
              Filter & sort
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filter & sort</DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-8">
              <FilterPanel categories={categories} tags={tags} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}

function FilterPanel({
  categories,
  tags,
}: {
  categories: CategoryRow[];
  tags: TagRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const apply = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSingle = (key: string, value: string) =>
    apply((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

  const toggleMulti = (key: string, value: string) =>
    apply((params) => {
      const current = params.getAll(key);
      params.delete(key);
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      for (const entry of next) params.append(key, entry);
    });

  const selectedTags = searchParams.getAll("tag");
  const selectedTypes = searchParams.getAll("type");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="filter-sort" className="text-sm font-medium">
          Sort
        </label>
        <select
          id="filter-sort"
          className={selectClassName}
          value={searchParams.get("sort") ?? "newest"}
          onChange={(event) => setSingle("sort", event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="filter-category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="filter-category"
          className={selectClassName}
          value={searchParams.get("category") ?? ""}
          onChange={(event) => setSingle("category", event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="filter-status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="filter-status"
          className={selectClassName}
          value={searchParams.get("status") ?? "active"}
          onChange={(event) =>
            setSingle("status", event.target.value === "active" ? "" : event.target.value)
          }
        >
          <option value="active">Active only</option>
          <option value="archived">Archived only</option>
          <option value="all">Active and archived</option>
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Output type</legend>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_TYPES.map((type) => (
            <TogglePill
              key={type}
              label={type}
              active={selectedTypes.includes(type)}
              onClick={() => toggleMulti("type", type)}
            />
          ))}
        </div>
      </fieldset>

      {tags.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tags</legend>
          <p className="text-muted-foreground text-xs">
            Choosing several narrows to prompts carrying all of them.
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TogglePill
                key={tag.id}
                label={tag.name}
                active={selectedTags.includes(tag.slug)}
                onClick={() => toggleMulti("tag", tag.slug)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Flags</legend>
        <div className="flex flex-wrap gap-2">
          <TogglePill
            label="Favorites"
            active={searchParams.get("favorite") === "true"}
            onClick={() =>
              setSingle(
                "favorite",
                searchParams.get("favorite") === "true" ? "" : "true",
              )
            }
          />
          <TogglePill
            label="Featured"
            active={searchParams.get("featured") === "true"}
            onClick={() =>
              setSingle(
                "featured",
                searchParams.get("featured") === "true" ? "" : "true",
              )
            }
          />
        </div>
      </fieldset>
    </div>
  );
}

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "bg-primary text-primary-foreground min-h-9 rounded-full px-3 text-xs font-medium"
          : "border-border text-muted-foreground hover:text-foreground min-h-9 rounded-full border px-3 text-xs"
      }
    >
      {label}
    </button>
  );
}

/** The chips above the results, each removable, plus a single reset. */
export function ActiveFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: { key: string; label: string; remove: () => void }[] = [];

  const removeParam = (key: string, value?: string) => () => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === undefined) {
      params.delete(key);
    } else {
      const rest = params.getAll(key).filter((entry) => entry !== value);
      params.delete(key);
      for (const entry of rest) params.append(key, entry);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const q = searchParams.get("q");
  if (q) chips.push({ key: `q-${q}`, label: `“${q}”`, remove: removeParam("q") });

  const category = searchParams.get("category");
  if (category)
    chips.push({
      key: `category-${category}`,
      label: category,
      remove: removeParam("category"),
    });

  for (const tag of searchParams.getAll("tag")) {
    chips.push({
      key: `tag-${tag}`,
      label: `#${tag}`,
      remove: removeParam("tag", tag),
    });
  }

  for (const type of searchParams.getAll("type")) {
    chips.push({
      key: `type-${type}`,
      label: type,
      remove: removeParam("type", type),
    });
  }

  if (searchParams.get("favorite") === "true")
    chips.push({
      key: "favorite",
      label: "Favorites",
      remove: removeParam("favorite"),
    });

  if (searchParams.get("featured") === "true")
    chips.push({
      key: "featured",
      label: "Featured",
      remove: removeParam("featured"),
    });

  const status = searchParams.get("status");
  if (status && status !== "active")
    chips.push({
      key: `status-${status}`,
      label: status === "all" ? "Including archived" : "Archived only",
      remove: removeParam("status"),
    });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className="border-border text-muted-foreground hover:text-foreground inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs"
        >
          {chip.label}
          <X aria-hidden className="size-3" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => router.replace(pathname, { scroll: false })}
        className="text-primary min-h-9 px-2 text-xs underline-offset-4 hover:underline"
      >
        Reset all
      </button>
    </div>
  );
}
