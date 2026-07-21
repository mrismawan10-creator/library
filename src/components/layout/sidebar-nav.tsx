"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADD_PROMPT_ITEM, NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Desktop navigation: a fixed left rail, hidden below the lg breakpoint. */
export function SidebarNav() {
  const pathname = usePathname();
  const AddIcon = ADD_PROMPT_ITEM.icon;

  return (
    <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r lg:flex">
      <div className="px-6 py-6">
        <Link href="/" className="block">
          <span className="font-serif text-lg leading-tight font-semibold">
            Prompt Library
          </span>
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3">
        <Link
          href={ADD_PROMPT_ITEM.href}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors"
        >
          <AddIcon aria-hidden className="size-4" />
          {ADD_PROMPT_ITEM.label}
        </Link>
      </div>
    </aside>
  );
}
