"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Badge, Checkbox } from "@/components/ui";
import { ProofUploadSheet } from "@/features/proofs/ProofUploadSheet";
import { CategoryBadge } from "@/features/titles/CategoryIcon";
import { formatNumber } from "@/lib/format";
import type { CompletionStatus } from "@/lib/game/points";
import { setCheckTaskDone } from "./actions";
import type { TaskData } from "./queries";

type TaskRowProps = {
  task: TaskData;
  /** Shows the tick right away; TaskBoard rolls it back if the action fails. */
  onOptimisticDone: (done: boolean) => void;
};

/** One task: a tickable row for `check` tasks, a read-only row with its status for `proof` tasks. */
export function TaskRow({ task, onOptimisticDone }: TaskRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const points = <Badge tone="gold">+{formatNumber(task.points)}</Badge>;

  if (task.type === "proof") {
    return (
      <div className="flex min-h-11 items-center gap-3 py-2">
        <CameraIcon />
        <div className="min-w-0 flex-1">
          <p className="text-base text-fg">{task.title}</p>
          <TaskMeta task={task}>
            <ProofStatus status={task.myStatus} />
          </TaskMeta>
          {(task.myStatus === null || task.myStatus === "rejected") && (
            <ProofUploadSheet
              taskId={task.id}
              taskTitle={task.title}
              points={task.points}
              retry={task.myStatus === "rejected"}
            />
          )}
        </div>
        {points}
      </div>
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
    <div className="py-1">
      <Checkbox
        label={task.title}
        description={<TaskMeta task={task} />}
        aside={points}
        strike
        checked={task.myStatus === "approved"}
        onChange={(event) => toggle(event.target.checked)}
      />
      {error && (
        <p role="alert" className="pb-1 pl-9 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Description and badges under the title. */
function TaskMeta({ task, children }: { task: TaskData; children?: ReactNode }) {
  return (
    <>
      {task.description && <span className="block text-sm text-fg-muted">{task.description}</span>}
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge tone={task.scope === "team" ? "hextech" : "neutral"}>{task.scope === "team" ? "Tim" : "Solo"}</Badge>
        {task.category && <CategoryBadge category={task.category} />}
        {children}
      </span>
    </>
  );
}

function ProofStatus({ status }: { status: CompletionStatus | null }) {
  if (status === "pending") return <Badge tone="pending">Na čekanju</Badge>;
  if (status === "approved") return <Badge tone="success">Legit</Badge>;
  if (status === "rejected") return <Badge tone="danger">Cap</Badge>;
  return <Badge>Treba slika</Badge>;
}

/** Takes the checkbox's place in proof rows, so titles line up. */
function CameraIcon() {
  return (
    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center text-fg-muted">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    </span>
  );
}
