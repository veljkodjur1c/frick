"use client";

import { useState, useTransition } from "react";
import { Badge, Button, VerdictStamp } from "@/components/ui";
import { PostCard } from "@/features/feed/PostCard";
import type { FeedProofData } from "@/features/feed/queries";
import { applyVote, nextVote } from "@/features/feed/votes";
import { formatNumber } from "@/lib/format";
import { PROOF_APPROVALS_NEEDED, PROOF_REJECTIONS_NEEDED } from "@/lib/game/config";
import type { ProofVote } from "@/lib/game/proofs";
import { voteOnProof } from "./actions";

// Decided proofs get a stamp next to the points instead of a status badge.
const STAMP = { approved: "legit", rejected: "cap" } as const;

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
      author={{
        name: proof.author.displayName,
        avatarUrl: proof.author.avatarUrl,
        collector: proof.author.collector,
        title: proof.author.title,
      }}
      createdAt={proof.createdAt}
      imageUrl={proof.imageUrl}
      imageAlt={`Dokaz: ${proof.task.title}`}
      caption={`Dokaz za „${proof.task.title}“`}
      badge={
        <span className="flex items-center gap-1.5">
          <Badge tone="gold">+{points}</Badge>
          {status === "pending" ? (
            <Badge tone="pending">Na čekanju</Badge>
          ) : (
            // Animates only when a vote here decided it, not for proofs that load already decided.
            <VerdictStamp verdict={STAMP[status]} animate={status !== proof.status} />
          )}
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
