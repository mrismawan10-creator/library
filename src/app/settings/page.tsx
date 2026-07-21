import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Settings" };

/** Feature flags, tag cleanup (FR-10), and export live here from Milestone 4. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <p className="text-muted-foreground text-sm">
        Tag cleanup, feature flags, and backup options arrive in later
        milestones.
      </p>
    </>
  );
}
