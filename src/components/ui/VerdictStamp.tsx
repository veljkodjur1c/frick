import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Verdict = "legit" | "cap";

// Hexagon like RankEmblem: gold Hextech rim outside, the verdict color inside.
const OUTER = "20,1.5 38,12 38,32 20,42.5 2,32 2,12";
const INNER = "20,6 34,14 34,30 20,38 6,30 6,14";

const LOOK: Record<Verdict, { label: string; hex: string; text: string; icon: ReactNode }> = {
  legit: {
    label: "Legit",
    hex: "fill-success/20 stroke-success",
    text: "text-success",
    // Shield with a tick.
    icon: (
      <>
        <path d="M12 3.5 5.5 6v5.2c0 4.1 2.7 7.4 6.5 9.3 3.8-1.9 6.5-5.2 6.5-9.3V6z" />
        <path d="m9 12 2.2 2.2L15.5 10" />
      </>
    ),
  },
  cap: {
    label: "Cap",
    hex: "fill-danger/20 stroke-danger",
    text: "text-danger",
    // Baseball cap, side view: crown, seam, button and the brim to the right.
    icon: (
      <>
        <path d="M3.5 15a7.5 7.5 0 0 1 15 0z" />
        <path d="M18.5 15h1.8a1.7 1.7 0 0 1 0 3.4H11" />
        <path d="M11 7.5V15" />
        <circle cx="11" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
};

type VerdictStampProps = {
  verdict: Verdict;
  /** Plays the stamp-in animation; only when the verdict just changed (a vote), not on page load. */
  animate?: boolean;
  className?: string;
};

/**
 * Voted result stamped on a photo: a tilted Hextech hexagon with a shield (Legit) or a cap (Cap) and a small
 * label under it. Place it over the top-right corner of the image (PostCard does this through `stamp`).
 */
export function VerdictStamp({ verdict, animate = false, className }: VerdictStampProps) {
  const look = LOOK[verdict];

  return (
    <span
      role="img"
      aria-label={`Izglasano: ${look.label}`}
      className={cn("inline-flex -rotate-6 flex-col items-center", animate && "animate-stamp-in", className)}
    >
      <span className="relative size-16">
        <svg aria-hidden viewBox="0 0 40 44" className="absolute inset-0 size-full">
          <polygon points={OUTER} className="fill-abyss/85 stroke-gold-300" strokeWidth={2} strokeLinejoin="round" />
          <polygon points={INNER} className={look.hex} strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("absolute inset-0 m-auto size-7", look.text)}
        >
          {look.icon}
        </svg>
      </span>
      <span
        className={cn(
          "-mt-2.5 rounded-sm border border-gold-500 bg-deep px-2 font-display text-xs leading-5 font-bold",
          look.text,
        )}
      >
        {look.label}
      </span>
    </span>
  );
}
