"use client";

import { useEffect, useState, useTransition } from "react";
import { EmptyState, Sheet, Spinner } from "@/components/ui";
import { ProofFeedCard } from "@/features/proofs/ProofFeedCard";
import { loadVoteQueue } from "./actions";
import type { FeedProofData } from "./queries";

/**
 * "Čeka tvoj glas": the other players' pending proofs the viewer hasn't voted on, loaded when it opens.
 * Mount it only while open (the wheel does), so it loads fresh every time.
 */
export function VoteQueueSheet({ onClose }: { onClose: () => void }) {
  const [proofs, setProofs] = useState<FeedProofData[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        setProofs(await loadVoteQueue());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  return (
    <Sheet open onClose={onClose} title="Čeka tvoj glas">
      {failed ? (
        <p role="alert" className="py-6 text-center text-sm text-danger">
          Dokazi nisu učitani. Proveri internet i pokušaj ponovo.
        </p>
      ) : proofs === null ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : proofs.length === 0 ? (
        <EmptyState title="Sve si izglasao" description="Kad neko pošalje novi dokaz, pojaviće se ovde." />
      ) : (
        <ul className="flex flex-col gap-4">
          {proofs.map((proof) => (
            <li key={proof.id}>
              <ProofFeedCard proof={proof} />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
