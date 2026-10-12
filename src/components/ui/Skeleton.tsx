import { cn } from "@/lib/cn";

/** Grey placeholder while data loads. Give it the size of what it replaces: <Skeleton className="h-4 w-32" /> */
export function Skeleton({ className, rounded = "md" }: { className?: string; rounded?: "md" | "lg" | "full" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-raised",
        rounded === "md" && "rounded-md",
        rounded === "lg" && "rounded-lg",
        rounded === "full" && "rounded-full",
        className,
      )}
    />
  );
}
