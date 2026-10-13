"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Pointy-top hexagon.
const HEX = "[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]";

type HextechFabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Accessible name, e.g. "Akcije". The button only shows an icon. */
  label: string;
  /** The icon in the teal core. */
  icon: ReactNode;
  /** A menu it controls is open: the icon turns 45° (a + becomes ×). */
  open?: boolean;
  /** Something is waiting for the player: the core glows. */
  glow?: boolean;
  /** Small count in the corner, e.g. proofs waiting for a vote. */
  count?: number;
};

/**
 * The floating Hextech action button: a gold hexagon with a teal core, 64px wide.
 * Pressing it sends a short energy ring out (motion only on a tap). Position it with className
 * (it is usually fixed above the bottom nav by the feature that uses it).
 */
export function HextechFab({ label, icon, open = false, glow = false, count, className, onClick, ...props }: HextechFabProps) {
  // Bumped on every press so the ring element remounts and plays again.
  const [pulse, setPulse] = useState(0);

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={(event) => {
        setPulse((n) => n + 1);
        onClick?.(event);
      }}
      className={cn(
        "relative flex h-[4.5rem] w-16 shrink-0 items-center justify-center transition-transform active:scale-95",
        glow ? "drop-shadow-[0_0_14px_var(--color-hextech-300)]" : "drop-shadow-[0_6px_10px_var(--color-abyss)]",
        className,
      )}
      {...props}
    >
      {/* Gold frame, dark ring, teal core */}
      <span aria-hidden className={cn("absolute inset-0 bg-linear-to-b from-gold-200 via-gold-300 to-gold-500", HEX)} />
      <span aria-hidden className={cn("absolute inset-[3px] bg-deep", HEX)} />
      <span
        aria-hidden
        className={cn("absolute inset-[9px] bg-linear-to-b from-hextech-100 via-hextech-300 to-hextech-700", HEX)}
      />
      {pulse > 0 && (
        <span
          key={pulse}
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 animate-hex-pulse bg-hextech-300/60", HEX)}
        />
      )}
      <span aria-hidden className={cn("relative text-abyss transition-transform duration-200", open && "rotate-45")}>
        {icon}
      </span>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-fg tabular-nums ring-2 ring-abyss">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
