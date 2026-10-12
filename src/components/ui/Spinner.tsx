import { cn } from "@/lib/cn";

/** Small loading ring. Inherits the text color. */
export function Spinner({ className, label = "Učitavanje" }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}
