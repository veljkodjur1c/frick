import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { RankDivision, RankTier } from "@/lib/game/rank";

// Re-exported so UI code keeps importing them from "@/components/ui". The LP -> rank logic is in src/lib/game/rank.ts.
export type { RankDivision, RankTier };

const TIER_LABEL: Record<RankTier, string> = {
  iron: "Iron",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  emerald: "Emerald",
  diamond: "Diamond",
  master: "Master",
  grandmaster: "Grandmaster",
  challenger: "Challenger",
};

const APEX_TIERS: ReadonlySet<RankTier> = new Set(["master", "grandmaster", "challenger"]);
const ROMAN: Record<RankDivision, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

const SIZES = {
  sm: { emblem: "size-5", name: "text-sm", gap: "gap-1.5", stacked: false },
  md: { emblem: "size-8", name: "text-base", gap: "gap-2", stacked: false },
  lg: { emblem: "size-16", name: "text-xl", gap: "gap-2", stacked: true },
} as const;

/** Rank name as text, e.g. "Gold II" or "Challenger". */
export function rankLabel(tier: RankTier, division?: RankDivision | null) {
  return APEX_TIERS.has(tier) || !division ? TIER_LABEL[tier] : `${TIER_LABEL[tier]} ${ROMAN[division]}`;
}

/** Hexagonal gem in the tier color. Drawn from scratch, not Riot's emblems. */
export function RankEmblem({ tier, className }: { tier: RankTier; className?: string }) {
  const apex = APEX_TIERS.has(tier);

  return (
    <svg
      viewBox="0 0 40 44"
      aria-hidden
      className={cn("shrink-0", className)}
      style={{ color: `var(--color-rank-${tier})` }}
    >
      <polygon
        points="20,1.5 38,12 38,32 20,42.5 2,32 2,12"
        fill="currentColor"
        fillOpacity={apex ? 0.3 : 0.14}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {apex && (
        <polygon
          points="20,5.5 34.5,14 34.5,30 20,38.5 5.5,30 5.5,14"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.6}
          strokeWidth={1}
        />
      )}
      {/* Gem */}
      <polygon points="20,11 29,16.5 29,27.5 20,33 11,27.5 11,16.5" fill="currentColor" />
      <polygon points="20,11 29,16.5 20,22 11,16.5" fill="#ffffff" fillOpacity={0.35} />
      <polygon points="29,16.5 29,27.5 20,33 20,22" fill="#000000" fillOpacity={0.22} />
    </svg>
  );
}

type RankBadgeProps = {
  tier: RankTier;
  /** 4 is the lowest (IV), 1 the highest (I). Ignored for Master and above (rankFromLp() gives null there). */
  division?: RankDivision | null;
  lp?: number;
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * Emblem + rank name (+ LP). sm/md sit inline in lists, lg is stacked for the profile.
 * From a player's total LP: <RankBadge {...rankFromLp(profile.lp)} />.
 */
export function RankBadge({ tier, division, lp, size = "md", className }: RankBadgeProps) {
  const s = SIZES[size];

  return (
    <span
      className={cn(
        "inline-flex",
        s.gap,
        s.stacked ? "flex-col items-center text-center" : "items-center",
        className,
      )}
    >
      <RankEmblem tier={tier} className={s.emblem} />
      <span className={cn("flex", s.stacked ? "flex-col items-center" : "items-baseline gap-1.5")}>
        <span className={cn("font-display font-semibold text-fg", s.name)}>{rankLabel(tier, division)}</span>
        {lp !== undefined && (
          <span className="text-xs text-fg-muted tabular-nums">{formatNumber(lp)} LP</span>
        )}
      </span>
    </span>
  );
}
