"use client";

import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { setPostVote } from "./actions";
import { PostCard } from "./PostCard";
import type { FeedPostData } from "./queries";
import { applyVote, nextVote, postVerdict, type PostVote } from "./votes";

/**
 * A feed post rendered as a PostCard, with Legit/Cap voting and the Valid/Freak badge.
 * Rendered through FeedItemCard.
 */
export function FeedPostCard({ post }: { post: FeedPostData }) {
  const [votes, setVotes] = useState(post.votes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const verdict = postVerdict(votes);

  function vote(tapped: PostVote) {
    // Ignore taps until the last vote is saved, so a rollback can't undo a newer vote.
    if (pending) return;
    const before = votes;
    const next = nextVote(votes.mine, tapped);

    // Show the result right away; roll back if the server says no.
    setVotes(applyVote(votes, next));
    setError(null);
    startTransition(async () => {
      const message = await setPostVote(post.id, next);
      if (message) {
        setVotes(before);
        setError(message);
      }
    });
  }

  return (
    <PostCard
      author={{ name: post.author.displayName, avatarUrl: post.author.avatarUrl }}
      createdAt={post.createdAt}
      imageUrl={post.imageUrl}
      caption={post.caption}
      badge={
        verdict === "valid" ? (
          <Badge tone="success">Valid</Badge>
        ) : verdict === "freak" ? (
          <Badge tone="danger">Freak</Badge>
        ) : null
      }
      footer={
        post.isOwn ? (
          <p className="text-sm text-fg-muted tabular-nums">
            {votes.legit + votes.cap === 0
              ? "Još niko nije glasao."
              : `Legit ${formatNumber(votes.legit)} · Cap ${formatNumber(votes.cap)}`}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={votes.mine === "legit" ? "success" : "secondary"}
                aria-pressed={votes.mine === "legit"}
                onClick={() => vote("legit")}
              >
                Legit <span className="tabular-nums">{formatNumber(votes.legit)}</span>
              </Button>
              <Button
                variant={votes.mine === "cap" ? "danger" : "secondary"}
                aria-pressed={votes.mine === "cap"}
                onClick={() => vote("cap")}
              >
                Cap <span className="tabular-nums">{formatNumber(votes.cap)}</span>
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )
      }
    />
  );
}
