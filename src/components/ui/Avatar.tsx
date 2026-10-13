import { cn } from "@/lib/cn";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: "size-8", text: "text-xs" },
  md: { box: "size-10", text: "text-sm" },
  lg: { box: "size-14", text: "text-lg" },
  xl: { box: "size-20", text: "text-2xl" },
};

const HIGHLIGHTS = {
  none: "ring-1 ring-line",
  // MVP of the week.
  mvp: "shadow-glow-gold",
  // Feeder of the week. Playful, not alarming.
  feeder: "ring-2 ring-danger/70 grayscale-[35%]",
  // Owns every Monster can flavor ("Kolekcionar"). Kept forever, unlike the weekly ones.
  collector: "shadow-glow-hextech",
} as const;

type AvatarProps = {
  /** Display name. Used for alt text and the initials fallback. */
  name: string;
  src?: string | null;
  size?: AvatarSize;
  highlight?: keyof typeof HIGHLIGHTS;
  className?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

/** Round profile picture. Falls back to initials when there is no photo. */
export function Avatar({ name, src, size = "md", highlight = "none", className }: AvatarProps) {
  const { box, text } = SIZES[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised",
        box,
        HIGHLIGHTS[highlight],
        className,
      )}
    >
      {src ? (
        // Avatars are small Supabase Storage files; next/image optimization is not worth the config here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-label={name} role="img" className={cn("font-display font-semibold text-gold-200", text)}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
