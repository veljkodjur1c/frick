"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Badge, Button, Card, Checkbox } from "@/components/ui";
import { ProofUploadSheet } from "@/features/proofs/ProofUploadSheet";
import { CategoryBadge } from "@/features/titles/CategoryIcon";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { CompletionStatus } from "@/lib/game/points";
import { setCheckTaskDone } from "./actions";
import type { TaskData } from "./queries";

type TaskRowProps = {
  task: TaskData;
  /** Shows the tick right away; TaskBoard rolls it back if the action fails. */
  onOptimisticDone: (done: boolean) => void;
};

// Every row has the same height: a 48px tile on the left, at most two lines of title and one line of badges.
const ROW = "h-24";

/**
 * One task as a card: on the left the checkbox (`check`) or the camera / proof status (`proof`),
 * in the middle the title with scope and category, on the right the points.
 */
export function TaskRow({ task, onOptimisticDone }: TaskRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (task.type === "proof") {
    return (
      <Card padding="sm" className={ROW}>
        <div className="flex h-full items-center gap-3">
          <ProofTile task={task} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-base leading-5 text-fg">{task.title}</p>
            <TaskBadges task={task} className="mt-2" />
          </div>
          <TaskPoints points={task.points} status={task.myStatus} />
        </div>
      </Card>
    );
  }

  function toggle(done: boolean) {
    // Ignore taps until the last change is saved, so a rollback can't undo a newer tick.
    if (pending) return;
    setError(null);
    startTransition(async () => {
      onOptimisticDone(done);
      const result = await setCheckTaskDone(task.id, done);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <Card padding="sm" className={ROW}>
        <Checkbox
          size="lg"
          icon={<TaskIcon />}
          className="h-full"
          label={<span className="line-clamp-2 leading-5">{task.title}</span>}
          description={<TaskBadges task={task} className="mt-1.5" />}
          aside={<TaskPoints points={task.points} status={task.myStatus} />}
          strike
          checked={task.myStatus === "approved"}
          onChange={(event) => toggle(event.target.checked)}
        />
      </Card>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

/** Scope and category, fixed widths so they line up from row to row. */
function TaskBadges({ task, className }: { task: TaskData; className?: string }) {
  return (
    <span className={cn("flex gap-1.5 overflow-hidden", className)}>
      <Badge tone={task.scope === "team" ? "hextech" : "neutral"} className="w-12 justify-center">
        {task.scope === "team" ? "Tim" : "Solo"}
      </Badge>
      {task.category && <CategoryBadge category={task.category} className="w-36 justify-center" />}
    </span>
  );
}

const POINTS_LOOK: Record<CompletionStatus | "open", { tile: string; number: string; label: string; text: string }> = {
  open: { tile: "bg-gold-700/25", number: "text-gold-200", label: "text-fg-muted", text: "poena" },
  approved: { tile: "bg-success/15", number: "text-success", label: "text-success", text: "poena" },
  pending: { tile: "bg-pending/15", number: "text-gold-200", label: "text-pending", text: "čeka" },
  rejected: { tile: "bg-danger/15", number: "text-fg-muted line-through", label: "text-danger", text: "Cap" },
};

/** The task's points on the right, colored by what happened to them (open, earned, waiting for votes, Capped). */
function TaskPoints({ points, status }: { points: number; status: CompletionStatus | null }) {
  const look = POINTS_LOOK[status ?? "open"];
  return (
    <span className={cn("flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-md", look.tile)}>
      <span className={cn("text-lg leading-6 font-bold tabular-nums", look.number)}>+{formatNumber(points)}</span>
      <span className={cn("text-xs leading-4", look.label)}>{look.text}</span>
    </span>
  );
}

/** Left tile of a proof task: the camera opens the upload sheet; after sending it shows the proof's status. */
function ProofTile({ task }: { task: TaskData }) {
  if (task.myStatus === "pending") {
    return (
      <StatusTile label="Dokaz čeka glasove" className="bg-pending/15 text-pending">
        <path d="M7 4h10M7 20h10M8 4c0 4 8 4 8 8s-8 4-8 8M16 4c0 4-8 4-8 8s8 4 8 8" />
      </StatusTile>
    );
  }
  if (task.myStatus === "approved") {
    return (
      <StatusTile label="Dokaz je Legit" className="bg-success/15 text-success">
        <path d="M5 12.5 10 17.5 19 7" />
      </StatusTile>
    );
  }

  const retry = task.myStatus === "rejected";
  return (
    <ProofUploadSheet
      taskId={task.id}
      taskTitle={task.title}
      points={task.points}
      retry={retry}
      trigger={(open) => (
        <Button
          variant={retry ? "danger" : "secondary"}
          size="icon"
          aria-label={retry ? "Pošalji novi dokaz" : "Pošalji dokaz"}
          onClick={open}
        >
          <CameraIcon />
        </Button>
      )}
    />
  );
}

function StatusTile({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("flex size-12 shrink-0 items-center justify-center rounded-md", className)}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

/** Clipboard with a list: the empty checkbox of a `check` task. */
export function TaskIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
