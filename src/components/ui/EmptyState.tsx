import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  /** Say what to do next, not just that it is empty. */
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Shown instead of an empty list. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-line px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-base font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
