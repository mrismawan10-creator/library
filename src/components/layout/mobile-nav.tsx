"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { ADD_PROMPT_ITEM, NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Mobile navigation: a bottom bar with the primary destinations plus a drawer
 * for the rest. Every target is at least 44x44px (PRD §12).
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const AddIcon = ADD_PROMPT_ITEM.icon;

  // Close the drawer after navigating.
  useEffect(() => setOpen(false), [pathname]);

  const primary = NAV_ITEMS.filter((item) => item.primaryOnMobile);
  const secondary = NAV_ITEMS.filter((item) => !item.primaryOnMobile);

  return (
    <nav
      aria-label="Main"
      className="bg-sidebar border-sidebar-border fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {primary.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <Link
            href={ADD_PROMPT_ITEM.href}
            aria-label={ADD_PROMPT_ITEM.label}
            className={cn(
              "flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 text-[11px]",
              isActivePath(pathname, ADD_PROMPT_ITEM.href)
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <AddIcon aria-hidden className="size-5" />
            Add
          </Link>
        </li>

        <li className="flex-1">
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger
              aria-label="More navigation"
              className="text-muted-foreground flex min-h-14 w-full min-w-11 flex-col items-center justify-center gap-1 text-[11px]"
            >
              <Menu aria-hidden className="size-5" />
              More
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Navigate</DrawerTitle>
              </DrawerHeader>
              <ul className="space-y-1 px-4 pb-8">
                {secondary.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
                          active
                            ? "bg-accent text-primary font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        <Icon aria-hidden className="size-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </DrawerContent>
          </Drawer>
        </li>
      </ul>
    </nav>
  );
}
