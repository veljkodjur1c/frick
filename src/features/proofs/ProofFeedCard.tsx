"use client";

import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { PostCard } from "@/features/feed/PostCard";
import type { FeedProofData } from "@/features/feed/queries";
import { applyVote, nextVote } from "@/features/feed/votes";
import { formatNumber } from "@/lib/format";
import { PROOF_APPROVALS_NEEDED, PROOF_REJECTIONS_NEEDED } from "@/lib/game/config";
import type { ProofVote } from "@/lib/game/proofs";
import { voteOnProof } from "./actions";

const STATUS_BADGE = {
  pending: <Badge tone="pending">Na čekanju</Badge>,
  approved: <Badge tone="success">Legit</Badge>,
  rejected: <Badge tone="danger">Cap</Badge>,
};

/** A task proof in the feed. The other players vote Legit/Cap here; enough votes approve or reject it. */
export function ProofFeedCard({ proof }: { proof: FeedProofData }) {
  const [status, setStatus] = useState(proof.status);
  const [votes, setVotes] = useState(proof.votes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const points = formatNumber(proof.task.points);
  const canVote = status === "pending" && !proof.isOwn;

  function vote(tapped: ProofVote) {
    // Ignore taps until the last vote is saved, so a rollback can't undo a newer vote.
    if (pending) return;
    const before = votes;
    const next = nextVote(votes.mine, tapped);

    // Show the vote right away; the server answers with the real counts and status.
    setVotes(applyVote(votes, next));
    setError(null);
    startTransition(async () => {
      const result = await voteOnProof(proof.id, next);
      if (!result.ok) {
        setVotes(before);
        setError(result.error);
        return;
      }
      setVotes({ legit: result.legit, cap: result.cap, mine: next });
      setStatus(result.status);
    });
  }

  const progress = `Legit ${formatNumber(votes.legit)}/${formatNumber(PROOF_APPROVALS_NEEDED)} · Cap ${formatNumber(votes.cap)}/${formatNumber(PROOF_REJECTIONS_NEEDED)}`;

  return (
    <PostCard
      author={{ name: proof.author.displayName, avatarUrl: proof.author.avatarUrl, collector: proof.author.collector }}
      createdAt={proof.createdAt}
      imageUrl={proof.imageUrl}
      imageAlt={`Dokaz: ${proof.task.title}`}
      caption={`Dokaz za „${proof.task.title}“`}
      badge={
        <span className="flex gap-1.5">
          <Badge tone="gold">+{points}</Badge>
          {STATUS_BADGE[status]}
        </span>
      }
      footer={
        canVote ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={votes.mine === "legit" ? "success" : "secondary"}
                aria-pressed={votes.mine === "legit"}
                onClick={() => vote("legit")}
              >
                Legit{" "}
                <span className="tabular-nums">
                  {formatNumber(votes.legit)}/{formatNumber(PROOF_APPROVALS_NEEDED)}
                </span>
              </Button>
              <Button
                variant={votes.mine === "cap" ? "danger" : "secondary"}
                aria-pressed={votes.mine === "cap"}
                onClick={() => vote("cap")}
              >
                Cap{" "}
                <span className="tabular-nums">
                  {formatNumber(votes.cap)}/{formatNumber(PROOF_REJECTIONS_NEEDED)}
                </span>
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted tabular-nums">
            {status === "approved"
              ? `Priznato: +${points} štete bossu.`
              : status === "rejected"
                ? "Odbijeno. Može novi dokaz dok traje nedelja."
                : `Čeka glasove: ${progress}`}
          </p>
        )
      }
    />
  );
}
