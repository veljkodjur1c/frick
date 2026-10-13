import type { ReactNode } from "react";
import { Avatar, Card } from "@/components/ui";
import { TitleBadge } from "@/features/titles/CategoryIcon";
import { formatTimeAgo } from "@/lib/format";
import type { TaskCategory } from "@/lib/game/titles";

type PostCardProps = {
  /**
   * collector: owns every Monster can flavor, shown with the "Kolekcionar" avatar frame.
   * title: the author's category title, shown as a gold badge next to the name.
   */
  author: { name: string; avatarUrl?: string | null; collector?: boolean; title?: TaskCategory | null };
  /** ISO timestamp. */
  createdAt: string;
  /** Signed URL of the photo. Null shows a placeholder (e.g. the file is gone). */
  imageUrl: string | null;
  imageAlt?: string;
  caption?: string | null;
  /** Right side of the header, e.g. a proof status Badge ("Na čekanju"). */
  badge?: ReactNode;
  /** Over the top-right corner of the photo, e.g. a <VerdictStamp> once the post is voted. */
  stamp?: ReactNode;
  /** Under the caption, e.g. Legit/Cap buttons on a task proof. */
  footer?: ReactNode;
};

/**
 * A photo post: author, time, photo (cropped to 4:5), caption.
 * Used by the feed, and meant to be reused for task proof photos (#9) via `badge` and `footer`.
 */
export function PostCard({ author, createdAt, imageUrl, imageAlt, caption, badge, stamp, footer }: PostCardProps) {
  return (
    <Card as="article" padding="sm" className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <Avatar name={author.name} src={author.avatarUrl} highlight={author.collector ? "collector" : "none"} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-semibold text-fg">{author.name}</p>
            {author.title && <TitleBadge category={author.title} />}
          </div>
          {/* "pre 5 minuta" can tick over between the server render and hydration; that's fine. */}
          <time dateTime={createdAt} className="text-sm text-fg-muted" suppressHydrationWarning>
            {formatTimeAgo(new Date(createdAt))}
          </time>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </header>

      <div className="relative">
        {imageUrl ? (
          // Signed Supabase URLs expire, so next/image caching would only get in the way.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt ?? caption ?? `Slika: ${author.name}`}
            loading="lazy"
            className="aspect-4/5 w-full rounded-lg bg-raised object-cover"
          />
        ) : (
          <div className="flex aspect-4/5 items-center justify-center rounded-lg bg-raised text-sm text-fg-muted">
            Slika nije dostupna
          </div>
        )}
        {stamp && <div className="absolute top-3 right-3">{stamp}</div>}
      </div>

      {caption && <p className="whitespace-pre-line text-fg">{caption}</p>}
      {footer}
    </Card>
  );
}
