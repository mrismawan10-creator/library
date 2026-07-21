import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found."
      description="The page you are looking for does not exist."
      actionLabel="Back to home"
      actionHref="/"
    />
  );
}
