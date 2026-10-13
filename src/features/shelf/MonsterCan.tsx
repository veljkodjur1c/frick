import { cn } from "@/lib/cn";
import { canLook } from "./canLooks";

type MonsterCanProps = {
  /** Flavor id (CanFlavor.id); picks the body and claw colors (canLooks.ts). */
  flavor: string;
  /** Not earned yet: a gray, dimmed can. */
  locked?: boolean;
  className?: string;
};

/**
 * One torn claw stroke: wide at the top, tapering to a point, with jagged edges.
 * `lean` bends the tip sideways. Points are computed once, at module load.
 */
function claw(x: number, top: number, bottom: number, lean: number): string {
  const steps = 10;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = top + (bottom - top) * t;
    const center = x + lean * t * t;
    const half = 2.7 * (1 - t) + 0.2;
    // Rougher near the top, like a torn brush stroke.
    const jag = (i % 2 === 0 ? 0.75 : -0.75) * (1 - t * 0.6);
    left.push(`${(center - half + jag).toFixed(2)},${y.toFixed(2)}`);
    right.push(`${(center + half + jag * 0.6).toFixed(2)},${(y + 1.4).toFixed(2)}`);
  }
  return [...left, ...right.reverse()].join(" ");
}

const CLAWS = [claw(14, 18, 80, -1.4), claw(20, 14, 85, 0), claw(26, 18, 80, 1.4)];

/**
 * A tall 500 ml energy drink can in the style of the real Monster cans: metal lid, colored body and three torn
 * claw marks. Drawn from scratch (no brand logo or images). Size it with a height class, e.g. "h-20".
 */
export function MonsterCan({ flavor, locked = false, className }: MonsterCanProps) {
  const look = locked ? { body: "can-locked", claw: "can-metal" } : canLook(flavor);

  return (
    <svg viewBox="0 0 40 107" aria-hidden className={cn("aspect-[40/107] shrink-0", locked && "opacity-50", className)}>
      {/* Lid with the pull tab, and the neck */}
      <rect x="9" y="0.5" width="22" height="3" rx="1.5" className="fill-can-metal" />
      <rect x="16.5" y="1" width="7" height="1.6" rx="0.8" className="fill-white/50" />
      <path d="M9 3.5h22l6 5.5H3z" className="fill-can-metal" />
      <path d="M27 3.5h4l6 5.5h-6z" className="fill-black/20" />
      <path d="M11 3.5h2.5L8 9H5.5z" className="fill-white/35" />

      {/* Body */}
      <rect x="3" y="9" width="34" height="88" style={{ fill: `var(--color-${look.body})` }} />

      {/* Claw marks and the band under them, where the real can has its name */}
      <g style={{ fill: `var(--color-${look.claw})` }}>
        {CLAWS.map((points) => (
          <polygon key={points} points={points} />
        ))}
        <rect x="10" y="88" width="20" height="2.6" rx="1.3" />
        <rect x="14" y="92" width="12" height="1.2" rx="0.6" opacity="0.6" />
      </g>

      {/* Round shading: dark edges, a highlight on the left, shade on the right, seams at the ends */}
      <rect x="3" y="9" width="2.5" height="88" className="fill-black/25" />
      <rect x="7" y="9" width="2.5" height="88" className="fill-white/35" />
      <rect x="9.5" y="9" width="2" height="88" className="fill-white/10" />
      <rect x="28" y="9" width="9" height="88" className="fill-black/20" />
      <rect x="33" y="9" width="4" height="88" className="fill-black/15" />
      <rect x="3" y="9" width="34" height="1.2" className="fill-black/30" />
      <rect x="3" y="95.8" width="34" height="1.2" className="fill-black/30" />

      {/* Bottom */}
      <path d="M3 97h34l-4 6H7z" className="fill-can-metal" />
      <path d="M29 97h8l-4 6h-6z" className="fill-black/20" />
      <rect x="8" y="102.5" width="24" height="4" rx="2" className="fill-can-metal" />
    </svg>
  );
}
