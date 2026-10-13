"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { isProposalApproved } from "@/lib/game/champSelect";
import { CategoryBadge } from "@/features/titles/CategoryIcon";
import { PROPOSAL_APPROVALS_NEEDED } from "@/lib/game/config";
import { deleteProposal, setProposalVote } from "./actions";
import type { ProposalData, ProposalVotes } from "./queries";

/** The votes after the viewer's vote changes to `next` (true = Za, false = Protiv, null = none). */
function applyVote(votes: ProposalVotes, next: boolean | null): ProposalVotes {
  const result = { ...votes, mine: next };
  if (votes.mine === true) result.za -= 1;
  if (votes.mine === false) result.protiv -= 1;
  if (next === true) result.za += 1;
  if (next === false) result.protiv += 1;
  return result;
}

/** One proposal with Za/Protiv voting. The proposer can delete it. */
export function ProposalCard({ proposal }: { proposal: ProposalData }) {
  // Rolls back by itself when the action's transition ends without new server data (an error).
  const [votes, setOptimisticVotes] = useOptimistic(proposal.votes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const passes = isProposalApproved(votes.za);

  function vote(tapped: boolean) {
    // Ignore taps until the last change is saved, so a rollback can't undo a newer vote.
    if (pending) return;
    // Tapping your current vote takes it back.
    const next = votes.mine === tapped ? null : tapped;
    setError(null);
    startTransition(async () => {
      setOptimisticVotes(applyVote(votes, next));
      const result = await setProposalVote(proposal.id, next);
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProposal(proposal.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card as="article" className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <Avatar name={proposal.proposer.displayName} src={proposal.proposer.avatarUrl} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">
          {proposal.proposer.displayName}
          {proposal.isOwn && " · ti"}
        </p>
        <Badge tone="gold">+{formatNumber(proposal.points)}</Badge>
      </header>

      <div>
        <p className="text-base text-fg">{proposal.title}</p>
        {proposal.description && (
          <p className="mt-0.5 whitespace-pre-line text-sm text-fg-muted">{proposal.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone={proposal.scope === "team" ? "hextech" : "neutral"}>
            {proposal.scope === "team" ? "Tim" : "Solo"}
          </Badge>
          <Badge>{proposal.type === "proof" ? "Sa slikom" : "Štikliranje"}</Badge>
          {proposal.category && <CategoryBadge category={proposal.category} />}
          {passes && <Badge tone="success">Prolazi</Badge>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-fg-muted tabular-nums">
          Za {formatNumber(votes.za)} od {formatNumber(PROPOSAL_APPROVALS_NEEDED)} · Protiv {formatNumber(votes.protiv)}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={votes.mine === true ? "success" : "secondary"}
            aria-pressed={votes.mine === true}
            onClick={() => vote(true)}
          >
            Za
          </Button>
          <Button
            variant={votes.mine === false ? "danger" : "secondary"}
            aria-pressed={votes.mine === false}
            onClick={() => vote(false)}
          >
            Protiv
          </Button>
        </div>
        {proposal.isOwn && (
          <Button variant="ghost" disabled={pending} onClick={remove}>
            Obriši predlog
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
