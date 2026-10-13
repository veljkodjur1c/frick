import { cn } from "@/lib/cn";

type MonsterCanProps = {
  /** Color token of the flavor (CanFlavor.color). */
  color: string;
  /** Not earned yet: a gray, dimmed can. */
  locked?: boolean;
  className?: string;
};

/** A tall energy drink can in the flavor color. Drawn from scratch, no brand logo. Size it with height. */
export function MonsterCan({ color, locked = false, className }: MonsterCanProps) {
  return (
    <svg
      viewBox="0 0 40 88"
      aria-hidden
      className={cn("aspect-[40/88] shrink-0", locked && "opacity-50", className)}
      style={{ color: `var(--color-${locked ? "can-locked" : color})` }}
    >
      {/* Lid and neck */}
      <rect x="8" y="0.5" width="24" height="3" rx="1.5" className="fill-can-metal" />
      <path d="M8 3.5h24l5 5.5H3z" className="fill-can-metal" />
      <path d="M8 3.5h24l5 5.5H3z" className="fill-black/20" />
      {/* Body with a light stripe on the left and shade on the right */}
      <rect x="3" y="9" width="34" height="71" fill="currentColor" />
      <rect x="3" y="12" width="34" height="2" className="fill-black/25" />
      <rect x="3" y="75" width="34" height="2" className="fill-black/25" />
      <rect x="8" y="9" width="3" height="71" className="fill-white/30" />
      <rect x="30" y="9" width="7" height="71" className="fill-black/20" />
      {/* Lightning bolt */}
      <path d="M24 22 13 46h7l-4 18 13-25h-7l4-17z" className="fill-black/45" />
      {/* Bottom rim */}
      <path d="M3 80h34l-4 5H7z" className="fill-can-metal" />
      <rect x="7" y="84.5" width="26" height="3" rx="1.5" className="fill-can-metal" />
    </svg>
  );
}
