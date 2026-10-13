import type { ReactNode } from "react";
import { Avatar, Card } from "@/components/ui";
import { formatTimeAgo } from "@/lib/format";

type PostCardProps = {
  /** collector: owns every Monster can flavor, shown with the "Kolekcionar" avatar frame. */
  author: { name: string; avatarUrl?: string | null; collector?: boolean };
  /** ISO timestamp. */
  createdAt: string;
  /** Signed URL of the photo. Null shows a placeholder (e.g. the file is gone). */
  imageUrl: string | null;
  imageAlt?: string;
  caption?: string | null;
  /** Right side of the header, e.g. a proof status Badge ("Na čekanju"). */
  badge?: ReactNode;
  /** Under the caption, e.g. Legit/Cap buttons on a task proof. */
  footer?: ReactNode;
};

/**
 * A photo post: author, time, photo (cropped to 4:5), caption.
 * Used by the feed, and meant to be reused for task proof photos (#9) via `badge` and `footer`.
 */
export function PostCard({ author, createdAt, imageUrl, imageAlt, caption, badge, footer }: PostCardProps) {
  return (
    <Card as="article" padding="sm" className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <Avatar name={author.name} src={author.avatarUrl} highlight={author.collector ? "collector" : "none"} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{author.name}</p>
          {/* "pre 5 minuta" can tick over between the server render and hydration; that's fine. */}
          <time dateTime={createdAt} className="text-sm text-fg-muted" suppressHydrationWarning>
            {formatTimeAgo(new Date(createdAt))}
          </time>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </header>

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

      {caption && <p className="whitespace-pre-line text-fg">{caption}</p>}
      {footer}
    </Card>
  );
}
