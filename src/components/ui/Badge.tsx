import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "gold" | "hextech" | "success" | "danger" | "pending";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-raised text-fg-muted",
  gold: "bg-gold-700/70 text-gold-200",
  hextech: "bg-hextech-900 text-hextech-100",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  pending: "bg-pending/15 text-pending",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

/**
 * Short status or info label: points (+30), task scope (Tim / Solo),
 * proof status (Na čekanju / Legit / Cap).
 */
export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-semibold whitespace-nowrap tabular-nums",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
