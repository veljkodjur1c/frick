"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, HextechFab } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { NewPostSheet } from "./NewPostSheet";
import { VoteQueueSheet } from "./VoteQueueSheet";

type FeedActionWheelProps = {
  userId: string;
  /** Other players' pending proofs the viewer hasn't voted on. */
  voteCount: number;
};

/**
 * The feed's floating Hextech button, fixed above the bottom nav. A tap opens a small wheel of actions around it
 * (like League's ping wheel): Nova objava and Čeka tvoj glas. The core glows while proofs wait for a vote.
 */
export function FeedActionWheel({ userId, voteCount }: FeedActionWheelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<"post" | "votes" | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function choose(next: "post" | "votes") {
    setOpen(false);
    setSheet(next);
  }

  return (
    <>
      {/* Dims the feed while the wheel is open; a tap outside closes it. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-20 bg-abyss/70 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <div className="mx-auto flex max-w-md justify-end px-4">
          <div className="pointer-events-auto relative">
            <WheelItem open={open} order={0} className="right-0 bottom-full mb-3 origin-bottom-right">
              <Button variant="secondary" onClick={() => choose("post")}>
                <CameraIcon />
                Nova objava
              </Button>
            </WheelItem>
            <WheelItem open={open} order={1} className="top-1/2 right-full mr-3 origin-right -translate-y-1/2">
              <Button variant="secondary" onClick={() => choose("votes")}>
                <VoteIcon />
                Čeka tvoj glas
                {voteCount > 0 && <Badge tone="pending">{formatNumber(voteCount)}</Badge>}
              </Button>
            </WheelItem>

            <HextechFab
              label="Akcije u feedu"
              icon={<PlusIcon />}
              open={open}
              glow={voteCount > 0}
              count={voteCount}
              onClick={() => setOpen((wasOpen) => !wasOpen)}
            />
          </div>
        </div>
      </div>

      <NewPostSheet userId={userId} open={sheet === "post"} onClose={() => setSheet(null)} />
      {sheet === "votes" && (
        <VoteQueueSheet
          onClose={() => {
            setSheet(null);
            // The badge count and the feed's vote counts may have changed.
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/** One action in the wheel. Pops out from the button when the wheel opens, one after the other. */
function WheelItem({ open, order, className, children }: { open: boolean; order: number; className: string; children: ReactNode }) {
  return (
    <div
      inert={!open}
      style={{ transitionDelay: open ? `${order * 50}ms` : "0ms" }}
      className={cn(
        "absolute rounded-md bg-deep whitespace-nowrap shadow-card transition duration-200 ease-out",
        open ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function VoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l3.5 3.5L15 9.5" />
      <path d="M14 15l5 5M19 15l-5 5" />
    </svg>
  );
}
