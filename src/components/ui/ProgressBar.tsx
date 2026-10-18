import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export type ProgressTone = "hextech" | "gold" | "success" | "danger";

const TONES: Record<ProgressTone, string> = {
  hextech: "bg-hextech-300",
  gold: "bg-linear-to-r from-gold-500 to-gold-300",
  success: "bg-success",
  // Over a limit (e.g. too many tasks in champ select).
  danger: "bg-danger",
};

type ProgressBarProps = {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: "sm" | "md";
  /** Text above the bar, e.g. "Taskovi ove nedelje". Also used as the accessible name. */
  label?: string;
  /** Shows "value / max" next to the label. */
  showValue?: boolean;
  className?: string;
};

/** Generic progress: weekly tasks done, LP to next division, votes collected. For the boss use BossHealthBar. */
export function ProgressBar({
  value,
  max = 100,
  tone = "hextech",
  size = "md",
  label,
  showValue = false,
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          {label && <span className="text-fg-muted">{label}</span>}
          {showValue && (
            <span className="ml-auto font-semibold text-fg tabular-nums">
              {formatNumber(value)} / {formatNumber(max)}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn("overflow-hidden rounded-full bg-raised", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", TONES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
