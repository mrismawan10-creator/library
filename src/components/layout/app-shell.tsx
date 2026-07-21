import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";

/**
 * The frame every page renders inside: left rail on desktop, bottom bar on
 * mobile. The bottom padding keeps content clear of the mobile bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SidebarNav />
      <div className="lg:pl-60">
        <main id="main" className="px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
