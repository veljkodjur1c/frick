import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

type BossHealthBarProps = {
  /** Boss max HP for the week. */
  hp: number;
  /** Total approved points the team has dealt so far. */
  damage: number;
  /** Shown on the left above the bar, usually the boss name. */
  label?: ReactNode;
  className?: string;
};

const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

/**
 * The weekly boss HP bar.
 *
 * Damage trail: when `damage` grows, the red bar drops right away and a lighter bar
 * behind it drains a moment later, so everyone sees how big the hit was. This is pure CSS
 * (two widths with different transition delays), so it just works when the parent re-renders
 * with a new `damage` value.
 */
export function BossHealthBar({ hp, damage, label, className }: BossHealthBarProps) {
  const remaining = Math.max(hp - damage, 0);
  const percent = hp > 0 ? (remaining / hp) * 100 : 0;
  const defeated = remaining === 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-end justify-between gap-3">
        {label && <div className="min-w-0 truncate font-display text-lg font-semibold text-gold-200">{label}</div>}
        <div className="ml-auto shrink-0 text-sm font-semibold tabular-nums">
          {defeated ? (
            <span className="text-gold-300">Poražen</span>
          ) : (
            <>
              <span className="text-fg">{formatNumber(remaining)}</span>
              <span className="text-fg-muted"> / {formatNumber(hp)} HP</span>
            </>
          )}
        </div>
      </div>

      {/* Gold frame */}
      <div className="chamfer bg-linear-to-b from-gold-300 to-gold-500 p-px [--chamfer:7px]">
        <div
          role="progressbar"
          aria-label="Boss HP"
          aria-valuemin={0}
          aria-valuemax={hp}
          aria-valuenow={remaining}
          className="chamfer relative h-5 overflow-hidden bg-deep [--chamfer:6.6px]"
        >
          {/* Damage trail: same width, but waits before draining. */}
          <div
            className="absolute inset-y-0 left-0 bg-boss-trail transition-[width] delay-500 duration-700 ease-in"
            style={{ width: `${percent}%` }}
          />
          {/* Current HP */}
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-b from-boss to-boss-dark transition-[width] duration-200 ease-out"
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-x-0 top-0 h-1/3 bg-white/15" />
          </div>
          {/* 10% ticks */}
          {TICKS.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-y-0 w-px bg-abyss/70"
              style={{ left: `${tick}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
