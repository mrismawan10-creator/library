import {
  Archive,
  FolderTree,
  Heart,
  Home,
  LibraryBig,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar; the rest live in the "More" drawer. */
  primaryOnMobile?: boolean;
};

/** Main navigation (PRD §5). Order is deliberate and shared by both navs. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, primaryOnMobile: true },
  {
    href: "/prompts",
    label: "All Prompts",
    icon: LibraryBig,
    primaryOnMobile: true,
  },
  {
    href: "/favorites",
    label: "Favorites",
    icon: Heart,
    primaryOnMobile: true,
  },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/archived", label: "Archived", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const ADD_PROMPT_ITEM: NavItem = {
  href: "/prompts/new",
  label: "Add Prompt",
  icon: Plus,
};

/**
 * "/" only matches exactly; every other route also matches its children, so
 * /prompts/123 keeps All Prompts highlighted.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
