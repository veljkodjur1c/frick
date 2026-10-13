import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CATEGORY_INFO, type TaskCategory } from "@/lib/game/titles";

// Line icons on a 24px grid, drawn with currentColor so they take the text color around them.
const PATHS: Record<TaskCategory, ReactNode> = {
  // Coffee cup with steam.
  caffeine: (
    <>
      <path d="M5 10h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" strokeLinejoin="round" />
      <path d="M16 11.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" strokeLinecap="round" />
    </>
  ),
  // Dumbbell.
  gym: (
    <>
      <path d="M8 12h8" />
      <rect x="5" y="7.5" width="3" height="9" rx="1" />
      <rect x="16" y="7.5" width="3" height="9" rx="1" />
      <path d="M3 10v4M21 10v4" strokeLinecap="round" />
    </>
  ),
  // Open book.
  grind: (
    <>
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" strokeLinejoin="round" />
      <path d="M12 6.5v13" />
    </>
  ),
  // Chef hat.
  chef: (
    <>
      <path
        d="M7 14.5a4 4 0 0 1-.8-7.9A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 5.8 2.6A4 4 0 0 1 17 14.5V19H7z"
        strokeLinejoin="round"
      />
      <path d="M7 16.5h10" />
    </>
  ),
  // Die.
  random: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
};

/** The category's icon. Decorative: the category name is always written next to it. */
export function CategoryIcon({ category, className }: { category: TaskCategory; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={cn("shrink-0", className)}
    >
      {PATHS[category]}
    </svg>
  );
}

/** Small label with a task's category, on task rows and proposal cards. */
export function CategoryBadge({ category, className }: { category: TaskCategory; className?: string }) {
  return (
    <Badge tone={category} className={className}>
      <CategoryIcon category={category} className="size-3.5" />
      {CATEGORY_INFO[category].title}
    </Badge>
  );
}

/** A player's title next to their name (feed), in gold so it reads as a reward, not a task label. */
export function TitleBadge({ category }: { category: TaskCategory }) {
  return (
    <Badge tone="gold">
      <CategoryIcon category={category} className="size-3.5" />
      {CATEGORY_INFO[category].title}
    </Badge>
  );
}
